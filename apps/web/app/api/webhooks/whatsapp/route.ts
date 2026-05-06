import { NextResponse } from "next/server";
import { createCaseFromIntake } from "../../../../src/features/intake/create-case-from-intake";
import { normalizeWhatsAppPayload } from "../../../../src/features/intake/normalize-whatsapp-payload";
import { verifyWhatsAppSignature } from "../../../../src/features/intake/whatsapp-signature";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_signature"
      },
      { status: 401 }
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_json"
      },
      { status: 400 }
    );
  }

  try {
    const normalizedPayload = normalizeWhatsAppPayload(payload as never);
    const result = await createCaseFromIntake(normalizedPayload, correlationId);

    return NextResponse.json(
      {
        correlationId,
        status: "accepted",
        caseId: result.caseId,
        workflowJobId: result.workflowJobId,
        accessCode: result.accessCode
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "whatsapp_message_not_found") {
      return NextResponse.json(
        {
          correlationId,
          error: "unsupported_whatsapp_event"
        },
        { status: 202 }
      );
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_payload"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        correlationId,
        error: "whatsapp_processing_failed"
      },
      { status: 500 }
    );
  }
}
