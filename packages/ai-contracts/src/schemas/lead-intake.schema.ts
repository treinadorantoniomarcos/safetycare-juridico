import { z } from "zod";
import { leadSources } from "../constants";
import { consentSchema } from "./consent.schema";

export const leadIntakeSchema = z.object({
  source: z.enum(leadSources),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(8).max(30).optional(),
  message: z.string().trim().min(10).max(10000),
  consent: consentSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type LeadIntakeInput = z.infer<typeof leadIntakeSchema>;
