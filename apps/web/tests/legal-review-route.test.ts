import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findBriefByCaseIdMock,
  findLatestByCaseIdAndTypeMock,
  createOrGetMock,
  requeueMock,
  markBlockedMock,
  updateStatusesMock,
  recordAuditLogMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findBriefByCaseIdMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  createOrGetMock: vi.fn(),
  requeueMock: vi.fn(),
  markBlockedMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordAuditLogMock;
  },
  CaseRepository: class {
    findById = findCaseByIdMock;
    updateStatuses = updateStatusesMock;
  },
  LegalBriefInputRepository: class {
    findByCaseId = findBriefByCaseIdMock;
  },
  WorkflowJobRepository: class {
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
    createOrGet = createOrGetMock;
    requeue = requeueMock;
    markBlocked = markBlockedMock;
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

import { POST } from "../app/api/dashboard/protect/cases/[caseId]/legal-review/route";

const caseId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/dashboard/protect/cases/[caseId]/legal-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseClientMock.mockReturnValue({ db: {} });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
  });

  it("approves the review and queues legal execution", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce({
      id: "brief-1"
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce(undefined);
    updateStatusesMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "conversion_pending",
      legalStatus: "legal_execution_pending"
    });
    createOrGetMock.mockResolvedValueOnce({
      id: "job-1",
      jobType: "legal.execution",
      status: "queued"
    });
    recordAuditLogMock.mockResolvedValueOnce({ id: "audit-1" });

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          decision: "approve",
          reviewerId: "revisor-1",
          note: "Liberar para geracao."
        })
      }),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("approve");
    expect(body.workflowJob.status).toBe("queued");
    expect(updateStatusesMock).toHaveBeenCalledWith(caseId, {
      legalStatus: "legal_execution_pending"
    });
    expect(createOrGetMock).toHaveBeenCalledTimes(1);
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("rejects the review without queuing legal execution", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce({
      id: "brief-1"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    recordAuditLogMock.mockResolvedValueOnce({ id: "audit-2" });

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          decision: "reject",
          reviewerId: "revisor-2",
          note: "Aguardando ajuste."
        })
      }),
      {
        params: Promise.resolve({ caseId })
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("reject");
    expect(updateStatusesMock).toHaveBeenCalledWith(caseId, {
      legalStatus: "conversion_pending"
    });
    expect(createOrGetMock).not.toHaveBeenCalled();
    expect(requeueMock).not.toHaveBeenCalled();
  });

  it("requests complement and reopens the case for the client", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "legal_execution_pending",
      legalStatus: "legal_execution_pending"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce({
      id: "brief-1"
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "job-2",
      jobType: "legal.execution",
      status: "queued",
      payload: {
        stage: "legal_execution_pending"
      }
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    markBlockedMock.mockResolvedValueOnce({
      id: "job-2",
      jobType: "legal.execution",
      status: "blocked"
    });
    recordAuditLogMock.mockResolvedValueOnce({ id: "audit-3" });

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          decision: "request_changes",
          reviewerId: "revisor-3",
          note: "Faltam exames e comprovantes."
        })
      }),
      {
        params: Promise.resolve({ caseId })
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("request_changes");
    expect(updateStatusesMock).toHaveBeenCalledWith(caseId, {
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    expect(markBlockedMock).toHaveBeenCalledTimes(1);
    expect(createOrGetMock).not.toHaveBeenCalled();
  });
});
