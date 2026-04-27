import { AuditLogRepository } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";
import { notifySlaEscalation } from "../../lib/operations-notifier";

const SLA_ESCALATION_ACTION = "sla.escalation_triggered";
const SLA_NOTIFICATION_DISPATCHED_ACTION = "sla.notification_dispatched";
const SLA_NOTIFICATION_FAILED_ACTION = "sla.notification_failed";

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_HOURS = 24;

type DispatchSlaNotificationsInput = {
  correlationId: string;
  dryRun?: boolean;
  limit?: number;
  windowHours?: number;
};

type EscalationSignal = {
  legalStatus?: string;
  commercialStatus?: string;
  ageMinutes?: number;
  slaHours?: number;
};

export type DispatchSlaNotificationsResult = {
  generatedAt: Date;
  dryRun: boolean;
  windowHours: number;
  evaluatedTotal: number;
  pendingTotal: number;
  dispatchedTotal: number;
  caseIds: string[];
};

function normalizeLimit(limit: number | undefined) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(500, Math.max(1, Math.floor(limit)));
}

function normalizeWindowHours(windowHours: number | undefined) {
  if (typeof windowHours !== "number" || !Number.isFinite(windowHours)) {
    return DEFAULT_WINDOW_HOURS;
  }

  return Math.min(168, Math.max(1, Math.floor(windowHours)));
}

function parseSourceEventId(afterPayload: Record<string, unknown> | null) {
  if (!afterPayload) {
    return undefined;
  }

  const value = afterPayload.sourceEventId;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function parseEscalationSignal(afterPayload: Record<string, unknown> | null): EscalationSignal {
  if (!afterPayload) {
    return {};
  }

  return {
    legalStatus: typeof afterPayload.legalStatus === "string" ? afterPayload.legalStatus : undefined,
    commercialStatus:
      typeof afterPayload.commercialStatus === "string" ? afterPayload.commercialStatus : undefined,
    ageMinutes: typeof afterPayload.ageMinutes === "number" ? afterPayload.ageMinutes : undefined,
    slaHours: typeof afterPayload.slaHours === "number" ? afterPayload.slaHours : undefined
  };
}

export async function dispatchSlaNotifications(
  input: DispatchSlaNotificationsInput
): Promise<DispatchSlaNotificationsResult> {
  const { db } = getDatabaseClient();
  const auditLogs = new AuditLogRepository(db);

  const generatedAt = new Date();
  const dryRun = input.dryRun ?? false;
  const limit = normalizeLimit(input.limit);
  const windowHours = normalizeWindowHours(input.windowHours);
  const since = new Date(generatedAt.getTime() - windowHours * 60 * 60 * 1000);

  const escalations = await auditLogs.listByAction(SLA_ESCALATION_ACTION, since, limit);
  const dispatched = await auditLogs.listByAction(SLA_NOTIFICATION_DISPATCHED_ACTION, since, limit * 5);

  const dispatchedEventIds = new Set<string>();

  for (const event of dispatched) {
    const sourceEventId = parseSourceEventId(event.afterPayload);
    if (sourceEventId) {
      dispatchedEventIds.add(sourceEventId);
    }
  }

  const pendingEscalations = escalations
    .filter((event) => event.caseId)
    .filter((event) => !dispatchedEventIds.has(event.id))
    .reverse();

  let dispatchedTotal = 0;

  if (!dryRun) {
    for (const escalation of pendingEscalations) {
      const signal = parseEscalationSignal(escalation.afterPayload);

      try {
        const notifyResult = await notifySlaEscalation({
          correlationId: input.correlationId,
          caseId: escalation.caseId as string,
          legalStatus: signal.legalStatus,
          commercialStatus: signal.commercialStatus,
          ageMinutes: signal.ageMinutes,
          slaHours: signal.slaHours
        });

        await auditLogs.record({
          caseId: escalation.caseId,
          actorType: "system",
          actorId: "sla-notifier",
          action: SLA_NOTIFICATION_DISPATCHED_ACTION,
          correlationId: input.correlationId,
          beforePayload: {
            sourceEventId: escalation.id,
            sourceAction: escalation.action
          },
          afterPayload: {
            sourceEventId: escalation.id,
            sourceAction: escalation.action,
            channel: notifyResult.channel,
            deliveryStatus: notifyResult.status,
            responseStatus: notifyResult.responseStatus ?? null,
            legalStatus: signal.legalStatus ?? null,
            commercialStatus: signal.commercialStatus ?? null,
            ageMinutes: signal.ageMinutes ?? null,
            slaHours: signal.slaHours ?? null
          }
        });

        dispatchedTotal += 1;
      } catch (error) {
        await auditLogs.record({
          caseId: escalation.caseId,
          actorType: "system",
          actorId: "sla-notifier",
          action: SLA_NOTIFICATION_FAILED_ACTION,
          correlationId: input.correlationId,
          beforePayload: {
            sourceEventId: escalation.id,
            sourceAction: escalation.action
          },
          afterPayload: {
            sourceEventId: escalation.id,
            sourceAction: escalation.action,
            legalStatus: signal.legalStatus ?? null,
            commercialStatus: signal.commercialStatus ?? null,
            ageMinutes: signal.ageMinutes ?? null,
            slaHours: signal.slaHours ?? null,
            reason: error instanceof Error ? error.message : "unknown"
          }
        });
      }
    }
  }

  const caseIds = pendingEscalations
    .map((event) => event.caseId)
    .filter((caseId): caseId is string => typeof caseId === "string");

  return {
    generatedAt,
    dryRun,
    windowHours,
    evaluatedTotal: escalations.length,
    pendingTotal: pendingEscalations.length,
    dispatchedTotal: dryRun ? 0 : dispatchedTotal,
    caseIds
  };
}
