import { describe, expect, it, vi } from "vitest";

const { getIntakeQueueSummaryMock } = vi.hoisted(() => ({
  getIntakeQueueSummaryMock: vi.fn()
}));

vi.mock("../src/features/intake/get-intake-queue-summary", () => ({
  getIntakeQueueSummary: getIntakeQueueSummaryMock
}));

import { GET } from "../app/api/health/route";

describe("health route", () => {
  it("returns ok status with queue summary", async () => {
    getIntakeQueueSummaryMock.mockResolvedValueOnce({
      jobType: "intake.orchestrator.bootstrap",
      total: 3,
      summary: [
        {
          status: "queued",
          total: 3
        }
      ]
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.queueSummary).toEqual([
      {
        status: "queued",
        total: 3
      }
    ]);
  });

  it("returns degraded when dependencies are unavailable", async () => {
    getIntakeQueueSummaryMock.mockRejectedValueOnce(
      new Error("Missing required environment variable: DATABASE_URL")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });
});
