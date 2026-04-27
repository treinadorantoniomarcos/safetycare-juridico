import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findScoreByCaseIdMock, getDatabaseClientMock } = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/score/route";

describe("GET /api/intake/cases/[caseId]/score", () => {
  it("returns legal score details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      viabilityScore: 83,
      complexity: "high",
      estimatedValueCents: 14500000,
      confidence: 82,
      reviewRequired: true,
      reviewReasons: ["high_complexity"],
      rationale: {
        inputs: ["triage", "clinical", "rights", "evidence"],
        notes: ["evidence_missing=2"]
      }
    });

    const response = await GET(new Request("http://localhost"), {
      params: {
        caseId: "case-1"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseStatus.legalStatus).toBe("human_review_required");
    expect(body.score.reviewRequired).toBe(true);
  });

  it("returns 404 when legal score is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
