import { humanTriageDecisionSchema, workflowJobTypes } from "@safetycare/ai-contracts";
import { AuditLogRepository, CaseRepository, WorkflowJobRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);

  if (!hasOperationsAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

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

  const validation = humanTriageDecisionSchema.safeParse(payload);

  if (!validation.success) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_payload",
        details: validation.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);
    const auditLogs = new AuditLogRepository(db);
    const caseWithClient = await cases.findWithClientById(caseId);

    if (!caseWithClient) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    const bootstrapJob = await workflowJobs.findLatestByCaseIdAndType(caseId, workflowJobTypes[0]);

    if (!bootstrapJob) {
      return NextResponse.json(
        {
          correlationId,
          error: "bootstrap_job_not_found"
        },
        { status: 409 }
      );
    }

    const decision = validation.data.decision;
    const reviewerId = validation.data.reviewerId;
    const note = validation.data.note?.trim() ? validation.data.note.trim() : "";
    const consentGranted = caseWithClient.clientRecord.consentStatus === "granted";

    let workflowJobStatus = bootstrapJob.status;

    const nextStatuses =
      decision === "approve"
        ? consentGranted
          ? {
              commercialStatus: "screening",
              legalStatus: "intake"
            }
          : {
              commercialStatus: "awaiting_consent",
              legalStatus: "awaiting_consent"
            }
        : {
            commercialStatus: "closed_lost",
            legalStatus: "closed_lost"
          };

    const caseStatus = await cases.updateStatuses(caseId, nextStatuses);

    if (decision === "approve" && bootstrapJob.status === "blocked") {
      await workflowJobs.requeue(bootstrapJob.id);
      workflowJobStatus = "queued";
    }

    if (decision === "reject" && bootstrapJob.status !== "completed") {
      await workflowJobs.markCompleted(bootstrapJob.id, {
        stage: "human_triage_rejected",
        decision,
        reviewerId
      });
      workflowJobStatus = "completed";
    }

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: reviewerId,
      action: decision === "approve" ? "intake.human_triage_approved" : "intake.human_triage_rejected",
      correlationId,
      beforePayload: {
        commercialStatus: caseWithClient.caseRecord.commercialStatus,
        legalStatus: caseWithClient.caseRecord.legalStatus,
        workflowJobStatus: bootstrapJob.status
      },
      afterPayload: {
        decision,
        note,
        workflowJobStatus,
        caseStatus
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        decision,
        workflowJobStatus,
        caseStatus
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "human_triage_update_failed"
      },
      { status: 500 }
    );
  }
}
