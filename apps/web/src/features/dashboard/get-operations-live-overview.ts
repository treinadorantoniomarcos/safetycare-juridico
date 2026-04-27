import {
  AuditLogRepository,
  WorkflowJobRepository,
  casesTable,
  clinicalAnalysesTable,
  evidenceChecklistsTable,
  journeyTimelinesTable,
  leadsTable,
  legalScoresTable,
  rightsAssessmentsTable,
  triageAnalysesTable
} from "@safetycare/database";
import { and, count, desc, gte, inArray, isNotNull } from "drizzle-orm";
import { getCaseReviewQueue } from "../intake/get-case-review-queue";
import { getCaseSlaAlerts } from "../intake/get-case-sla-alerts";
import { getDatabaseClient } from "../../lib/database";

export type DashboardAgentStatus = "online" | "revisao" | "fila" | "bloqueado" | "erro" | "inativo";

export type AgentCardOverview = {
  key: string;
  layer: string;
  name: string;
  status: DashboardAgentStatus;
  statusLabel: string;
  latencyMs: number;
  lastProcessedAt?: string;
  summary: string;
};

export type DashboardKpis = {
  leadsHoje: number;
  casosEmTriagem: number;
  scoreJuridicoMedio: number;
  conversaoPercentual: number;
  slaConformidadePercentual: number;
};

export type QueueItemOverview = {
  caseId: string;
  legalStatus: string;
  priority: string | null;
  updatedAt: string;
};

export type AlertItemOverview = {
  caseId: string;
  legalStatus: string;
  ageMinutes: number;
  slaHours: number;
};

export type ModuleBreakdownItem = {
  module: "Neuro" | "Estetico" | "Plano de Saude";
  total: number;
};

export type ConversionByHourItem = {
  hour: string;
  total: number;
  signed: number;
  percentual: number;
};

export type OperationsLiveOverview = {
  generatedAt: string;
  systemOnline: boolean;
  refreshSeconds: number;
  orchestrator: {
    name: string;
    status: DashboardAgentStatus;
    flow: string[];
  };
  kpis: DashboardKpis;
  agents: AgentCardOverview[];
  queue: {
    total: number;
    items: QueueItemOverview[];
  };
  alerts: {
    total: number;
    items: AlertItemOverview[];
  };
  modules: ModuleBreakdownItem[];
  conversionByHour: ConversionByHourItem[];
};

const TRIAGE_STATUSES = [
  "human_triage_pending",
  "triage_pending",
  "triaged",
  "clinical_pending",
  "rights_pending",
  "evidence_pending",
  "score_pending"
] as const;

const OPERATIONAL_STATUSES_FOR_CLIENT = [
  "human_triage_pending",
  "triage_pending",
  "triaged",
  "clinical_pending",
  "rights_pending",
  "evidence_pending",
  "score_pending",
  "human_review_required",
  "conversion_pending",
  "legal_execution_pending",
  "legal_execution_in_progress"
] as const;

const ORCHESTRATOR_FLOW = [
  "capture",
  "triage",
  "journey",
  "clinical_analysis",
  "rights_check",
  "evidence_builder",
  "risk_score",
  "conversion",
  "legal_execution"
] as const;

const JOB_TYPES = [
  "intake.orchestrator.bootstrap",
  "triage.classification",
  "journey.timeline",
  "clinical.analysis",
  "rights.assessment",
  "evidence.builder",
  "legal.score",
  "legal.execution"
] as const;

function statusLabel(status: DashboardAgentStatus) {
  switch (status) {
    case "online":
      return "Online";
    case "revisao":
      return "Revisao humana";
    case "fila":
      return "Em fila";
    case "bloqueado":
      return "Bloqueado";
    case "erro":
      return "Falha";
    default:
      return "Aguardando";
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function round(value: number, precision: number = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function mapJobSummaryToStatus(summary?: { status: string; total: number }[]): DashboardAgentStatus {
  if (!summary || summary.length === 0) {
    return "inativo";
  }

  const byStatus = new Map(summary.map((item) => [item.status, item.total]));

  if ((byStatus.get("processing") ?? 0) > 0 || (byStatus.get("completed") ?? 0) > 0) {
    return "online";
  }

  if ((byStatus.get("queued") ?? 0) > 0) {
    return "fila";
  }

  if ((byStatus.get("blocked") ?? 0) > 0) {
    return "bloqueado";
  }

  if ((byStatus.get("failed") ?? 0) > 0) {
    return "erro";
  }

  return "inativo";
}

function toIsoOrUndefined(value: Date | undefined) {
  return value ? value.toISOString() : undefined;
}

function estimateLatencyMs(status: DashboardAgentStatus, baseline: number) {
  switch (status) {
    case "online":
      return baseline;
    case "revisao":
      return baseline + 120;
    case "fila":
      return baseline + 280;
    case "bloqueado":
    case "erro":
      return baseline + 480;
    default:
      return baseline + 150;
  }
}

function buildHourlyTimeline(now: Date) {
  const timeline: { key: string; hour: string }[] = [];

  for (let index = 23; index >= 0; index -= 1) {
    const date = new Date(now.getTime() - index * 60 * 60 * 1000);
    const hour = `${String(date.getHours()).padStart(2, "0")}:00`;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    timeline.push({ key, hour });
  }

  return timeline;
}

export async function getOperationsLiveOverview(): Promise<OperationsLiveOverview> {
  const { db } = getDatabaseClient();
  const now = new Date();
  const todayStart = startOfToday();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const workflowJobs = new WorkflowJobRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const [
    leadsHojeRows,
    casosTriagemRows,
    scoreRows,
    decisionRows,
    activeCasesRows,
    moduleRows,
    queue,
    sla,
    conversionEvents,
    jobSummaries,
    lastCaseUpdated,
    lastTriage,
    lastJourney,
    lastClinical,
    lastRights,
    lastEvidence,
    lastScore
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(leadsTable)
      .where(gte(leadsTable.receivedAt, todayStart)),
    db
      .select({ total: count() })
      .from(casesTable)
      .where(inArray(casesTable.legalStatus, [...TRIAGE_STATUSES])),
    db
      .select({ viabilityScore: legalScoresTable.viabilityScore })
      .from(legalScoresTable),
    auditLogs.listByAction("conversion.decision_recorded", last24h, 1000),
    db
      .select({ total: count() })
      .from(casesTable)
      .where(inArray(casesTable.legalStatus, [...OPERATIONAL_STATUSES_FOR_CLIENT])),
    db
      .select({
        caseType: casesTable.caseType,
        total: count()
      })
      .from(casesTable)
      .where(and(isNotNull(casesTable.caseType), gte(casesTable.createdAt, last24h)))
      .groupBy(casesTable.caseType),
    getCaseReviewQueue(20),
    getCaseSlaAlerts(20),
    auditLogs.listByAction("conversion.decision_recorded", last24h, 1000),
    Promise.all(
      JOB_TYPES.map(async (jobType) => {
        const summary = await workflowJobs.summarizeByStatus(jobType);
        return { jobType, summary };
      })
    ),
    db
      .select({ updatedAt: casesTable.updatedAt })
      .from(casesTable)
      .orderBy(desc(casesTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: triageAnalysesTable.updatedAt })
      .from(triageAnalysesTable)
      .orderBy(desc(triageAnalysesTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: journeyTimelinesTable.updatedAt })
      .from(journeyTimelinesTable)
      .orderBy(desc(journeyTimelinesTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: clinicalAnalysesTable.updatedAt })
      .from(clinicalAnalysesTable)
      .orderBy(desc(clinicalAnalysesTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: rightsAssessmentsTable.updatedAt })
      .from(rightsAssessmentsTable)
      .orderBy(desc(rightsAssessmentsTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: evidenceChecklistsTable.updatedAt })
      .from(evidenceChecklistsTable)
      .orderBy(desc(evidenceChecklistsTable.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: legalScoresTable.updatedAt })
      .from(legalScoresTable)
      .orderBy(desc(legalScoresTable.updatedAt))
      .limit(1)
  ]);

  const leadsHoje = Number(leadsHojeRows[0]?.total ?? 0);
  const casosEmTriagem = Number(casosTriagemRows[0]?.total ?? 0);

  const numericScores = scoreRows
    .map((row) => Number(row.viabilityScore))
    .filter((value) => Number.isFinite(value));
  const scoreJuridicoMedio =
    numericScores.length > 0
      ? round(numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length, 1)
      : 0;

  let decisionTotal = 0;
  let decisionSigned = 0;

  for (const event of decisionRows) {
    const payload = (event.afterPayload ?? {}) as Record<string, unknown>;
    const decision = typeof payload.decision === "string" ? payload.decision : undefined;

    if (!decision) {
      continue;
    }

    decisionTotal += 1;

    if (decision === "signed") {
      decisionSigned += 1;
    }
  }

  const conversaoPercentual = decisionTotal > 0 ? round((decisionSigned / decisionTotal) * 100, 1) : 0;
  const slaConformidadePercentual =
    sla.total > 0 ? round(((sla.total - sla.breachTotal) / sla.total) * 100, 1) : 100;

  const moduleTotals = new Map<"Neuro" | "Estetico" | "Plano de Saude", number>([
    ["Neuro", 0],
    ["Estetico", 0],
    ["Plano de Saude", 0]
  ]);

  for (const row of moduleRows) {
    const caseType = row.caseType;
    const total = Number(row.total ?? 0);

    if (caseType === "aesthetic") {
      moduleTotals.set("Estetico", (moduleTotals.get("Estetico") ?? 0) + total);
      continue;
    }

    if (caseType === "health_plan") {
      moduleTotals.set("Plano de Saude", (moduleTotals.get("Plano de Saude") ?? 0) + total);
      continue;
    }

    moduleTotals.set("Neuro", (moduleTotals.get("Neuro") ?? 0) + total);
  }

  const jobSummaryMap = new Map<string, { status: string; total: number }[]>();
  for (const item of jobSummaries) {
    jobSummaryMap.set(item.jobType, item.summary);
  }

  const triageStatus = mapJobSummaryToStatus(jobSummaryMap.get("triage.classification"));
  const journeyStatus = mapJobSummaryToStatus(jobSummaryMap.get("journey.timeline"));
  const clinicalStatus = mapJobSummaryToStatus(jobSummaryMap.get("clinical.analysis"));
  const rightsStatus = mapJobSummaryToStatus(jobSummaryMap.get("rights.assessment"));
  const evidenceStatus = mapJobSummaryToStatus(jobSummaryMap.get("evidence.builder"));
  const legalExecutionStatus = mapJobSummaryToStatus(jobSummaryMap.get("legal.execution"));

  const hasReviewCases = queue.summary.some((item) => item.status === "human_review_required" && item.total > 0);
  const scoreStatus = hasReviewCases
    ? ("revisao" as const)
    : mapJobSummaryToStatus(jobSummaryMap.get("legal.score"));

  const conversionStatus = queue.summary.some((item) => item.status === "conversion_pending" && item.total > 0)
    ? ("online" as const)
    : ("fila" as const);
  const monitoringStatus = sla.total > 0 ? ("online" as const) : ("inativo" as const);
  const clientStatus = Number(activeCasesRows[0]?.total ?? 0) > 0 ? ("online" as const) : ("inativo" as const);
  const growthStatus = leadsHoje > 0 ? ("online" as const) : ("fila" as const);

  const timeline = buildHourlyTimeline(now);
  const byHour = new Map<string, { total: number; signed: number }>();

  for (const point of timeline) {
    byHour.set(point.key, { total: 0, signed: 0 });
  }

  for (const event of conversionEvents) {
    const payload = (event.afterPayload ?? {}) as Record<string, unknown>;
    const decision = typeof payload.decision === "string" ? payload.decision : undefined;
    const key = `${event.createdAt.getFullYear()}-${event.createdAt.getMonth()}-${event.createdAt.getDate()}-${event.createdAt.getHours()}`;

    if (!byHour.has(key)) {
      continue;
    }

    const current = byHour.get(key);
    if (!current) {
      continue;
    }

    current.total += 1;

    if (decision === "signed") {
      current.signed += 1;
    }
  }

  const conversionByHour = timeline.map((point) => {
    const current = byHour.get(point.key) ?? { total: 0, signed: 0 };
    return {
      hour: point.hour,
      total: current.total,
      signed: current.signed,
      percentual: current.total > 0 ? round((current.signed / current.total) * 100, 1) : 0
    };
  });

  const latestCaseTimestamp = lastCaseUpdated[0]?.updatedAt;
  const fallbackTimestamp = latestCaseTimestamp ? latestCaseTimestamp.toISOString() : undefined;

  const agents: AgentCardOverview[] = [
    {
      key: "capture",
      layer: "Aquisicao",
      name: "Agente de Captacao",
      status: leadsHoje > 0 ? "online" : "fila",
      statusLabel: statusLabel(leadsHoje > 0 ? "online" : "fila"),
      latencyMs: estimateLatencyMs(leadsHoje > 0 ? "online" : "fila", 140),
      lastProcessedAt: fallbackTimestamp,
      summary: `${leadsHoje} leads recebidos hoje.`
    },
    {
      key: "triage",
      layer: "Qualificacao",
      name: "Agente de Triagem",
      status: triageStatus,
      statusLabel: statusLabel(triageStatus),
      latencyMs: estimateLatencyMs(triageStatus, 180),
      lastProcessedAt: toIsoOrUndefined(lastTriage[0]?.updatedAt) ?? fallbackTimestamp,
      summary: `${casosEmTriagem} casos em triagem ativa.`
    },
    {
      key: "journey",
      layer: "Estruturacao",
      name: "Agente de Jornada do Paciente",
      status: journeyStatus,
      statusLabel: statusLabel(journeyStatus),
      latencyMs: estimateLatencyMs(journeyStatus, 210),
      lastProcessedAt: toIsoOrUndefined(lastJourney[0]?.updatedAt) ?? fallbackTimestamp,
      summary: "Reconstrucao cronologica dos eventos assistenciais."
    },
    {
      key: "clinical",
      layer: "Estruturacao",
      name: "Agente de Analise Clinica",
      status: clinicalStatus,
      statusLabel: statusLabel(clinicalStatus),
      latencyMs: estimateLatencyMs(clinicalStatus, 230),
      lastProcessedAt: toIsoOrUndefined(lastClinical[0]?.updatedAt) ?? fallbackTimestamp,
      summary: "Deteccao de atrasos, falhas de protocolo e risco clinico."
    },
    {
      key: "rights",
      layer: "Estruturacao",
      name: "Agente de Direitos do Paciente",
      status: rightsStatus,
      statusLabel: statusLabel(rightsStatus),
      latencyMs: estimateLatencyMs(rightsStatus, 220),
      lastProcessedAt: toIsoOrUndefined(lastRights[0]?.updatedAt) ?? fallbackTimestamp,
      summary: "Validacao de consentimento, informacao e seguranca assistencial."
    },
    {
      key: "evidence",
      layer: "Estruturacao",
      name: "Agente de Prova",
      status: evidenceStatus,
      statusLabel: statusLabel(evidenceStatus),
      latencyMs: estimateLatencyMs(evidenceStatus, 260),
      lastProcessedAt: toIsoOrUndefined(lastEvidence[0]?.updatedAt) ?? fallbackTimestamp,
      summary: "Checklist documental e lacunas probatorias priorizadas."
    },
    {
      key: "score",
      layer: "Decisao",
      name: "Agente de Score Juridico",
      status: scoreStatus,
      statusLabel: statusLabel(scoreStatus),
      latencyMs: estimateLatencyMs(scoreStatus, 190),
      lastProcessedAt: toIsoOrUndefined(lastScore[0]?.updatedAt) ?? fallbackTimestamp,
      summary: `Score medio atual: ${scoreJuridicoMedio}/100.`
    },
    {
      key: "conversion",
      layer: "Decisao",
      name: "Agente de Conversao",
      status: conversionStatus,
      statusLabel: statusLabel(conversionStatus),
      latencyMs: estimateLatencyMs(conversionStatus, 170),
      lastProcessedAt: fallbackTimestamp,
      summary: `Conversao assinada nas ultimas 24h: ${conversaoPercentual}%.`
    },
    {
      key: "legal_execution",
      layer: "Execucao",
      name: "Agente de Pecas Juridicas",
      status: legalExecutionStatus,
      statusLabel: statusLabel(legalExecutionStatus),
      latencyMs: estimateLatencyMs(legalExecutionStatus, 280),
      lastProcessedAt: fallbackTimestamp,
      summary: "Preparacao de peticoes e estrategias para execucao."
    },
    {
      key: "monitoring",
      layer: "Execucao",
      name: "Agente de Monitoramento",
      status: monitoringStatus,
      statusLabel: statusLabel(monitoringStatus),
      latencyMs: estimateLatencyMs(monitoringStatus, 150),
      lastProcessedAt: fallbackTimestamp,
      summary: `Conformidade SLA: ${slaConformidadePercentual}%.`
    },
    {
      key: "client",
      layer: "Relacionamento",
      name: "Agente de Cliente",
      status: clientStatus,
      statusLabel: statusLabel(clientStatus),
      latencyMs: estimateLatencyMs(clientStatus, 120),
      lastProcessedAt: fallbackTimestamp,
      summary: `${Number(activeCasesRows[0]?.total ?? 0)} casos ativos com comunicacao em curso.`
    },
    {
      key: "growth",
      layer: "Inteligencia",
      name: "Agente de Growth",
      status: growthStatus,
      statusLabel: statusLabel(growthStatus),
      latencyMs: estimateLatencyMs(growthStatus, 130),
      lastProcessedAt: fallbackTimestamp,
      summary: "Analise de ROI por canal e desempenho de conversao."
    }
  ];

  const orchestratorStatus = mapJobSummaryToStatus(jobSummaryMap.get("intake.orchestrator.bootstrap"));

  const queueItems: QueueItemOverview[] = queue.cases.slice(0, 8).map((item) => ({
    caseId: item.id,
    legalStatus: item.legalStatus,
    priority: item.priority,
    updatedAt: item.updatedAt.toISOString()
  }));

  const alertItems: AlertItemOverview[] = sla.alerts
    .filter((item) => item.breach)
    .slice(0, 8)
    .map((item) => ({
      caseId: item.caseId,
      legalStatus: item.legalStatus,
      ageMinutes: item.ageMinutes,
      slaHours: item.slaHours
    }));

  const modules: ModuleBreakdownItem[] = [
    { module: "Neuro", total: moduleTotals.get("Neuro") ?? 0 },
    { module: "Estetico", total: moduleTotals.get("Estetico") ?? 0 },
    { module: "Plano de Saude", total: moduleTotals.get("Plano de Saude") ?? 0 }
  ];

  return {
    generatedAt: now.toISOString(),
    systemOnline: true,
    refreshSeconds: 5,
    orchestrator: {
      name: "SAFETYCARE Orchestrator",
      status: orchestratorStatus,
      flow: [...ORCHESTRATOR_FLOW]
    },
    kpis: {
      leadsHoje,
      casosEmTriagem,
      scoreJuridicoMedio,
      conversaoPercentual,
      slaConformidadePercentual
    },
    agents,
    queue: {
      total: queue.total,
      items: queueItems
    },
    alerts: {
      total: sla.breachTotal,
      items: alertItems
    },
    modules,
    conversionByHour
  };
}
