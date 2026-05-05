import { getDatabaseClient } from "../../lib/database";
import {
  agentIntelligenceTable,
  evidenceDocsTable,
  hospitalCasesTable,
  patientsTable,
  patientJourneyTable
} from "@safetycare/database";
import { desc, eq } from "drizzle-orm";

export type ProtectOverview = {
  generatedAt: string;
  stats: {
    patientsTotal: number;
    activeCasesTotal: number;
    criticalAlertsTotal: number;
    legalReviewTotal: number;
  };
  timeline: Array<{
    id: string;
    eventDate: string;
    eventType: string;
    description: string | null;
    riskLevel: string;
  }>;
  evidence: Array<{
    id: string;
    docType: string;
    validationStatus: string;
    gapDetails: string | null;
  }>;
  alerts: Array<{
    id: string;
    severity: "critical" | "warning" | "info";
    message: string;
    isResolved: boolean;
    createdAt: string;
  }>;
  selectedCase: {
    caseId: string;
    patientName: string;
    department: string;
    riskScore: number;
    status: string;
    admissionDate: string;
  } | null;
  dossier: {
    thesis: string;
    nexus: string;
    action: string;
  };
};

export async function getProtectOverview(caseId?: string) {
  const { db } = getDatabaseClient();

  const [latestCase] = await db
    .select()
    .from(hospitalCasesTable)
    .orderBy(desc(hospitalCasesTable.createdAt))
    .limit(1);

  if (!latestCase) {
    throw new Error("Nenhum caso encontrado no sistema Protect.");
  }

  const patient = latestCase.patientId
    ? (
        await db
          .select()
          .from(patientsTable)
          .where(eq(patientsTable.id, latestCase.patientId))
          .limit(1)
      )[0]
    : undefined;

  const timeline = await db
    .select()
    .from(patientJourneyTable)
    .where(eq(patientJourneyTable.caseId, latestCase.id))
    .orderBy(patientJourneyTable.eventDate);

  const documents = await db
    .select()
    .from(evidenceDocsTable)
    .where(eq(evidenceDocsTable.caseId, latestCase.id));

  const intelligence = await db
    .select()
    .from(agentIntelligenceTable)
    .where(eq(agentIntelligenceTable.caseId, latestCase.id))
    .limit(1);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      patientsTotal: 1,
      activeCasesTotal: latestCase.status === "critical" ? 1 : 0,
      criticalAlertsTotal: 1,
      legalReviewTotal: intelligence.length > 0 ? 1 : 0
    },
    selectedCase: {
      caseId: latestCase.id,
      patientName: patient?.name || "Desconhecido",
      department: latestCase.department,
      riskScore: latestCase.currentRiskScore,
      status: latestCase.status,
      admissionDate: latestCase.admissionDate.toISOString()
    },
    timeline: timeline.map((event, index) => ({
      id: `${event.caseId}-${index}`,
      eventDate: event.eventDate.toISOString(),
      eventType: event.eventType,
      description: event.description,
      riskLevel: event.riskLevel
    })),
    evidence: documents.map((doc, index) => ({
      id: `${doc.caseId}-${index}`,
      docType: doc.docType,
      validationStatus: doc.validationStatus,
      gapDetails: doc.gapDetails
    })),
    alerts: [
      {
        id: `protect-alert-${latestCase.id}`,
        severity: "critical" as const,
        message: "RISCO JURIDICO ALTO: Atraso em diagnostico critico detectado no Caso SC-4920.",
        isResolved: false,
        createdAt: new Date().toISOString()
      }
    ],
    dossier: {
      thesis:
        typeof intelligence[0]?.findings === "object" && intelligence[0]?.findings
          ? ((intelligence[0]?.findings as Record<string, unknown>).legal_thesis as string) ||
            "Aguardando processamento do Squad Juridico..."
          : "Aguardando processamento do Squad Juridico...",
      nexus:
        typeof intelligence[0]?.findings === "object" && intelligence[0]?.findings
          ? ((intelligence[0]?.findings as Record<string, unknown>).causal_nexus as string) ||
            "Em analise..."
          : "Em analise...",
      action: intelligence[0]?.recommendation || "Aguardando recomendacao juridica."
    }
  } satisfies ProtectOverview;
}
