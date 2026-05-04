import { describe, expect, it } from "vitest";
import {
  buildLegalArtifactExportBundle,
  createLegalArtifactDocxBuffer,
  createLegalArtifactPdfBuffer
} from "../src/features/dashboard/legal-artifact-export";

const caseId = "11111111-1111-4111-8111-111111111111";

function makeArtifact(
  artifactType: "civil_health_draft" | "power_of_attorney" | "fee_agreement",
  title: string,
  versionNumber: number
) {
  return {
    id: `${artifactType}-${versionNumber}`,
    caseId,
    sourceWorkflowJobId: "22222222-2222-4222-8222-222222222222",
    artifactType,
    versionNumber,
    status: "draft",
    title,
    subtitle: `Subtitulo ${versionNumber}`,
    summary: `Resumo ${versionNumber}`,
    contentMarkdown: `${title}\n\nConteudo principal ${versionNumber}.`,
    metadata: {
      source: "public_legal_brief_form"
    },
    createdAt: new Date("2026-05-01T12:00:00Z"),
    updatedAt: new Date("2026-05-01T12:00:00Z")
  } as const;
}

describe("legal artifact export", () => {
  const artifacts = [
    makeArtifact("fee_agreement", "Contrato", 1),
    makeArtifact("civil_health_draft", "Minuta", 2),
    makeArtifact("power_of_attorney", "Procuracao", 3)
  ];

  it("orders the bundle and removes the duplicated leading title", () => {
    const bundle = buildLegalArtifactExportBundle(caseId, artifacts);

    expect(bundle.documents).toHaveLength(3);
    expect(bundle.documents[0]?.artifactType).toBe("civil_health_draft");
    expect(bundle.documents[1]?.artifactType).toBe("power_of_attorney");
    expect(bundle.documents[2]?.artifactType).toBe("fee_agreement");
    expect(bundle.documents[0]?.artifactLabel).toBe("Minuta preliminar");
    expect(bundle.documents[1]?.artifactLabel.toLowerCase()).toContain("procura");
    expect(bundle.documents[0]?.contentMarkdown.split("\n").find((line) => line.trim().length > 0)).toBe(
      "Conteudo principal 2."
    );
  });

  it("uses the artifact title when exporting a single document", () => {
    const bundle = buildLegalArtifactExportBundle(caseId, [makeArtifact("power_of_attorney", "ProcuraÃ§Ã£o", 1)]);

    expect(bundle.title).toBe("ProcuraÃ§Ã£o");
    expect(bundle.subtitle).toBe("Subtitulo 1");
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]?.artifactType).toBe("power_of_attorney");
  });

  it("builds a pdf buffer with a valid header", () => {
    const bundle = buildLegalArtifactExportBundle(caseId, artifacts);
    const pdfBuffer = createLegalArtifactPdfBuffer(bundle);

    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdfBuffer.toString("latin1")).toContain("Pacote de artefatos juridicos");
  });

  it("builds a docx buffer with a zip header", () => {
    const bundle = buildLegalArtifactExportBundle(caseId, artifacts);
    const docxBuffer = createLegalArtifactDocxBuffer(bundle);

    expect(docxBuffer.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(docxBuffer.toString("utf8")).toContain("[Content_Types].xml");
  });
});
