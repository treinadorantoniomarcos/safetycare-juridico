import { NextResponse } from "next/server";
import { getCaseSlaAlerts } from "../../../../../src/features/intake/get-case-sla-alerts";
import { hasOperationsAccess } from "../../../../../src/lib/operations-auth";

function parseLimit(rawValue: string | null): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return parsedValue;
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));

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
    const payload = await getCaseSlaAlerts(limit);

    return NextResponse.json({
      correlationId,
      ...payload
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "case_sla_unavailable"
      },
      { status: 500 }
    );
  }
}
