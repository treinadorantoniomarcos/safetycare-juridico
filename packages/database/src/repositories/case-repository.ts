import { desc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { casesTable, clientsTable, leadsTable } from "../schema";
import type {
  CaseIntakeContextRecord,
  CaseRecord,
  CaseStatusRecord,
  CaseWithClientRecord,
  NewCaseRecord
} from "../types";

export class CaseRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: NewCaseRecord): Promise<CaseRecord> {
    const [record] = await this.db.insert(casesTable).values(input).returning();
    return record;
  }

  async findById(id: string): Promise<CaseRecord | undefined> {
    const [record] = await this.db.select().from(casesTable).where(eq(casesTable.id, id));
    return record;
  }

  async findWithClientById(id: string): Promise<CaseWithClientRecord | undefined> {
    const [record] = await this.db
      .select({
        caseRecord: casesTable,
        clientRecord: clientsTable
      })
      .from(casesTable)
      .innerJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
      .where(eq(casesTable.id, id));

    return record;
  }

  async findIntakeContextById(id: string): Promise<CaseIntakeContextRecord | undefined> {
    const [record] = await this.db
      .select({
        caseRecord: casesTable,
        clientRecord: clientsTable,
        leadRecord: leadsTable
      })
      .from(casesTable)
      .innerJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
      .innerJoin(leadsTable, eq(clientsTable.leadId, leadsTable.id))
      .where(eq(casesTable.id, id));

    return record;
  }

  async updateStatuses(
    id: string,
    input: Partial<
      Pick<CaseRecord, "caseType" | "priority" | "urgency" | "commercialStatus" | "legalStatus">
    >
  ): Promise<CaseStatusRecord | undefined> {
    const [record] = await this.db
      .update(casesTable)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(casesTable.id, id))
      .returning({
        id: casesTable.id,
        caseType: casesTable.caseType,
        priority: casesTable.priority,
        urgency: casesTable.urgency,
        commercialStatus: casesTable.commercialStatus,
        legalStatus: casesTable.legalStatus,
        updatedAt: casesTable.updatedAt
      });

    return record;
  }

  async listByLegalStatuses(statuses: string[], limit: number): Promise<CaseStatusRecord[]> {
    if (statuses.length === 0) {
      return [];
    }

    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 50;
    const clampedLimit = Math.min(200, Math.max(1, normalizedLimit));

    return this.db
      .select({
        id: casesTable.id,
        caseType: casesTable.caseType,
        priority: casesTable.priority,
        urgency: casesTable.urgency,
        commercialStatus: casesTable.commercialStatus,
        legalStatus: casesTable.legalStatus,
        updatedAt: casesTable.updatedAt
      })
      .from(casesTable)
      .where(inArray(casesTable.legalStatus, statuses))
      .orderBy(desc(casesTable.updatedAt))
      .limit(clampedLimit);
  }
}
