import { NextResponse } from "next/server";
import { z } from "zod";
import { dispatchSlaNotifications } from "../../../../../src/features/intake/dispatch-sla-notifications";
import { hasOperationsAccess } from "../../../../../src/lib/operations-auth";

const dispatchPayloadSchema = z.object({
  dryRun: z.boolean().optional(),
  limit: z.number().int().positive().max(500).optional(),
  windowHours: z.number().int().positive().max(168).optional()
});

type DispatchPayload = z.infer<typeof dispatchPayloadSchema>;

async function parsePayload(request: Request): Promise<
  | {
      payload: DispatchPayload;
    }
  | {
      error: "invalid_json" | "invalid_payload";
    }
> {
  let rawPayload: unknown = {};

  try {
    const body = await request.text();
    if (body.trim()) {
      rawPayload = JSON.parse(body);
    }
  } catch {
    return { error: "invalid_json" };
  }

  const parsed = dispatchPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return { error: "invalid_payload" };
  }

  return { payload: parsed.data };
}

export async function POST(request: Request) {
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

  const parsedPayload = await parsePayload(request);

  if ("error" in parsedPayload) {
    return NextResponse.json(
      {
        correlationId,
        error: parsedPayload.error
      },
      { status: 400 }
    );
  }

  try {
    const result = await dispatchSlaNotifications({
      correlationId,
      dryRun: parsedPayload.payload.dryRun,
      limit: parsedPayload.payload.limit,
      windowHours: parsedPayload.payload.windowHours
    });

    return NextResponse.json({
      correlationId,
      ...result
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "notifications_dispatch_failed"
      },
      { status: 500 }
    );
  }
}
