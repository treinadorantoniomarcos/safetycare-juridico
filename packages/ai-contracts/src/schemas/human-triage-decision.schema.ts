import { z } from "zod";
import { humanTriageDecisions } from "../constants";

export const humanTriageDecisionSchema = z.object({
  decision: z.enum(humanTriageDecisions),
  reviewerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(400).default("")
});

export type HumanTriageDecisionInput = z.infer<typeof humanTriageDecisionSchema>;
