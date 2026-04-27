import { describe, expect, it, vi } from "vitest";

const { getCaseSlaAlertsMock } = vi.hoisted(() => ({
  getCaseSlaAlertsMock: vi.fn()
}));

vi.mock("../src/features/intake/get-case-sla-alerts", () => ({
  getCaseSlaAlerts: getCaseSlaAlertsMock
}));

import { GET } from "../app/api/intake/cases/sla/route";

describe("GET /api/intake/cases/sla", () => {
  it("returns SLA alerts payload", async () => {
    getCaseSlaAlertsMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-25T15:00:00.000Z"),
      statuses: ["human_review_required", "conversion_pending", "legal_execution_pending"],
      total: 2,
      breachTotal: 1,
      summary: [
        {
          status: "human_review_required",
          total: 1,
          breachTotal: 1,
          slaHours: 4
        },
        {
          status: "conversion_pending",
          total: 1,
          breachTotal: 0,
          slaHours: 12
        },
        {
          status: "legal_execution_pending",
          total: 0,
          breachTotal: 0,
          slaHours: 24
        }
      ],
      alerts: [
        {
          caseId: "case-1",
          legalStatus: "human_review_required",
          commercialStatus: "triaged",
          updatedAt: new Date("2026-04-25T09:00:00.000Z"),
          ageMinutes: 360,
          slaHours: 4,
          breach: true
        },
        {
          caseId: "case-2",
          legalStatus: "conversion_pending",
          commercialStatus: "conversion_pending",
          updatedAt: new Date("2026-04-25T11:00:00.000Z"),
          ageMinutes: 240,
          slaHours: 12,
          breach: false
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/intake/cases/sla?limit=25"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getCaseSlaAlertsMock).toHaveBeenCalledWith(25);
    expect(body.total).toBe(2);
    expect(body.breachTotal).toBe(1);
    expect(body.summary).toHaveLength(3);
    expect(body.alerts).toHaveLength(2);
    expect(body.correlationId).toEqual(expect.any(String));
  });

  it("returns 500 when SLA alerts are unavailable", async () => {
    getCaseSlaAlertsMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await GET(new Request("http://localhost/api/intake/cases/sla"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("case_sla_unavailable");
    expect(body.correlationId).toEqual(expect.any(String));
  });
});
