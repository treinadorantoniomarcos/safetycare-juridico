import { z } from "zod";
import { consentStatuses } from "../constants";

export const consentSchema = z.object({
  status: z.enum(consentStatuses),
  version: z.string().min(1),
  acceptedAt: z.string().datetime().optional(),
  acceptedFromIp: z.string().min(1).optional(),
  captureMethod: z.enum(["checkbox", "whatsapp", "operator", "import"]).optional()
});

export type ConsentInput = z.infer<typeof consentSchema>;
