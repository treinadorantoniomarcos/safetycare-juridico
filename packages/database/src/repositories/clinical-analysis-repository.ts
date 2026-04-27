import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { clinicalAnalysesTable } from "../schema";
import type { ClinicalAnalysisRecord, NewClinicalAnalysisRecord } from "../types";

export class ClinicalAnalysisRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewClinicalAnalysisRecord): Promise<ClinicalAnalysisRecord> {
    const [record] = await this.db
      .insert(clinicalAnalysesTable)
      .values(input)
      .onConflictDoUpdate({
        target: clinicalAnalysesTable.caseId,
        set: {
          source: input.source,
          summary: input.summary,
          riskLevel: input.riskLevel,
          confidence: input.confidence,
          findings: input.findings,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<ClinicalAnalysisRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(clinicalAnalysesTable)
      .where(eq(clinicalAnalysesTable.caseId, caseId));

    return record;
  }
}
