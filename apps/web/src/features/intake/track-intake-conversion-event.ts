import { z } from "zod";
import { AuditLogRepository } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

const conversionSourceSchema = z
  .enum(["landing_home", "landing_method", "landing_faq", "unknown"])
  .default("unknown");

const conversionEventNameSchema = z
  .enum(["lead_submitted", "thank_you_viewed"])
  .default("thank_you_viewed");

const intakeConversionEventSchema = z.object({
  caseId: z.string().uuid().optional(),
  workflowJobId: z.string().uuid().optional(),
  eventName: conversionEventNameSchema.optional(),
  source: conversionSourceSchema.optional(),
  utmSource: z.string().trim().min(1).max(120).optional(),
  utmMedium: z.string().trim().min(1).max(120).optional(),
  utmCampaign: z.string().trim().min(1).max(160).optional(),
  utmContent: z.string().trim().min(1).max(160).optional(),
  utmTerm: z.string().trim().min(1).max(160).optional(),
  referrer: z.string().trim().min(1).max(500).optional()
});

export async function trackIntakeConversionEvent(payload: unknown, correlationId: string) {
  const parsed = intakeConversionEventSchema.parse(payload);
  const { db } = getDatabaseClient();
  const auditLogs = new AuditLogRepository(db);

  const action = `marketing.${parsed.eventName ?? "thank_you_viewed"}`;

  const event = await auditLogs.record({
    caseId: parsed.caseId,
    actorType: "integration",
    actorId: "web-frontend",
    action,
    correlationId,
    afterPayload: {
      workflowJobId: parsed.workflowJobId,
      source: parsed.source ?? "unknown",
      utm: {
        source: parsed.utmSource,
        medium: parsed.utmMedium,
        campaign: parsed.utmCampaign,
        content: parsed.utmContent,
        term: parsed.utmTerm
      },
      referrer: parsed.referrer
    }
  });

  return {
    eventId: event.id,
    action
  };
}

