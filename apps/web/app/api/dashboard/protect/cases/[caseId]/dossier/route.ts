import {
  agentIntelligenceTable,
  evidenceDocsTable,
  hospitalCasesTable,
  legalAlertsTable,
  patientJourneyTable,
  patientsTable
} from "@safetycare/database";
import { asc, desc, eq } from "drizzle-orm";
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

export async function GET(request: Request, context: RouteContext) {
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
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  try {
    const { db } = getDatabaseClient();

    const [caseRows, timelineRows, evidenceRows, intelligenceRows, alertRows] = await Promise.all([
      db
        .select({
          caseId: hospitalCasesTable.id,
          status: hospitalCasesTable.status,
          department: hospitalCasesTable.department,
          riskScore: hospitalCasesTable.currentRiskScore,
          patientName: patientsTable.name
        })
        .from(hospitalCasesTable)
        .leftJoin(patientsTable, eq(hospitalCasesTable.patientId, patientsTable.id))
        .where(eq(hospitalCasesTable.id, caseId))
        .limit(1),
      db
        .select({
          eventDate: patientJourneyTable.eventDate,
          eventType: patientJourneyTable.eventType,
          description: patientJourneyTable.description,
          riskLevel: patientJourneyTable.riskLevel
        })
        .from(patientJourneyTable)
        .where(eq(patientJourneyTable.caseId, caseId))
        .orderBy(asc(patientJourneyTable.eventDate))
        .limit(40),
      db
        .select({
          docType: evidenceDocsTable.docType,
          validationStatus: evidenceDocsTable.validationStatus,
          gapDetails: evidenceDocsTable.gapDetails
        })
        .from(evidenceDocsTable)
        .where(eq(evidenceDocsTable.caseId, caseId))
        .orderBy(desc(evidenceDocsTable.createdAt))
        .limit(30),
      db
        .select({
          squadName: agentIntelligenceTable.squadName,
          agentId: agentIntelligenceTable.agentId,
          findings: agentIntelligenceTable.findings,
          recommendation: agentIntelligenceTable.recommendation,
          createdAt: agentIntelligenceTable.createdAt
        })
        .from(agentIntelligenceTable)
        .where(eq(agentIntelligenceTable.caseId, caseId))
        .orderBy(desc(agentIntelligenceTable.createdAt))
        .limit(20),
      db
        .select({
          severity: legalAlertsTable.severity,
          message: legalAlertsTable.message,
          isResolved: legalAlertsTable.isResolved,
          createdAt: legalAlertsTable.createdAt
        })
        .from(legalAlertsTable)
        .where(eq(legalAlertsTable.caseId, caseId))
        .orderBy(desc(legalAlertsTable.createdAt))
        .limit(30)
    ]);

    const caseData = caseRows[0];

    if (!caseData) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    const latestIntelligence = intelligenceRows[0];
    const findings =
      latestIntelligence && typeof latestIntelligence.findings === "object" && latestIntelligence.findings
        ? (latestIntelligence.findings as Record<string, unknown>)
        : {};

    const payload = {
      correlationId,
      generatedAt: new Date().toISOString(),
      case: caseData,
      dossier: {
        thesis:
          typeof findings.legal_thesis === "string"
            ? findings.legal_thesis
            : "Sem tese automatica consolidada.",
        nexus:
          typeof findings.causal_nexus === "string"
            ? findings.causal_nexus
            : "Sem nexo causal consolidado pelo agente.",
        recommendation:
          latestIntelligence?.recommendation ??
          "Recomendado validar material probatorio com revisao humana."
      },
      timeline: timelineRows,
      evidence: evidenceRows,
      intelligence: intelligenceRows,
      alerts: alertRows
    };

    if (!download) {
      return NextResponse.json(payload, { status: 200 });
    }

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="safetycare-dossier-${caseId}.json"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "protect_dossier_unavailable",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
