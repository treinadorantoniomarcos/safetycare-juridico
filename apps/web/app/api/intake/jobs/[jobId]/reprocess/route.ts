import { AuditLogRepository, WorkflowJobRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        jobId: string;
      }
    | Promise<{
        jobId: string;
      }>;
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { jobId } = await Promise.resolve(context.params);

  if (!hasOperationsAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  const { db } = getDatabaseClient();
  const workflowJobs = new WorkflowJobRepository(db);
  const auditLogs = new AuditLogRepository(db);

  const job = await workflowJobs.requeue(jobId);

  if (!job) {
    return NextResponse.json(
      {
        correlationId,
        error: "workflow_job_not_found"
      },
      { status: 404 }
    );
  }

  if (job.caseId) {
    await auditLogs.record({
      caseId: job.caseId,
      actorType: "system",
      actorId: "intake-reprocess-api",
      action: "intake.job_requeued",
      correlationId,
      afterPayload: {
        workflowJobId: job.id,
        jobType: job.jobType
      }
    });
  }

  return NextResponse.json(
    {
      correlationId,
      status: "queued",
      workflowJobId: job.id
    },
    { status: 202 }
  );
}
