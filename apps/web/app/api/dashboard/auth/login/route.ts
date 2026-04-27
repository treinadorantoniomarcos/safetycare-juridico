import { z } from "zod";
import { NextResponse } from "next/server";
import {
  createDashboardSessionToken,
  dashboardSessionCookieName,
  dashboardSessionTtlSeconds,
  isDashboardAuthConfigured,
  validateDashboardCredentials
} from "../../../../../src/lib/dashboard-auth";

const dashboardLoginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200)
});

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  if (!isDashboardAuthConfigured()) {
    return NextResponse.json(
      {
        correlationId,
        error: "dashboard_auth_not_configured"
      },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_json"
      },
      { status: 400 }
    );
  }

  try {
    const { username, password } = dashboardLoginSchema.parse(payload);
    const authenticated = validateDashboardCredentials(username, password);

    if (!authenticated) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_credentials"
        },
        { status: 401 }
      );
    }

    const token = createDashboardSessionToken();

    if (!token) {
      return NextResponse.json(
        {
          correlationId,
          error: "dashboard_auth_not_configured"
        },
        { status: 503 }
      );
    }

    const response = NextResponse.json(
      {
        correlationId,
        status: "authenticated"
      },
      { status: 200 }
    );

    response.cookies.set({
      name: dashboardSessionCookieName,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: dashboardSessionTtlSeconds,
      path: "/"
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_payload"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        correlationId,
        error: "dashboard_login_failed"
      },
      { status: 500 }
    );
  }
}
