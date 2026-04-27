import {
  agentIntelligenceTable,
  evidenceDocsTable,
  hospitalCasesTable,
  legalAlertsTable,
  patientJourneyTable,
  patientsTable
} from "@safetycare/database";
import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDatabaseClient } from "../../lib/database";

type ProtectAlertSeverity = "critical" | "warning" | "info";

export type ProtectOverview = {
  generatedAt: string;
  stats: {
    patientsTotal: number;
    activeCasesTotal: number;
    criticalAlertsTotal: number;
    legalReviewTotal: number;
  };
  selectedCase: {
    caseId: string;
    patientName: string;
    department: string;
    status: string;
    riskScore: number;
    admissionDate?: string;
  } | null;
  timeline: Array<{
    id: string;
    eventDate: string;
    eventType: string;
    description: string;
    riskLevel: string;
  }>;
  evidence: Array<{
    id: string;
    docType: string;
    validationStatus: string;
    gapDetails?: string;
    createdAt: string;
  }>;
  alerts: Array<{
    id: string;
    severity: ProtectAlertSeverity;
    message: string;
    isResolved: boolean;
    createdAt: string;
  }>;
  intelligence: Array<{
    id: string;
    squadName: string;
    agentId: string;
    recommendation?: string;
    createdAt: string;
  }>;
  dossier: {
    thesis: string;
    nexus: string;
    action: string;
  };
};

function normalizeSeverity(value: string): ProtectAlertSeverity {
  const normalized = value.trim().toLowerCase();

  if (normalized === "critical" || normalized === "alta") {
    return "critical";
  }

  if (normalized === "warning" || normalized === "medio" || normalized === "medio-alto") {
    return "warning";
  }

  return "info";
}

function toIso(value?: Date | null) {
  if (!value) {
    return undefined;
  }

  return value.toISOString();
}

export async function getProtectOverview(): Promise<ProtectOverview> {
  const { db } = getDatabaseClient();
  const now = new Date();

  const [patientsRows, activeCasesRows, legalReviewRows, criticalAlertsRows, selectedCaseRows] =
    await Promise.all([
      db.select({ total: count() }).from(patientsTable),
      db
        .select({ total: count() })
        .from(hospitalCasesTable)
        .where(
          inArray(hospitalCasesTable.status, [
            "active",
            "critical",
            "legal_review_pending",
            "legal_review_in_progress"
          ])
        ),
      db
        .select({ total: count() })
        .from(hospitalCasesTable)
        .where(inArray(hospitalCasesTable.status, ["legal_review_pending", "legal_review_in_progress"])),
      db
        .select({ total: count() })
        .from(legalAlertsTable)
        .where(
          and(
            eq(legalAlertsTable.isResolved, false),
            inArray(legalAlertsTable.severity, [
              "Critical",
              "critical",
              "HIGH",
              "high",
              "Alta",
              "alta"
            ])
          )
        ),
      db
        .select({
          caseId: hospitalCasesTable.id,
          department: hospitalCasesTable.department,
          status: hospitalCasesTable.status,
          riskScore: hospitalCasesTable.currentRiskScore,
          admissionDate: hospitalCasesTable.admissionDate,
          patientName: patientsTable.name
        })
        .from(hospitalCasesTable)
        .leftJoin(patientsTable, eq(hospitalCasesTable.patientId, patientsTable.id))
        .where(isNotNull(hospitalCasesTable.id))
        .orderBy(desc(hospitalCasesTable.currentRiskScore), desc(hospitalCasesTable.createdAt))
        .limit(1)
    ]);

  const selectedCase = selectedCaseRows[0];
  const selectedCaseId = selectedCase?.caseId;

  if (!selectedCaseId) {
    return {
      generatedAt: now.toISOString(),
      stats: {
        patientsTotal: Number(patientsRows[0]?.total ?? 0),
        activeCasesTotal: Number(activeCasesRows[0]?.total ?? 0),
        criticalAlertsTotal: Number(criticalAlertsRows[0]?.total ?? 0),
        legalReviewTotal: Number(legalReviewRows[0]?.total ?? 0)
      },
      selectedCase: null,
      timeline: [],
      evidence: [],
      alerts: [],
      intelligence: [],
      dossier: {
        thesis: "Sem caso selecionado para gerar tese de defesa.",
        nexus: "Sem dados suficientes para consolidar nexo causal.",
        action: "Cadastrar ou sincronizar casos hospitalares para ativar o modulo Protect."
      }
    };
  }

  const [timelineRows, evidenceRows, alertRows, intelligenceRows] = await Promise.all([
    db
      .select({
        id: patientJourneyTable.id,
        eventDate: patientJourneyTable.eventDate,
        eventType: patientJourneyTable.eventType,
        description: patientJourneyTable.description,
        riskLevel: patientJourneyTable.riskLevel
      })
      .from(patientJourneyTable)
      .where(eq(patientJourneyTable.caseId, selectedCaseId))
      .orderBy(asc(patientJourneyTable.eventDate))
      .limit(30),
    db
      .select({
        id: evidenceDocsTable.id,
        docType: evidenceDocsTable.docType,
        validationStatus: evidenceDocsTable.validationStatus,
        gapDetails: evidenceDocsTable.gapDetails,
        createdAt: evidenceDocsTable.createdAt
      })
      .from(evidenceDocsTable)
      .where(eq(evidenceDocsTable.caseId, selectedCaseId))
      .orderBy(desc(evidenceDocsTable.createdAt))
      .limit(20),
    db
      .select({
        id: legalAlertsTable.id,
        severity: legalAlertsTable.severity,
        message: legalAlertsTable.message,
        isResolved: legalAlertsTable.isResolved,
        createdAt: legalAlertsTable.createdAt
      })
      .from(legalAlertsTable)
      .where(eq(legalAlertsTable.caseId, selectedCaseId))
      .orderBy(desc(legalAlertsTable.createdAt))
      .limit(20),
    db
      .select({
        id: agentIntelligenceTable.id,
        squadName: agentIntelligenceTable.squadName,
        agentId: agentIntelligenceTable.agentId,
        findings: agentIntelligenceTable.findings,
        recommendation: agentIntelligenceTable.recommendation,
        createdAt: agentIntelligenceTable.createdAt
      })
      .from(agentIntelligenceTable)
      .where(eq(agentIntelligenceTable.caseId, selectedCaseId))
      .orderBy(desc(agentIntelligenceTable.createdAt))
      .limit(10)
  ]);

  const latestIntelligence = intelligenceRows[0];
  const findings =
    latestIntelligence && typeof latestIntelligence.findings === "object" && latestIntelligence.findings
      ? (latestIntelligence.findings as Record<string, unknown>)
      : {};

  const thesis =
    typeof findings.legal_thesis === "string"
      ? findings.legal_thesis
      : "Sem tese automatica consolidada para este caso.";
  const nexus =
    typeof findings.causal_nexus === "string"
      ? findings.causal_nexus
      : "Sem avaliacao de nexo causal registrada.";
  const action =
    latestIntelligence?.recommendation ??
    "Solicitar revisao humana para consolidar estrategia de defesa e evidencias.";

  return {
    generatedAt: now.toISOString(),
    stats: {
      patientsTotal: Number(patientsRows[0]?.total ?? 0),
      activeCasesTotal: Number(activeCasesRows[0]?.total ?? 0),
      criticalAlertsTotal: Number(criticalAlertsRows[0]?.total ?? 0),
      legalReviewTotal: Number(legalReviewRows[0]?.total ?? 0)
    },
    selectedCase: {
      caseId: selectedCase.caseId,
      patientName: selectedCase.patientName ?? "Paciente nao identificado",
      department: selectedCase.department,
      status: selectedCase.status,
      riskScore: selectedCase.riskScore,
      admissionDate: toIso(selectedCase.admissionDate)
    },
    timeline: timelineRows.map((row) => ({
      id: row.id,
      eventDate: row.eventDate.toISOString(),
      eventType: row.eventType,
      description: row.description ?? "Sem descricao registrada.",
      riskLevel: row.riskLevel
    })),
    evidence: evidenceRows.map((row) => ({
      id: row.id,
      docType: row.docType,
      validationStatus: row.validationStatus,
      gapDetails: row.gapDetails ?? undefined,
      createdAt: row.createdAt.toISOString()
    })),
    alerts: alertRows.map((row) => ({
      id: row.id,
      severity: normalizeSeverity(row.severity),
      message: row.message,
      isResolved: row.isResolved,
      createdAt: row.createdAt.toISOString()
    })),
    intelligence: intelligenceRows.map((row) => ({
      id: row.id,
      squadName: row.squadName,
      agentId: row.agentId,
      recommendation: row.recommendation ?? undefined,
      createdAt: row.createdAt.toISOString()
    })),
    dossier: {
      thesis,
      nexus,
      action
    }
  };
}
