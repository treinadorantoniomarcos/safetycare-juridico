import { describe, expect, it } from "vitest";
import { buildCivilHealthLegalDraft } from "../src/legal-draft";

describe("buildCivilHealthLegalDraft", () => {
  it("includes a preliminary legal analysis section", () => {
    const draft = buildCivilHealthLegalDraft({
      caseId: "11111111-1111-4111-8111-111111111111",
      workflowJobId: "22222222-2222-4222-8222-222222222222",
      draftScope: "civil_health",
      patientFullName: "Roberto Carlos",
      patientCpf: "12345678901",
      city: "Goiânia",
      contact: "62 99999-9999",
      patientAddress: "Rua A, 123",
      patientWhatsapp: "62999999999",
      patientEmail: "roberto@example.com",
      patientAdditionalEmails: ["roberto.alt@example.com"],
      patientAdditionalWhatsapps: ["62988880000"],
      patientRg: "1234567",
      relationToPatient: "Filho",
      contactFullName: "Maria Silva",
      contactAddress: "Rua B, 456",
      contactWhatsapp: "62988888888",
      contactEmail: "maria@example.com",
      contactAdditionalEmails: ["maria.alt@example.com"],
      contactAdditionalWhatsapps: ["62977770000"],
      contactCpf: "10987654321",
      contactRg: "7654321",
      problemType: "atendimento",
      currentUrgency: "high",
      keyDates: [{ label: "Atendimento", date: "2026-05-01", time: "18:10" }],
      objectiveDescription:
        "O paciente foi socorrido, permaneceu sem atendimento adequado e evoluiu a óbito na unidade.",
      materialLosses: "Despesas com remoção e funeral.",
      moralImpact: "Abalo intenso aos familiares.",
      uploadedDocuments: [],
      documentsAttached: ["Prontuário", "Boletim de ocorrência"],
      witnesses: [
        {
          fullName: "Testemunha Exemplo",
          cpf: "111.111.111-11",
          rg: "RG-123",
          address: "Rua Teste, 100",
          whatsapp: "(62) 90000-0000"
        }
      ],
      mainRequest: "Indenização por danos morais e materiais",
      subsidiaryRequest: "Aplicação subsidiária da responsabilidade civil"
    });

    expect(draft.sections.some((section) => section.title === "Análise jurídica preliminar")).toBe(
      true
    );
    expect(draft.sections.find((section) => section.key === "contexto")?.body).toContain(
      "E-mails adicionais do paciente"
    );
    expect(draft.markdown).toContain("falha no atendimento emergencial");
    expect(draft.markdown).toContain("Análise jurídica preliminar");
  });
});
