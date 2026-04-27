import { z } from "zod";
import { scoreReviewDecisions } from "../constants";

export const scoreReviewDecisionSchema = z.object({
  decision: z.enum(scoreReviewDecisions),
  reviewerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(400).default("")
});

export type ScoreReviewDecisionInput = z.infer<typeof scoreReviewDecisionSchema>;
