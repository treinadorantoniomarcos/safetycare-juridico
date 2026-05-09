import {
  formatLegalBriefWitnessLine,
  legalDraftSchema,
  normalizeLegalBriefWitnesses,
  type LegalBriefInput,
  type LegalDraft,
  type LegalDraftSection
} from "@safetycare/ai-contracts";

type CivilHealthDraftInput = Omit<LegalBriefInput, "caseId" | "workflowJobId">;

const problemTypeLabels: Record<CivilHealthDraftInput["problemType"], string> = {
  atendimento: "falha no atendimento",
  plano: "negativa de cobertura por plano de saúde",
  hospital: "falha hospitalar",
  medico: "erro médico",
  clinica: "falha de clínica",
  medicamento: "fornecimento de medicamento",
  cirurgia: "autorização de procedimento cirúrgico",
  uti: "internação em UTI",
  reembolso: "reembolso de despesas assistenciais",
  outro: "falha assistencial"
};

function formatDate(value: string) {
  const parts = value.split("-");

  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatUrgency(value: CivilHealthDraftInput["currentUrgency"]) {
  switch (value) {
    case "critical":
      return "crítica";
    case "high":
      return "alta";
    case "medium":
      return "média";
    default:
      return "baixa";
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeParagraphText(value: string) {
  return value
    .split(/\r?\n+/)
    .map((paragraph) => normalizeText(paragraph))
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function renderList(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return `- ${emptyMessage}`;
  }

  return items.map((item) => `- ${normalizeText(item)}`).join("\n");
}

function buildProcessRepresentativeReference(input: CivilHealthDraftInput) {
  const lines = [
    `Solicitante sera o procurador e responsavel pelo acompanhamento do processo: ${
      input.contactIsProcessRepresentative ? "sim" : "nao"
    }.`
  ];

  if (input.contactIsProcessRepresentative) {
    return lines;
  }

  return lines
    .concat([
      `Procurador e responsavel pelo acompanhamento do processo: ${normalizeText(
        input.processRepresentativeFullName ?? ""
      )}.`,
      `CPF do procurador: ${normalizeText(input.processRepresentativeCpf ?? "")}.`,
      `RG do procurador: ${normalizeText(input.processRepresentativeRg ?? "")}.`,
      `Endereco do procurador: ${normalizeText(input.processRepresentativeAddress ?? "")}.`,
      `WhatsApp do procurador: ${normalizeText(input.processRepresentativeWhatsapp ?? "")}.`,
      `E-mail do procurador: ${normalizeText(input.processRepresentativeEmail ?? "")}.`
    ])
    .concat(
      input.processRepresentativeAdditionalEmails.length > 0
        ? [
            `E-mails adicionais do procurador:`,
            renderList(
              input.processRepresentativeAdditionalEmails,
              "Nenhum e-mail adicional do procurador foi informado."
            )
          ]
        : []
    )
    .concat(
      input.processRepresentativeAdditionalWhatsapps.length > 0
        ? [
            `WhatsApps adicionais do procurador:`,
            renderList(
              input.processRepresentativeAdditionalWhatsapps,
              "Nenhum WhatsApp adicional do procurador foi informado."
            )
          ]
        : []
    );
}

function renderUploadedDocuments(input: CivilHealthDraftInput["uploadedDocuments"]) {
  if (input.length === 0) {
    return "- Nenhum arquivo enviado no formulario.";
  }

  return input
    .map((item, index) => {
      const name = normalizeText(item.name);
      const mimeType = normalizeText(item.mimeType);
      const size = formatFileSize(item.size);
      const uploadedAt = formatDate(item.uploadedAt.slice(0, 10));

      return `${index + 1}. ${name} (${mimeType}, ${size}) enviado em ${uploadedAt}`;
    })
    .join("\n");
}

function renderTimeline(keyDates: CivilHealthDraftInput["keyDates"]) {
  if (keyDates.length === 0) {
    return "- Nenhuma data-chave informada.";
  }

  return keyDates
    .map((item, index) => {
      const label = normalizeText(item.label);
      const date = formatDate(item.date);
      const time = item.time?.trim();

      return `${index + 1}. ${label} em ${date}${time ? ` às ${time}` : ""}`;
    })
    .join("\n");
}

function buildPreliminaryLegalAnalysis(input: CivilHealthDraftInput) {
  const urgencyLabel = formatUrgency(input.currentUrgency);
  const analysisParagraphs = [
    `A narrativa consolidada aponta, em tese, falha no atendimento emergencial, com triagem sem resposta imediata, permanência prolongada em sala de espera e agravamento progressivo do quadro até o óbito ainda nas dependências da unidade.`,
    `Sob a ótica jurídica, a peça deve examinar o dever de assistência tempestiva, a adequação do protocolo de classificação de risco, o tempo de resposta assistencial, a evolução clínica documentada e o nexo causal entre a demora e o desfecho descrito.`,
    `Também é necessário conferir prontuário, horários de entrada e evolução, registros de triagem, exames, condutas adotadas e eventual ausência de medidas de estabilização, pois esses elementos sustentam ou enfraquecem a tese de responsabilidade civil.`,
    `A análise jurídica preliminar permanece sujeita à validação humana antes do protocolo, especialmente quanto à escolha dos fundamentos legais, da jurisprudência aplicável, do polo passivo e da extensão dos pedidos indenizatórios. Urgência informada: ${urgencyLabel}.`
  ];

  return analysisParagraphs.join("\n\n");
}

function buildMarkdownDraft(input: CivilHealthDraftInput, sections: LegalDraftSection[]) {
  const introduction = [
    `EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE ${normalizeText(input.city)}`,
    "",
    `MINUTA PRELIMINAR DE PEÇA CIVIL/SAÚDE`,
    "",
    `Base objetiva: ${normalizeText(input.patientFullName)} - ${problemTypeLabels[input.problemType]}.`
  ].join("\n");

  const sectionText = sections
    .map((section) => [`## ${section.title}`, section.body].join("\n\n"))
    .join("\n\n");

  const conclusion = [
    "## Observações de revisão humana",
    "Esta minuta foi montada a partir dos parâmetros informados no formulário e continua sujeita a validação jurídica, conferência documental e ajuste de estratégia processual.",
    "Antes do protocolo, revisar competência, polo passivo, tutela de urgência, valor da causa, documentos anexos e adequação do pedido principal."
  ].join("\n\n");

  return [introduction, sectionText, conclusion].join("\n\n");
}

export function buildCivilHealthLegalDraft(input: CivilHealthDraftInput): LegalDraft {
  const problemTypeLabel = problemTypeLabels[input.problemType];
  const urgencyLabel = formatUrgency(input.currentUrgency);
  const keyDatesCount = input.keyDates.length;
  const documentCount = input.documentsAttached.filter((item) => normalizeText(item).length > 0).length;
  const uploadedDocumentCount = input.uploadedDocuments.length;
  const witnessCount = normalizeLegalBriefWitnesses(input.witnesses).length;

  const sections: LegalDraftSection[] = [
    {
      key: "contexto",
      title: "Dados de referência",
      body: [
        `Paciente: ${normalizeText(input.patientFullName)}.`,
        `Endereço do paciente: ${normalizeText(input.patientAddress)}.`,
        `WhatsApp do paciente: ${normalizeText(input.patientWhatsapp)}.`,
        `E-mail do paciente: ${normalizeText(input.patientEmail)}.`,
        `CPF do paciente: ${normalizeText(input.patientCpf)}.`,
        `RG do paciente: ${normalizeText(input.patientRg)}.`,
        `Relação informada: ${normalizeText(input.relationToPatient)}.`,
      ]
        .concat(buildProcessRepresentativeReference(input))
        .concat([
        `Solicitante: ${normalizeText(input.contactFullName)}.`,
        `Endereço do solicitante: ${normalizeText(input.contactAddress)}.`,
        `WhatsApp do solicitante: ${normalizeText(input.contactWhatsapp)}.`,
        `E-mail do solicitante: ${normalizeText(input.contactEmail)}.`,
        `CPF do solicitante: ${normalizeText(input.contactCpf)}.`,
        `RG do solicitante: ${normalizeText(input.contactRg)}.`,
        `Cidade de referência: ${normalizeText(input.city)}.`,
        `Contato informado: ${normalizeText(input.contact)}.`,
        `Tipo de problema: ${problemTypeLabel}.`,
        `Urgência atual: ${urgencyLabel}.`
      ])
        .concat(
          input.patientAdditionalEmails.length > 0
            ? [
                `E-mails adicionais do paciente:`,
                renderList(
                  input.patientAdditionalEmails,
                  "Nenhum e-mail adicional do paciente foi informado."
                )
              ]
            : []
        )
        .concat(
          input.patientAdditionalWhatsapps.length > 0
            ? [
                `WhatsApps adicionais do paciente:`,
                renderList(
                  input.patientAdditionalWhatsapps,
                  "Nenhum WhatsApp adicional do paciente foi informado."
                )
              ]
            : []
        )
        .concat(
          input.contactAdditionalEmails.length > 0
            ? [
                `E-mails adicionais do solicitante:`,
                renderList(
                  input.contactAdditionalEmails,
                  "Nenhum e-mail adicional do solicitante foi informado."
                )
              ]
            : []
        )
        .concat(
          input.contactAdditionalWhatsapps.length > 0
            ? [
                `WhatsApps adicionais do solicitante:`,
                renderList(
                  input.contactAdditionalWhatsapps,
                  "Nenhum WhatsApp adicional do solicitante foi informado."
                )
              ]
            : []
        )
        .join("\n")
    },
    {
      key: "fatos",
      title: "Narrativa técnica consolidada dos fatos",
      body: normalizeParagraphText(input.objectiveDescription)
    },
    {
      key: "timeline",
      title: "Linha do tempo",
      body: renderTimeline(input.keyDates)
    },
    {
      key: "analise_juridica",
      title: "Análise jurídica preliminar",
      body: buildPreliminaryLegalAnalysis(input)
    },
    {
      key: "impactos",
      title: "Prejuízos e repercussões",
      body: [
        `Prejuízos materiais informados: ${normalizeParagraphText(input.materialLosses)}.`,
        `Impacto moral e assistencial informado: ${normalizeParagraphText(input.moralImpact)}.`
      ].join("\n\n")
    },
    {
      key: "provas",
      title: "Documentos e testemunhas",
      body: [
        `Documentos anexos declarados (${documentCount}):`,
        renderList(input.documentsAttached, "Nenhum documento adicional foi informado."),
        "",
        `Arquivos enviados (${uploadedDocumentCount}):`,
        renderUploadedDocuments(input.uploadedDocuments),
        "",
        `Testemunhas indicadas (${witnessCount}):`,
        renderList(
          normalizeLegalBriefWitnesses(input.witnesses).map(formatLegalBriefWitnessLine),
          "Nenhuma testemunha adicional foi informada."
        )
      ].join("\n")
    },
    {
      key: "pedidos",
      title: "Pedidos sugeridos",
      body: [
        `Pedido principal: ${normalizeParagraphText(input.mainRequest)}.`,
        `Pedido subsidiário: ${normalizeParagraphText(input.subsidiaryRequest)}.`,
        "",
        `A urgência indicada é ${urgencyLabel}, o que recomenda verificar a viabilidade de tutela de urgência e a necessidade de delimitar prova pré-constituída.`
      ].join("\n\n")
    }
  ];

  const markdown = buildMarkdownDraft(input, sections);

  return legalDraftSchema.parse({
    draftScope: "civil_health",
    title: `Minuta preliminar civil/saúde - ${problemTypeLabel}`,
    subtitle: `${normalizeText(input.patientFullName)} | ${normalizeText(input.city)} | urgência ${urgencyLabel}`,
    summary: `Peça organizada a partir de ${keyDatesCount} data(s)-chave, ${documentCount} documento(s), ${uploadedDocumentCount} arquivo(s) enviados e ${witnessCount} testemunha(s) informada(s).`,
    sections,
    keyRecommendations: [
      `Revisar a competência da comarca de ${normalizeText(input.city)} e o polo passivo adequado para o problema descrito.`,
      "Conferir se os documentos médicos, comprovantes e negativas administrativas foram anexados antes do protocolo.",
      "Abrir os arquivos enviados pelo cliente no painel humano antes de concluir a liberacao.",
      `Validar se o pedido principal informado (${normalizeText(input.mainRequest)}) está coerente com a urgência ${urgencyLabel}.`,
      "Ajustar o valor da causa e os pedidos acessórios após a revisão humana da narrativa e da prova."
    ],
    markdown,
    generatedAt: new Date().toISOString()
  });
}
