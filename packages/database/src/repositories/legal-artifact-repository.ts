import { and, desc, eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { legalArtifactsTable } from "../schema";
import type { LegalArtifactRecord, NewLegalArtifactRecord } from "../types";

type LegalArtifactVersionInput = Omit<NewLegalArtifactRecord, "versionNumber">;

export class LegalArtifactRepository {
  constructor(private readonly db: DatabaseClient) {}

  async createVersion(input: LegalArtifactVersionInput): Promise<LegalArtifactRecord> {
    const latest = await this.findLatestByCaseIdAndType(input.caseId, input.artifactType);
    const nextVersion = (latest?.versionNumber ?? 0) + 1;

    const [record] = await this.db
      .insert(legalArtifactsTable)
      .values({
        ...input,
        versionNumber: nextVersion,
        updatedAt: new Date()
      })
      .returning();

    return record;
  }

  async findLatestByCaseIdAndType(
    caseId: string,
    artifactType: string
  ): Promise<LegalArtifactRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(legalArtifactsTable)
      .where(and(eq(legalArtifactsTable.caseId, caseId), eq(legalArtifactsTable.artifactType, artifactType)))
      .orderBy(desc(legalArtifactsTable.versionNumber))
      .limit(1);

    return record;
  }

  async listByCaseId(caseId: string): Promise<LegalArtifactRecord[]> {
    return this.db
      .select()
      .from(legalArtifactsTable)
      .where(eq(legalArtifactsTable.caseId, caseId))
      .orderBy(desc(legalArtifactsTable.versionNumber));
  }
}
