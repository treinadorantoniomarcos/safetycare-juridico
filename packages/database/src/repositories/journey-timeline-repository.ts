import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { journeyTimelinesTable } from "../schema";
import type { JourneyTimelineRecord, NewJourneyTimelineRecord } from "../types";

export class JourneyTimelineRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewJourneyTimelineRecord): Promise<JourneyTimelineRecord> {
    const [record] = await this.db
      .insert(journeyTimelinesTable)
      .values(input)
      .onConflictDoUpdate({
        target: journeyTimelinesTable.caseId,
        set: {
          source: input.source,
          summary: input.summary,
          riskLevel: input.riskLevel,
          confidence: input.confidence,
          timeline: input.timeline,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<JourneyTimelineRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(journeyTimelinesTable)
      .where(eq(journeyTimelinesTable.caseId, caseId));

    return record;
  }
}
