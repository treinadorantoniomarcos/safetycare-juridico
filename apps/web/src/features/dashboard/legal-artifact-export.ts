import type { LegalArtifactRecord } from "@safetycare/database";

export const legalArtifactOrder = ["civil_health_draft", "power_of_attorney", "fee_agreement"] as const;
export type LegalArtifactType = (typeof legalArtifactOrder)[number];

export const legalArtifactLabels: Record<LegalArtifactType, string> = {
  civil_health_draft: "Minuta preliminar",
  power_of_attorney: "Procuração",
  fee_agreement: "Contrato de prestação de serviços e honorários"
};

type ExportArtifact = Omit<LegalArtifactRecord, "artifactType"> & {
  artifactType: LegalArtifactType;
};

type ExportBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "blank" }
  | { kind: "pageBreak" };

type PdfLine = {
  font: "regular" | "bold" | "italic";
  size: number;
  text: string;
  x: number;
  y: number;
};

type PdfPage = {
  lines: PdfLine[];
};

export type LegalArtifactExportFormat = "pdf" | "docx";

export type LegalArtifactExportBundle = {
  caseId: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  summary: string;
  documents: Array<{
    artifactType: LegalArtifactType;
    artifactLabel: string;
    versionNumber: number;
    status: string;
    title: string;
    subtitle: string;
    summary: string;
    metadata: Record<string, unknown>;
    contentMarkdown: string;
  }>;
};

function normalizeComparisonText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeMarkdownText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\r/g, "");
}

function stripDuplicateLeadingTitle(contentMarkdown: string, title: string) {
  const lines = contentMarkdown.split("\n");
  const normalizedTitle = normalizeComparisonText(title);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();

    if (!line) {
      continue;
    }

    if (normalizeComparisonText(line) === normalizedTitle) {
      return [...lines.slice(0, index), ...lines.slice(index + 1)].join("\n");
    }

    return contentMarkdown;
  }

  return contentMarkdown;
}

function formatMetadataValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function orderArtifacts(artifacts: ExportArtifact[]) {
  const order = new Map<LegalArtifactType, number>(legalArtifactOrder.map((artifactType, index) => [artifactType, index]));

  return [...artifacts].sort((left, right) => {
    const leftOrder = order.get(left.artifactType) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.artifactType) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.versionNumber - right.versionNumber;
  });
}

function buildArtifactDocumentBundle(
  caseId: string,
  artifacts: ExportArtifact[],
  generatedAt: string
): LegalArtifactExportBundle {
  const orderedArtifacts = orderArtifacts(artifacts);

  if (orderedArtifacts.length === 1) {
    const [artifact] = orderedArtifacts;

    if (artifact) {
      return {
        caseId,
        generatedAt,
        title: artifact.title,
        subtitle: artifact.subtitle,
        summary: artifact.summary,
        documents: orderedArtifacts.map((currentArtifact) => ({
          artifactType: currentArtifact.artifactType,
          artifactLabel: legalArtifactLabels[currentArtifact.artifactType],
          versionNumber: currentArtifact.versionNumber,
          status: currentArtifact.status,
          title: currentArtifact.title,
          subtitle: currentArtifact.subtitle,
          summary: currentArtifact.summary,
          metadata: currentArtifact.metadata ?? {},
          contentMarkdown: stripDuplicateLeadingTitle(
            currentArtifact.contentMarkdown,
            currentArtifact.title
          )
        }))
      };
    }
  }

  return {
    caseId,
    generatedAt,
    title: "Pacote de artefatos juridicos",
    subtitle: "Minuta, procuração e contrato para revisao humana",
    summary: `Versoes mais recentes dos artefatos juridicos do caso ${caseId}.`,
    documents: orderedArtifacts.map((artifact) => ({
      artifactType: artifact.artifactType,
      artifactLabel: legalArtifactLabels[artifact.artifactType],
      versionNumber: artifact.versionNumber,
      status: artifact.status,
      title: artifact.title,
      subtitle: artifact.subtitle,
      summary: artifact.summary,
      metadata: artifact.metadata ?? {},
      contentMarkdown: stripDuplicateLeadingTitle(artifact.contentMarkdown, artifact.title)
    }))
  };
}

function parseMarkdownToBlocks(markdown: string): ExportBlock[] {
  const blocks: ExportBlock[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/\s+$/g, "");

    if (!line.trim()) {
      blocks.push({ kind: "blank" });
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: normalizeMarkdownText(headingMatch[2] ?? "")
      });
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        kind: "bullet",
        text: normalizeMarkdownText(bulletMatch[1] ?? "")
      });
      continue;
    }

    blocks.push({
      kind: "paragraph",
      text: normalizeMarkdownText(line)
    });
  }

  return blocks;
}

function buildExportBlocks(bundle: LegalArtifactExportBundle) {
  const blocks: ExportBlock[] = [
    { kind: "heading", level: 1, text: bundle.title },
    { kind: "heading", level: 2, text: bundle.subtitle },
    { kind: "paragraph", text: bundle.summary },
    { kind: "paragraph", text: `Caso: ${bundle.caseId}` },
    { kind: "paragraph", text: `Gerado em: ${bundle.generatedAt}` },
    { kind: "paragraph", text: `Documentos incluidos: ${bundle.documents.length}` },
    { kind: "blank" },
    { kind: "pageBreak" }
  ];

  bundle.documents.forEach((document, index) => {
    const metadataPieces = [
      `Tipo: ${document.artifactLabel}`,
      `Versao: ${document.versionNumber}`,
      `Status: ${document.status}`
    ];

    const metadataDetails = Object.entries(document.metadata)
      .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
      .filter((item) => item.trim().length > 0);

    blocks.push(
      { kind: "heading", level: 1, text: document.title },
      { kind: "heading", level: 2, text: document.subtitle },
      { kind: "paragraph", text: document.summary },
      { kind: "paragraph", text: metadataPieces.join(" | ") }
    );

    if (metadataDetails.length > 0) {
      blocks.push({ kind: "paragraph", text: metadataDetails.join(" | ") });
    }

    blocks.push(
      { kind: "blank" },
      { kind: "heading", level: 2, text: "Conteudo" },
      ...parseMarkdownToBlocks(document.contentMarkdown)
    );

    if (index < bundle.documents.length - 1) {
      blocks.push({ kind: "pageBreak" });
    }
  });

  return blocks;
}

function wrapText(value: string, maxChars: number) {
  const cleaned = value.trim();

  if (!cleaned) {
    return [""];
  }

  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let currentLine = words.shift() ?? "";

  for (const word of words) {
    if ((currentLine + " " + word).length <= maxChars) {
      currentLine += ` ${word}`;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  lines.push(currentLine);

  return lines.flatMap((line) => {
    if (line.length <= maxChars) {
      return [line];
    }

    const segments: string[] = [];
    let cursor = 0;

    while (cursor < line.length) {
      segments.push(line.slice(cursor, cursor + maxChars));
      cursor += maxChars;
    }

    return segments;
  });
}

function ensurePdfSafeText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\u0000-\u00FF]/g, "?");
}

function escapePdfText(value: string) {
  return ensurePdfSafeText(value).replace(/([\\()])/g, "\\$1");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function layoutBlocksAsPdfPages(blocks: ExportBlock[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const bottomMargin = 52;
  const pages: PdfPage[] = [{ lines: [] }];
  let currentPage = pages[0];
  let cursorY = pageHeight - margin;

  const addLine = (text: string, font: "regular" | "bold" | "italic", size: number, indent: number) => {
    const availableWidth = pageWidth - margin * 2 - indent;
    const maxChars = Math.max(24, Math.floor(availableWidth / (size * 0.52)));
    const wrappedLines = wrapText(text, maxChars);
    const lineHeight = Math.round(size * 1.35);

    for (const wrappedLine of wrappedLines) {
      if (cursorY - lineHeight < bottomMargin) {
        currentPage = { lines: [] };
        pages.push(currentPage);
        cursorY = pageHeight - margin;
      }

      currentPage.lines.push({
        font,
        size,
        text: wrappedLine,
        x: margin + indent,
        y: cursorY
      });

      cursorY -= lineHeight;
    }
  };

  for (const block of blocks) {
    if (block.kind === "pageBreak") {
      currentPage = { lines: [] };
      pages.push(currentPage);
      cursorY = pageHeight - margin;
      continue;
    }

    if (block.kind === "blank") {
      cursorY -= 9;
      continue;
    }

    if (block.kind === "heading") {
      const size = block.level === 1 ? 18 : block.level === 2 ? 14 : 12;
      addLine(block.text, "bold", size, 0);
      cursorY -= block.level === 1 ? 6 : 4;
      continue;
    }

    if (block.kind === "bullet") {
      addLine(`- ${block.text}`, "regular", 11, 18);
      continue;
    }

    addLine(block.text, "regular", 11, 0);
  }

  return pages.filter((page, index) => index === 0 || page.lines.length > 0);
}

function renderPdfTextLines(lines: PdfLine[]) {
  return lines
    .map((line) => {
      const fontName = line.font === "bold" ? "/F2" : line.font === "italic" ? "/F3" : "/F1";
      const escapedText = escapePdfText(line.text);
      return `BT ${fontName} ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapedText}) Tj ET`;
    })
    .join("\n");
}

function toDosDateTime(date: Date = new Date()) {
  const safeYear = Math.max(date.getFullYear(), 1980);
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds()) / 2) & 0x1f);
  const dosDate = ((safeYear - 1980) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);

  return { time: dosTime, date: dosDate };
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
}

const crc32Table = createCrc32Table();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(entries: Array<{ name: string; data: Buffer }>) {
  const { time, date } = toDosDateTime();
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const dataBuffer = entry.data;
    const crc = crc32(dataBuffer);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function buildDocxParagraph(
  text: string,
  options?: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    indent?: number;
    pageBreak?: boolean;
  }
) {
  if (options?.pageBreak) {
    return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  const size = options?.size ?? 22;
  const indent = options?.indent ?? 0;
  const rPr: string[] = [`<w:sz w:val="${size}"/>`];

  if (options?.bold) {
    rPr.push("<w:b/>");
  }

  if (options?.italic) {
    rPr.push("<w:i/>");
  }

  const pPr = indent ? `<w:pPr><w:ind w:left="${indent}" w:hanging="${Math.min(indent, 360)}"/></w:pPr>` : "";

  return [
    "<w:p>",
    pPr,
    `<w:r><w:rPr>${rPr.join("")}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`,
    "</w:p>"
  ].join("");
}

function blocksToDocxXml(blocks: ExportBlock[]) {
  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (block.kind === "pageBreak") {
      paragraphs.push(buildDocxParagraph("", { pageBreak: true }));
      continue;
    }

    if (block.kind === "blank") {
      paragraphs.push(buildDocxParagraph("", { size: 12 }));
      continue;
    }

    if (block.kind === "heading") {
      const size = block.level === 1 ? 36 : block.level === 2 ? 28 : 24;
      paragraphs.push(buildDocxParagraph(block.text, { bold: true, size }));
      continue;
    }

    if (block.kind === "bullet") {
      paragraphs.push(buildDocxParagraph(`- ${block.text}`, { size: 22, indent: 720 }));
      continue;
    }

    paragraphs.push(buildDocxParagraph(block.text, { size: 22 }));
  }

  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    "<w:body>",
    paragraphs.join(""),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>',
    "</w:body>",
    "</w:document>"
  ].join("");

  const relsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
  ].join("");

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    "</Types>"
  ].join("");

  const rootRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    "</Relationships>"
  ].join("");

  return createZipBuffer([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRelsXml, "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
    { name: "word/_rels/document.xml.rels", data: Buffer.from(relsXml, "utf8") }
  ]);
}

function createPdfBuffer(blocks: ExportBlock[]) {
  const pages = layoutBlocksAsPdfPages(blocks);
  const pageCount = pages.length;
  const objectContents: string[] = [];

  objectContents.push("<< /Type /Catalog /Pages 2 0 R >>");
  objectContents.push(
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${6 + index * 2} 0 R`).join(" ")}] /Count ${pageCount} >>`
  );
  objectContents.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objectContents.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objectContents.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");

  for (const [pageIndex, page] of pages.entries()) {
    const content = renderPdfTextLines(page.lines);
    const contentLength = Buffer.byteLength(content, "latin1");
    const pageObjectNumber = 6 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;

    objectContents.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`
    );
  }

  const offsets: number[] = [0];
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1");
  const pdfBuffers: Buffer[] = [header];
  let cursor = header.length;

  for (let index = 0; index < objectContents.length; index += 1) {
    offsets.push(cursor);
    const objectNumber = index + 1;
    const objectBuffer = Buffer.from(`${objectNumber} 0 obj\n${objectContents[index]}\nendobj\n`, "latin1");
    pdfBuffers.push(objectBuffer);
    cursor += objectBuffer.length;
  }

  const xrefOffset = cursor;
  const xrefLines = ["xref", `0 ${objectContents.length + 1}`, "0000000000 65535 f "];

  for (const offset of offsets.slice(1)) {
    xrefLines.push(`${String(offset).padStart(10, "0")} 00000 n `);
  }

  const trailerLines = [
    "trailer",
    `<< /Size ${objectContents.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF"
  ];

  pdfBuffers.push(Buffer.from(`${xrefLines.join("\n")}\n${trailerLines.join("\n")}\n`, "latin1"));

  return Buffer.concat(pdfBuffers);
}

export function buildLegalArtifactExportBundle(
  caseId: string,
  artifacts: ExportArtifact[],
  generatedAt = new Date().toISOString()
) {
  return buildArtifactDocumentBundle(caseId, artifacts, generatedAt);
}

export function createLegalArtifactPdfBuffer(bundle: LegalArtifactExportBundle) {
  return createPdfBuffer(buildExportBlocks(bundle));
}

export function createLegalArtifactDocxBuffer(bundle: LegalArtifactExportBundle) {
  return blocksToDocxXml(buildExportBlocks(bundle));
}
