import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { leadsTable } from "../schema";
import type { LeadRecord, NewLeadRecord } from "../types";

export class LeadRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: NewLeadRecord): Promise<LeadRecord> {
    const [lead] = await this.db.insert(leadsTable).values(input).returning();
    return lead;
  }

  async findById(id: string): Promise<LeadRecord | undefined> {
    const [lead] = await this.db.select().from(leadsTable).where(eq(leadsTable.id, id));
    return lead;
  }
}
