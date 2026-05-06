import { workflowJobTypes } from "@safetycare/ai-contracts";
import { CaseRepository, LegalScoreRepository, WorkflowJobRepository } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

export type HumanTriageReviewJobView = {
  createdAt: string;
  id: string;
  jobType: string;
  runAfter: string | null;
  status: string;
};

export type HumanTriageReviewCase = {
  caseId: string;
  caseType: string | null;
  commercialStatus: string;
  client: {
    consentStatus: string;
    email: string | null;
    fullName: string;
    phone: string | null;
  };
  caseUpdatedAt: string;
  legalStatus: string;
  lead: {
    metadata: Record<string, unknown>;
    name: string | null;
    phone: string | null;
    rawMessage: string;
    receivedAt: string;
    source: string;
  };
  priority: string;
  urgency: string;
  score: Awaited<ReturnType<LegalScoreRepository["findByCaseId"]>> | null;
  bootstrapJob: HumanTriageReviewJobView | null;
};

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatJob(
  job: Awaited<ReturnType<WorkflowJobRepository["findLatestByCaseIdAndType"]>>
): HumanTriageReviewJobView | null {
  if (!job) {
    return null;
  }

  return {
    createdAt: toIsoDate(job.createdAt),
    id: job.id,
    jobType: job.jobType,
    runAfter: job.runAfter ? toIsoDate(job.runAfter) : null,
    status: job.status
  };
}

export async function getHumanTriageReviewCase(
  caseId: string
): Promise<HumanTriageReviewCase | null> {
  const { db } = getDatabaseClient();
  const cases = new CaseRepository(db);
  const legalScores = new LegalScoreRepository(db);
  const workflowJobs = new WorkflowJobRepository(db);

  const intakeContext = await cases.findIntakeContextById(caseId);

  if (!intakeContext) {
    return null;
  }

  const [score, bootstrapJob] = await Promise.all([
    legalScores.findByCaseId(caseId),
    workflowJobs.findLatestByCaseIdAndType(caseId, workflowJobTypes[0])
  ]);

  return {
    caseId: intakeContext.caseRecord.id,
    caseType: intakeContext.caseRecord.caseType,
    commercialStatus: intakeContext.caseRecord.commercialStatus,
    client: {
      consentStatus: intakeContext.clientRecord.consentStatus,
      email: intakeContext.clientRecord.email,
      fullName: intakeContext.clientRecord.fullName,
      phone: intakeContext.clientRecord.phone
    },
    caseUpdatedAt: toIsoDate(intakeContext.caseRecord.updatedAt),
    legalStatus: intakeContext.caseRecord.legalStatus,
    lead: {
      metadata:
        intakeContext.leadRecord.metadata && typeof intakeContext.leadRecord.metadata === "object"
          ? (intakeContext.leadRecord.metadata as Record<string, unknown>)
          : {},
      name: intakeContext.leadRecord.name,
      phone: intakeContext.leadRecord.phone,
      rawMessage: intakeContext.leadRecord.rawMessage,
      receivedAt: toIsoDate(intakeContext.leadRecord.receivedAt),
      source: intakeContext.leadRecord.source
    },
    priority: intakeContext.caseRecord.priority,
    urgency: intakeContext.caseRecord.urgency,
    score,
    bootstrapJob: formatJob(bootstrapJob)
  };
}
