import { AuditLogRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import { getCaseSlaAlerts } from "../../../../../../src/features/intake/get-case-sla-alerts";
import { getDatabaseClient } from "../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../src/lib/operations-auth";

type EscalatePayload = {
  limit?: number;
  dryRun?: boolean;
};

function isValidLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function parsePayload(payload: unknown): EscalatePayload | undefined {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const body = payload as Record<string, unknown>;

  if (body.limit !== undefined && !isValidLimit(body.limit)) {
    return undefined;
  }

  if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") {
    return undefined;
  }

  return {
    limit: body.limit as number | undefined,
    dryRun: body.dryRun as boolean | undefined
  };
}

async function readPayload(request: Request): Promise<
  | {
      payload: EscalatePayload;
    }
  | {
      error: "invalid_json" | "invalid_payload";
    }
> {
  let parsedPayload: unknown = {};

  try {
    const rawBody = await request.text();

    if (rawBody.trim()) {
      parsedPayload = JSON.parse(rawBody);
    }
  } catch {
    return {
      error: "invalid_json"
    };
  }

  const payload = parsePayload(parsedPayload);

  if (!payload) {
    return {
      error: "invalid_payload"
    };
  }

  return {
    payload
  };
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  if (!hasOperationsAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  const parsedBody = await readPayload(request);

  if ("error" in parsedBody) {
    return NextResponse.json(
      {
        correlationId,
        error: parsedBody.error
      },
      { status: 400 }
    );
  }

  const dryRun = parsedBody.payload.dryRun ?? false;

  try {
    const slaAlerts = await getCaseSlaAlerts(parsedBody.payload.limit);
    const breachedAlerts = slaAlerts.alerts.filter((alert) => alert.breach);
    const caseIds = breachedAlerts.map((alert) => alert.caseId);
    let escalatedTotal = 0;

    if (!dryRun && breachedAlerts.length > 0) {
      const { db } = getDatabaseClient();
      const auditLogs = new AuditLogRepository(db);

      for (const alert of breachedAlerts) {
        await auditLogs.record({
          caseId: alert.caseId,
          actorType: "system",
          actorId: "sla-monitor",
          action: "sla.escalation_triggered",
          correlationId,
          afterPayload: {
            legalStatus: alert.legalStatus,
            commercialStatus: alert.commercialStatus,
            ageMinutes: alert.ageMinutes,
            slaHours: alert.slaHours
          }
        });
      }

      escalatedTotal = breachedAlerts.length;
    }

    return NextResponse.json({
      correlationId,
      dryRun,
      evaluatedTotal: slaAlerts.alerts.length,
      breachTotal: breachedAlerts.length,
      escalatedTotal,
      caseIds
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "sla_escalation_failed"
      },
      { status: 500 }
    );
  }
}
