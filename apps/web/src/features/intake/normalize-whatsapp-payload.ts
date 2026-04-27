import type { LeadIntakeInput } from "@safetycare/ai-contracts";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{ text?: { body?: string } }>;
      };
    }>;
  }>;
};

export function normalizeWhatsAppPayload(payload: WhatsAppWebhookPayload): LeadIntakeInput {
  const change = payload.entry?.[0]?.changes?.[0];
  const contact = change?.value?.contacts?.[0];
  const message = change?.value?.messages?.[0];
  const body = message?.text?.body?.trim();

  if (!body) {
    throw new Error("whatsapp_message_not_found");
  }

  return {
    source: "whatsapp",
    name: contact?.profile?.name,
    phone: contact?.wa_id,
    message: body,
    metadata: {
      channel: "whatsapp"
    }
  };
}
