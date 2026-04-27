import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findScoreByCaseIdMock,
  applyHumanReviewDecisionMock,
  updateStatusesMock,
  recordMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  applyHumanReviewDecisionMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  recordMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordMock;
  },
  CaseRepository: class {
    findById = findCaseByIdMock;
    updateStatuses = updateStatusesMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
    applyHumanReviewDecision = applyHumanReviewDecisionMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { POST } from "../app/api/intake/cases/[caseId]/score/review/route";

describe("POST /api/intake/cases/[caseId]/score/review", () => {
  it("approves score review and moves the case to conversion_pending", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      viabilityScore: 83,
      reviewRequired: true
    });
    applyHumanReviewDecisionMock.mockResolvedValueOnce({
      caseId: "case-1",
      reviewRequired: false,
      humanReviewDecision: "approve"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-1/score/review", {
      method: "POST",
      body: JSON.stringify({
        decision: "approve",
        reviewerId: "reviewer-1",
        note: "Seguir para conversao."
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request, {
      params: {
        caseId: "case-1"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applyHumanReviewDecisionMock).toHaveBeenCalledWith("case-1", {
      decision: "approve",
      reviewerId: "reviewer-1",
      note: "Seguir para conversao."
    });
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    expect(body.caseStatus.legalStatus).toBe("conversion_pending");
  });

  it("rejects score review and moves the case to score_rejected", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      viabilityScore: 41,
      reviewRequired: true
    });
    applyHumanReviewDecisionMock.mockResolvedValueOnce({
      caseId: "case-1",
      reviewRequired: false,
      humanReviewDecision: "reject"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "score_rejected",
      legalStatus: "score_rejected"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-1/score/review", {
      method: "POST",
      body: JSON.stringify({
        decision: "reject",
        reviewerId: "reviewer-2"
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request, {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "score_rejected",
      legalStatus: "score_rejected"
    });
    expect(body.caseStatus.commercialStatus).toBe("score_rejected");
  });

  it("returns 404 when the case does not exist", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-404/score/review", {
      method: "POST",
      body: JSON.stringify({
        decision: "approve",
        reviewerId: "reviewer-1"
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request, {
      params: {
        caseId: "case-404"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("case_not_found");
  });
});
