import {
  evidenceChecklistItemSchema,
  evidenceInformationRequestSchema,
  workflowJobTypes
} from "@safetycare/ai-contracts";
import {
  AuditLogRepository,
  CaseRepository,
  EvidenceChecklistRepository,
  WorkflowJobRepository
} from "@safetycare/database";
import { NextResponse } from "next/server";
import { z } from "zod";
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

const completionPayloadSchema = z.object({
  workflowJobId: z.string().uuid(),
  contactEmail: z
    .string()
    .trim()
    .email()
    .max(180)
    .optional()
    .or(z.literal("")),
  preferredContactWindow: z.string().trim().max(120).optional(),
  additionalContext: z.string().trim().max(4000).optional(),
  consentToContact: z.literal(true),
  responses: z
    .array(
      z.object({
        requestKey: z.string().trim().min(1).max(120),
        answer: z.string().trim().max(2000).default(""),
        provided: z.boolean().default(false)
      })
    )
    .max(100)
    .default([]),
  documentsDeclared: z.array(z.string().trim().min(1).max(180)).max(30).default([])
});

function normalizeWorkflowJobId(url: URL) {
  const workflowJobId = url.searchParams.get("workflowJobId");
  return workflowJobId?.trim();
}

function isValidPublicCaseAccessToken(caseId: string, workflowJob: { caseId: string | null; jobType: string }) {
  return workflowJob.caseId === caseId && workflowJob.jobType === workflowJobTypes[0];
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
    const evidenceChecklists = new EvidenceChecklistRepository(db);

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

    const workflowJob = await workflowJobs.findById(workflowJobId);

    if (!workflowJob || !isValidPublicCaseAccessToken(caseId, workflowJob)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_access"
        },
        { status: 403 }
      );
    }

    const evidence = await evidenceChecklists.findByCaseId(caseId);

    if (!evidence) {
      return NextResponse.json(
        {
          correlationId,
          status: "processing",
          caseId,
          workflowJobId,
          message: "Ainda estamos estruturando a lista de documentos do seu caso."
        },
        { status: 202 }
      );
    }

    const requirements = evidenceInformationRequestSchema
      .array()
      .safeParse(evidence.requiredInformationRequests);
    const checklistItems = evidenceChecklistItemSchema.array().safeParse(evidence.items);
    const missingItems = checklistItems.success
      ? checklistItems.data.filter((item) => item.status !== "present")
      : [];

    return NextResponse.json(
      {
        correlationId,
        status: "ready",
        caseId,
        workflowJobId,
        evidenceSummary: evidence.summary,
        missingCount: evidence.missingCount,
        requiredInformationRequests: requirements.success ? requirements.data : [],
        missingChecklistItems: missingItems
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "requirements_fetch_failed",
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

  const parsedPayload = completionPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_payload"
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);
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

    const evidenceBuilderJob = await workflowJobs.findLatestByCaseIdAndType(
      caseId,
      workflowJobTypes[5]
    );

    if (evidenceBuilderJob?.status === "blocked") {
      await workflowJobs.requeue(evidenceBuilderJob.id);
    }

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: "public-intake-form",
      action: "intake.client_information_submitted",
      correlationId,
      afterPayload: {
        contactEmail: parsedPayload.data.contactEmail || null,
        preferredContactWindow: parsedPayload.data.preferredContactWindow || null,
        additionalContext: parsedPayload.data.additionalContext || null,
        responses: parsedPayload.data.responses,
        documentsDeclared: parsedPayload.data.documentsDeclared,
        sourceWorkflowJobId: parsedPayload.data.workflowJobId
      }
    });

    return NextResponse.json(
      {
        correlationId,
        status: "accepted",
        caseId,
        workflowJobId: parsedPayload.data.workflowJobId
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "requirements_submission_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
