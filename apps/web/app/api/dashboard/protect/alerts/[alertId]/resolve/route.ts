import { legalAlertsTable } from "@safetycare/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        alertId: string;
      }
    | Promise<{
        alertId: string;
      }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const { alertId } = await Promise.resolve(context.params);

  try {
    const { db } = getDatabaseClient();

    const [updated] = await db
      .update(legalAlertsTable)
      .set({
        isResolved: true
      })
      .where(eq(legalAlertsTable.id, alertId))
      .returning({
        id: legalAlertsTable.id,
        isResolved: legalAlertsTable.isResolved
      });

    if (!updated) {
      return NextResponse.json(
        {
          correlationId,
          error: "alert_not_found"
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        correlationId,
        status: "alert_resolved",
        alertId: updated.id
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "resolve_alert_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
