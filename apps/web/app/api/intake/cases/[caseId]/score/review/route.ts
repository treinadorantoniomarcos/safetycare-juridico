import { AuditLogRepository, CaseRepository, LegalScoreRepository } from "@safetycare/database";
import { scoreReviewDecisionSchema } from "@safetycare/ai-contracts";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

function getCaseStatusesForDecision(decision: "approve" | "request_changes" | "reject") {
  if (decision === "approve" || decision === "request_changes") {
    return {
      commercialStatus: "conversion_pending",
      legalStatus: "conversion_pending"
    } as const;
  }

  return {
    commercialStatus: "score_rejected",
    legalStatus: "score_rejected"
  } as const;
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);

  if (!hasOperationsAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

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

  const validation = scoreReviewDecisionSchema.safeParse(payload);

  if (!validation.success) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_payload",
        details: validation.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const legalScores = new LegalScoreRepository(db);
    const auditLogs = new AuditLogRepository(db);

    const caseRecord = await cases.findById(caseId);

    if (!caseRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    const scoreRecord = await legalScores.findByCaseId(caseId);

    if (!scoreRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "score_not_found"
        },
        { status: 404 }
      );
    }

    const decisionInput = {
      decision: validation.data.decision,
      reviewerId: validation.data.reviewerId,
      note: validation.data.note?.trim() ? validation.data.note.trim() : ""
    };

    if (validation.data.decision === "request_changes" && !decisionInput.note) {
      return NextResponse.json(
        {
          correlationId,
          error: "note_required"
        },
        { status: 400 }
      );
    }

    const reviewedScore = await legalScores.applyHumanReviewDecision(caseId, decisionInput);
    const nextStatuses = getCaseStatusesForDecision(validation.data.decision);
    const caseStatus = await cases.updateStatuses(caseId, nextStatuses);

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: validation.data.reviewerId,
      action:
        validation.data.decision === "approve"
          ? "intake.score_review_approved"
          : validation.data.decision === "request_changes"
            ? "intake.score_review_requested_changes"
            : "intake.score_review_rejected",
      correlationId,
      beforePayload: {
        score: scoreRecord,
        caseStatus: {
          commercialStatus: caseRecord.commercialStatus,
          legalStatus: caseRecord.legalStatus
        }
      },
      afterPayload: {
        decision: validation.data.decision,
        note: decisionInput.note,
        score: reviewedScore,
        caseStatus
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        decision: validation.data.decision,
        score: reviewedScore,
        caseStatus
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "score_review_failed"
      },
      { status: 500 }
    );
  }
}
