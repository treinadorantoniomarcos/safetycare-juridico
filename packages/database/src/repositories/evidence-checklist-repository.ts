import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { evidenceChecklistsTable } from "../schema";
import type { EvidenceChecklistRecord, NewEvidenceChecklistRecord } from "../types";

export class EvidenceChecklistRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewEvidenceChecklistRecord): Promise<EvidenceChecklistRecord> {
    const [record] = await this.db
      .insert(evidenceChecklistsTable)
      .values(input)
      .onConflictDoUpdate({
        target: evidenceChecklistsTable.caseId,
        set: {
          source: input.source,
          summary: input.summary,
          confidence: input.confidence,
          missingCount: input.missingCount,
          items: input.items,
          requiredInformationRequests: input.requiredInformationRequests,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<EvidenceChecklistRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(evidenceChecklistsTable)
      .where(eq(evidenceChecklistsTable.caseId, caseId));

    return record;
  }
}
