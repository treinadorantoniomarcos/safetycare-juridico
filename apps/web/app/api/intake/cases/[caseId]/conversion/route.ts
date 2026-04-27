import { AuditLogRepository, CaseRepository, WorkflowJobRepository } from "@safetycare/database";
import { conversionDecisionSchema } from "@safetycare/ai-contracts";
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

function getCaseStatusesForDecision(decision: "signed" | "lost") {
  if (decision === "signed") {
    return {
      commercialStatus: "retained",
      legalStatus: "legal_execution_pending"
    } as const;
  }

  return {
    commercialStatus: "closed_lost",
    legalStatus: "closed_lost"
  } as const;
}

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

  const validation = conversionDecisionSchema.safeParse(payload);

  if (!validation.success) {
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

    if (caseRecord.legalStatus !== "conversion_pending") {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_stage"
        },
        { status: 409 }
      );
    }

    const decision = validation.data.decision;
    const note = validation.data.note?.trim() ? validation.data.note.trim() : undefined;
    const caseStatus = await cases.updateStatuses(caseId, getCaseStatusesForDecision(decision));

    if (!caseStatus) {
      throw new Error("case_status_update_failed");
    }

    let workflowJob: Awaited<ReturnType<WorkflowJobRepository["createOrGet"]>> | undefined;

    if (decision === "signed") {
      const workflowCorrelationId = `${caseId}:legal.execution`;

      workflowJob = await workflowJobs.createOrGet({
        caseId,
        jobType: "legal.execution",
        status: "queued",
        correlationId: workflowCorrelationId,
        payload: {
          stage: "legal_execution_pending",
          origin: "commercial.decision",
          decision,
          note
        }
      });
    }

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: validation.data.closerId,
      action: "conversion.decision_recorded",
      correlationId,
      beforePayload: {
        caseStatus: {
          commercialStatus: caseRecord.commercialStatus,
          legalStatus: caseRecord.legalStatus
        }
      },
      afterPayload: {
        decision,
        note,
        caseStatus: {
          commercialStatus: caseStatus.commercialStatus,
          legalStatus: caseStatus.legalStatus
        },
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
        caseStatus,
        ...(workflowJob ? { workflowJob } : {})
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "conversion_update_failed"
      },
      { status: 500 }
    );
  }
}
