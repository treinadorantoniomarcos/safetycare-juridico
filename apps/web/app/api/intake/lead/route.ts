import { NextResponse } from "next/server";
import { createCaseFromIntake } from "../../../../src/features/intake/create-case-from-intake";

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
    const result = await createCaseFromIntake(payload, correlationId);

    return NextResponse.json(
      {
        correlationId,
        status: "accepted",
        caseId: result.caseId,
        workflowJobId: result.workflowJobId
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
        error: "intake_creation_failed"
      },
      { status: 500 }
    );
  }
}
