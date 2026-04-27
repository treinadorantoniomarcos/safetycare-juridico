import { describe, expect, it, vi } from "vitest";

const {
  findWithClientByIdMock,
  findLatestByCaseIdAndTypeMock,
  updateStatusesMock,
  requeueMock,
  markCompletedMock,
  recordMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findWithClientByIdMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  requeueMock: vi.fn(),
  markCompletedMock: vi.fn(),
  recordMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findWithClientById = findWithClientByIdMock;
    updateStatuses = updateStatusesMock;
  },
  WorkflowJobRepository: class {
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
    requeue = requeueMock;
    markCompleted = markCompletedMock;
  },
  AuditLogRepository: class {
    record = recordMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { POST } from "../app/api/intake/cases/[caseId]/human-triage/route";

describe("POST /api/intake/cases/[caseId]/human-triage", () => {
  it("approves human triage and requeues bootstrap job", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findWithClientByIdMock.mockResolvedValueOnce({
      caseRecord: {
        id: "case-1",
        commercialStatus: "screening_pending",
        legalStatus: "human_triage_pending"
      },
      clientRecord: {
        consentStatus: "granted"
      }
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "job-1",
      status: "blocked"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "screening",
      legalStatus: "intake"
    });
    requeueMock.mockResolvedValueOnce({
      id: "job-1",
      status: "queued"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const response = await POST(
      new Request("http://localhost/api/intake/cases/case-1/human-triage", {
        method: "POST",
        body: JSON.stringify({
          decision: "approve",
          reviewerId: "ops.user",
          note: "Aprovar para iniciar fluxo."
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: {
          caseId: "case-1"
        }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("approve");
    expect(body.workflowJobStatus).toBe("queued");
    expect(requeueMock).toHaveBeenCalledWith("job-1");
  });

  it("rejects human triage and finalizes bootstrap job", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findWithClientByIdMock.mockResolvedValueOnce({
      caseRecord: {
        id: "case-2",
        commercialStatus: "screening_pending",
        legalStatus: "human_triage_pending"
      },
      clientRecord: {
        consentStatus: "granted"
      }
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "job-2",
      status: "blocked"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-2",
      commercialStatus: "closed_lost",
      legalStatus: "closed_lost"
    });
    markCompletedMock.mockResolvedValueOnce({
      id: "job-2",
      status: "completed"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const response = await POST(
      new Request("http://localhost/api/intake/cases/case-2/human-triage", {
        method: "POST",
        body: JSON.stringify({
          decision: "reject",
          reviewerId: "ops.user",
          note: "Caso fora da tese."
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          caseId: "case-2"
        })
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("reject");
    expect(body.workflowJobStatus).toBe("completed");
    expect(markCompletedMock).toHaveBeenCalledTimes(1);
  });
});
