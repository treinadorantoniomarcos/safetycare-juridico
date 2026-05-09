import { z } from "zod";
import { legalBriefProblemTypes, triageUrgencyLevels } from "../constants";

const optionalTimeSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora invalida").optional());

const optionalTrimmedTextSchema = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().trim().max(maxLength).optional());

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().trim().email().max(200).optional());

const additionalEmailListSchema = z.array(z.string().trim().email().max(200)).max(10).default([]);
const additionalWhatsappListSchema = z.array(z.string().trim().min(5).max(40)).max(10).default([]);

export const legalBriefKeyDateSchema = z.object({
  label: z.string().trim().min(1).max(140),
  date: z.string().date(),
  time: optionalTimeSchema
});

export const legalBriefWitnessSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  cpf: optionalTrimmedTextSchema(18),
  rg: optionalTrimmedTextSchema(20),
  address: optionalTrimmedTextSchema(250),
  whatsapp: optionalTrimmedTextSchema(40)
});

export const legalBriefUploadedDocumentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
  size: z.number().int().nonnegative().max(12 * 1024 * 1024),
  dataUrl: z.string().trim().min(1).startsWith("data:"),
  uploadedAt: z.string().datetime()
});

export const legalBriefInputSchema = z.object({
  caseId: z.string().uuid(),
  workflowJobId: z.string().uuid(),
  draftScope: z.literal("civil_health"),
  patientFullName: z.string().trim().min(1).max(200),
  patientCpf: z.string().trim().min(11).max(18),
  city: z.string().trim().min(1).max(120),
  contact: z.string().trim().min(5).max(120),
  patientAddress: z.string().trim().min(5).max(250),
  patientWhatsapp: z.string().trim().min(5).max(40),
  patientEmail: z.string().trim().email().max(200),
  patientAdditionalEmails: additionalEmailListSchema,
  patientAdditionalWhatsapps: additionalWhatsappListSchema,
  patientRg: z.string().trim().min(3).max(20),
  relationToPatient: z.string().trim().min(1).max(120),
  contactIsProcessRepresentative: z.boolean(),
  contactFullName: z.string().trim().min(1).max(200),
  contactAddress: z.string().trim().min(5).max(250),
  contactWhatsapp: z.string().trim().min(5).max(40),
  contactEmail: z.string().trim().email().max(200),
  contactAdditionalEmails: additionalEmailListSchema,
  contactAdditionalWhatsapps: additionalWhatsappListSchema,
  contactCpf: z.string().trim().min(11).max(18),
  contactRg: z.string().trim().min(3).max(20),
  processRepresentativeFullName: optionalTrimmedTextSchema(200),
  processRepresentativeCpf: optionalTrimmedTextSchema(18),
  processRepresentativeRg: optionalTrimmedTextSchema(20),
  processRepresentativeAddress: optionalTrimmedTextSchema(250),
  processRepresentativeWhatsapp: optionalTrimmedTextSchema(40),
  processRepresentativeEmail: optionalEmailSchema,
  processRepresentativeAdditionalEmails: additionalEmailListSchema,
  processRepresentativeAdditionalWhatsapps: additionalWhatsappListSchema,
  problemType: z.enum(legalBriefProblemTypes),
  currentUrgency: z.enum(triageUrgencyLevels),
  keyDates: z.array(legalBriefKeyDateSchema).min(1).max(12),
  objectiveDescription: z.string().trim().min(20).max(5000),
  materialLosses: z.string().trim().min(1).max(4000),
  moralImpact: z.string().trim().min(1).max(4000),
  uploadedDocuments: z.array(legalBriefUploadedDocumentSchema).max(10).default([]),
  documentsAttached: z.array(z.string().trim().min(1).max(180)).max(40).default([]),
  witnesses: z.array(legalBriefWitnessSchema).max(20).default([]),
  mainRequest: z.string().trim().min(5).max(4000),
  subsidiaryRequest: z.string().trim().min(5).max(4000)
}).superRefine((data, ctx) => {
  if (data.contactIsProcessRepresentative) {
    return;
  }

  const requiredRepresentativeFields: Array<{
    key:
      | "processRepresentativeFullName"
      | "processRepresentativeCpf"
      | "processRepresentativeRg"
      | "processRepresentativeAddress"
      | "processRepresentativeWhatsapp"
      | "processRepresentativeEmail";
    message: string;
  }> = [
    {
      key: "processRepresentativeFullName",
      message: "Informe o nome completo do procurador e responsavel pelo processo."
    },
    {
      key: "processRepresentativeCpf",
      message: "Informe o CPF do procurador e responsavel pelo processo."
    },
    {
      key: "processRepresentativeRg",
      message: "Informe o RG do procurador e responsavel pelo processo."
    },
    {
      key: "processRepresentativeAddress",
      message: "Informe o endereco completo do procurador e responsavel pelo processo."
    },
    {
      key: "processRepresentativeWhatsapp",
      message: "Informe o WhatsApp do procurador e responsavel pelo processo."
    },
    {
      key: "processRepresentativeEmail",
      message: "Informe o e-mail do procurador e responsavel pelo processo."
    }
  ];

  for (const field of requiredRepresentativeFields) {
    const value = data[field.key];

    if (typeof value !== "string" || value.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field.key],
        message: field.message
      });
    }
  }
});

export type LegalBriefWitness = z.infer<typeof legalBriefWitnessSchema>;
export type LegalBriefInput = z.infer<typeof legalBriefInputSchema>;
export type LegalBriefKeyDate = z.infer<typeof legalBriefKeyDateSchema>;
export type LegalBriefUploadedDocument = z.infer<typeof legalBriefUploadedDocumentSchema>;

export function normalizeLegalBriefWitness(value: unknown): LegalBriefWitness | null {
  if (typeof value === "string") {
    const fullName = value.trim();

    return fullName ? { fullName } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<Record<keyof LegalBriefWitness, unknown>>;
  const fullName = typeof record.fullName === "string" ? record.fullName.trim() : "";
  const cpf = typeof record.cpf === "string" ? record.cpf.trim() : "";
  const rg = typeof record.rg === "string" ? record.rg.trim() : "";
  const address = typeof record.address === "string" ? record.address.trim() : "";
  const whatsapp = typeof record.whatsapp === "string" ? record.whatsapp.trim() : "";

  if (!fullName) {
    return null;
  }

  return {
    fullName,
    ...(cpf ? { cpf } : {}),
    ...(rg ? { rg } : {}),
    ...(address ? { address } : {}),
    ...(whatsapp ? { whatsapp } : {})
  };
}

export function normalizeLegalBriefWitnesses(values: unknown): LegalBriefWitness[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(normalizeLegalBriefWitness).filter((value): value is LegalBriefWitness => value !== null);
}

export function formatLegalBriefWitnessLine(witness: LegalBriefWitness) {
  const parts = [witness.fullName];

  if (witness.cpf) {
    parts.push(`CPF: ${witness.cpf}`);
  }

  if (witness.rg) {
    parts.push(`RG: ${witness.rg}`);
  }

  if (witness.address) {
    parts.push(`Endereco: ${witness.address}`);
  }

  if (witness.whatsapp) {
    parts.push(`WhatsApp: ${witness.whatsapp}`);
  }

  return parts.join(" | ");
}

export function renderLegalBriefWitnessList(values: unknown, emptyMessage: string) {
  const witnesses = normalizeLegalBriefWitnesses(values);

  if (witnesses.length === 0) {
    return `- ${emptyMessage}`;
  }

  return witnesses.map((witness) => `- ${formatLegalBriefWitnessLine(witness)}`).join("\n");
}
