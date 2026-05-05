import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findWorkflowJobByIdMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
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
  it("blocks the stage while human analysis is pending", async () => {
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

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("processing");
  });

  it("allows the stage when the case is already released", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "intake"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });

    const result = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

    expect(result.status).toBe("ready");
  });
});
