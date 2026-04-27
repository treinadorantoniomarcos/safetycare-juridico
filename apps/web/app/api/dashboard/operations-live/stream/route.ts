import { getOperationsLiveOverview } from "../../../../../src/features/dashboard/get-operations-live-overview";
import { hasDashboardSessionFromRequest } from "../../../../../src/lib/dashboard-auth";
import { hasOperationsAccess } from "../../../../../src/lib/operations-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function encodeSseComment(comment: string) {
  return `: ${comment}\n\n`;
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const hasSession = hasDashboardSessionFromRequest(request);
  const hasOpsAccess = hasOperationsAccess(request);

  if (!hasSession && !hasOpsAccess) {
    return Response.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let closeStream: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abortListener = () => {
        closeStream?.();
      };

      const publishSnapshot = async () => {
        try {
          const payload = await getOperationsLiveOverview();

          if (closed) {
            return;
          }

          controller.enqueue(
            encoder.encode(
              encodeSseEvent("operations_live", {
                correlationId: crypto.randomUUID(),
                ...payload
              })
            )
          );
        } catch (error) {
          if (closed) {
            return;
          }

          const message = error instanceof Error ? error.message : "unknown_error";
          const isDatabaseUrlMissing = message.includes(
            "Missing required environment variable: DATABASE_URL"
          );

          controller.enqueue(
            encoder.encode(
              encodeSseEvent("operations_error", {
                correlationId: crypto.randomUUID(),
                error: isDatabaseUrlMissing ? "database_not_configured" : "operations_live_unavailable",
                ...(process.env.NODE_ENV === "development"
                  ? { detail: message }
                  : {})
              })
            )
          );
        }
      };

      closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (refreshTimer) {
          clearInterval(refreshTimer);
        }

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }

        request.signal.removeEventListener("abort", abortListener);
        try {
          controller.close();
        } catch {
          // Stream may already be closed by the runtime cancellation flow.
        }
      };

      request.signal.addEventListener("abort", abortListener);

      controller.enqueue(
        encoder.encode(
          encodeSseComment("safetycare-operations-live-connected")
        )
      );

      void publishSnapshot();

      refreshTimer = setInterval(() => {
        void publishSnapshot();
      }, 5000);

      heartbeatTimer = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(encodeSseComment("heartbeat")));
      }, 20000);
    },
    cancel() {
      closeStream?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
