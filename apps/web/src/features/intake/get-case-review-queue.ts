import { CaseRepository, type CaseStatusRecord } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

const DEFAULT_LIMIT = 50;

export const caseReviewQueueStatuses = [
  "human_triage_pending",
  "human_review_required",
  "conversion_pending",
  "score_rejected"
] as const;

export type CaseReviewQueueSummaryItem = {
  status: string;
  total: number;
};

export type CaseReviewQueueResult = {
  statuses: string[];
  total: number;
  summary: CaseReviewQueueSummaryItem[];
  cases: CaseStatusRecord[];
};

export async function getCaseReviewQueue(limit: number = DEFAULT_LIMIT): Promise<CaseReviewQueueResult> {
  const sanitizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : DEFAULT_LIMIT;
  const { db } = getDatabaseClient();
  const cases = new CaseRepository(db);
  const statuses = [...caseReviewQueueStatuses];
  const queue = await cases.listByLegalStatuses(statuses, sanitizedLimit);
  const totalsByStatus = new Map<string, number>(statuses.map((status) => [status, 0]));

  for (const caseRecord of queue) {
    totalsByStatus.set(caseRecord.legalStatus, (totalsByStatus.get(caseRecord.legalStatus) ?? 0) + 1);
  }

  return {
    statuses,
    total: queue.length,
    summary: statuses.map((status) => ({
      status,
      total: totalsByStatus.get(status) ?? 0
    })),
    cases: queue
  };
}
