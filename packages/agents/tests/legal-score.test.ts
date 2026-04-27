import { describe, expect, it } from "vitest";
import {
  analyzeClinicalSignals,
  assessPatientRights,
  buildEvidenceChecklist,
  buildPatientJourneyTimeline,
  calculateLegalScore,
  classifyCaseTriage
} from "../src";

describe("calculateLegalScore", () => {
  it("returns legal score with review gate when complexity and gaps are high", () => {
    const message = "Plano negou cirurgia, houve atraso, alta e piora clinica em seguida.";
    const triage = classifyCaseTriage({ source: "whatsapp", message });
    const journey = buildPatientJourneyTimeline({
      caseId: "22222222-2222-4222-8222-222222222222",
      source: "whatsapp",
      message,
      triage
    });
    const clinical = analyzeClinicalSignals({
      caseId: journey.caseId,
      source: "whatsapp",
      journey,
      triage
    });
    const rights = assessPatientRights({
      caseId: journey.caseId,
      source: "whatsapp",
      message,
      consentStatus: "granted",
      triage,
      journey,
      clinical
    });
    const evidence = buildEvidenceChecklist({
      caseId: journey.caseId,
      source: "whatsapp",
      triage,
      journey,
      clinical,
      rights
    });

    const score = calculateLegalScore({
      caseId: journey.caseId,
      triage,
      clinical,
      rights,
      evidence
    });

    expect(score.viabilityScore).toBeGreaterThanOrEqual(0);
    expect(score.reviewRequired).toBe(true);
    expect(score.reviewReasons.length).toBeGreaterThan(0);
    expect(score.strategicLegalGuidance?.statutoryReferences.length).toBeGreaterThan(0);
    expect(score.strategicLegalGuidance?.oabMarketing.references.length).toBeGreaterThan(0);
    expect(score.reviewReasons).toContain("essential_sources_not_verified");
    expect(score.strategicLegalGuidance?.sourceAccessControl.canDraftProceduralPiece).toBe(false);
    expect(
      score.strategicLegalGuidance?.sourceAccessControl.inaccessibleEssentialSources.length
    ).toBeGreaterThan(0);
    expect(score.rationale.legalAuthorities.length).toBeGreaterThan(0);
    expect(score.rationale.claimValueRecommendation.suggestedClaimValueCents).toBeGreaterThan(0);
    expect(score.rationale.draftingStyleGuide.voice).toBe("specialist_health_lawyer");
  });
});
