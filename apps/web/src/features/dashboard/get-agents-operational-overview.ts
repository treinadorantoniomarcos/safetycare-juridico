import {
  agentIntelligenceTable,
  casesTable,
  clinicalAnalysesTable,
  evidenceChecklistsTable,
  journeyTimelinesTable,
  legalScoresTable,
  rightsAssessmentsTable,
  triageAnalysesTable,
  workflowJobsTable
} from "@safetycare/database";
import { and, count, desc, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  getOperationsLiveOverview,
  type AgentCardOverview,
  type DashboardAgentStatus
} from "./get-operations-live-overview";
import { getDatabaseClient } from "../../lib/database";

type CasePhaseStatus =
  | "not_started"
  | "pending"
  | "running"
  | "blocked"
  | "completed"
  | "review_required"
  | "manual"
  | "error";

export type CasePhaseItem = {
  key: string;
  label: string;
  status: CasePhaseStatus;
};

export type CaseOperationalItem = {
  caseId: string;
  caseType: string | null;
  priority: string;
  urgency: string;
  commercialStatus: string;
  legalStatus: string;
  updatedAt: string;
  progressPercent: number;
  phases: CasePhaseItem[];
};

export type PhaseMetricsItem = {
  key: string;
  label: string;
  totalCases: number;
  completed: number;
  inProgress: number;
  reviewRequired: number;
  blockedOrError: number;
  notStarted: number;
  completionPercent: number;
};

export type IntelligenceMetrics = {
  recordsTotal: number;
  casesWithIntelligence: number;
  recordsLast24h: number;
  humanActionsLast24h: number;
  topSquads: Array<{
    squadName: string;
    total: number;
  }>;
};

export type AgentsOperationalOverview = {
  generatedAt: string;
  orchestrator: {
    name: string;
    status: CasePhaseStatus;
    flow: string[];
  };
  agents: Array<Omit<AgentCardOverview, "status"> & { status: CasePhaseStatus }>;
  intelligence: IntelligenceMetrics;
  phases: PhaseMetricsItem[];
  cases: CaseOperationalItem[];
};

type PhaseDefinition = {
  key: string;
  label: string;
};

const phaseDefinitions: PhaseDefinition[] = [
  { key: "capture", label: "Captação" },
  { key: "triage", label: "Triagem" },
  { key: "journey", label: "Jornada" },
  { key: "clinical", label: "Análise Clínica" },
  { key: "rights", label: "Direitos do Paciente" },
  { key: "evidence", label: "Prova" },
  { key: "risk_score", label: "Score Jurídico" },
  { key: "human_review", label: "Revisão Humana" },
  { key: "conversion", label: "Conversão" },
  { key: "legal_execution", label: "Execução Jurídica" },
  { key: "monitoring", label: "Monitoramento" }
];

function mapDashboardAgentStatus(status: DashboardAgentStatus): CasePhaseStatus {
  switch (status) {
    case "online":
      return "running";
    case "revisao":
      return "review_required";
    case "fila":
      return "pending";
    case "bloqueado":
      return "blocked";
    case "erro":
      return "error";
    default:
      return "not_started";
  }
}

function mapWorkflowJobStatus(
  workflowStatus: string | undefined,
  hasArtifact: boolean
): CasePhaseStatus {
  if (hasArtifact) {
    return "completed";
  }

  switch (workflowStatus) {
    case "queued":
      return "pending";
    case "processing":
      return "running";
    case "blocked":
      return "blocked";
    case "completed":
      return "completed";
    case "failed":
      return "error";
    default:
      return "not_started";
  }
}

function normalizePercent(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(safe)));
}

function statusForConversion(commercialStatus: string, legalStatus: string): CasePhaseStatus {
  if (commercialStatus === "conversion_pending" || legalStatus === "conversion_pending") {
    return "manual";
  }

  if (
    commercialStatus === "retained" ||
    commercialStatus === "closed_lost" ||
    legalStatus === "closed_lost" ||
    legalStatus === "legal_execution_pending" ||
    legalStatus === "legal_execution_active"
  ) {
    return "completed";
  }

  return "not_started";
}

function statusForMonitoring(legalStatus: string): CasePhaseStatus {
  if (legalStatus === "legal_execution_active" || legalStatus === "legal_execution_pending") {
    return "running";
  }

  if (legalStatus === "closed_lost") {
    return "completed";
  }

  return "not_started";
}

function statusForHumanReview(reviewRequired: boolean, decision: string | null): CasePhaseStatus {
  if (reviewRequired && !decision) {
    return "review_required";
  }

  if (reviewRequired && decision) {
    return "completed";
  }

  return "not_started";
}

function computeProgress(phases: CasePhaseItem[]) {
  const completed = phases.filter((item) => item.status === "completed").length;
  return normalizePercent((completed / phases.length) * 100);
}

function statusToMetricsBucket(status: CasePhaseStatus) {
  if (status === "completed") {
    return "completed";
  }

  if (status === "review_required") {
    return "reviewRequired";
  }

  if (status === "blocked" || status === "error") {
    return "blockedOrError";
  }

  if (status === "pending" || status === "running" || status === "manual") {
    return "inProgress";
  }

  return "notStarted";
}

export async function getAgentsOperationalOverview(): Promise<AgentsOperationalOverview> {
  const { db } = getDatabaseClient();
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const operations = await getOperationsLiveOverview();

  const recentCases = await db
    .select({
      id: casesTable.id,
      caseType: casesTable.caseType,
      priority: casesTable.priority,
      urgency: casesTable.urgency,
      commercialStatus: casesTable.commercialStatus,
      legalStatus: casesTable.legalStatus,
      updatedAt: casesTable.updatedAt
    })
    .from(casesTable)
    .orderBy(desc(casesTable.updatedAt))
    .limit(25);

  const caseIds = recentCases.map((item) => item.id);

  const [
    triageRows,
    journeyRows,
    clinicalRows,
    rightsRows,
    evidenceRows,
    scoreRows,
    workflowRows,
    intelligenceTotalRows,
    intelligenceCasesRows,
    intelligenceLast24Rows,
    topSquadsRows
  ] = caseIds.length
    ? await Promise.all([
        db
          .select({ caseId: triageAnalysesTable.caseId })
          .from(triageAnalysesTable)
          .where(inArray(triageAnalysesTable.caseId, caseIds)),
        db
          .select({ caseId: journeyTimelinesTable.caseId })
          .from(journeyTimelinesTable)
          .where(inArray(journeyTimelinesTable.caseId, caseIds)),
        db
          .select({ caseId: clinicalAnalysesTable.caseId })
          .from(clinicalAnalysesTable)
          .where(inArray(clinicalAnalysesTable.caseId, caseIds)),
        db
          .select({ caseId: rightsAssessmentsTable.caseId })
          .from(rightsAssessmentsTable)
          .where(inArray(rightsAssessmentsTable.caseId, caseIds)),
        db
          .select({ caseId: evidenceChecklistsTable.caseId })
          .from(evidenceChecklistsTable)
          .where(inArray(evidenceChecklistsTable.caseId, caseIds)),
        db
          .select({
            caseId: legalScoresTable.caseId,
            reviewRequired: legalScoresTable.reviewRequired,
            decision: legalScoresTable.decision
          })
          .from(legalScoresTable)
          .where(inArray(legalScoresTable.caseId, caseIds)),
        db
          .select({
            caseId: workflowJobsTable.caseId,
            jobType: workflowJobsTable.jobType,
            status: workflowJobsTable.status,
            createdAt: workflowJobsTable.createdAt
          })
          .from(workflowJobsTable)
          .where(and(isNotNull(workflowJobsTable.caseId), inArray(workflowJobsTable.caseId, caseIds))),
        db.select({ total: count() }).from(agentIntelligenceTable),
        db
          .select({
            total: sql<number>`count(distinct ${agentIntelligenceTable.caseId})`
          })
          .from(agentIntelligenceTable)
          .where(isNotNull(agentIntelligenceTable.caseId)),
        db
          .select({
            total: count(),
            manualActions: sql<number>`sum(case when ${agentIntelligenceTable.agentId} like 'manual.%' then 1 else 0 end)`
          })
          .from(agentIntelligenceTable)
          .where(gte(agentIntelligenceTable.createdAt, last24h)),
        db
          .select({
            squadName: agentIntelligenceTable.squadName,
            total: count()
          })
          .from(agentIntelligenceTable)
          .groupBy(agentIntelligenceTable.squadName)
          .orderBy(desc(count()))
          .limit(6)
      ])
    : await Promise.all([
        Promise.resolve([] as Array<{ caseId: string }>),
        Promise.resolve([] as Array<{ caseId: string }>),
        Promise.resolve([] as Array<{ caseId: string }>),
        Promise.resolve([] as Array<{ caseId: string }>),
        Promise.resolve([] as Array<{ caseId: string }>),
        Promise.resolve([] as Array<{ caseId: string; reviewRequired: boolean; decision: string | null }>),
        Promise.resolve(
          [] as Array<{ caseId: string | null; jobType: string; status: string; createdAt: Date }>
        ),
        db.select({ total: count() }).from(agentIntelligenceTable),
        db
          .select({
            total: sql<number>`count(distinct ${agentIntelligenceTable.caseId})`
          })
          .from(agentIntelligenceTable)
          .where(isNotNull(agentIntelligenceTable.caseId)),
        db
          .select({
            total: count(),
            manualActions: sql<number>`sum(case when ${agentIntelligenceTable.agentId} like 'manual.%' then 1 else 0 end)`
          })
          .from(agentIntelligenceTable)
          .where(gte(agentIntelligenceTable.createdAt, last24h)),
        db
          .select({
            squadName: agentIntelligenceTable.squadName,
            total: count()
          })
          .from(agentIntelligenceTable)
          .groupBy(agentIntelligenceTable.squadName)
          .orderBy(desc(count()))
          .limit(6)
      ]);

  const triageSet = new Set(triageRows.map((row) => row.caseId));
  const journeySet = new Set(journeyRows.map((row) => row.caseId));
  const clinicalSet = new Set(clinicalRows.map((row) => row.caseId));
  const rightsSet = new Set(rightsRows.map((row) => row.caseId));
  const evidenceSet = new Set(evidenceRows.map((row) => row.caseId));
  const scoreMap = new Map(
    scoreRows.map((row) => [
      row.caseId,
      {
        reviewRequired: row.reviewRequired,
        decision: row.decision
      }
    ])
  );

  const latestWorkflowByCaseAndType = new Map<string, string>();
  for (const row of workflowRows) {
    if (!row.caseId) {
      continue;
    }

    const key = `${row.caseId}:${row.jobType}`;
    const existing = latestWorkflowByCaseAndType.get(key);

    if (!existing) {
      latestWorkflowByCaseAndType.set(key, row.status);
    }
  }

  function workflowStatusFor(caseId: string, jobType: string) {
    return latestWorkflowByCaseAndType.get(`${caseId}:${jobType}`);
  }

  const cases: CaseOperationalItem[] = recentCases.map((item) => {
    const score = scoreMap.get(item.id);

    const triageStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "triage.classification"),
      triageSet.has(item.id)
    );
    const journeyStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "journey.timeline"),
      journeySet.has(item.id)
    );
    const clinicalStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "clinical.analysis"),
      clinicalSet.has(item.id)
    );
    const rightsStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "rights.assessment"),
      rightsSet.has(item.id)
    );
    const evidenceStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "evidence.builder"),
      evidenceSet.has(item.id)
    );

    const riskScoreStatus =
      score?.reviewRequired === true && !score.decision
        ? "review_required"
        : mapWorkflowJobStatus(workflowStatusFor(item.id, "legal.score"), Boolean(score));

    const humanReviewStatus = statusForHumanReview(
      score?.reviewRequired ?? false,
      score?.decision ?? null
    );

    const conversionStatus = statusForConversion(item.commercialStatus, item.legalStatus);
    const legalExecutionStatus = mapWorkflowJobStatus(
      workflowStatusFor(item.id, "legal.execution"),
      item.legalStatus === "legal_execution_active"
    );
    const monitoringStatus = statusForMonitoring(item.legalStatus);

    const phases: CasePhaseItem[] = [
      { key: "capture", label: "Captação", status: "completed" },
      { key: "triage", label: "Triagem", status: triageStatus },
      { key: "journey", label: "Jornada", status: journeyStatus },
      { key: "clinical", label: "Análise Clínica", status: clinicalStatus },
      { key: "rights", label: "Direitos do Paciente", status: rightsStatus },
      { key: "evidence", label: "Prova", status: evidenceStatus },
      { key: "risk_score", label: "Score Jurídico", status: riskScoreStatus },
      { key: "human_review", label: "Revisão Humana", status: humanReviewStatus },
      { key: "conversion", label: "Conversão", status: conversionStatus },
      { key: "legal_execution", label: "Execução Jurídica", status: legalExecutionStatus },
      { key: "monitoring", label: "Monitoramento", status: monitoringStatus }
    ];

    return {
      caseId: item.id,
      caseType: item.caseType,
      priority: item.priority,
      urgency: item.urgency,
      commercialStatus: item.commercialStatus,
      legalStatus: item.legalStatus,
      updatedAt: item.updatedAt.toISOString(),
      progressPercent: computeProgress(phases),
      phases
    };
  });

  const phases = phaseDefinitions.map((phase) => {
    const totals = {
      completed: 0,
      inProgress: 0,
      reviewRequired: 0,
      blockedOrError: 0,
      notStarted: 0
    };

    for (const caseItem of cases) {
      const phaseStatus = caseItem.phases.find((item) => item.key === phase.key)?.status ?? "not_started";
      const bucket = statusToMetricsBucket(phaseStatus);
      totals[bucket] += 1;
    }

    return {
      key: phase.key,
      label: phase.label,
      totalCases: cases.length,
      completed: totals.completed,
      inProgress: totals.inProgress,
      reviewRequired: totals.reviewRequired,
      blockedOrError: totals.blockedOrError,
      notStarted: totals.notStarted,
      completionPercent: cases.length > 0 ? normalizePercent((totals.completed / cases.length) * 100) : 0
    };
  });

  const intelligence: IntelligenceMetrics = {
    recordsTotal: Number(intelligenceTotalRows[0]?.total ?? 0),
    casesWithIntelligence: Number(intelligenceCasesRows[0]?.total ?? 0),
    recordsLast24h: Number(intelligenceLast24Rows[0]?.total ?? 0),
    humanActionsLast24h: Number(intelligenceLast24Rows[0]?.manualActions ?? 0),
    topSquads: topSquadsRows.map((row) => ({
      squadName: row.squadName,
      total: Number(row.total)
    }))
  };

  return {
    generatedAt: now.toISOString(),
    orchestrator: {
      ...operations.orchestrator,
      status: mapDashboardAgentStatus(operations.orchestrator.status)
    },
    agents: operations.agents.map((agent) => ({
      ...agent,
      status: mapDashboardAgentStatus(agent.status)
    })),
    intelligence,
    phases,
    cases
  };
}
