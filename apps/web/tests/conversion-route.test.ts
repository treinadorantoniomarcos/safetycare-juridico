import { beforeEach, describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, updateStatusesMock, createOrGetMock, recordMock, getDatabaseClientMock } =
  vi.hoisted(() => ({
    findCaseByIdMock: vi.fn(),
    updateStatusesMock: vi.fn(),
    createOrGetMock: vi.fn(),
    recordMock: vi.fn(),
    getDatabaseClientMock: vi.fn()
  }));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
    updateStatuses = updateStatusesMock;
  },
  WorkflowJobRepository: class {
    createOrGet = createOrGetMock;
  },
  AuditLogRepository: class {
    record = recordMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { POST } from "../app/api/intake/cases/[caseId]/conversion/route";

describe("POST /api/intake/cases/[caseId]/conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
  });

  it("records signed decision, updates status and enqueues legal execution job", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "retained",
      legalStatus: "legal_execution_pending"
    });
    createOrGetMock.mockResolvedValueOnce({
      id: "job-1",
      caseId: "case-1",
      jobType: "legal.execution",
      status: "queued",
      attemptCount: 0,
      runAfter: null,
      correlationId: "corr-1",
      payload: {
        stage: "legal_execution_pending",
        origin: "commercial.decision",
        decision: "signed"
      },
      createdAt: new Date("2026-04-25T15:00:00.000Z")
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-1/conversion", {
      method: "POST",
      body: JSON.stringify({
        decision: "signed",
        closerId: "closer-1",
        note: "Contrato assinado."
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
    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      commercialStatus: "retained",
      legalStatus: "legal_execution_pending"
    });
    expect(createOrGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        jobType: "legal.execution",
        status: "queued",
        correlationId: "case-1:legal.execution",
        payload: expect.objectContaining({
          stage: "legal_execution_pending",
          origin: "commercial.decision",
          decision: "signed",
          note: "Contrato assinado."
        })
      })
    );
    expect(body.decision).toBe("signed");
    expect(body.caseStatus.legalStatus).toBe("legal_execution_pending");
    expect(body.workflowJob.id).toBe("job-1");
  });

  it("records lost decision and closes case without creating legal execution job", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "closed_lost",
      legalStatus: "closed_lost"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-1/conversion", {
      method: "POST",
      body: JSON.stringify({
        decision: "lost",
        closerId: "closer-2"
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
      commercialStatus: "closed_lost",
      legalStatus: "closed_lost"
    });
    expect(createOrGetMock).not.toHaveBeenCalled();
    expect(body.decision).toBe("lost");
    expect(body.caseStatus.legalStatus).toBe("closed_lost");
    expect(body.workflowJob).toBeUndefined();
  });

  it("returns 404 when case does not exist", async () => {
    findCaseByIdMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-404/conversion", {
      method: "POST",
      body: JSON.stringify({
        decision: "lost",
        closerId: "closer-1"
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

  it("returns 409 when case is outside conversion_pending stage", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      commercialStatus: "triaged",
      legalStatus: "human_review_required"
    });

    const request = new Request("http://localhost/api/intake/cases/case-1/conversion", {
      method: "POST",
      body: JSON.stringify({
        decision: "signed",
        closerId: "closer-1"
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

    expect(response.status).toBe(409);
    expect(body.error).toBe("invalid_case_stage");
    expect(updateStatusesMock).not.toHaveBeenCalled();
    expect(createOrGetMock).not.toHaveBeenCalled();
  });
});
