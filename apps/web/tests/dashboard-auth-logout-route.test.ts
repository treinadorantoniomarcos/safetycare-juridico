import { describe, expect, it } from "vitest";
import { POST } from "../app/api/dashboard/auth/logout/route";

describe("POST /api/dashboard/auth/logout", () => {
  it("returns 200 and clears session cookie", async () => {
    const response = await POST();
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(body.status).toBe("logged_out");
    expect(setCookie).toContain("safetycare_dashboard_session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});

