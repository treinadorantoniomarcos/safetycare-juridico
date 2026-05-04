import { z } from "zod";

const legalSupportingDocumentTypeValues = ["power_of_attorney", "fee_agreement"] as const;

export const legalSupportingDocumentTypeSchema = z.enum(legalSupportingDocumentTypeValues);

const legalSupportingDocumentSchema = z.object({
  key: z.string().trim().min(1).max(80),
  type: legalSupportingDocumentTypeSchema,
  title: z.string().trim().min(1).max(220),
  subtitle: z.string().trim().min(1).max(260),
  summary: z.string().trim().min(1).max(500),
  placeholders: z.array(z.string().trim().min(1).max(140)).max(20).default([]),
  reviewNotes: z.array(z.string().trim().min(1).max(260)).min(1),
  markdown: z.string().trim().min(1).max(50000)
});

export const legalDocumentPackSchema = z.object({
  draftScope: z.literal("civil_health"),
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().trim().min(1).max(260),
  summary: z.string().trim().min(1).max(500),
  documents: z.array(legalSupportingDocumentSchema).min(2).max(4),
  generatedAt: z.string().datetime()
});

export type LegalSupportingDocumentType = z.infer<typeof legalSupportingDocumentTypeSchema>;
export type LegalSupportingDocument = z.infer<typeof legalSupportingDocumentSchema>;
export type LegalDocumentPack = z.infer<typeof legalDocumentPackSchema>;
