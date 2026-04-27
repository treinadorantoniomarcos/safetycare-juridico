import { z } from "zod";
import { consentStatuses, leadSources } from "../constants";

export const caseInitializationSchema = z.object({
  leadId: z.string().uuid(),
  client: z.object({
    fullName: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(8).max(30).optional(),
    email: z.string().email().optional(),
    consentStatus: z.enum(consentStatuses).default("pending")
  }),
  case: z.object({
    source: z.enum(leadSources),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    urgency: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    legalStatus: z.literal("intake").default("intake")
  })
});

export type CaseInitializationInput = z.infer<typeof caseInitializationSchema>;
