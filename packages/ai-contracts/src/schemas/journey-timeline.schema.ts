import { z } from "zod";
import { journeyRiskLevels, leadSources } from "../constants";

export const journeyEventSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(400),
  approximateTiming: z.string().trim().min(1).max(120).optional(),
  risk: z.boolean(),
  evidenceHints: z.array(z.string().trim().min(1).max(120)).default([])
});

export const journeyTimelineSchema = z.object({
  caseId: z.string().uuid(),
  source: z.enum(leadSources),
  summary: z.string().trim().min(1).max(600),
  riskLevel: z.enum(journeyRiskLevels),
  confidence: z.number().int().min(0).max(100),
  events: z.array(journeyEventSchema).min(1)
});

export type JourneyEvent = z.infer<typeof journeyEventSchema>;
export type JourneyTimelineResult = z.infer<typeof journeyTimelineSchema>;
