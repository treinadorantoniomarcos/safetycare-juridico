import { CaseRepository, LegalScoreRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

export async function GET(request: Request, context: RouteContext) {
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

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const legalScores = new LegalScoreRepository(db);
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

    const score = await legalScores.findByCaseId(caseId);

    if (!score) {
      return NextResponse.json(
        {
          correlationId,
          error: "score_not_found"
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      correlationId,
      caseId,
      caseStatus: {
        caseType: caseRecord.caseType,
        priority: caseRecord.priority,
        urgency: caseRecord.urgency,
        commercialStatus: caseRecord.commercialStatus,
        legalStatus: caseRecord.legalStatus
      },
      score
    });
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "score_fetch_failed"
      },
      { status: 500 }
    );
  }
}
