import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findWithClientByIdMock,
  updateConsentMock,
  findLatestByCaseIdAndTypeMock,
  requeueMock,
  updateStatusesMock,
  recordMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findWithClientByIdMock: vi.fn(),
  updateConsentMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  requeueMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  recordMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findWithClientById = findWithClientByIdMock;
    updateStatuses = updateStatusesMock;
  },
  ClientRepository: class {
    updateConsent = updateConsentMock;
  },
  WorkflowJobRepository: class {
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
    requeue = requeueMock;
  },
  AuditLogRepository: class {
    record = recordMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { POST } from "../app/api/intake/cases/[caseId]/consent/route";

describe("POST /api/intake/cases/[caseId]/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates consent and requeues blocked intake jobs", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findWithClientByIdMock.mockResolvedValueOnce({
      caseRecord: {
        id: "case-1"
      },
      clientRecord: {
        id: "client-1"
      }
    });
    updateConsentMock.mockResolvedValueOnce({
      id: "client-1",
      consentStatus: "granted"
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "job-1",
      status: "blocked"
    });
    requeueMock.mockResolvedValueOnce({
      id: "job-1",
      status: "queued"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-1/consent", {
      method: "POST",
      body: JSON.stringify({
        status: "granted",
        version: "v1",
        acceptedAt: "2026-04-25T15:00:00.000Z",
        captureMethod: "checkbox"
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
    expect(body.consentStatus).toBe("granted");
    expect(body.workflowJobStatus).toBe("queued");
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost/api/intake/cases/case-1/consent", {
      method: "POST",
      body: JSON.stringify({
        status: "invalid"
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

    expect(response.status).toBe(400);
  });

  it("keeps bootstrap blocked when consent is granted but human triage is still pending", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findWithClientByIdMock.mockResolvedValueOnce({
      caseRecord: {
        id: "case-2",
        legalStatus: "human_triage_pending"
      },
      clientRecord: {
        id: "client-2"
      }
    });
    updateConsentMock.mockResolvedValueOnce({
      id: "client-2",
      consentStatus: "granted"
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "job-2",
      status: "blocked"
    });
    recordMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/intake/cases/case-2/consent", {
      method: "POST",
      body: JSON.stringify({
        status: "granted",
        version: "v1",
        acceptedAt: "2026-04-25T15:00:00.000Z",
        captureMethod: "checkbox"
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workflowJobStatus).toBe("awaiting_human_triage");
    expect(requeueMock).not.toHaveBeenCalled();
  });
});
