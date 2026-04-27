import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getOperationsLiveOverviewMock } = vi.hoisted(() => ({
  getOperationsLiveOverviewMock: vi.fn()
}));

vi.mock("../src/features/dashboard/get-operations-live-overview", () => ({
  getOperationsLiveOverview: getOperationsLiveOverviewMock
}));

import { GET } from "../app/api/dashboard/operations-live/stream/route";

describe("GET /api/dashboard/operations-live/stream", () => {
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

  it("returns unauthorized when operations key is configured and request has no session", async () => {
    process.env.OPERATIONS_API_KEY = "secure-key";

    const response = await GET(new Request("http://localhost/api/dashboard/operations-live/stream"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns SSE stream when authorized", async () => {
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
        leadsHoje: 1,
        casosEmTriagem: 1,
        scoreJuridicoMedio: 80,
        conversaoPercentual: 50,
        slaConformidadePercentual: 95
      },
      agents: [],
      queue: { total: 0, items: [] },
      alerts: { total: 0, items: [] },
      modules: [],
      conversionByHour: []
    });

    const response = await GET(new Request("http://localhost/api/dashboard/operations-live/stream"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.body).toBeTruthy();

    await response.body?.cancel();
  });
});
