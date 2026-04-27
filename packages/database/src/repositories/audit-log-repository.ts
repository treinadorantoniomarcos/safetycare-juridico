import { and, desc, eq, gte } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { auditLogsTable } from "../schema";
import type { AuditLogRecord, NewAuditLogRecord } from "../types";

export class AuditLogRepository {
  constructor(private readonly db: DatabaseClient) {}

  async record(input: NewAuditLogRecord): Promise<AuditLogRecord> {
    const [record] = await this.db.insert(auditLogsTable).values(input).returning();
    return record;
  }

  async listByAction(action: string, since: Date, limit: number): Promise<AuditLogRecord[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 100;
    const validLimit = normalizedLimit > 0 ? normalizedLimit : 100;
    const clampedLimit = Math.min(500, Math.max(1, validLimit));

    return this.db
      .select()
      .from(auditLogsTable)
      .where(and(eq(auditLogsTable.action, action), gte(auditLogsTable.createdAt, since)))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(clampedLimit);
  }
}
