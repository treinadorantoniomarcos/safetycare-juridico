import { consentSchema, workflowJobTypes } from "@safetycare/ai-contracts";
import {
  AuditLogRepository,
  CaseRepository,
  ClientRepository,
  WorkflowJobRepository
} from "@safetycare/database";
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

  try {
    const consent = consentSchema.parse(payload);
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const clients = new ClientRepository(db);
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

    const client = await clients.updateConsent(
      caseWithClient.clientRecord.id,
      consent.status,
      consent
    );

    if (!client) {
      return NextResponse.json(
        {
          correlationId,
          error: "client_not_found"
        },
        { status: 404 }
      );
    }

    let workflowJobStatus = "unchanged";
    const bootstrapJob = await workflowJobs.findLatestByCaseIdAndType(caseId, workflowJobTypes[0]);

    if (consent.status !== "granted") {
      await cases.updateStatuses(caseId, {
        commercialStatus: "awaiting_consent",
        legalStatus: "awaiting_consent"
      });
    }

    if (consent.status === "granted" && bootstrapJob?.status === "blocked") {
      await workflowJobs.requeue(bootstrapJob.id);
      workflowJobStatus = "queued";
    }

    await auditLogs.record({
      caseId,
      actorType: "system",
      actorId: "consent-api",
      action: "intake.consent_updated",
      correlationId,
      afterPayload: {
        consentStatus: consent.status,
        workflowJobStatus
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        consentStatus: consent.status,
        workflowJobStatus
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_payload"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        correlationId,
        error: "consent_update_failed"
      },
      { status: 500 }
    );
  }
}
