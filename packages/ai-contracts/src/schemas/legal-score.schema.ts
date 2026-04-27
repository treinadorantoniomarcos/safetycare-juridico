import { z } from "zod";
import { legalComplexityLevels } from "../constants";

const legalReferenceSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(260),
  authority: z.string().trim().min(1).max(160),
  scope: z.string().trim().min(1).max(200),
  url: z.string().trim().url()
});

const bibliographyEntrySchema = z.object({
  area: z.enum([
    "direito_saude",
    "direito_medico",
    "direito_odontologico",
    "bioetica_medica",
    "cuidados_paliativos"
  ]),
  focusTopics: z.array(z.string().trim().min(1).max(140)).min(2),
  recommendedDatabases: z.array(z.string().trim().min(1).max(140)).min(1),
  priorityKeywords: z.array(z.string().trim().min(1).max(120)).min(3)
});

const jurisprudenceResearchSchema = z.object({
  asOfDate: z.string().date(),
  officialSources: z.array(z.string().trim().url()).min(1),
  queryTerms: z.array(z.string().trim().min(3).max(140)).min(5),
  notes: z.array(z.string().trim().min(1).max(240)).default([])
});

const lgpdGuidanceSchema = z.object({
  containsSensitiveHealthData: z.boolean(),
  legalBases: z.array(
    z.enum([
      "consent",
      "legal_obligation",
      "regular_exercise_of_rights",
      "health_protection",
      "fraud_prevention"
    ])
  ).min(1),
  safeguards: z.array(z.string().trim().min(1).max(220)).min(3)
});

const oabMarketingGuidanceSchema = z.object({
  allowedPractices: z.array(z.string().trim().min(1).max(220)).min(2),
  forbiddenPractices: z.array(z.string().trim().min(1).max(220)).min(2),
  mandatoryDisclaimers: z.array(z.string().trim().min(1).max(220)).min(1),
  references: z.array(legalReferenceSchema).min(1)
});

const sourceAccessStatusSchema = z.enum(["verified", "unreachable", "not_checked"]);

const sourceAccessItemSchema = z.object({
  referenceKey: z.string().trim().min(1).max(80),
  referenceUrl: z.string().trim().url(),
  isEssential: z.boolean(),
  status: sourceAccessStatusSchema,
  lastCheckedAt: z.string().datetime().optional(),
  details: z.string().trim().max(240).default("")
});

const sourceAccessControlSchema = z.object({
  policy: z.literal("must_verify_before_legal_drafting"),
  checkedAt: z.string().datetime(),
  sourceItems: z.array(sourceAccessItemSchema).min(1),
  inaccessibleEssentialSources: z.array(sourceAccessItemSchema).default([]),
  canDraftProceduralPiece: z.boolean(),
  blockingMessage: z.string().trim().min(1).max(500).optional()
});

const valuationBenchmarkSchema = z.object({
  segment: z.enum(["baixa_complexidade", "media_complexidade", "alta_complexidade"]),
  minValueCents: z.number().int().min(0),
  medianValueCents: z.number().int().min(0),
  maxValueCents: z.number().int().min(0),
  sourceLabel: z.string().trim().min(1).max(160),
  sourceDate: z.string().date()
});

const claimValueRecommendationSchema = z.object({
  suggestedClaimValueCents: z.number().int().min(0),
  suggestedMinValueCents: z.number().int().min(0),
  suggestedMaxValueCents: z.number().int().min(0),
  confidenceBand: z.enum(["conservative", "balanced", "aggressive"]),
  methodology: z.string().trim().min(1).max(500),
  benchmarks: z.array(valuationBenchmarkSchema).min(1),
  assumptions: z.array(z.string().trim().min(1).max(220)).min(1)
});

const draftingStyleGuideSchema = z.object({
  voice: z.literal("specialist_health_lawyer"),
  tone: z.array(
    z.enum(["tecnico", "objetivo", "forense", "sobrio", "assertivo_sem_excesso"])
  ).min(2),
  forbiddenPatterns: z.array(z.string().trim().min(1).max(180)).min(3),
  mandatorySections: z.array(z.string().trim().min(1).max(160)).min(5),
  qualityChecklist: z.array(z.string().trim().min(1).max(200)).min(5)
});

export const strategicLegalGuidanceSchema = z.object({
  statutoryReferences: z.array(legalReferenceSchema).min(1),
  jurisprudentialReferences: z.array(legalReferenceSchema).min(1),
  regulatoryReferences: z.array(legalReferenceSchema).min(1),
  internationalReferences: z.array(legalReferenceSchema).min(1),
  lgpd: lgpdGuidanceSchema,
  oabMarketing: oabMarketingGuidanceSchema,
  bibliography: z.array(bibliographyEntrySchema).min(1),
  jurisprudenceResearch: jurisprudenceResearchSchema,
  sourceAccessControl: sourceAccessControlSchema
});

export const legalScoreSchema = z.object({
  caseId: z.string().uuid(),
  viabilityScore: z.number().int().min(0).max(100),
  complexity: z.enum(legalComplexityLevels),
  estimatedValueCents: z.number().int().min(0),
  confidence: z.number().int().min(0).max(100),
  reviewRequired: z.boolean(),
  reviewReasons: z.array(z.string().trim().min(1).max(200)).default([]),
  strategicLegalGuidance: strategicLegalGuidanceSchema.optional(),
  rationale: z.object({
    inputs: z.array(z.string().trim().min(1).max(120)).default([]),
    notes: z.array(z.string().trim().min(1).max(240)).default([]),
    legalAuthorities: z.array(legalReferenceSchema).default([]),
    jurisprudenceTags: z.array(z.string().trim().min(1).max(120)).default([]),
    claimValueRecommendation: claimValueRecommendationSchema,
    draftingStyleGuide: draftingStyleGuideSchema
  })
});

export type StrategicLegalGuidance = z.infer<typeof strategicLegalGuidanceSchema>;
export type LegalScoreResult = z.infer<typeof legalScoreSchema>;
