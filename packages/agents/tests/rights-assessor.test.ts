import { describe, expect, it } from "vitest";
import {
  analyzeClinicalSignals,
  assessPatientRights,
  buildPatientJourneyTimeline,
  classifyCaseTriage
} from "../src";

describe("assessPatientRights", () => {
  it("marks rights risks when narrative has severe continuity and safety signals", () => {
    const message = "Minha mae ficou na UTI, fez cirurgia, teve alta sem orientacao e piorou em casa.";
    const triage = classifyCaseTriage({
      source: "form",
      message
    });
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

    expect(rights.violationCount).toBeGreaterThan(0);
    expect(
      rights.rights.find((item) => item.rightKey === "patient_safety")?.status
    ).toBe("possible_violation");
  });
});
