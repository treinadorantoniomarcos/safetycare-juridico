import { describe, expect, it } from "vitest";
import { classifyCaseTriage, buildPatientJourneyTimeline } from "../src";

describe("buildPatientJourneyTimeline", () => {
  it("builds a structured timeline from a hospital narrative", () => {
    const triage = classifyCaseTriage({
      source: "form",
      message: "Minha mae ficou na UTI, passou por cirurgia e piorou apos a alta."
    });

    const timeline = buildPatientJourneyTimeline({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      message: "Minha mae ficou na UTI, passou por cirurgia e piorou apos a alta.",
      triage
    });

    expect(timeline.events.length).toBeGreaterThanOrEqual(3);
    expect(timeline.riskLevel).toBe("critical");
    expect(timeline.summary.toLowerCase()).toContain("jornada estruturada");
  });
});
