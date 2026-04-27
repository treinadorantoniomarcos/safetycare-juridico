import { z } from "zod";
import { intakeActorTypes } from "../constants";

export const auditLogEventSchema = z.object({
  actorType: z.enum(intakeActorTypes),
  actorId: z.string().min(1),
  action: z.string().min(1),
  caseId: z.string().uuid().optional(),
  correlationId: z.string().min(1).optional(),
  beforePayload: z.record(z.string(), z.unknown()).nullable().optional(),
  afterPayload: z.record(z.string(), z.unknown()).nullable().optional()
});

export type AuditLogEventInput = z.infer<typeof auditLogEventSchema>;
