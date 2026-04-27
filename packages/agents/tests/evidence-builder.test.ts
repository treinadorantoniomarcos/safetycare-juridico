import { describe, expect, it } from "vitest";
import {
  analyzeClinicalSignals,
  assessPatientRights,
  buildEvidenceChecklist,
  buildPatientJourneyTimeline,
  classifyCaseTriage
} from "../src";

describe("buildEvidenceChecklist", () => {
  it("builds checklist with critical missing items for severe narratives", () => {
    const message = "Minha mae ficou na UTI, fez cirurgia, recebeu alta sem orientacao e piorou.";
    const triage = classifyCaseTriage({ source: "form", message });
    const journey = buildPatientJourneyTimeline({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      message,
      triage
    });
    const clinical = analyzeClinicalSignals({
      caseId: journey.caseId,
      source: "form",
      journey,
      triage
    });
    const rights = assessPatientRights({
      caseId: journey.caseId,
      source: "form",
      message,
      consentStatus: "granted",
      triage,
      journey,
      clinical
    });

    const checklist = buildEvidenceChecklist({
      caseId: journey.caseId,
      source: "form",
      triage,
      journey,
      clinical,
      rights
    });

    expect(checklist.items.length).toBeGreaterThanOrEqual(4);
    expect(checklist.missingCount).toBeGreaterThan(0);
    expect(checklist.requiredInformationRequests.length).toBeGreaterThan(0);
  });
});
