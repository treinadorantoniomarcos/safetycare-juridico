import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPayload } from "../src/features/intake/normalize-whatsapp-payload";

describe("normalizeWhatsAppPayload", () => {
  it("maps a whatsapp text message into intake contract", () => {
    const result = normalizeWhatsAppPayload({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [
                  {
                    profile: { name: "Ana" },
                    wa_id: "5511999999999"
                  }
                ],
                messages: [
                  {
                    text: {
                      body: "Preciso de ajuda com um caso hospitalar grave."
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    expect(result.source).toBe("whatsapp");
    expect(result.message).toContain("caso hospitalar");
  });
});
