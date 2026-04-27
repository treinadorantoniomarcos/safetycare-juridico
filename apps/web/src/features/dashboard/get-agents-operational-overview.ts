import {
  agentIntelligenceTable,
  auditLogsTable,
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
  lastActionDescription?: string;
  lastActionAt?: string;
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
  agents: Array<
    Omit<AgentCardOverview, "status"> & {
      status: CasePhaseStatus;
      lastActionDescription?: string;
      lastActionAt?: string;
    }
  >;
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

type WorkflowSnapshot = {
  status: string;
  createdAt: Date;
  payload: unknown;
};

type LastActionSnapshot = {
  description: string;
  at: Date;
};

function toIsoOrUndefined(value?: Date) {
  return value ? value.toISOString() : undefined;
}

function phaseForAuditAction(action: string): string | undefined {
  if (action === "intake.score_review_recorded") {
    return "human_review";
  }

  if (action.startsWith("intake.")) {
    return "capture";
  }

  if (action.startsWith("triage.")) {
    return "triage";
  }

  if (action.startsWith("journey.")) {
    return "journey";
  }

  if (action.startsWith("clinical.")) {
    return "clinical";
  }

  if (action.startsWith("rights.")) {
    return "rights";
  }

  if (action.startsWith("evidence.")) {
    return "evidence";
  }

  if (action.startsWith("score.")) {
    return "risk_score";
  }

  if (action.startsWith("conversion.")) {
    return "conversion";
  }

  if (action.startsWith("legal_execution.")) {
    return "legal_execution";
  }

  if (action.startsWith("sla.")) {
    return "monitoring";
  }

  return undefined;
}

function formatAuditActionDescription(action: string) {
  switch (action) {
    case "intake.case_created":
      return "Caso criado no intake";
    case "intake.job_queued":
      return "Fluxo inicial enfileirado";
    case "intake.awaiting_consent":
      return "Aguardando consentimento";
    case "triage.job_queued":
      return "Triagem enfileirada";
    case "triage.completed":
      return "Triagem concluida";
    case "triage.blocked":
      return "Triagem bloqueada";
    case "journey.completed":
      return "Jornada consolidada";
    case "journey.blocked":
      return "Jornada bloqueada";
    case "clinical.completed":
      return "Analise clinica concluida";
    case "clinical.blocked":
      return "Analise clinica bloqueada";
    case "rights.completed":
      return "Direitos avaliados";
    case "rights.blocked":
      return "Direitos bloqueados";
    case "evidence.completed":
      return "Checklist de prova concluido";
    case "evidence.blocked":
      return "Checklist de prova bloqueado";
    case "score.completed":
      return "Score juridico concluido";
    case "score.blocked":
      return "Score juridico bloqueado";
    case "intake.score_review_recorded":
      return "Revisao humana registrada";
    case "conversion.decision_recorded":
      return "Decisao comercial registrada";
    case "legal_execution.started":
      return "Execucao juridica iniciada";
    case "legal_execution.blocked":
      return "Execucao juridica bloqueada";
    case "sla.escalation_triggered":
      return "Escalonamento de SLA acionado";
    case "sla.notification_dispatched":
      return "Notificacao de SLA enviada";
    default:
      return action;
  }
}

function formatWorkflowActionDescription(
  workflowStatus: string,
  payload: unknown,
  phaseLabel: string
) {
  const payloadRecord =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
  const reason = typeof payloadRecord?.reason === "string" ? payloadRecord.reason : undefined;
  const message =
    typeof payloadRecord?.message === "string"
      ? payloadRecord.message
      : typeof payloadRecord?.error === "string"
        ? payloadRecord.error
        : undefined;

  switch (workflowStatus) {
    case "queued":
      return `${phaseLabel} enfileirada`;
    case "processing":
      return `${phaseLabel} em processamento`;
    case "completed":
      return `${phaseLabel} concluida`;
    case "blocked":
      return reason ? `${phaseLabel} bloqueada: ${reason}` : `${phaseLabel} bloqueada`;
    case "failed":
      return message ? `${phaseLabel} com falha: ${message}` : `${phaseLabel} com falha`;
    default:
      return `${phaseLabel} sem execucao registrada`;
  }
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
    caseAuditRows,
    globalAuditRows,
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
            payload: workflowJobsTable.payload,
            createdAt: workflowJobsTable.createdAt
          })
          .from(workflowJobsTable)
          .where(and(isNotNull(workflowJobsTable.caseId), inArray(workflowJobsTable.caseId, caseIds)))
          .orderBy(desc(workflowJobsTable.createdAt)),
        db
          .select({
            caseId: auditLogsTable.caseId,
            action: auditLogsTable.action,
            createdAt: auditLogsTable.createdAt
          })
          .from(auditLogsTable)
          .where(and(isNotNull(auditLogsTable.caseId), inArray(auditLogsTable.caseId, caseIds)))
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(500),
        db
          .select({
            action: auditLogsTable.action,
            createdAt: auditLogsTable.createdAt
          })
          .from(auditLogsTable)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(500),
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
          [] as Array<{
            caseId: string | null;
            jobType: string;
            status: string;
            payload: unknown;
            createdAt: Date;
          }>
        ),
        Promise.resolve([] as Array<{ caseId: string | null; action: string; createdAt: Date }>),
        db
          .select({
            action: auditLogsTable.action,
            createdAt: auditLogsTable.createdAt
          })
          .from(auditLogsTable)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(500),
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

  const latestWorkflowByCaseAndType = new Map<string, WorkflowSnapshot>();
  const latestWorkflowByType = new Map<string, WorkflowSnapshot>();
  for (const row of workflowRows) {
    if (!row.caseId) {
      continue;
    }

    const snapshot: WorkflowSnapshot = {
      status: row.status,
      payload: row.payload,
      createdAt: row.createdAt
    };
    const key = `${row.caseId}:${row.jobType}`;
    const existing = latestWorkflowByCaseAndType.get(key);

    if (!existing) {
      latestWorkflowByCaseAndType.set(key, snapshot);
    }

    if (!latestWorkflowByType.has(row.jobType)) {
      latestWorkflowByType.set(row.jobType, snapshot);
    }
  }

  function workflowStatusFor(caseId: string, jobType: string) {
    return latestWorkflowByCaseAndType.get(`${caseId}:${jobType}`);
  }

  const latestCasePhaseAction = new Map<string, LastActionSnapshot>();
  for (const row of caseAuditRows) {
    if (!row.caseId) {
      continue;
    }

    const phaseKey = phaseForAuditAction(row.action);
    if (!phaseKey) {
      continue;
    }

    const key = `${row.caseId}:${phaseKey}`;
    if (!latestCasePhaseAction.has(key)) {
      latestCasePhaseAction.set(key, {
        description: formatAuditActionDescription(row.action),
        at: row.createdAt
      });
    }
  }

  const latestGlobalPhaseAction = new Map<string, LastActionSnapshot>();
  for (const row of globalAuditRows) {
    const phaseKey = phaseForAuditAction(row.action);
    if (!phaseKey) {
      continue;
    }

    if (!latestGlobalPhaseAction.has(phaseKey)) {
      latestGlobalPhaseAction.set(phaseKey, {
        description: formatAuditActionDescription(row.action),
        at: row.createdAt
      });
    }
  }

  const cases: CaseOperationalItem[] = recentCases.map((item) => {
    const score = scoreMap.get(item.id);
    const triageWorkflow = workflowStatusFor(item.id, "triage.classification");
    const journeyWorkflow = workflowStatusFor(item.id, "journey.timeline");
    const clinicalWorkflow = workflowStatusFor(item.id, "clinical.analysis");
    const rightsWorkflow = workflowStatusFor(item.id, "rights.assessment");
    const evidenceWorkflow = workflowStatusFor(item.id, "evidence.builder");
    const scoreWorkflow = workflowStatusFor(item.id, "legal.score");
    const legalExecutionWorkflow = workflowStatusFor(item.id, "legal.execution");

    const triageStatus = mapWorkflowJobStatus(
      triageWorkflow?.status,
      triageSet.has(item.id)
    );
    const journeyStatus = mapWorkflowJobStatus(
      journeyWorkflow?.status,
      journeySet.has(item.id)
    );
    const clinicalStatus = mapWorkflowJobStatus(
      clinicalWorkflow?.status,
      clinicalSet.has(item.id)
    );
    const rightsStatus = mapWorkflowJobStatus(
      rightsWorkflow?.status,
      rightsSet.has(item.id)
    );
    const evidenceStatus = mapWorkflowJobStatus(
      evidenceWorkflow?.status,
      evidenceSet.has(item.id)
    );

    const riskScoreStatus =
      score?.reviewRequired === true && !score.decision
        ? "review_required"
        : mapWorkflowJobStatus(scoreWorkflow?.status, Boolean(score));

    const humanReviewStatus = statusForHumanReview(
      score?.reviewRequired ?? false,
      score?.decision ?? null
    );

    const conversionStatus = statusForConversion(item.commercialStatus, item.legalStatus);
    const legalExecutionStatus = mapWorkflowJobStatus(
      legalExecutionWorkflow?.status,
      item.legalStatus === "legal_execution_active"
    );
    const monitoringStatus = statusForMonitoring(item.legalStatus);

    function phaseAction(
      phaseKey: string,
      phaseLabel: string,
      workflow?: WorkflowSnapshot
    ): LastActionSnapshot | undefined {
      const audit = latestCasePhaseAction.get(`${item.id}:${phaseKey}`);
      if (audit) {
        return audit;
      }

      if (workflow) {
        return {
          description: formatWorkflowActionDescription(workflow.status, workflow.payload, phaseLabel),
          at: workflow.createdAt
        };
      }

      return undefined;
    }

    const captureAction = phaseAction("capture", "Captação");
    const triageAction = phaseAction("triage", "Triagem", triageWorkflow);
    const journeyAction = phaseAction("journey", "Jornada", journeyWorkflow);
    const clinicalAction = phaseAction("clinical", "Análise clínica", clinicalWorkflow);
    const rightsAction = phaseAction("rights", "Direitos do paciente", rightsWorkflow);
    const evidenceAction = phaseAction("evidence", "Prova", evidenceWorkflow);
    const scoreAction = phaseAction("risk_score", "Score jurídico", scoreWorkflow);
    const humanReviewAction = phaseAction("human_review", "Revisão humana");
    const conversionAction = phaseAction("conversion", "Conversão");
    const legalExecutionAction = phaseAction(
      "legal_execution",
      "Execução jurídica",
      legalExecutionWorkflow
    );
    const monitoringAction = phaseAction("monitoring", "Monitoramento");

    const phases: CasePhaseItem[] = [
      {
        key: "capture",
        label: "Captação",
        status: "completed",
        lastActionDescription: captureAction?.description ?? "Caso recebido na operação",
        lastActionAt: toIsoOrUndefined(captureAction?.at)
      },
      {
        key: "triage",
        label: "Triagem",
        status: triageStatus,
        lastActionDescription: triageAction?.description,
        lastActionAt: toIsoOrUndefined(triageAction?.at)
      },
      {
        key: "journey",
        label: "Jornada",
        status: journeyStatus,
        lastActionDescription: journeyAction?.description,
        lastActionAt: toIsoOrUndefined(journeyAction?.at)
      },
      {
        key: "clinical",
        label: "Análise Clínica",
        status: clinicalStatus,
        lastActionDescription: clinicalAction?.description,
        lastActionAt: toIsoOrUndefined(clinicalAction?.at)
      },
      {
        key: "rights",
        label: "Direitos do Paciente",
        status: rightsStatus,
        lastActionDescription: rightsAction?.description,
        lastActionAt: toIsoOrUndefined(rightsAction?.at)
      },
      {
        key: "evidence",
        label: "Prova",
        status: evidenceStatus,
        lastActionDescription: evidenceAction?.description,
        lastActionAt: toIsoOrUndefined(evidenceAction?.at)
      },
      {
        key: "risk_score",
        label: "Score Jurídico",
        status: riskScoreStatus,
        lastActionDescription: scoreAction?.description,
        lastActionAt: toIsoOrUndefined(scoreAction?.at)
      },
      {
        key: "human_review",
        label: "Revisão Humana",
        status: humanReviewStatus,
        lastActionDescription: humanReviewAction?.description,
        lastActionAt: toIsoOrUndefined(humanReviewAction?.at)
      },
      {
        key: "conversion",
        label: "Conversão",
        status: conversionStatus,
        lastActionDescription: conversionAction?.description,
        lastActionAt: toIsoOrUndefined(conversionAction?.at)
      },
      {
        key: "legal_execution",
        label: "Execução Jurídica",
        status: legalExecutionStatus,
        lastActionDescription: legalExecutionAction?.description,
        lastActionAt: toIsoOrUndefined(legalExecutionAction?.at)
      },
      {
        key: "monitoring",
        label: "Monitoramento",
        status: monitoringStatus,
        lastActionDescription: monitoringAction?.description,
        lastActionAt: toIsoOrUndefined(monitoringAction?.at)
      }
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

  const globalMostRecentAction = globalAuditRows[0];

  function globalPhaseAction(
    phaseKey: string,
    phaseLabel: string,
    workflowJobType?: string
  ): LastActionSnapshot | undefined {
    const audit = latestGlobalPhaseAction.get(phaseKey);
    if (audit) {
      return audit;
    }

    if (workflowJobType) {
      const workflow = latestWorkflowByType.get(workflowJobType);
      if (workflow) {
        return {
          description: formatWorkflowActionDescription(workflow.status, workflow.payload, phaseLabel),
          at: workflow.createdAt
        };
      }
    }

    if (globalMostRecentAction) {
      return {
        description: formatAuditActionDescription(globalMostRecentAction.action),
        at: globalMostRecentAction.createdAt
      };
    }

    return undefined;
  }

  function actionForAgent(agentKey: string): LastActionSnapshot | undefined {
    switch (agentKey) {
      case "capture":
        return globalPhaseAction("capture", "Captação", "intake.orchestrator.bootstrap");
      case "triage":
        return globalPhaseAction("triage", "Triagem", "triage.classification");
      case "journey":
        return globalPhaseAction("journey", "Jornada", "journey.timeline");
      case "clinical":
        return globalPhaseAction("clinical", "Análise clínica", "clinical.analysis");
      case "rights":
        return globalPhaseAction("rights", "Direitos do paciente", "rights.assessment");
      case "evidence":
        return globalPhaseAction("evidence", "Prova", "evidence.builder");
      case "score":
        return globalPhaseAction("risk_score", "Score jurídico", "legal.score");
      case "conversion":
        return globalPhaseAction("conversion", "Conversão");
      case "legal_execution":
        return globalPhaseAction("legal_execution", "Execução jurídica", "legal.execution");
      case "monitoring":
        return globalPhaseAction("monitoring", "Monitoramento");
      case "client":
        return globalPhaseAction("capture", "Relacionamento");
      case "growth":
        return globalMostRecentAction
          ? {
              description: formatAuditActionDescription(globalMostRecentAction.action),
              at: globalMostRecentAction.createdAt
            }
          : undefined;
      default:
        return undefined;
    }
  }

  return {
    generatedAt: now.toISOString(),
    orchestrator: {
      ...operations.orchestrator,
      status: mapDashboardAgentStatus(operations.orchestrator.status)
    },
    agents: operations.agents.map((agent) => {
      const action = actionForAgent(agent.key);

      return {
        ...agent,
        status: mapDashboardAgentStatus(agent.status),
        lastActionDescription: action?.description,
        lastActionAt: action?.at ? action.at.toISOString() : agent.lastProcessedAt
      };
    }),
    intelligence,
    phases,
    cases
  };
}
