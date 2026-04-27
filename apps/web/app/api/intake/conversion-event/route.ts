import { NextResponse } from "next/server";
import { trackIntakeConversionEvent } from "../../../../src/features/intake/track-intake-conversion-event";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  let payload: unknown;

  try {
    payload = await request.json();
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
    const result = await trackIntakeConversionEvent(payload, correlationId);

    return NextResponse.json(
      {
        correlationId,
        status: "accepted",
        eventId: result.eventId,
        action: result.action
      },
      { status: 201 }
    );
  } catch (error) {
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
        error: "conversion_event_failed"
      },
      { status: 500 }
    );
  }
}
