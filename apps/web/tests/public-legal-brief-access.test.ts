import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findWorkflowJobByIdMock,
  findScoreByCaseIdMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
  },
  WorkflowJobRepository: class {
    findById = findWorkflowJobByIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { resolvePublicLegalBriefAccess } from "../src/features/intake/public-legal-brief-access";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

describe("Public legal brief access gate", () => {
  it("blocks the stage while the first score has not been generated", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening_pending",
      legalStatus: "human_triage_pending"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce(undefined);

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("processing");
  });

  it("waits for human classification when the first score exists but has not been reviewed", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "human_review_required"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 60,
      reviewRequired: true
    });

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("awaiting_human_score");
  });

  it("allows the stage when the first score is yellow", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "human_review_required"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 60,
      reviewRequired: true,
      decision: "yellow"
    });

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.classification.key).toBe("yellow");
    }
  });

  it("blocks the stage when the first score is red", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "human_review_required"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 30,
      reviewRequired: true,
      decision: "red"
    });

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("blocked");
  });
});
