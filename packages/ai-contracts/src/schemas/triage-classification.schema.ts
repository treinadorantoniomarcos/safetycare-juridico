import { z } from "zod";
import {
  triageCaseTypes,
  triageLegalPotentialLevels,
  triagePriorityLevels,
  triageUrgencyLevels
} from "../constants";

export const triageClassificationSchema = z.object({
  caseType: z.enum(triageCaseTypes),
  priority: z.enum(triagePriorityLevels),
  urgency: z.enum(triageUrgencyLevels),
  hasDamage: z.boolean(),
  legalPotential: z.enum(triageLegalPotentialLevels),
  confidence: z.number().int().min(0).max(100),
  rationale: z.object({
    matchedSignals: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([])
  })
});

export type TriageClassificationResult = z.infer<typeof triageClassificationSchema>;
