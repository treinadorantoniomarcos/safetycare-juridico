import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimMock,
  findByIdMock,
  updateStatusesMock,
  markBlockedMock,
  markCompletedMock,
  markFailedMock,
  recordMock
} = vi.hoisted(() => ({
  claimMock: vi.fn(),
  findByIdMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  markBlockedMock: vi.fn(),
  markCompletedMock: vi.fn(),
  markFailedMock: vi.fn(),
  recordMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  WorkflowJobRepository: class {
    claim = claimMock;
    markBlocked = markBlockedMock;
    markCompleted = markCompletedMock;
    markFailed = markFailedMock;
  },
  CaseRepository: class {
    findById = findByIdMock;
    updateStatuses = updateStatusesMock;
  },
  AuditLogRepository: class {
    record = recordMock;
  },
  TriageAnalysisRepository: class {},
  JourneyTimelineRepository: class {},
  ClinicalAnalysisRepository: class {},
  RightsAssessmentRepository: class {},
  EvidenceChecklistRepository: class {},
  LegalScoreRepository: class {}
}));

vi.mock("@safetycare/observability", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

import { runLegalExecution } from "../src/index";

describe("runLegalExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts legal execution when case is pending", async () => {
    claimMock.mockResolvedValueOnce({
      id: "job-1",
      caseId: "case-1",
      correlationId: "corr-1"
    });
    findByIdMock.mockResolvedValueOnce({
      id: "case-1",
      legalStatus: "legal_execution_pending"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      legalStatus: "legal_execution_in_progress"
    });
    markCompletedMock.mockResolvedValueOnce(undefined);
    recordMock.mockResolvedValue(undefined);

    const result = await runLegalExecution({} as never, "job-1");

    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      legalStatus: "legal_execution_in_progress"
    });
    expect(markCompletedMock).toHaveBeenCalledWith("job-1", {
      stage: "legal_execution_in_progress"
    });
    expect(result.status).toBe("completed");
    expect(result.nextStage).toBe("legal_execution_in_progress");
  });

  it("blocks execution when case is not in pending stage", async () => {
    claimMock.mockResolvedValueOnce({
      id: "job-2",
      caseId: "case-2",
      correlationId: "corr-2"
    });
    findByIdMock.mockResolvedValueOnce({
      id: "case-2",
      legalStatus: "triaged"
    });
    markBlockedMock.mockResolvedValueOnce(undefined);
    recordMock.mockResolvedValue(undefined);

    const result = await runLegalExecution({} as never, "job-2");

    expect(markBlockedMock).toHaveBeenCalledTimes(1);
    expect(updateStatusesMock).not.toHaveBeenCalled();
    expect(result.status).toBe("blocked");
    expect(result.nextStage).toBe("legal_execution_pending");
  });
});
