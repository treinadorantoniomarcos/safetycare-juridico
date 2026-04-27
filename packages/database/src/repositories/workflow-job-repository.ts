import { and, asc, count, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { workflowJobsTable } from "../schema";
import type {
  NewWorkflowJobRecord,
  WorkflowJobRecord,
  WorkflowJobStatusSummaryRecord
} from "../types";

export class WorkflowJobRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: NewWorkflowJobRecord): Promise<WorkflowJobRecord> {
    const [record] = await this.db.insert(workflowJobsTable).values(input).returning();
    return record;
  }

  async createOrGet(input: NewWorkflowJobRecord): Promise<WorkflowJobRecord> {
    const [created] = await this.db
      .insert(workflowJobsTable)
      .values(input)
      .onConflictDoNothing({
        target: [workflowJobsTable.correlationId, workflowJobsTable.jobType]
      })
      .returning();

    if (created) {
      return created;
    }

    const existing = await this.findByCorrelationAndType(input.correlationId, input.jobType);

    if (!existing) {
      throw new Error("workflow_job_create_conflict_without_existing_record");
    }

    return existing;
  }

  async findByCorrelationAndType(
    correlationId: string,
    jobType: string
  ): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(workflowJobsTable)
      .where(
        and(
          eq(workflowJobsTable.correlationId, correlationId),
          eq(workflowJobsTable.jobType, jobType)
        )
      );

    return record;
  }

  async findById(id: string): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(workflowJobsTable)
      .where(eq(workflowJobsTable.id, id));

    return record;
  }

  async findLatestByCaseIdAndType(
    caseId: string,
    jobType: string
  ): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(workflowJobsTable)
      .where(and(eq(workflowJobsTable.caseId, caseId), eq(workflowJobsTable.jobType, jobType)))
      .orderBy(desc(workflowJobsTable.createdAt))
      .limit(1);

    return record;
  }

  async listReady(jobType: string, now: Date, limit: number): Promise<WorkflowJobRecord[]> {
    return this.db
      .select()
      .from(workflowJobsTable)
      .where(
        and(
          eq(workflowJobsTable.jobType, jobType),
          inArray(workflowJobsTable.status, ["queued", "failed"]),
          or(isNull(workflowJobsTable.runAfter), lte(workflowJobsTable.runAfter, now))
        )
      )
      .orderBy(asc(workflowJobsTable.createdAt))
      .limit(limit);
  }

  async summarizeByStatus(jobType: string): Promise<WorkflowJobStatusSummaryRecord[]> {
    const rows = await this.db
      .select({
        status: workflowJobsTable.status,
        total: count()
      })
      .from(workflowJobsTable)
      .where(eq(workflowJobsTable.jobType, jobType))
      .groupBy(workflowJobsTable.status);

    return rows.map((row) => ({
      status: row.status,
      total: Number(row.total)
    }));
  }

  async claim(id: string): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .update(workflowJobsTable)
      .set({
        status: "processing",
        attemptCount: sql<number>`${workflowJobsTable.attemptCount} + 1`
      })
      .where(
        and(
          eq(workflowJobsTable.id, id),
          inArray(workflowJobsTable.status, ["queued", "failed", "blocked"])
        )
      )
      .returning();

    return record;
  }

  async markBlocked(
    id: string,
    payload: Record<string, unknown>,
    runAfter: Date
  ): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .update(workflowJobsTable)
      .set({
        status: "blocked",
        payload,
        runAfter
      })
      .where(eq(workflowJobsTable.id, id))
      .returning();

    return record;
  }

  async markCompleted(
    id: string,
    payload: Record<string, unknown>
  ): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .update(workflowJobsTable)
      .set({
        status: "completed",
        payload,
        runAfter: null
      })
      .where(eq(workflowJobsTable.id, id))
      .returning();

    return record;
  }

  async markFailed(id: string, payload: Record<string, unknown>): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .update(workflowJobsTable)
      .set({
        status: "failed",
        payload
      })
      .where(eq(workflowJobsTable.id, id))
      .returning();

    return record;
  }

  async requeue(id: string, runAfter: Date | null = null): Promise<WorkflowJobRecord | undefined> {
    const [record] = await this.db
      .update(workflowJobsTable)
      .set({
        status: "queued",
        runAfter
      })
      .where(eq(workflowJobsTable.id, id))
      .returning();

    return record;
  }
}
