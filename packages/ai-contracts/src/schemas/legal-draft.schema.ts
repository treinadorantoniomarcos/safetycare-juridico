import { z } from "zod";

const legalDraftSectionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(12000)
});

export const legalDraftSchema = z.object({
  draftScope: z.literal("civil_health"),
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().trim().min(1).max(260),
  summary: z.string().trim().min(1).max(500),
  sections: z.array(legalDraftSectionSchema).min(4),
  keyRecommendations: z.array(z.string().trim().min(1).max(240)).min(2),
  markdown: z.string().trim().min(1).max(100000),
  generatedAt: z.string().datetime()
});

export type LegalDraftSection = z.infer<typeof legalDraftSectionSchema>;
export type LegalDraft = z.infer<typeof legalDraftSchema>;
