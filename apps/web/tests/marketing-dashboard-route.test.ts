import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getMarketingOverviewMock } = vi.hoisted(() => ({
  getMarketingOverviewMock: vi.fn()
}));

vi.mock("../src/features/dashboard/get-marketing-overview", () => ({
  getMarketingOverview: getMarketingOverviewMock
}));

import { GET } from "../app/api/dashboard/marketing/route";

describe("GET /api/dashboard/marketing", () => {
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

  it("returns dashboard payload", async () => {
    getMarketingOverviewMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-26T00:00:00.000Z"),
      periodDays: 30,
      since: new Date("2026-03-27T00:00:00.000Z"),
      funnel: [{ stage: "Leads recebidos", total: 10 }],
      sources: [{ source: "site", total: 7 }],
      utm: [{ landing: "landing_home", utmSource: "google", utmMedium: "cpc", utmCampaign: "safetycare", total: 3 }],
      legalStatuses: [{ legalStatus: "conversion_pending", total: 2 }]
    });

    const response = await GET(new Request("http://localhost/api/dashboard/marketing?days=30"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.periodDays).toBe(30);
    expect(getMarketingOverviewMock).toHaveBeenCalledWith(30);
  });

  it("returns 401 when operations key is configured and request is missing header", async () => {
    process.env.OPERATIONS_API_KEY = "secure-key";

    const response = await GET(new Request("http://localhost/api/dashboard/marketing"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
    expect(getMarketingOverviewMock).not.toHaveBeenCalled();
  });

  it("returns 500 when feature fails", async () => {
    getMarketingOverviewMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await GET(new Request("http://localhost/api/dashboard/marketing"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("marketing_dashboard_unavailable");
  });
});

