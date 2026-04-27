import { describe, expect, it, vi } from "vitest";

const { getIntakeQueueSummaryMock } = vi.hoisted(() => ({
  getIntakeQueueSummaryMock: vi.fn()
}));

vi.mock("../src/features/intake/get-intake-queue-summary", () => ({
  getIntakeQueueSummary: getIntakeQueueSummaryMock
}));

import { GET } from "../app/api/intake/queue/route";

describe("GET /api/intake/queue", () => {
  it("returns queue summary", async () => {
    getIntakeQueueSummaryMock.mockResolvedValueOnce({
      jobType: "intake.orchestrator.bootstrap",
      total: 5,
      summary: [
        {
          status: "queued",
          total: 4
        },
        {
          status: "blocked",
          total: 1
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/intake/queue"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(5);
    expect(body.summary).toHaveLength(2);
  });

  it("returns 500 when queue summary is unavailable", async () => {
    getIntakeQueueSummaryMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await GET(new Request("http://localhost/api/intake/queue"));

    expect(response.status).toBe(500);
  });
});
