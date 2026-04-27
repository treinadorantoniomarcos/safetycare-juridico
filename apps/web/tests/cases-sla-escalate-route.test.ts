import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCaseSlaAlertsMock, recordMock, getDatabaseClientMock } = vi.hoisted(() => ({
  getCaseSlaAlertsMock: vi.fn(),
  recordMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("../src/features/intake/get-case-sla-alerts", () => ({
  getCaseSlaAlerts: getCaseSlaAlertsMock
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { POST } from "../app/api/intake/cases/sla/escalate/route";

describe("POST /api/intake/cases/sla/escalate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
  });

  it("returns counts for dryRun and does not write audit logs", async () => {
    getCaseSlaAlertsMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-25T15:00:00.000Z"),
      statuses: ["human_review_required", "conversion_pending", "legal_execution_pending"],
      total: 3,
      breachTotal: 2,
      summary: [],
      alerts: [
        {
          caseId: "case-1",
          legalStatus: "human_review_required",
          commercialStatus: "triaged",
          updatedAt: new Date("2026-04-25T09:00:00.000Z"),
          ageMinutes: 370,
          slaHours: 4,
          breach: true
        },
        {
          caseId: "case-2",
          legalStatus: "conversion_pending",
          commercialStatus: "conversion_pending",
          updatedAt: new Date("2026-04-25T13:00:00.000Z"),
          ageMinutes: 110,
          slaHours: 12,
          breach: false
        },
        {
          caseId: "case-3",
          legalStatus: "legal_execution_pending",
          commercialStatus: "retained",
          updatedAt: new Date("2026-04-24T09:00:00.000Z"),
          ageMinutes: 1800,
          slaHours: 24,
          breach: true
        }
      ]
    });

    const response = await POST(
      new Request("http://localhost/api/intake/cases/sla/escalate", {
        method: "POST",
        body: JSON.stringify({
          limit: 25,
          dryRun: true
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getCaseSlaAlertsMock).toHaveBeenCalledWith(25);
    expect(recordMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      dryRun: true,
      evaluatedTotal: 3,
      breachTotal: 2,
      escalatedTotal: 0,
      caseIds: ["case-1", "case-3"]
    });
    expect(body.correlationId).toEqual(expect.any(String));
  });

  it("writes one audit log per breached case when dryRun is false", async () => {
    getCaseSlaAlertsMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-25T15:00:00.000Z"),
      statuses: ["human_review_required", "conversion_pending", "legal_execution_pending"],
      total: 2,
      breachTotal: 2,
      summary: [],
      alerts: [
        {
          caseId: "case-a",
          legalStatus: "human_review_required",
          commercialStatus: "triaged",
          updatedAt: new Date("2026-04-25T08:00:00.000Z"),
          ageMinutes: 420,
          slaHours: 4,
          breach: true
        },
        {
          caseId: "case-b",
          legalStatus: "conversion_pending",
          commercialStatus: "conversion_pending",
          updatedAt: new Date("2026-04-24T12:00:00.000Z"),
          ageMinutes: 1620,
          slaHours: 12,
          breach: true
        }
      ]
    });
    recordMock.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/intake/cases/sla/escalate", {
        method: "POST",
        body: JSON.stringify({
          dryRun: false
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getCaseSlaAlertsMock).toHaveBeenCalledWith(undefined);
    expect(recordMock).toHaveBeenCalledTimes(2);
    expect(recordMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        caseId: "case-a",
        actorType: "system",
        actorId: "sla-monitor",
        action: "sla.escalation_triggered",
        correlationId: body.correlationId,
        afterPayload: {
          legalStatus: "human_review_required",
          commercialStatus: "triaged",
          ageMinutes: 420,
          slaHours: 4
        }
      })
    );
    expect(recordMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        caseId: "case-b",
        actorType: "system",
        actorId: "sla-monitor",
        action: "sla.escalation_triggered",
        correlationId: body.correlationId,
        afterPayload: {
          legalStatus: "conversion_pending",
          commercialStatus: "conversion_pending",
          ageMinutes: 1620,
          slaHours: 12
        }
      })
    );
    expect(body).toMatchObject({
      dryRun: false,
      evaluatedTotal: 2,
      breachTotal: 2,
      escalatedTotal: 2,
      caseIds: ["case-a", "case-b"]
    });
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/intake/cases/sla/escalate", {
        method: "POST",
        body: JSON.stringify({
          dryRun: "true"
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
    expect(getCaseSlaAlertsMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("returns 500 when escalation execution fails", async () => {
    getCaseSlaAlertsMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await POST(
      new Request("http://localhost/api/intake/cases/sla/escalate", {
        method: "POST"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("sla_escalation_failed");
    expect(body.correlationId).toEqual(expect.any(String));
  });
});
