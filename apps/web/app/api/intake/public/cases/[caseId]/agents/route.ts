import { workflowJobTypes } from "@safetycare/ai-contracts";
import {
  CaseRepository,
  ClinicalAnalysisRepository,
  EvidenceChecklistRepository,
  JourneyTimelineRepository,
  LegalScoreRepository,
  RightsAssessmentRepository,
  TriageAnalysisRepository,
  WorkflowJobRepository
} from "@safetycare/database";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../../src/lib/database";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

type PublicAgentStatus =
  | "not_started"
  | "pending"
  | "running"
  | "blocked"
  | "completed"
  | "review_required"
  | "manual"
  | "error";

function normalizeWorkflowJobId(url: URL) {
  const workflowJobId = url.searchParams.get("workflowJobId");
  return workflowJobId?.trim();
}

function isValidPublicCaseAccessToken(caseId: string, workflowJob: { caseId: string | null; jobType: string }) {
  return workflowJob.caseId === caseId && workflowJob.jobType === workflowJobTypes[0];
}

function mapWorkflowJobStatusToAgentStatus(
  status: string | undefined,
  hasArtifact: boolean
): PublicAgentStatus {
  if (hasArtifact) {
    return "completed";
  }

  switch (status) {
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

function getConversionStatus(commercialStatus: string, legalStatus: string): PublicAgentStatus {
  if (commercialStatus === "conversion_pending" || legalStatus === "conversion_pending") {
    return "manual";
  }

  if (commercialStatus === "retained") {
    return "completed";
  }

  if (commercialStatus === "closed_lost" || legalStatus === "closed_lost") {
    return "completed";
  }

  return "not_started";
}

function getMonitoringStatus(legalStatus: string): PublicAgentStatus {
  if (legalStatus === "legal_execution_pending" || legalStatus === "legal_execution_active") {
    return "running";
  }

  if (legalStatus === "closed_lost") {
    return "completed";
  }

  return "not_started";
}

function isHumanTriagePending(legalStatus: string) {
  return legalStatus === "human_triage_pending";
}

export async function GET(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);
  const workflowJobId = normalizeWorkflowJobId(new URL(request.url));

  if (!workflowJobId) {
    return NextResponse.json(
      {
        correlationId,
        error: "workflow_job_id_required"
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);

    const [caseRecord, accessJob] = await Promise.all([
      cases.findById(caseId),
      workflowJobs.findById(workflowJobId)
    ]);

    if (!caseRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    if (!accessJob || !isValidPublicCaseAccessToken(caseId, accessJob)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_access"
        },
        { status: 403 }
      );
    }

    const triageRepo = new TriageAnalysisRepository(db);
    const journeyRepo = new JourneyTimelineRepository(db);
    const clinicalRepo = new ClinicalAnalysisRepository(db);
    const rightsRepo = new RightsAssessmentRepository(db);
    const evidenceRepo = new EvidenceChecklistRepository(db);
    const scoreRepo = new LegalScoreRepository(db);

    const [triage, journey, clinical, rights, evidence, score, jobs] = await Promise.all([
      triageRepo.findByCaseId(caseId),
      journeyRepo.findByCaseId(caseId),
      clinicalRepo.findByCaseId(caseId),
      rightsRepo.findByCaseId(caseId),
      evidenceRepo.findByCaseId(caseId),
      scoreRepo.findByCaseId(caseId),
      Promise.all(workflowJobTypes.map((jobType) => workflowJobs.findLatestByCaseIdAndType(caseId, jobType)))
    ]);

    const jobStatusByType = new Map<string, string | undefined>();

    for (const job of jobs) {
      if (job) {
        jobStatusByType.set(job.jobType, job.status);
      }
    }

    const legalScoreStatus =
      score?.reviewRequired === true
        ? "review_required"
        : mapWorkflowJobStatusToAgentStatus(jobStatusByType.get("legal.score"), Boolean(score));
    const humanTriagePending = isHumanTriagePending(caseRecord.legalStatus);

    return NextResponse.json(
      {
        correlationId,
        caseId,
        workflowJobId,
        orchestrator: {
          name: "Safetycare Orchestrator",
          status: humanTriagePending
            ? "manual"
            : mapWorkflowJobStatusToAgentStatus(jobStatusByType.get("intake.orchestrator.bootstrap"), false),
          flow: [
            "capture",
            "triage",
            "journey",
            "clinical_analysis",
            "rights_check",
            "evidence_builder",
            "risk_score",
            "conversion",
            "legal_execution"
          ]
        },
        caseSnapshot: {
          caseType: caseRecord.caseType,
          priority: caseRecord.priority,
          urgency: caseRecord.urgency,
          commercialStatus: caseRecord.commercialStatus,
          legalStatus: caseRecord.legalStatus
        },
        agents: [
          {
            key: "capture",
            layer: "Aquisicao",
            name: "Agente de Captacao",
            status: "completed",
            summary: humanTriagePending
              ? "Lead recebido. Aguardando triagem humana para iniciar os agentes."
              : "Lead recebido e caso inicializado."
          },
          {
            key: "triage",
            layer: "Qualificacao",
            name: "Agente de Triagem",
            status: humanTriagePending
              ? "manual"
              : mapWorkflowJobStatusToAgentStatus(
                  jobStatusByType.get("triage.classification"),
                  Boolean(triage)
                ),
            summary: humanTriagePending
              ? "Triagem humana pendente de aprovacao."
              : triage
              ? `Tipo ${triage.caseType}, prioridade ${triage.priority}, urgencia ${triage.urgency}.`
              : "Aguardando classificacao inicial."
          },
          {
            key: "journey",
            layer: "Estruturacao",
            name: "Agente de Jornada do Paciente",
            status: mapWorkflowJobStatusToAgentStatus(
              jobStatusByType.get("journey.timeline"),
              Boolean(journey)
            ),
            summary: journey?.summary ?? "Linha do tempo ainda nao consolidada."
          },
          {
            key: "clinical_analysis",
            layer: "Estruturacao",
            name: "Agente de Analise Clinica",
            status: mapWorkflowJobStatusToAgentStatus(
              jobStatusByType.get("clinical.analysis"),
              Boolean(clinical)
            ),
            summary: clinical?.summary ?? "Analise clinica ainda nao finalizada."
          },
          {
            key: "rights_check",
            layer: "Estruturacao",
            name: "Agente de Direitos do Paciente",
            status: mapWorkflowJobStatusToAgentStatus(
              jobStatusByType.get("rights.assessment"),
              Boolean(rights)
            ),
            summary: rights
              ? `Possiveis violacoes identificadas: ${rights.violationCount}.`
              : "Aguardando avaliacao de direitos."
          },
          {
            key: "evidence_builder",
            layer: "Estruturacao",
            name: "Agente de Prova",
            status: mapWorkflowJobStatusToAgentStatus(
              jobStatusByType.get("evidence.builder"),
              Boolean(evidence)
            ),
            summary: evidence
              ? `Checklist gerado com ${evidence.missingCount} lacunas prioritarias.`
              : "Checklist probatorio ainda nao gerado."
          },
          {
            key: "risk_score",
            layer: "Decisao",
            name: "Agente de Score Juridico",
            status: legalScoreStatus,
            summary: score
              ? `Viabilidade ${score.viabilityScore}/100, complexidade ${score.complexity}.`
              : "Score juridico ainda nao calculado."
          },
          {
            key: "conversion",
            layer: "Decisao",
            name: "Agente de Conversao",
            status: getConversionStatus(caseRecord.commercialStatus, caseRecord.legalStatus),
            summary: `Status comercial atual: ${caseRecord.commercialStatus}.`
          },
          {
            key: "legal_execution",
            layer: "Execucao",
            name: "Agente de Pecas Juridicas",
            status: mapWorkflowJobStatusToAgentStatus(
              jobStatusByType.get("legal.execution"),
              caseRecord.legalStatus === "legal_execution_active"
            ),
            summary:
              caseRecord.legalStatus === "legal_execution_pending"
                ? "Caso apto para execucao juridica."
                : "Execucao juridica depende da etapa comercial e revisao humana."
          },
          {
            key: "monitoring",
            layer: "Execucao",
            name: "Agente de Monitoramento",
            status: getMonitoringStatus(caseRecord.legalStatus),
            summary: `Status juridico atual: ${caseRecord.legalStatus}.`
          },
          {
            key: "client_relationship",
            layer: "Relacionamento",
            name: "Agente de Cliente",
            status: "running",
            summary: "Canal de atualizacao ativo para comunicacao com o cliente."
          },
          {
            key: "growth",
            layer: "Inteligencia",
            name: "Agente de Growth",
            status: "running",
            summary: "Metricas de aquisicao e conversao consolidadas no dashboard operacional."
          }
        ]
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "agents_status_fetch_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
