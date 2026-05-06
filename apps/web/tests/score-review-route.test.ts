import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findScoreByCaseIdMock,
  upsertScoreMock,
  applyHumanReviewDecisionMock,
  updateStatusesMock,
  recordMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  upsertScoreMock: vi.fn(),
  applyHumanReviewDecisionMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  recordMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn()
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
    upsert = upsertScoreMock;
    applyHumanReviewDecision = applyHumanReviewDecisionMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

vi.mock("../src/lib/dashboard-auth", () => ({
  hasDashboardSessionFromRequest: hasDashboardSessionFromRequestMock
}));

vi.mock("../src/lib/operations-auth", () => ({
  hasOperationsAccess: hasOperationsAccessMock
}));

import { POST } from "../app/api/intake/cases/[caseId]/score/review/route";

describe("POST /api/intake/cases/[caseId]/score/review", () => {
  it("classifies the score as green and moves the case to conversion_pending", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
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
      decision: "green"
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
        decision: "green",
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
      decision: "green",
      reviewerId: "reviewer-1",
      note: "Seguir para conversao."
    });
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    expect(body.caseStatus.legalStatus).toBe("conversion_pending");
  });

  it("creates a manual score seed when none exists yet", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-2",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce(undefined);
    upsertScoreMock.mockResolvedValueOnce({
      caseId: "case-2",
      viabilityScore: 60,
      reviewRequired: true
    });
    applyHumanReviewDecisionMock.mockResolvedValueOnce({
      caseId: "case-2",
      reviewRequired: true,
      decision: "yellow"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-2",
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-2/score/review", {
      method: "POST",
      body: JSON.stringify({
        decision: "yellow",
        reviewerId: "reviewer-4",
        note: "Faltam exames complementares."
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request, {
      params: {
        caseId: "case-2"
      }
    });

    expect(response.status).toBe(200);
    expect(upsertScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-2",
        viabilityScore: 60,
        complexity: "manual_classification",
        estimatedValueCents: 0,
        confidence: 100,
        reviewRequired: true
      })
    );
    expect(applyHumanReviewDecisionMock).toHaveBeenCalledWith("case-2", {
      decision: "yellow",
      reviewerId: "reviewer-4",
      note: "Faltam exames complementares."
    });
  });

  it("classifies the score as red and moves the case to score_rejected", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
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
      decision: "red"
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
        decision: "red",
        reviewerId: "reviewer-2",
        note: "Nao ha base juridica suficiente."
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
    expect(applyHumanReviewDecisionMock).toHaveBeenCalledWith("case-1", {
      decision: "red",
      reviewerId: "reviewer-2",
      note: "Nao ha base juridica suficiente."
    });
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "score_rejected",
      legalStatus: "score_rejected"
    });
    expect(body.caseStatus.commercialStatus).toBe("score_rejected");
  });

  it("classifies the score as yellow and moves the case back to conversion_pending", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      viabilityScore: 66,
      reviewRequired: true
    });
    applyHumanReviewDecisionMock.mockResolvedValueOnce({
      caseId: "case-1",
      reviewRequired: true,
      decision: "yellow"
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
        decision: "yellow",
        reviewerId: "reviewer-3",
        note: "Faltam exames complementares."
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
      decision: "yellow",
      reviewerId: "reviewer-3",
      note: "Faltam exames complementares."
    });
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    expect(body.caseStatus.legalStatus).toBe("conversion_pending");
  });

  it("returns 404 when the case does not exist", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
    findCaseByIdMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-404/score/review", {
      method: "POST",
      body: JSON.stringify({
        decision: "green",
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
