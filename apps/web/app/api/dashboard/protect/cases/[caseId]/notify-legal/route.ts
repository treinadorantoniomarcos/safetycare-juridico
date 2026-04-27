import { agentIntelligenceTable, hospitalCasesTable, legalAlertsTable } from "@safetycare/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
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

  const { caseId } = await Promise.resolve(context.params);

  try {
    const { db } = getDatabaseClient();

    const [updatedCase] = await db
      .update(hospitalCasesTable)
      .set({
        status: "legal_review_pending"
      })
      .where(eq(hospitalCasesTable.id, caseId))
      .returning({
        id: hospitalCasesTable.id,
        status: hospitalCasesTable.status
      });

    if (!updatedCase) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    await Promise.all([
      db.insert(agentIntelligenceTable).values({
        caseId,
        squadName: "Legal_Desk",
        agentId: "manual.dispatch",
        findings: {
          event: "notify_legal",
          source: "protect_dashboard",
          at: new Date().toISOString()
        },
        recommendation: "Caso encaminhado para revisao juridica prioritaria."
      }),
      db.insert(legalAlertsTable).values({
        caseId,
        severity: "info",
        message: "Caso encaminhado ao juridico para revisao humana.",
        isResolved: false
      })
    ]);

    return NextResponse.json(
      {
        correlationId,
        status: "legal_notified",
        caseId: updatedCase.id
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "notify_legal_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
