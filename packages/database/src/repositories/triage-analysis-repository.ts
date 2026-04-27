import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { triageAnalysesTable } from "../schema";
import type { NewTriageAnalysisRecord, TriageAnalysisRecord } from "../types";

export class TriageAnalysisRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewTriageAnalysisRecord): Promise<TriageAnalysisRecord> {
    const [record] = await this.db
      .insert(triageAnalysesTable)
      .values(input)
      .onConflictDoUpdate({
        target: triageAnalysesTable.caseId,
        set: {
          caseType: input.caseType,
          priority: input.priority,
          urgency: input.urgency,
          hasDamage: input.hasDamage,
          legalPotential: input.legalPotential,
          confidence: input.confidence,
          rationale: input.rationale,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<TriageAnalysisRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(triageAnalysesTable)
      .where(eq(triageAnalysesTable.caseId, caseId));

    return record;
  }
}
