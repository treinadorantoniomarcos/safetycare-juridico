import { z } from "zod";
import { legalBriefProblemTypes, triageUrgencyLevels } from "../constants";

export const legalBriefKeyDateSchema = z.object({
  label: z.string().trim().min(1).max(140),
  date: z.string().date()
});

export const legalBriefInputSchema = z.object({
  caseId: z.string().uuid(),
  workflowJobId: z.string().uuid(),
  draftScope: z.literal("civil_health"),
  patientFullName: z.string().trim().min(1).max(200),
  patientCpf: z.string().trim().min(11).max(18),
  city: z.string().trim().min(1).max(120),
  contact: z.string().trim().min(5).max(120),
  relationToPatient: z.string().trim().min(1).max(120),
  problemType: z.enum(legalBriefProblemTypes),
  currentUrgency: z.enum(triageUrgencyLevels),
  keyDates: z.array(legalBriefKeyDateSchema).min(1).max(12),
  objectiveDescription: z.string().trim().min(20).max(5000),
  materialLosses: z.string().trim().min(1).max(4000),
  moralImpact: z.string().trim().min(1).max(4000),
  documentsAttached: z.array(z.string().trim().min(1).max(180)).max(40).default([]),
  witnesses: z.array(z.string().trim().min(1).max(180)).max(20).default([]),
  mainRequest: z.string().trim().min(5).max(4000),
  subsidiaryRequest: z.string().trim().min(5).max(4000)
});

export type LegalBriefInput = z.infer<typeof legalBriefInputSchema>;
export type LegalBriefKeyDate = z.infer<typeof legalBriefKeyDateSchema>;
