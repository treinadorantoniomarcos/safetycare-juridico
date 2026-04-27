import { describe, expect, it, vi } from "vitest";

const {
  isDashboardAuthConfiguredMock,
  validateDashboardCredentialsMock,
  createDashboardSessionTokenMock
} = vi.hoisted(() => ({
  isDashboardAuthConfiguredMock: vi.fn(),
  validateDashboardCredentialsMock: vi.fn(),
  createDashboardSessionTokenMock: vi.fn()
}));

vi.mock("../src/lib/dashboard-auth", () => ({
  dashboardSessionCookieName: "safetycare_dashboard_session",
  dashboardSessionTtlSeconds: 28800,
  isDashboardAuthConfigured: isDashboardAuthConfiguredMock,
  validateDashboardCredentials: validateDashboardCredentialsMock,
  createDashboardSessionToken: createDashboardSessionTokenMock
}));

import { POST } from "../app/api/dashboard/auth/login/route";

describe("POST /api/dashboard/auth/login", () => {
  it("returns 503 when auth is not configured", async () => {
    isDashboardAuthConfiguredMock.mockReturnValueOnce(false);

    const response = await POST(
      new Request("http://localhost/api/dashboard/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "admin",
          password: "secret"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("dashboard_auth_not_configured");
  });

  it("returns 401 for invalid credentials", async () => {
    isDashboardAuthConfiguredMock.mockReturnValueOnce(true);
    validateDashboardCredentialsMock.mockReturnValueOnce(false);

    const response = await POST(
      new Request("http://localhost/api/dashboard/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "admin",
          password: "wrong"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("invalid_credentials");
  });

  it("returns 200 and sets session cookie when credentials are valid", async () => {
    isDashboardAuthConfiguredMock.mockReturnValueOnce(true);
    validateDashboardCredentialsMock.mockReturnValueOnce(true);
    createDashboardSessionTokenMock.mockReturnValueOnce("token.value");

    const response = await POST(
      new Request("http://localhost/api/dashboard/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "admin",
          password: "correct"
        })
      })
    );
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(body.status).toBe("authenticated");
    expect(setCookie).toContain("safetycare_dashboard_session=token.value");
  });
});

