import { scoreReviewDecisionSchema, workflowJobTypes } from "@safetycare/ai-contracts";
import {
  AuditLogRepository,
  CaseRepository,
  LegalBriefInputRepository,
  type WorkflowJobRecord,
  WorkflowJobRepository
} from "@safetycare/database";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

function canAccess(request: Request) {
  return hasDashboardSessionFromRequest(request) || hasOperationsAccess(request);
}

function isReviewableLegalStatus(legalStatus: string) {
  return legalStatus === "conversion_pending" || legalStatus === "legal_execution_pending";
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);

  if (!canAccess(request)) {
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

  const validation = scoreReviewDecisionSchema.safeParse(payload);

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

    const brief = await legalBriefInputs.findByCaseId(caseId);

    if (!brief) {
      return NextResponse.json(
        {
          correlationId,
          error: "legal_brief_missing"
        },
        { status: 404 }
      );
    }

    const decision = validation.data.decision;
    const reviewerId = validation.data.reviewerId;
    const note = validation.data.note?.trim() ? validation.data.note.trim() : "";

    if (!isReviewableLegalStatus(caseRecord.legalStatus)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_stage"
        },
        { status: 409 }
      );
    }

    const beforeStatus = {
      commercialStatus: caseRecord.commercialStatus,
      legalStatus: caseRecord.legalStatus
    };

    if (decision === "approve") {
      const updatedCase = await cases.updateStatuses(caseId, {
        legalStatus: "legal_execution_pending"
      });

      if (!updatedCase) {
        throw new Error("case_status_update_failed");
      }

      const workflowCorrelationId = `${caseId}:legal.execution`;
      const latestJob = await workflowJobs.findLatestByCaseIdAndType(caseId, workflowJobTypes[7]);

      let workflowJob: WorkflowJobRecord | undefined;

      if (latestJob) {
        if (latestJob.status !== "completed" && latestJob.status !== "processing") {
          workflowJob = await workflowJobs.requeue(latestJob.id);
        } else {
          workflowJob = latestJob;
        }
      } else {
        workflowJob = await workflowJobs.createOrGet({
          caseId,
          jobType: workflowJobTypes[7],
          status: "queued",
          correlationId: workflowCorrelationId,
          payload: {
            stage: "legal_execution_pending",
            origin: "human_legal_review",
            decision,
            reviewerId,
            note
          }
        });
      }

      await auditLogs.record({
        caseId,
        actorType: "user",
        actorId: reviewerId,
        action: "intake.legal_brief_review_approved",
        correlationId,
        beforePayload: beforeStatus,
        afterPayload: {
          decision,
          note,
          legalBriefId: brief.id,
          caseStatus: updatedCase,
          workflowJob: workflowJob
            ? {
                id: workflowJob.id,
                jobType: workflowJob.jobType,
                status: workflowJob.status
              }
            : null
        }
      });

      return NextResponse.json(
        {
          correlationId,
          caseId,
          decision,
          caseStatus: updatedCase,
          workflowJob: workflowJob
            ? {
                id: workflowJob.id,
                jobType: workflowJob.jobType,
                status: workflowJob.status
              }
            : null
        },
        { status: 200 }
      );
    }

    const caseStatus = await cases.updateStatuses(caseId, {
      legalStatus: caseRecord.legalStatus
    });

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: reviewerId,
      action: "intake.legal_brief_review_rejected",
      correlationId,
      beforePayload: beforeStatus,
      afterPayload: {
        decision,
        note,
        legalBriefId: brief.id,
        caseStatus
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        decision,
        caseStatus
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "legal_brief_review_failed"
      },
      { status: 500 }
    );
  }
}
