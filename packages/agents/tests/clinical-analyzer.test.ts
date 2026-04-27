import { describe, expect, it } from "vitest";
import { buildPatientJourneyTimeline, classifyCaseTriage, analyzeClinicalSignals } from "../src";

describe("analyzeClinicalSignals", () => {
  it("detects critical clinical signals from a severe hospital narrative", () => {
    const triage = classifyCaseTriage({
      source: "form",
      message: "Minha mae ficou na UTI, passou por cirurgia e piorou apos a alta."
    });

    const journey = buildPatientJourneyTimeline({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      message: "Minha mae ficou na UTI, passou por cirurgia e piorou apos a alta.",
      triage
    });

    const analysis = analyzeClinicalSignals({
      caseId: journey.caseId,
      source: "form",
      journey,
      triage
    });

    expect(analysis.riskLevel).toBe("critical");
    expect(analysis.findings.some((finding) => finding.findingType === "red_flag")).toBe(true);
    expect(analysis.summary.toLowerCase()).toContain("analise clinica");
  });

  it("flags plan denial as a clinical delay signal", () => {
    const triage = classifyCaseTriage({
      source: "whatsapp",
      message: "Meu plano negou a cobertura da cirurgia e estou aguardando liberacao."
    });

    const journey = buildPatientJourneyTimeline({
      caseId: "22222222-2222-4222-8222-222222222222",
      source: "whatsapp",
      message: "Meu plano negou a cobertura da cirurgia e estou aguardando liberacao.",
      triage
    });

    const analysis = analyzeClinicalSignals({
      caseId: journey.caseId,
      source: "whatsapp",
      journey,
      triage
    });

    expect(analysis.findings.some((finding) => finding.findingType === "delay")).toBe(true);
    expect(analysis.riskLevel).not.toBe("low");
  });
});
