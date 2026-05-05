import { z } from "zod";
import { resolvePublicLegalBriefAccess } from "../../../../../../../../src/features/intake/public-legal-brief-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const workflowJobIdSchema = z.string().uuid();

function normalizeWorkflowJobId(url: URL) {
  const workflowJobId = url.searchParams.get("workflowJobId");
  return workflowJobId?.trim();
}

function encodeSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function encodeSseComment(comment: string) {
  return `: ${comment}\n\n`;
}

export async function GET(
  request: Request,
  context: { params: { caseId: string } | Promise<{ caseId: string }> }
) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);
  const workflowJobId = normalizeWorkflowJobId(new URL(request.url));

  if (!workflowJobId) {
    return Response.json(
      {
        correlationId,
        error: "workflow_job_id_required"
      },
      { status: 400 }
    );
  }

  const parsedWorkflowJobId = workflowJobIdSchema.safeParse(workflowJobId);

  if (!parsedWorkflowJobId.success) {
    return Response.json(
      {
        correlationId,
        error: "invalid_workflow_job_id"
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  let closed = false;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let closeStream: (() => void) | undefined;
  let lastSnapshotKey: string | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const abortListener = () => {
        closeStream?.();
      };

      const publishSnapshot = async () => {
        try {
          const access = await resolvePublicLegalBriefAccess(caseId, parsedWorkflowJobId.data);
          const snapshotKey = `${access.status}:${"message" in access ? access.message : ""}`;

          if (closed) {
            return;
          }

          if (snapshotKey !== lastSnapshotKey) {
            lastSnapshotKey = snapshotKey;
            controller.enqueue(
              encoder.encode(
                encodeSseEvent("brief_access", {
                  correlationId: crypto.randomUUID(),
                  caseId,
                  workflowJobId: parsedWorkflowJobId.data,
                  ...access
                })
              )
            );
          }

          if (access.status === "ready") {
            closeStream?.();
          }
        } catch (error) {
          if (closed) {
            return;
          }

          const message = error instanceof Error ? error.message : "unknown_error";
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("brief_access_error", {
                correlationId: crypto.randomUUID(),
                error: "public_brief_access_unavailable",
                message
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
          // The runtime may already have closed the stream.
        }
      };

      request.signal.addEventListener("abort", abortListener);

      controller.enqueue(encoder.encode(encodeSseComment("safetycare-public-brief-access-connected")));

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
