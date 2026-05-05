import {
  analyzeClinicalSignals,
  assessPatientRights,
  buildEvidenceChecklist,
  buildPatientJourneyTimeline,
  calculateLegalScore,
  classifyCaseTriage
} from "@safetycare/agents";
import {
  clinicalAnalysisSchema,
  evidenceChecklistSchema,
  journeyTimelineSchema,
  legalScoreSchema,
  rightsAssessmentSchema,
  triageClassificationSchema,
  workflowJobTypes,
  type TriageClassificationResult
} from "@safetycare/ai-contracts";
import {
  AuditLogRepository,
  CaseRepository,
  EvidenceChecklistRepository,
  LegalBriefInputRepository,
  LegalArtifactRepository,
  LegalScoreRepository,
  RightsAssessmentRepository,
  type LegalBriefInputRecord,
  type DatabaseClient,
  ClinicalAnalysisRepository,
  JourneyTimelineRepository,
  TriageAnalysisRepository,
  WorkflowJobRepository
} from "@safetycare/database";
import { createLogger } from "@safetycare/observability";
import { buildCivilHealthLegalDraft } from "./legal-draft";
import { buildCivilHealthSupportingDocumentPack } from "./legal-supporting-documents";

type CivilHealthBriefInput = Parameters<typeof buildCivilHealthLegalDraft>[0];

const logger = createLogger("orchestrator");

export const intakeBootstrapJobType = workflowJobTypes[0];
export const triageClassificationJobType = workflowJobTypes[1];
export const journeyTimelineJobType = workflowJobTypes[2];
export const clinicalAnalysisJobType = workflowJobTypes[3];
export const rightsAssessmentJobType = workflowJobTypes[4];
export const evidenceBuilderJobType = workflowJobTypes[5];
export const legalScoreJobType = workflowJobTypes[6];
export const legalExecutionJobType = workflowJobTypes[7];

type IntakeBootstrapResult =
  | {
      workflowJobId: string;
      caseId: string;
      status: "completed";
      nextStage: "triage_pending";
      triageWorkflowJobId: string;
    }
  | {
      workflowJobId: string;
      caseId: string;
      status: "blocked";
      nextStage: "awaiting_human_triage";
      retryAt: string;
    }
  | {
      workflowJobId: string;
      caseId: string;
      status: "blocked";
      nextStage: "awaiting_consent";
      retryAt: string;
    };

type TriageClassificationJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed";
  nextStage: "journey_pending";
  classification: TriageClassificationResult;
  journeyWorkflowJobId: string;
};

type JourneyTimelineJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "clinical_pending" | "journey_pending";
  timelineEventCount: number;
  clinicalWorkflowJobId?: string;
  retryAt?: string;
};

type ClinicalAnalysisJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "rights_pending" | "clinical_pending";
  findingCount: number;
  rightsWorkflowJobId?: string;
  retryAt?: string;
};

type RightsAssessmentJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "evidence_pending" | "rights_pending";
  violationCount: number;
  evidenceWorkflowJobId?: string;
  retryAt?: string;
};

type EvidenceBuilderJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "score_pending" | "evidence_pending";
  checklistItemCount: number;
  scoreWorkflowJobId?: string;
  retryAt?: string;
};

type LegalScoreJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "score_ready" | "human_review_required" | "score_pending";
  viabilityScore: number;
  reviewRequired: boolean;
  retryAt?: string;
};

type LegalExecutionJobResult = {
  workflowJobId: string;
  caseId: string;
  status: "completed" | "blocked";
  nextStage: "legal_execution_in_progress" | "legal_execution_pending";
  retryAt?: string;
};

export async function runIntakeBootstrap(
  db: DatabaseClient,
  workflowJobId: string,
  now: Date = new Date()
): Promise<IntakeBootstrapResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const caseWithClient = await cases.findWithClientById(claimedJob.caseId);

    if (!caseWithClient) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const retryAt = buildRetryAt(now);
    const consentStatus = caseWithClient.clientRecord.consentStatus;

    if (caseWithClient.caseRecord.legalStatus === "human_triage_pending") {
      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "awaiting_human_triage",
          consentStatus
        },
        retryAt
      );

      await auditLogs.record({
        caseId: caseWithClient.caseRecord.id,
        actorType: "system",
        actorId: "intake-orchestrator",
        action: "intake.awaiting_human_triage",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          consentStatus
        }
      });

      logger.warn(
        `intake_blocked_human_triage caseId=${caseWithClient.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: caseWithClient.caseRecord.id,
        status: "blocked",
        nextStage: "awaiting_human_triage",
        retryAt: retryAt.toISOString()
      };
    }

    if (consentStatus !== "granted") {
      await cases.updateStatuses(caseWithClient.caseRecord.id, {
        commercialStatus: "awaiting_consent",
        legalStatus: "awaiting_consent"
      });

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "awaiting_consent",
          consentStatus
        },
        retryAt
      );

      await auditLogs.record({
        caseId: caseWithClient.caseRecord.id,
        actorType: "system",
        actorId: "intake-orchestrator",
        action: "intake.awaiting_consent",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          consentStatus
        }
      });

      logger.warn(
        `intake_blocked caseId=${caseWithClient.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: caseWithClient.caseRecord.id,
        status: "blocked",
        nextStage: "awaiting_consent",
        retryAt: retryAt.toISOString()
      };
    }

    await cases.updateStatuses(caseWithClient.caseRecord.id, {
      commercialStatus: "qualified",
      legalStatus: "triage_pending"
    });

    const triageJob = await workflowJobs.createOrGet({
      caseId: caseWithClient.caseRecord.id,
      jobType: triageClassificationJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "triage_pending",
        origin: "intake_bootstrap"
      }
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "triage_pending",
      consentStatus,
      triageWorkflowJobId: triageJob.id
    });

    await auditLogs.record({
      caseId: caseWithClient.caseRecord.id,
      actorType: "system",
      actorId: "intake-orchestrator",
      action: "triage.job_queued",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: triageJob.id,
        jobType: triageClassificationJobType
      }
    });

    logger.info(
      `intake_completed caseId=${caseWithClient.caseRecord.id} workflowJobId=${claimedJob.id} triageWorkflowJobId=${triageJob.id}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: caseWithClient.caseRecord.id,
      status: "completed",
      nextStage: "triage_pending",
      triageWorkflowJobId: triageJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runTriageClassification(
  db: DatabaseClient,
  workflowJobId: string
): Promise<TriageClassificationJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const classification = classifyCaseTriage({
      source: intakeContext.leadRecord.source,
      message: intakeContext.leadRecord.rawMessage
    });

    await triageAnalyses.upsert({
      caseId: intakeContext.caseRecord.id,
      caseType: classification.caseType,
      priority: classification.priority,
      urgency: classification.urgency,
      hasDamage: classification.hasDamage,
      legalPotential: classification.legalPotential,
      confidence: classification.confidence,
      rationale: classification.rationale
    });

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      caseType: classification.caseType,
      priority: classification.priority,
      urgency: classification.urgency,
      commercialStatus: "triaged",
      legalStatus: "triaged"
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "triaged",
      caseType: classification.caseType,
      confidence: classification.confidence
    });

    const journeyJob = await workflowJobs.createOrGet({
      caseId: intakeContext.caseRecord.id,
      jobType: journeyTimelineJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "journey_pending",
        origin: "triage_classification",
        caseType: classification.caseType
      }
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "triage-classifier",
      action: "triage.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        journeyWorkflowJobId: journeyJob.id,
        caseType: classification.caseType,
        priority: classification.priority,
        urgency: classification.urgency,
        legalPotential: classification.legalPotential,
        confidence: classification.confidence
      }
    });

    logger.info(
      `triage_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} journeyWorkflowJobId=${journeyJob.id} caseType=${classification.caseType}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage: "journey_pending",
      classification,
      journeyWorkflowJobId: journeyJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runJourneyTimeline(
  db: DatabaseClient,
  workflowJobId: string
): Promise<JourneyTimelineJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const journeyTimelines = new JourneyTimelineRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const triage = await triageAnalyses.findByCaseId(intakeContext.caseRecord.id);

    if (!triage) {
      const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "journey_pending",
          reason: "triage_analysis_missing"
        },
        retryAt
      );

      await auditLogs.record({
        caseId: intakeContext.caseRecord.id,
        actorType: "system",
        actorId: "journey-builder",
        action: "journey.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "triage_analysis_missing"
        }
      });

      logger.warn(
        `journey_blocked caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: intakeContext.caseRecord.id,
        status: "blocked",
        nextStage: "journey_pending",
        timelineEventCount: 0,
        retryAt: retryAt.toISOString()
      };
    }

    const triageInput = triageClassificationSchema.parse({
      caseType: triage.caseType,
      priority: triage.priority,
      urgency: triage.urgency,
      hasDamage: triage.hasDamage,
      legalPotential: triage.legalPotential,
      confidence: triage.confidence,
      rationale: triage.rationale
    });

    const timeline = buildPatientJourneyTimeline({
      caseId: intakeContext.caseRecord.id,
      source: intakeContext.leadRecord.source,
      message: intakeContext.leadRecord.rawMessage,
      triage: triageInput
    });

    await journeyTimelines.upsert({
      caseId: intakeContext.caseRecord.id,
      source: timeline.source,
      summary: timeline.summary,
      riskLevel: timeline.riskLevel,
      confidence: timeline.confidence,
      timeline
    });

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      legalStatus: "clinical_pending"
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "clinical_pending",
      riskLevel: timeline.riskLevel,
      confidence: timeline.confidence,
      eventCount: timeline.events.length
    });

    const clinicalJob = await workflowJobs.createOrGet({
      caseId: intakeContext.caseRecord.id,
      jobType: clinicalAnalysisJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "clinical_pending",
        origin: "journey_timeline",
        riskLevel: timeline.riskLevel
      }
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "journey-builder",
      action: "journey.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        clinicalWorkflowJobId: clinicalJob.id,
        riskLevel: timeline.riskLevel,
        confidence: timeline.confidence,
        eventCount: timeline.events.length
      }
    });

    logger.info(
      `journey_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} clinicalWorkflowJobId=${clinicalJob.id} eventCount=${timeline.events.length}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage: "clinical_pending",
      timelineEventCount: timeline.events.length,
      clinicalWorkflowJobId: clinicalJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runClinicalAnalysis(
  db: DatabaseClient,
  workflowJobId: string
): Promise<ClinicalAnalysisJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const journeyTimelines = new JourneyTimelineRepository(db);
  const clinicalAnalyses = new ClinicalAnalysisRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const triage = await triageAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const journey = await journeyTimelines.findByCaseId(intakeContext.caseRecord.id);

    if (!triage || !journey) {
      const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "clinical_pending",
          reason: "journey_or_triage_missing"
        },
        retryAt
      );

      await auditLogs.record({
        caseId: intakeContext.caseRecord.id,
        actorType: "system",
        actorId: "clinical-builder",
        action: "clinical.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "journey_or_triage_missing"
        }
      });

      logger.warn(
        `clinical_blocked caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: intakeContext.caseRecord.id,
        status: "blocked",
        nextStage: "clinical_pending",
        findingCount: 0,
        retryAt: retryAt.toISOString()
      };
    }

    const triageInput = triageClassificationSchema.parse({
      caseType: triage.caseType,
      priority: triage.priority,
      urgency: triage.urgency,
      hasDamage: triage.hasDamage,
      legalPotential: triage.legalPotential,
      confidence: triage.confidence,
      rationale: triage.rationale
    });
    const journeyInput = journeyTimelineSchema.parse(journey.timeline);
    const analysis = analyzeClinicalSignals({
      caseId: intakeContext.caseRecord.id,
      source: intakeContext.leadRecord.source,
      journey: journeyInput,
      triage: triageInput
    });

    await clinicalAnalyses.upsert({
      caseId: intakeContext.caseRecord.id,
      source: analysis.source,
      summary: analysis.summary,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      findings: analysis.findings
    });

    const rightsJob = await workflowJobs.createOrGet({
      caseId: intakeContext.caseRecord.id,
      jobType: rightsAssessmentJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "rights_pending",
        origin: "clinical_analysis",
        riskLevel: analysis.riskLevel
      }
    });

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      legalStatus: "rights_pending"
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "rights_pending",
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      findingCount: analysis.findings.length,
      rightsWorkflowJobId: rightsJob.id
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "clinical-analyzer",
      action: "clinical.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        rightsWorkflowJobId: rightsJob.id,
        riskLevel: analysis.riskLevel,
        confidence: analysis.confidence,
        findingCount: analysis.findings.length
      }
    });

    logger.info(
      `clinical_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} rightsWorkflowJobId=${rightsJob.id} findingCount=${analysis.findings.length}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage: "rights_pending",
      findingCount: analysis.findings.length,
      rightsWorkflowJobId: rightsJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runRightsAssessment(
  db: DatabaseClient,
  workflowJobId: string
): Promise<RightsAssessmentJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const journeyTimelines = new JourneyTimelineRepository(db);
  const clinicalAnalyses = new ClinicalAnalysisRepository(db);
  const rightsAssessments = new RightsAssessmentRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const triage = await triageAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const journey = await journeyTimelines.findByCaseId(intakeContext.caseRecord.id);
    const clinical = await clinicalAnalyses.findByCaseId(intakeContext.caseRecord.id);

    if (!triage || !journey || !clinical) {
      const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "rights_pending",
          reason: "clinical_or_dependencies_missing"
        },
        retryAt
      );

      await auditLogs.record({
        caseId: intakeContext.caseRecord.id,
        actorType: "system",
        actorId: "rights-assessor",
        action: "rights.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "clinical_or_dependencies_missing"
        }
      });

      logger.warn(
        `rights_blocked caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: intakeContext.caseRecord.id,
        status: "blocked",
        nextStage: "rights_pending",
        violationCount: 0,
        retryAt: retryAt.toISOString()
      };
    }

    const triageInput = triageClassificationSchema.parse({
      caseType: triage.caseType,
      priority: triage.priority,
      urgency: triage.urgency,
      hasDamage: triage.hasDamage,
      legalPotential: triage.legalPotential,
      confidence: triage.confidence,
      rationale: triage.rationale
    });
    const journeyInput = journeyTimelineSchema.parse(journey.timeline);
    const clinicalInput = clinicalAnalysisSchema.parse({
      caseId: clinical.caseId,
      source: clinical.source,
      summary: clinical.summary,
      riskLevel: clinical.riskLevel,
      confidence: clinical.confidence,
      findings: normalizeClinicalFindings(clinical.findings)
    });
    const assessment = assessPatientRights({
      caseId: intakeContext.caseRecord.id,
      source: intakeContext.leadRecord.source,
      message: intakeContext.leadRecord.rawMessage,
      consentStatus: intakeContext.clientRecord.consentStatus as
        | "pending"
        | "granted"
        | "revoked",
      triage: triageInput,
      journey: journeyInput,
      clinical: clinicalInput
    });

    await rightsAssessments.upsert({
      caseId: intakeContext.caseRecord.id,
      source: assessment.source,
      summary: assessment.summary,
      confidence: assessment.confidence,
      violationCount: assessment.violationCount,
      rights: assessment.rights
    });

    const evidenceJob = await workflowJobs.createOrGet({
      caseId: intakeContext.caseRecord.id,
      jobType: evidenceBuilderJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "evidence_pending",
        origin: "rights_assessment",
        violationCount: assessment.violationCount
      }
    });

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      legalStatus: "evidence_pending"
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "evidence_pending",
      confidence: assessment.confidence,
      violationCount: assessment.violationCount,
      evidenceWorkflowJobId: evidenceJob.id
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "rights-assessor",
      action: "rights.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        evidenceWorkflowJobId: evidenceJob.id,
        confidence: assessment.confidence,
        violationCount: assessment.violationCount
      }
    });

    logger.info(
      `rights_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} evidenceWorkflowJobId=${evidenceJob.id} violationCount=${assessment.violationCount}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage: "evidence_pending",
      violationCount: assessment.violationCount,
      evidenceWorkflowJobId: evidenceJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runEvidenceBuilder(
  db: DatabaseClient,
  workflowJobId: string
): Promise<EvidenceBuilderJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const journeyTimelines = new JourneyTimelineRepository(db);
  const clinicalAnalyses = new ClinicalAnalysisRepository(db);
  const rightsAssessments = new RightsAssessmentRepository(db);
  const evidenceChecklists = new EvidenceChecklistRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const triage = await triageAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const journey = await journeyTimelines.findByCaseId(intakeContext.caseRecord.id);
    const clinical = await clinicalAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const rights = await rightsAssessments.findByCaseId(intakeContext.caseRecord.id);

    if (!triage || !journey || !clinical || !rights) {
      const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "evidence_pending",
          reason: "evidence_dependencies_missing"
        },
        retryAt
      );

      await auditLogs.record({
        caseId: intakeContext.caseRecord.id,
        actorType: "system",
        actorId: "evidence-builder",
        action: "evidence.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "evidence_dependencies_missing"
        }
      });

      logger.warn(
        `evidence_blocked caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: intakeContext.caseRecord.id,
        status: "blocked",
        nextStage: "evidence_pending",
        checklistItemCount: 0,
        retryAt: retryAt.toISOString()
      };
    }

    const triageInput = triageClassificationSchema.parse({
      caseType: triage.caseType,
      priority: triage.priority,
      urgency: triage.urgency,
      hasDamage: triage.hasDamage,
      legalPotential: triage.legalPotential,
      confidence: triage.confidence,
      rationale: triage.rationale
    });
    const journeyInput = journeyTimelineSchema.parse(journey.timeline);
    const clinicalInput = clinicalAnalysisSchema.parse({
      caseId: clinical.caseId,
      source: clinical.source,
      summary: clinical.summary,
      riskLevel: clinical.riskLevel,
      confidence: clinical.confidence,
      findings: normalizeClinicalFindings(clinical.findings)
    });
    const parsedRights = rightsAssessmentSchema.parse({
      caseId: rights.caseId,
      source: rights.source,
      summary: rights.summary,
      confidence: rights.confidence,
      violationCount: rights.violationCount,
      rights: rights.rights
    });

    const checklist = buildEvidenceChecklist({
      caseId: intakeContext.caseRecord.id,
      source: intakeContext.leadRecord.source,
      triage: triageInput,
      journey: journeyInput,
      clinical: clinicalInput,
      rights: parsedRights
    });

    await evidenceChecklists.upsert({
      caseId: intakeContext.caseRecord.id,
      source: checklist.source,
      summary: checklist.summary,
      confidence: checklist.confidence,
      missingCount: checklist.missingCount,
      items: checklist.items,
      requiredInformationRequests: checklist.requiredInformationRequests
    });

    const scoreJob = await workflowJobs.createOrGet({
      caseId: intakeContext.caseRecord.id,
      jobType: legalScoreJobType,
      status: "queued",
      correlationId: claimedJob.correlationId,
      payload: {
        stage: "score_pending",
        origin: "evidence_builder",
        missingCount: checklist.missingCount
      }
    });

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      legalStatus: "score_pending"
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: "score_pending",
      checklistItemCount: checklist.items.length,
      missingCount: checklist.missingCount,
      scoreWorkflowJobId: scoreJob.id
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "evidence-builder",
      action: "evidence.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        scoreWorkflowJobId: scoreJob.id,
        checklistItemCount: checklist.items.length,
        missingCount: checklist.missingCount
      }
    });

    logger.info(
      `evidence_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} scoreWorkflowJobId=${scoreJob.id} checklistItemCount=${checklist.items.length}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage: "score_pending",
      checklistItemCount: checklist.items.length,
      scoreWorkflowJobId: scoreJob.id
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runLegalScore(
  db: DatabaseClient,
  workflowJobId: string
): Promise<LegalScoreJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const triageAnalyses = new TriageAnalysisRepository(db);
  const clinicalAnalyses = new ClinicalAnalysisRepository(db);
  const rightsAssessments = new RightsAssessmentRepository(db);
  const evidenceChecklists = new EvidenceChecklistRepository(db);
  const legalScores = new LegalScoreRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const intakeContext = await cases.findIntakeContextById(claimedJob.caseId);

    if (!intakeContext) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

    const triage = await triageAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const clinical = await clinicalAnalyses.findByCaseId(intakeContext.caseRecord.id);
    const rights = await rightsAssessments.findByCaseId(intakeContext.caseRecord.id);
    const evidence = await evidenceChecklists.findByCaseId(intakeContext.caseRecord.id);

    if (!triage || !clinical || !rights || !evidence) {
      const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "score_pending",
          reason: "score_dependencies_missing"
        },
        retryAt
      );

      await auditLogs.record({
        caseId: intakeContext.caseRecord.id,
        actorType: "system",
        actorId: "legal-scorer",
        action: "score.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "score_dependencies_missing"
        }
      });

      logger.warn(
        `score_blocked caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id}`
      );

      return {
        workflowJobId: claimedJob.id,
        caseId: intakeContext.caseRecord.id,
        status: "blocked",
        nextStage: "score_pending",
        viabilityScore: 0,
        reviewRequired: true,
        retryAt: retryAt.toISOString()
      };
    }

    const triageInput = triageClassificationSchema.parse({
      caseType: triage.caseType,
      priority: triage.priority,
      urgency: triage.urgency,
      hasDamage: triage.hasDamage,
      legalPotential: triage.legalPotential,
      confidence: triage.confidence,
      rationale: triage.rationale
    });
    const clinicalInput = clinicalAnalysisSchema.parse({
      caseId: clinical.caseId,
      source: clinical.source,
      summary: clinical.summary,
      riskLevel: clinical.riskLevel,
      confidence: clinical.confidence,
      findings: normalizeClinicalFindings(clinical.findings)
    });
    const rightsInput = rightsAssessmentSchema.parse({
      caseId: rights.caseId,
      source: rights.source,
      summary: rights.summary,
      confidence: rights.confidence,
      violationCount: rights.violationCount,
      rights: rights.rights
    });
    const evidenceInput = evidenceChecklistSchema.parse({
      caseId: evidence.caseId,
      source: evidence.source,
      summary: evidence.summary,
      confidence: evidence.confidence,
      missingCount: evidence.missingCount,
      items: evidence.items,
      requiredInformationRequests: evidence.requiredInformationRequests
    });

    const score = calculateLegalScore({
      caseId: intakeContext.caseRecord.id,
      triage: triageInput,
      clinical: clinicalInput,
      rights: rightsInput,
      evidence: evidenceInput
    });
    const normalizedScore = legalScoreSchema.parse(score);

    await legalScores.upsert({
      caseId: intakeContext.caseRecord.id,
      viabilityScore: normalizedScore.viabilityScore,
      complexity: normalizedScore.complexity,
      estimatedValueCents: normalizedScore.estimatedValueCents,
      confidence: normalizedScore.confidence,
      reviewRequired: normalizedScore.reviewRequired,
      reviewReasons: normalizedScore.reviewReasons,
      rationale: normalizedScore.rationale
    });

    const nextStage = normalizedScore.reviewRequired ? "human_review_required" : "score_ready";

    await cases.updateStatuses(intakeContext.caseRecord.id, {
      legalStatus: nextStage
    });

    await workflowJobs.markCompleted(claimedJob.id, {
      stage: nextStage,
      viabilityScore: normalizedScore.viabilityScore,
      complexity: normalizedScore.complexity,
      confidence: normalizedScore.confidence,
      reviewRequired: normalizedScore.reviewRequired,
      reviewReasons: normalizedScore.reviewReasons
    });

    await auditLogs.record({
      caseId: intakeContext.caseRecord.id,
      actorType: "agent",
      actorId: "legal-scorer",
      action: "score.completed",
      correlationId: claimedJob.correlationId,
      afterPayload: {
        workflowJobId: claimedJob.id,
        viabilityScore: normalizedScore.viabilityScore,
        complexity: normalizedScore.complexity,
        confidence: normalizedScore.confidence,
        reviewRequired: normalizedScore.reviewRequired
      }
    });

    logger.info(
      `score_completed caseId=${intakeContext.caseRecord.id} workflowJobId=${claimedJob.id} viabilityScore=${normalizedScore.viabilityScore} reviewRequired=${String(normalizedScore.reviewRequired)}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: intakeContext.caseRecord.id,
      status: "completed",
      nextStage,
      viabilityScore: normalizedScore.viabilityScore,
      reviewRequired: normalizedScore.reviewRequired
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

export async function runLegalExecution(
  db: DatabaseClient,
  workflowJobId: string
): Promise<LegalExecutionJobResult> {
  const workflowJobs = new WorkflowJobRepository(db);
  const cases = new CaseRepository(db);
  const legalBriefInputs = new LegalBriefInputRepository(db);
  const legalArtifacts = new LegalArtifactRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const claimedJob = await workflowJobs.claim(workflowJobId);

  if (!claimedJob) {
    throw new Error("workflow_job_not_claimable");
  }

  try {
    if (!claimedJob.caseId) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "missing_case_id"
      });

      throw new Error("workflow_job_missing_case_id");
    }

    const caseRecord = await cases.findById(claimedJob.caseId);

    if (!caseRecord) {
      await workflowJobs.markFailed(claimedJob.id, {
        reason: "case_not_found"
      });

      throw new Error("workflow_job_case_not_found");
    }

      if (caseRecord.legalStatus !== "legal_execution_pending") {
        const retryAt = buildRetryAt(new Date());

      await workflowJobs.markBlocked(
        claimedJob.id,
        {
          stage: "legal_execution_pending",
          reason: "invalid_case_stage",
          currentLegalStatus: caseRecord.legalStatus
        },
        retryAt
      );

      await auditLogs.record({
        caseId: caseRecord.id,
        actorType: "system",
        actorId: "legal-executor",
        action: "legal_execution.blocked",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          retryAt: retryAt.toISOString(),
          reason: "invalid_case_stage",
          currentLegalStatus: caseRecord.legalStatus
        }
      });

      logger.warn(`legal_execution_blocked caseId=${caseRecord.id} workflowJobId=${claimedJob.id}`);

        return {
          workflowJobId: claimedJob.id,
          caseId: caseRecord.id,
          status: "blocked",
          nextStage: "legal_execution_pending",
          retryAt: retryAt.toISOString()
        };
      }

      const legalBriefInput = await legalBriefInputs.findByCaseId(caseRecord.id);

      if (!legalBriefInput) {
        const retryAt = buildRetryAt(new Date());

        await workflowJobs.markBlocked(
          claimedJob.id,
          {
            stage: "legal_execution_pending",
            reason: "legal_brief_missing",
            currentLegalStatus: caseRecord.legalStatus
          },
          retryAt
        );

        await auditLogs.record({
          caseId: caseRecord.id,
          actorType: "system",
          actorId: "legal-executor",
          action: "legal_execution.blocked",
          correlationId: claimedJob.correlationId,
          afterPayload: {
            workflowJobId: claimedJob.id,
            retryAt: retryAt.toISOString(),
            reason: "legal_brief_missing",
            currentLegalStatus: caseRecord.legalStatus
          }
        });

        logger.warn(`legal_execution_blocked_missing_brief caseId=${caseRecord.id} workflowJobId=${claimedJob.id}`);

        return {
          workflowJobId: claimedJob.id,
          caseId: caseRecord.id,
          status: "blocked",
          nextStage: "legal_execution_pending",
          retryAt: retryAt.toISOString()
        };
      }

      const formattedSubmission = formatLegalBriefInput(legalBriefInput);
      const generatedDraft = buildCivilHealthLegalDraft(formattedSubmission);
      const supportingDocumentPack = buildCivilHealthSupportingDocumentPack(formattedSubmission);

      await legalArtifacts.createVersion({
        caseId: caseRecord.id,
        sourceWorkflowJobId: legalBriefInput.sourceWorkflowJobId,
        artifactType: "civil_health_draft",
        status: "final",
        title: generatedDraft.title,
        subtitle: generatedDraft.subtitle,
        summary: generatedDraft.summary,
        contentMarkdown: generatedDraft.markdown,
        metadata: {
          draftScope: generatedDraft.draftScope,
          source: "legal_execution_agent",
          documentCount: supportingDocumentPack.documents.length
        }
      });

      for (const document of supportingDocumentPack.documents) {
        await legalArtifacts.createVersion({
          caseId: caseRecord.id,
          sourceWorkflowJobId: legalBriefInput.sourceWorkflowJobId,
          artifactType: document.type,
          status: "final",
          title: document.title,
          subtitle: document.subtitle,
          summary: document.summary,
          contentMarkdown: document.markdown,
          metadata: {
            draftScope: supportingDocumentPack.draftScope,
            source: "legal_execution_agent",
            documentKey: document.key
          }
        });
      }

      await cases.updateStatuses(caseRecord.id, {
        legalStatus: "legal_execution_in_progress"
      });

      await workflowJobs.markCompleted(claimedJob.id, {
        stage: "legal_execution_in_progress",
        generatedArtifactTypes: [
          "civil_health_draft",
          ...supportingDocumentPack.documents.map((document) => document.type)
        ]
      });

      await auditLogs.record({
        caseId: caseRecord.id,
        actorType: "system",
        actorId: "legal-executor",
        action: "legal_execution.started",
        correlationId: claimedJob.correlationId,
        afterPayload: {
          workflowJobId: claimedJob.id,
          nextStage: "legal_execution_in_progress",
          generatedArtifactTypes: [
            "civil_health_draft",
            ...supportingDocumentPack.documents.map((document) => document.type)
          ],
          legalBrief: {
            problemType: legalBriefInput.problemType,
            urgency: legalBriefInput.currentUrgency,
            keyDatesCount: legalBriefInput.keyDates.length,
            documentsAttachedCount: legalBriefInput.documentsAttached.length,
            witnessesCount: legalBriefInput.witnesses.length
          }
        }
      });

    logger.info(
      `legal_execution_started caseId=${caseRecord.id} workflowJobId=${claimedJob.id}`
    );

    return {
      workflowJobId: claimedJob.id,
      caseId: caseRecord.id,
      status: "completed",
      nextStage: "legal_execution_in_progress"
    };
  } catch (error) {
    await handleWorkflowFailure(workflowJobs, claimedJob.id, error);
    throw error;
  }
}

function formatLegalBriefInput(record: LegalBriefInputRecord): CivilHealthBriefInput {
  return {
    draftScope: "civil_health" as const,
    patientFullName: record.patientFullName,
    patientCpf: record.patientCpf,
    city: record.city,
    contact: record.contact,
    patientAddress: record.patientAddress,
    patientWhatsapp: record.patientWhatsapp,
    patientEmail: record.patientEmail,
    patientRg: record.patientRg,
    relationToPatient: record.relationToPatient,
    contactFullName: record.contactFullName,
    contactAddress: record.contactAddress,
    contactWhatsapp: record.contactWhatsapp,
    contactEmail: record.contactEmail,
    contactCpf: record.contactCpf,
    contactRg: record.contactRg,
    problemType: record.problemType as CivilHealthBriefInput["problemType"],
    currentUrgency: record.currentUrgency as CivilHealthBriefInput["currentUrgency"],
    keyDates: record.keyDates,
    objectiveDescription: record.objectiveDescription,
    materialLosses: record.materialLosses,
    moralImpact: record.moralImpact,
    uploadedDocuments: record.uploadedDocuments ?? [],
    documentsAttached: record.documentsAttached,
    witnesses: record.witnesses,
    mainRequest: record.mainRequest,
    subsidiaryRequest: record.subsidiaryRequest
  };
}

export async function drainIntakeBootstrapQueue(
  db: DatabaseClient,
  limit: number,
  now: Date = new Date()
) {
  return drainQueue(db, intakeBootstrapJobType, limit, (jobId) =>
    runIntakeBootstrap(db, jobId, now)
  );
}

export async function drainTriageClassificationQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, triageClassificationJobType, limit, (jobId) =>
    runTriageClassification(db, jobId)
  );
}

export async function drainJourneyTimelineQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, journeyTimelineJobType, limit, (jobId) => runJourneyTimeline(db, jobId));
}

export async function drainClinicalAnalysisQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, clinicalAnalysisJobType, limit, (jobId) => runClinicalAnalysis(db, jobId));
}

export async function drainRightsAssessmentQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, rightsAssessmentJobType, limit, (jobId) => runRightsAssessment(db, jobId));
}

export async function drainEvidenceBuilderQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, evidenceBuilderJobType, limit, (jobId) => runEvidenceBuilder(db, jobId));
}

export async function drainLegalScoreQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, legalScoreJobType, limit, (jobId) => runLegalScore(db, jobId));
}

export async function drainLegalExecutionQueue(db: DatabaseClient, limit: number) {
  return drainQueue(db, legalExecutionJobType, limit, (jobId) => runLegalExecution(db, jobId));
}

export { buildCivilHealthLegalDraft } from "./legal-draft";
export { buildCivilHealthSupportingDocumentPack } from "./legal-supporting-documents";

async function drainQueue<T>(
  db: DatabaseClient,
  jobType: string,
  limit: number,
  handler: (jobId: string) => Promise<T>
) {
  const workflowJobs = new WorkflowJobRepository(db);
  const readyJobs = await workflowJobs.listReady(jobType, new Date(), limit);
  const results: T[] = [];

  for (const job of readyJobs) {
    try {
      const result = await handler(job.id);
      results.push(result);
    } catch (error) {
      logger.error(
        `workflow_job_failed jobType=${jobType} workflowJobId=${job.id} error=${
          error instanceof Error ? error.message : "unknown"
        }`
      );
    }
  }

  return {
    jobType,
    processed: results.length,
    results
  };
}

async function handleWorkflowFailure(
  workflowJobs: WorkflowJobRepository,
  workflowJobId: string,
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message !== "workflow_job_missing_case_id" &&
    error.message !== "workflow_job_case_not_found"
  ) {
    await workflowJobs.markFailed(workflowJobId, {
      reason: error.message
    });
  }
}

function buildRetryAt(now: Date) {
  return new Date(now.getTime() + 15 * 60 * 1000);
}

function normalizeClinicalFindings(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object" && "findings" in value) {
    const nested = (value as { findings?: unknown }).findings;
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}
