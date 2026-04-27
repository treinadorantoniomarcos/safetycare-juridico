import { z } from "zod";
import { conversionDecisions } from "../constants";

export const conversionDecisionSchema = z.object({
  decision: z.enum(conversionDecisions),
  closerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(400).default("")
});

export type ConversionDecisionInput = z.infer<typeof conversionDecisionSchema>;
