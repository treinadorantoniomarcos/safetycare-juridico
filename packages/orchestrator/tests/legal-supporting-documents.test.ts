import { describe, expect, it } from "vitest";
import { buildCivilHealthSupportingDocumentPack } from "../src/index";

describe("buildCivilHealthSupportingDocumentPack", () => {
  it("builds the procuração and contract templates", () => {
    const pack = buildCivilHealthSupportingDocumentPack({
      patientFullName: "Paciente Exemplo",
      patientCpf: "12345678901",
      city: "Curitiba",
      contact: "41 99999-9999",
      relationToPatient: "Filho",
      problemType: "atendimento",
      currentUrgency: "medium",
      keyDates: [{ label: "Consulta", date: "2026-05-01" }],
      objectiveDescription: "Descricao objetiva do caso.",
      materialLosses: "Perdas materiais informadas.",
      moralImpact: "Impacto moral informado.",
      documentsAttached: ["doc.pdf"],
      witnesses: ["Testemunha"],
      mainRequest: "Pedido principal.",
      subsidiaryRequest: "Pedido subsidiario."
    });

    expect(pack.documents).toHaveLength(2);
    expect(pack.documents[0]?.type).toBe("power_of_attorney");
    expect(pack.documents[1]?.type).toBe("fee_agreement");
    expect(pack.documents[0]?.markdown).toContain("PROCURAÇÃO");
    expect(pack.documents[1]?.markdown).toContain("CONTRATO DE PRESTACAO DE SERVICOS");
  });
});
