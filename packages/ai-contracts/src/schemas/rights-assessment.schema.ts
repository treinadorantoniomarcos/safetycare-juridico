import { z } from "zod";
import { leadSources, patientRightKeys, patientRightStatuses } from "../constants";

export const rightsAssessmentItemSchema = z.object({
  rightKey: z.enum(patientRightKeys),
  status: z.enum(patientRightStatuses),
  justification: z.string().trim().min(1).max(400),
  signals: z.array(z.string().trim().min(1).max(120)).default([])
});

export const rightsAssessmentSchema = z.object({
  caseId: z.string().uuid(),
  source: z.enum(leadSources),
  summary: z.string().trim().min(1).max(600),
  confidence: z.number().int().min(0).max(100),
  violationCount: z.number().int().min(0).max(20),
  rights: z.array(rightsAssessmentItemSchema).min(5).max(20)
});

export type RightsAssessmentItem = z.infer<typeof rightsAssessmentItemSchema>;
export type RightsAssessmentResult = z.infer<typeof rightsAssessmentSchema>;
