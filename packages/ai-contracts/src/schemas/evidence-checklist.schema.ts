import { z } from "zod";
import {
  evidenceChecklistImportanceLevels,
  evidenceChecklistStatuses,
  leadSources
} from "../constants";

export const evidenceChecklistItemSchema = z.object({
  itemKey: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(180),
  status: z.enum(evidenceChecklistStatuses),
  importance: z.enum(evidenceChecklistImportanceLevels),
  notes: z.string().trim().max(400).default(""),
  sourceHints: z.array(z.string().trim().min(1).max(120)).default([])
});

export const evidenceInformationRequestSchema = z.object({
  requestKey: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  justification: z.string().trim().min(1).max(400),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  dueInHours: z.number().int().min(1).max(240),
  channelSuggestion: z.enum(["whatsapp", "email", "portal", "phone"]).default("whatsapp")
});

export const evidenceChecklistSchema = z.object({
  caseId: z.string().uuid(),
  source: z.enum(leadSources),
  summary: z.string().trim().min(1).max(600),
  confidence: z.number().int().min(0).max(100),
  missingCount: z.number().int().min(0),
  items: z.array(evidenceChecklistItemSchema).min(1),
  requiredInformationRequests: z.array(evidenceInformationRequestSchema).default([])
});

export type EvidenceChecklistItem = z.infer<typeof evidenceChecklistItemSchema>;
export type EvidenceInformationRequest = z.infer<typeof evidenceInformationRequestSchema>;
export type EvidenceChecklistResult = z.infer<typeof evidenceChecklistSchema>;
