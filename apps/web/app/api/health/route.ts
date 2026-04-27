import { NextResponse } from "next/server";
import { getIntakeQueueSummary } from "../../../src/features/intake/get-intake-queue-summary";

export async function GET() {
  try {
    const queue = await getIntakeQueueSummary();

    return NextResponse.json({
      service: "web",
      status: "ok",
      checks: {
        database: "ok",
        intakeQueue: "ok"
      },
      queueSummary: queue.summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: "web",
        status: "degraded",
        checks: {
          database: "unavailable",
          intakeQueue: "unknown"
        },
        error: error instanceof Error ? error.message : "unknown"
      },
      { status: 503 }
    );
  }
}
