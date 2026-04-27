import { NextResponse } from "next/server";
import { getIntakeQueueSummary } from "../../../../src/features/intake/get-intake-queue-summary";
import { hasOperationsAccess } from "../../../../src/lib/operations-auth";

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();

  if (!hasOperationsAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  try {
    const queue = await getIntakeQueueSummary();

    return NextResponse.json({
      correlationId,
      ...queue
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "queue_summary_unavailable"
      },
      { status: 500 }
    );
  }
}
