import { describe, expect, it, vi } from "vitest";

const { trackIntakeConversionEventMock } = vi.hoisted(() => ({
  trackIntakeConversionEventMock: vi.fn()
}));

vi.mock("../src/features/intake/track-intake-conversion-event", () => ({
  trackIntakeConversionEvent: trackIntakeConversionEventMock
}));

import { POST } from "../app/api/intake/conversion-event/route";

describe("POST /api/intake/conversion-event", () => {
  it("returns accepted payload when conversion event is recorded", async () => {
    trackIntakeConversionEventMock.mockResolvedValueOnce({
      eventId: "event-id",
      action: "marketing.lead_submitted"
    });

    const response = await POST(
      new Request("http://localhost/api/intake/conversion-event", {
        method: "POST",
        body: JSON.stringify({
          caseId: "11111111-1111-4111-8111-111111111111",
          eventName: "lead_submitted",
          source: "landing_home"
        }),
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.status).toBe("accepted");
    expect(body.eventId).toBe("event-id");
    expect(trackIntakeConversionEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/intake/conversion-event", {
        method: "POST",
        body: "{"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_json");
  });

  it("returns 400 for invalid payload", async () => {
    const zodLikeError = Object.assign(new Error("invalid"), {
      name: "ZodError"
    });

    trackIntakeConversionEventMock.mockRejectedValueOnce(zodLikeError);

    const response = await POST(
      new Request("http://localhost/api/intake/conversion-event", {
        method: "POST",
        body: JSON.stringify({ eventName: "bad-value" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });
});

