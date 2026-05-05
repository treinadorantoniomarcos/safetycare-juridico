import { z } from "zod";
import { legalBriefReviewDecisions } from "../constants";

export const legalBriefReviewDecisionSchema = z.object({
  decision: z.enum(legalBriefReviewDecisions),
  reviewerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(400).default("")
});

export type LegalBriefReviewDecisionInput = z.infer<typeof legalBriefReviewDecisionSchema>;
