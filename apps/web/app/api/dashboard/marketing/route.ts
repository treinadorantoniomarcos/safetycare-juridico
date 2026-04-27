import { NextResponse } from "next/server";
import { getMarketingOverview } from "../../../../src/features/dashboard/get-marketing-overview";
import { hasOperationsAccess } from "../../../../src/lib/operations-auth";
import { hasDashboardSessionFromRequest } from "../../../../src/lib/dashboard-auth";

function parseDays(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();

  const hasSession = hasDashboardSessionFromRequest(request);
  const hasOpsAccess = hasOperationsAccess(request);

  if (!hasSession && !hasOpsAccess) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  try {
    const days = parseDays(new URL(request.url).searchParams.get("days"));
    const payload = await getMarketingOverview(days);

    return NextResponse.json({
      correlationId,
      ...payload
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "marketing_dashboard_unavailable"
      },
      { status: 500 }
    );
  }
}
