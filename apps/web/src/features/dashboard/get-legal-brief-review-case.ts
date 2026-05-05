import {
  type LegalBriefInput,
  type LegalDocumentPack,
  type LegalDraft,
  workflowJobTypes
} from "@safetycare/ai-contracts";
import {
  CaseRepository,
  LegalArtifactRepository,
  LegalBriefInputRepository,
  type LegalArtifactRecord,
  type LegalBriefInputRecord,
  WorkflowJobRepository
} from "@safetycare/database";
import {
  buildCivilHealthLegalDraft,
  buildCivilHealthSupportingDocumentPack
} from "@safetycare/orchestrator";
import { getDatabaseClient } from "../../lib/database";

export type LegalBriefSubmissionView = Omit<LegalBriefInput, "caseId" | "workflowJobId"> & {
  submittedAt: string;
  updatedAt: string;
};

export type LegalBriefReviewArtifactView = {
  artifactType: string;
  contentMarkdown: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  status: string;
  subtitle: string;
  summary: string;
  title: string;
  updatedAt: string;
  versionNumber: number;
};

export type LegalBriefReviewJobView = {
  createdAt: string;
  id: string;
  jobType: string;
  runAfter: string | null;
  status: string;
};

export type LegalBriefReviewCase = {
  caseId: string;
  commercialStatus: string;
  client: {
    consentStatus: string;
    email: string | null;
    fullName: string;
    phone: string | null;
  };
  caseUpdatedAt: string;
  draft: LegalDraft | null;
  legalExecutionJob: LegalBriefReviewJobView | null;
  legalStatus: string;
  supportingDocumentPack: LegalDocumentPack | null;
  submission: LegalBriefSubmissionView | null;
  artifacts: LegalBriefReviewArtifactView[];
};

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatSubmission(record: LegalBriefInputRecord): LegalBriefSubmissionView {
  return {
    draftScope: "civil_health",
    patientFullName: record.patientFullName,
    patientCpf: record.patientCpf,
    city: record.city,
    contact: record.contact,
    patientAddress: record.patientAddress ?? "",
    patientWhatsapp: record.patientWhatsapp ?? "",
    patientEmail: record.patientEmail ?? "",
    patientRg: record.patientRg ?? "",
    relationToPatient: record.relationToPatient,
    contactFullName: record.contactFullName ?? "",
    contactAddress: record.contactAddress ?? "",
    contactWhatsapp: record.contactWhatsapp ?? "",
    contactEmail: record.contactEmail ?? "",
    contactCpf: record.contactCpf ?? "",
    contactRg: record.contactRg ?? "",
    problemType: record.problemType as LegalBriefInput["problemType"],
    currentUrgency: record.currentUrgency as LegalBriefInput["currentUrgency"],
    keyDates: record.keyDates,
    objectiveDescription: record.objectiveDescription,
    materialLosses: record.materialLosses,
    moralImpact: record.moralImpact,
    uploadedDocuments: record.uploadedDocuments ?? [],
    documentsAttached: record.documentsAttached,
    witnesses: record.witnesses,
    mainRequest: record.mainRequest,
    subsidiaryRequest: record.subsidiaryRequest,
    submittedAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt)
  };
}

function formatArtifact(record: LegalArtifactRecord): LegalBriefReviewArtifactView {
  return {
    artifactType: record.artifactType,
    contentMarkdown: record.contentMarkdown,
    createdAt: toIsoDate(record.createdAt),
    metadata: record.metadata ?? {},
    status: record.status,
    subtitle: record.subtitle,
    summary: record.summary,
    title: record.title,
    updatedAt: toIsoDate(record.updatedAt),
    versionNumber: record.versionNumber
  };
}

function formatJob(job: NonNullable<Awaited<ReturnType<WorkflowJobRepository["findLatestByCaseIdAndType"]>>> | undefined) {
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

export async function getLegalBriefReviewCase(caseId: string): Promise<LegalBriefReviewCase | null> {
  const { db } = getDatabaseClient();
  const cases = new CaseRepository(db);
  const legalBriefInputs = new LegalBriefInputRepository(db);
  const legalArtifacts = new LegalArtifactRepository(db);
  const workflowJobs = new WorkflowJobRepository(db);

  const caseWithClient = await cases.findWithClientById(caseId);

  if (!caseWithClient) {
    return null;
  }

  const submissionRecord = await legalBriefInputs.findByCaseId(caseId);
  const submission = submissionRecord ? formatSubmission(submissionRecord) : null;
  const draft = submission ? buildCivilHealthLegalDraft(submission) : null;
  const supportingDocumentPack = submission ? buildCivilHealthSupportingDocumentPack(submission) : null;
  const legalExecutionJob = formatJob(
    await workflowJobs.findLatestByCaseIdAndType(caseId, workflowJobTypes[7])
  );
  const artifacts = (await legalArtifacts.listByCaseId(caseId)).map(formatArtifact);

  return {
    caseId: caseWithClient.caseRecord.id,
    commercialStatus: caseWithClient.caseRecord.commercialStatus,
    client: {
      consentStatus: caseWithClient.clientRecord.consentStatus,
      email: caseWithClient.clientRecord.email,
      fullName: caseWithClient.clientRecord.fullName,
      phone: caseWithClient.clientRecord.phone
    },
    caseUpdatedAt: toIsoDate(caseWithClient.caseRecord.updatedAt),
    draft,
    legalExecutionJob,
    legalStatus: caseWithClient.caseRecord.legalStatus,
    supportingDocumentPack,
    submission,
    artifacts
  };
}
