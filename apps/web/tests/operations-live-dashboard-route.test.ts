import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getOperationsLiveOverviewMock } = vi.hoisted(() => ({
  getOperationsLiveOverviewMock: vi.fn()
}));

vi.mock("../src/features/dashboard/get-operations-live-overview", () => ({
  getOperationsLiveOverview: getOperationsLiveOverviewMock
}));

import { GET } from "../app/api/dashboard/operations-live/route";

describe("GET /api/dashboard/operations-live", () => {
  const originalOperationsApiKey = process.env.OPERATIONS_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPERATIONS_API_KEY;
  });

  afterAll(() => {
    if (originalOperationsApiKey === undefined) {
      delete process.env.OPERATIONS_API_KEY;
      return;
    }

    process.env.OPERATIONS_API_KEY = originalOperationsApiKey;
  });

  it("returns operations live payload", async () => {
    getOperationsLiveOverviewMock.mockResolvedValueOnce({
      generatedAt: "2026-04-27T00:00:00.000Z",
      systemOnline: true,
      refreshSeconds: 5,
      orchestrator: {
        name: "SAFETYCARE Orchestrator",
        status: "online",
        flow: ["capture", "triage"]
      },
      kpis: {
        leadsHoje: 5,
        casosEmTriagem: 3,
        scoreJuridicoMedio: 81.2,
        conversaoPercentual: 35.5,
        slaConformidadePercentual: 92.1
      },
      agents: [],
      queue: {
        total: 0,
        items: []
      },
      alerts: {
        total: 0,
        items: []
      },
      modules: [],
      conversionByHour: []
    });

    const response = await GET(new Request("http://localhost/api/dashboard/operations-live"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.systemOnline).toBe(true);
    expect(getOperationsLiveOverviewMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when operations key is configured and request is missing header", async () => {
    process.env.OPERATIONS_API_KEY = "secure-key";

    const response = await GET(new Request("http://localhost/api/dashboard/operations-live"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
    expect(getOperationsLiveOverviewMock).not.toHaveBeenCalled();
  });

  it("returns 500 when feature fails", async () => {
    getOperationsLiveOverviewMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await GET(new Request("http://localhost/api/dashboard/operations-live"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("operations_live_unavailable");
  });
});
