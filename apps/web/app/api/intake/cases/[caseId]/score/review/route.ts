import { AuditLogRepository, CaseRepository, LegalScoreRepository } from "@safetycare/database";
import { scoreReviewDecisionSchema } from "@safetycare/ai-contracts";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
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

function getCaseStatusesForDecision(decision: "green" | "yellow" | "red") {
  if (decision === "green" || decision === "yellow") {
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

function getSeedScoreForDecision(caseId: string, decision: "green" | "yellow" | "red") {
  const base =
    decision === "green"
      ? {
          viabilityScore: 85,
          reviewRequired: false
        }
      : decision === "yellow"
        ? {
            viabilityScore: 60,
            reviewRequired: true
          }
        : {
            viabilityScore: 30,
            reviewRequired: false
          };

  return {
    caseId,
    viabilityScore: base.viabilityScore,
    complexity: "manual_classification",
    estimatedValueCents: 0,
    confidence: 100,
    reviewRequired: base.reviewRequired,
    reviewReasons: {
      source: "human_score_classification"
    },
    rationale: {
      source: "human_score_classification",
      decision
    }
  };
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const { caseId } = await Promise.resolve(context.params);

  const canAccess = hasDashboardSessionFromRequest(request) || hasOperationsAccess(request);

  if (!canAccess) {
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

    const decisionInput = {
      decision: validation.data.decision,
      reviewerId: validation.data.reviewerId,
      note: validation.data.note?.trim() ? validation.data.note.trim() : ""
    };

    if (validation.data.decision !== "green" && !decisionInput.note) {
      return NextResponse.json(
        {
          correlationId,
          error: "note_required"
        },
        { status: 400 }
      );
    }

    const scoreRecord =
      (await legalScores.findByCaseId(caseId)) ??
      (await legalScores.upsert(getSeedScoreForDecision(caseId, validation.data.decision)));
    const reviewedScore = await legalScores.applyHumanReviewDecision(caseId, decisionInput);
    const nextStatuses = getCaseStatusesForDecision(validation.data.decision);
    const caseStatus = await cases.updateStatuses(caseId, nextStatuses);

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: validation.data.reviewerId,
      action:
        validation.data.decision === "green"
          ? "intake.score_review_classified_green"
          : validation.data.decision === "yellow"
            ? "intake.score_review_classified_yellow"
            : "intake.score_review_classified_red",
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
