import { z } from "zod";

export const legalArtifactTypeSchema = z.enum([
  "civil_health_draft",
  "power_of_attorney",
  "fee_agreement"
]);

export const legalArtifactRevisionSchema = z.object({
  artifactType: legalArtifactTypeSchema,
  title: z.string().trim().min(1).max(240).optional(),
  subtitle: z.string().trim().min(1).max(260).optional(),
  summary: z.string().trim().min(1).max(500).optional(),
  contentMarkdown: z.string().trim().min(1).max(100000),
  reviewerId: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(1000).optional()
});

export type LegalArtifactType = z.infer<typeof legalArtifactTypeSchema>;
export type LegalArtifactRevisionInput = z.infer<typeof legalArtifactRevisionSchema>;
