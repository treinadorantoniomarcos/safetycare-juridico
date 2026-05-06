import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { legalScoresTable } from "../schema";
import type {
  LegalScoreHumanReviewInput,
  LegalScoreRecord,
  NewLegalScoreRecord
} from "../types";

export class LegalScoreRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewLegalScoreRecord): Promise<LegalScoreRecord> {
    const [record] = await this.db
      .insert(legalScoresTable)
      .values(input)
      .onConflictDoUpdate({
        target: legalScoresTable.caseId,
        set: {
          viabilityScore: input.viabilityScore,
          complexity: input.complexity,
          estimatedValueCents: input.estimatedValueCents,
          confidence: input.confidence,
          reviewRequired: input.reviewRequired,
          reviewReasons: input.reviewReasons,
          rationale: input.rationale,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<LegalScoreRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(legalScoresTable)
      .where(eq(legalScoresTable.caseId, caseId));

    return record;
  }

  async applyHumanReviewDecision(
    caseId: string,
    input: LegalScoreHumanReviewInput
  ): Promise<LegalScoreRecord | undefined> {
    const [record] = await this.db
      .update(legalScoresTable)
      .set({
        decision: input.decision,
        reviewNote: input.note,
        reviewedBy: input.reviewerId,
        reviewedAt: input.reviewedAt ?? new Date(),
        reviewRequired: false,
        updatedAt: new Date()
      })
      .where(eq(legalScoresTable.caseId, caseId))
      .returning();

    return record;
  }
}
