import { NextResponse } from "next/server";
import { getAgentsOperationalOverview } from "../../../../../src/features/dashboard/get-agents-operational-overview";
import { hasDashboardSessionFromRequest } from "../../../../../src/lib/dashboard-auth";
import { hasOperationsAccess } from "../../../../../src/lib/operations-auth";

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const hasSession = hasDashboardSessionFromRequest(request);
  const hasOpsAccess = hasOperationsAccess(request);

  if (!hasSession && !hasOpsAccess) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  try {
    const payload = await getAgentsOperationalOverview();

    return NextResponse.json({
      correlationId,
      ...payload
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "agents_overview_unavailable",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
