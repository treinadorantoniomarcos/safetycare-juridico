import { z } from "zod";
import { clinicalFindingTypes, clinicalRiskLevels, leadSources } from "../constants";

export const clinicalFindingSchema = z.object({
  order: z.number().int().min(1),
  findingType: z.enum(clinicalFindingTypes),
  description: z.string().trim().min(1).max(400),
  risk: z.boolean(),
  evidenceHints: z.array(z.string().trim().min(1).max(120)).default([])
});

export const clinicalAnalysisSchema = z.object({
  caseId: z.string().uuid(),
  source: z.enum(leadSources),
  summary: z.string().trim().min(1).max(600),
  riskLevel: z.enum(clinicalRiskLevels),
  confidence: z.number().int().min(0).max(100),
  findings: z.array(clinicalFindingSchema).min(1)
});

export type ClinicalFinding = z.infer<typeof clinicalFindingSchema>;
export type ClinicalAnalysisResult = z.infer<typeof clinicalAnalysisSchema>;
