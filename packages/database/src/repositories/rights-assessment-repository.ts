import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { rightsAssessmentsTable } from "../schema";
import type { NewRightsAssessmentRecord, RightsAssessmentRecord } from "../types";

export class RightsAssessmentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewRightsAssessmentRecord): Promise<RightsAssessmentRecord> {
    const [record] = await this.db
      .insert(rightsAssessmentsTable)
      .values(input)
      .onConflictDoUpdate({
        target: rightsAssessmentsTable.caseId,
        set: {
          source: input.source,
          summary: input.summary,
          confidence: input.confidence,
          violationCount: input.violationCount,
          rights: input.rights,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<RightsAssessmentRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(rightsAssessmentsTable)
      .where(eq(rightsAssessmentsTable.caseId, caseId));

    return record;
  }
}
