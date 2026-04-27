import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchSlaNotificationsMock } = vi.hoisted(() => ({
  dispatchSlaNotificationsMock: vi.fn()
}));

vi.mock("../src/features/intake/dispatch-sla-notifications", () => ({
  dispatchSlaNotifications: dispatchSlaNotificationsMock
}));

import { POST } from "../app/api/intake/notifications/dispatch/route";

describe("POST /api/intake/notifications/dispatch", () => {
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

  it("returns dispatch summary in dry run mode", async () => {
    dispatchSlaNotificationsMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-26T10:00:00.000Z"),
      dryRun: true,
      windowHours: 24,
      evaluatedTotal: 4,
      pendingTotal: 2,
      dispatchedTotal: 0,
      caseIds: ["case-1", "case-2"]
    });

    const response = await POST(
      new Request("http://localhost/api/intake/notifications/dispatch", {
        method: "POST",
        body: JSON.stringify({
          dryRun: true,
          limit: 50,
          windowHours: 24
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(dispatchSlaNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        dryRun: true,
        limit: 50,
        windowHours: 24
      })
    );
    expect(body.pendingTotal).toBe(2);
    expect(body.dispatchedTotal).toBe(0);
  });

  it("returns dispatch summary in real mode", async () => {
    dispatchSlaNotificationsMock.mockResolvedValueOnce({
      generatedAt: new Date("2026-04-26T10:05:00.000Z"),
      dryRun: false,
      windowHours: 12,
      evaluatedTotal: 3,
      pendingTotal: 2,
      dispatchedTotal: 2,
      caseIds: ["case-3", "case-4"]
    });

    const response = await POST(
      new Request("http://localhost/api/intake/notifications/dispatch", {
        method: "POST",
        body: JSON.stringify({
          dryRun: false,
          windowHours: 12
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dispatchedTotal).toBe(2);
    expect(body.caseIds).toEqual(["case-3", "case-4"]);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/intake/notifications/dispatch", {
        method: "POST",
        body: JSON.stringify({
          dryRun: "yes"
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
    expect(dispatchSlaNotificationsMock).not.toHaveBeenCalled();
  });

  it("returns 500 when dispatch fails", async () => {
    dispatchSlaNotificationsMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await POST(
      new Request("http://localhost/api/intake/notifications/dispatch", {
        method: "POST"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("notifications_dispatch_failed");
  });

  it("returns 401 when operations api key is configured and header is missing", async () => {
    process.env.OPERATIONS_API_KEY = "super-secret-key";

    const response = await POST(
      new Request("http://localhost/api/intake/notifications/dispatch", {
        method: "POST"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
    expect(dispatchSlaNotificationsMock).not.toHaveBeenCalled();
  });
});
