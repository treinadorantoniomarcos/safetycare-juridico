import {
  legalBriefInputSchema,
  type LegalDocumentPack,
  type LegalDraft,
  type LegalBriefInput
} from "@safetycare/ai-contracts";
import {
  AuditLogRepository,
  CaseRepository,
  LegalBriefInputRepository,
  WorkflowJobRepository
} from "@safetycare/database";
import {
  buildCivilHealthLegalDraft,
  buildCivilHealthSupportingDocumentPack
} from "@safetycare/orchestrator";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import {
  isBriefClosed,
  isBriefLocked,
  isValidPublicCaseAccessToken
} from "../../../../../../../src/features/intake/public-legal-brief-access";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

type LegalBriefSubmission = Omit<LegalBriefInput, "caseId" | "workflowJobId"> & {
  submittedAt: string;
  updatedAt: string;
};

type LegalBriefDraftResponse = LegalDraft;

type LegalSupportingDocumentPackResponse = LegalDocumentPack;

type LegalBriefReadyResponse = {
  status: "ready";
  submission: LegalBriefSubmission | null;
  draft: LegalBriefDraftResponse | null;
  supportingDocumentPack: LegalSupportingDocumentPackResponse | null;
};

const workflowJobIdSchema = z.string().uuid();

function normalizeWorkflowJobId(url: URL) {
  const workflowJobId = url.searchParams.get("workflowJobId");
  return workflowJobId?.trim();
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatSubmission(record: {
  draftScope: string;
  patientFullName: string;
  patientCpf: string;
  city: string;
  contact: string;
  patientAddress: string;
  patientWhatsapp: string;
  patientEmail: string;
  patientRg: string;
  relationToPatient: string;
  contactFullName: string;
  contactAddress: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactCpf: string;
  contactRg: string;
  problemType: string;
  currentUrgency: string;
  keyDates: Array<{ label: string; date: string }>;
  objectiveDescription: string;
  materialLosses: string;
  moralImpact: string;
  uploadedDocuments: Array<{
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
    uploadedAt: string;
  }>;
  documentsAttached: string[];
  witnesses: string[];
  mainRequest: string;
  subsidiaryRequest: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): LegalBriefSubmission {
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
    const parsedWorkflowJobId = workflowJobIdSchema.safeParse(workflowJobId);

    if (!parsedWorkflowJobId.success) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_workflow_job_id"
        },
        { status: 400 }
      );
    }

    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);
    const legalBriefInputs = new LegalBriefInputRepository(db);

    const caseRecord = await cases.findById(caseId);

    if (!caseRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    const workflowJob = await workflowJobs.findById(parsedWorkflowJobId.data);

    if (!workflowJob || !isValidPublicCaseAccessToken(caseId, workflowJob)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_access"
        },
        { status: 403 }
      );
    }

    if (isBriefClosed(caseRecord)) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_closed"
        },
        { status: 409 }
      );
    }

    if (isBriefLocked(caseRecord.legalStatus)) {
      return NextResponse.json(
        {
          correlationId,
          status: "processing",
          caseId,
          workflowJobId,
          message: "A etapa de parâmetros ainda não foi liberada pela análise humana."
        },
        { status: 202 }
      );
    }

    const submission = await legalBriefInputs.findByCaseId(caseId);
    const formattedSubmission = submission ? formatSubmission(submission) : null;

    return NextResponse.json(
      {
        correlationId,
        status: "ready",
        caseId,
        workflowJobId,
        submission: formattedSubmission,
        draft: formattedSubmission ? buildCivilHealthLegalDraft(formattedSubmission) : null,
        supportingDocumentPack: formattedSubmission
          ? buildCivilHealthSupportingDocumentPack(formattedSubmission)
          : null
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "legal_brief_fetch_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_json"
      },
      { status: 400 }
    );
  }

  const parsedPayload = legalBriefInputSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_payload",
        details: parsedPayload.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);
    const legalBriefInputs = new LegalBriefInputRepository(db);
    const auditLogs = new AuditLogRepository(db);

    const caseRecord = await cases.findById(caseId);

    if (!caseRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    const workflowJob = await workflowJobs.findById(parsedPayload.data.workflowJobId);

    if (!workflowJob || !isValidPublicCaseAccessToken(caseId, workflowJob)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_access"
        },
        { status: 403 }
      );
    }

    if (isBriefClosed(caseRecord)) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_closed"
        },
        { status: 409 }
      );
    }

    if (isBriefLocked(caseRecord.legalStatus)) {
      return NextResponse.json(
        {
          correlationId,
          error: "brief_not_ready"
        },
        { status: 409 }
      );
    }

    const existingSubmission = await legalBriefInputs.findByCaseId(caseId);

    const savedSubmission = await legalBriefInputs.upsert({
      caseId,
      sourceWorkflowJobId: parsedPayload.data.workflowJobId,
      draftScope: parsedPayload.data.draftScope,
      patientFullName: parsedPayload.data.patientFullName,
      patientCpf: parsedPayload.data.patientCpf,
      city: parsedPayload.data.city,
      contact: parsedPayload.data.contact,
      patientAddress: parsedPayload.data.patientAddress,
      patientWhatsapp: parsedPayload.data.patientWhatsapp,
      patientEmail: parsedPayload.data.patientEmail,
      patientRg: parsedPayload.data.patientRg,
      relationToPatient: parsedPayload.data.relationToPatient,
      contactFullName: parsedPayload.data.contactFullName,
      contactAddress: parsedPayload.data.contactAddress,
      contactWhatsapp: parsedPayload.data.contactWhatsapp,
      contactEmail: parsedPayload.data.contactEmail,
      contactCpf: parsedPayload.data.contactCpf,
      contactRg: parsedPayload.data.contactRg,
      problemType: parsedPayload.data.problemType,
      currentUrgency: parsedPayload.data.currentUrgency,
      keyDates: parsedPayload.data.keyDates,
      objectiveDescription: parsedPayload.data.objectiveDescription,
      materialLosses: parsedPayload.data.materialLosses,
      moralImpact: parsedPayload.data.moralImpact,
      uploadedDocuments: parsedPayload.data.uploadedDocuments,
      documentsAttached: parsedPayload.data.documentsAttached,
      witnesses: parsedPayload.data.witnesses,
      mainRequest: parsedPayload.data.mainRequest,
      subsidiaryRequest: parsedPayload.data.subsidiaryRequest
    });

    const formattedSavedSubmission = formatSubmission(savedSubmission);
    const generatedDraft = buildCivilHealthLegalDraft(formattedSavedSubmission);
    const supportingDocumentPack = buildCivilHealthSupportingDocumentPack(formattedSavedSubmission);

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: "public-legal-brief-form",
      action: "intake.legal_brief_submitted",
      correlationId,
      beforePayload: existingSubmission ? formatSubmission(existingSubmission) : null,
      afterPayload: {
        ...formattedSavedSubmission,
        caseId,
        sourceWorkflowJobId: parsedPayload.data.workflowJobId,
        savedArtifactTypes: []
      }
    });

    return NextResponse.json(
      {
        correlationId,
        status: "accepted",
        caseId,
        workflowJobId: parsedPayload.data.workflowJobId,
        submission: formattedSavedSubmission,
        draft: generatedDraft,
        supportingDocumentPack
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "legal_brief_submission_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
