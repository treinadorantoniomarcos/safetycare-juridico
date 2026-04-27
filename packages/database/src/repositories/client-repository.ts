import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { clientsTable } from "../schema";
import type { ClientRecord, NewClientRecord } from "../types";

export class ClientRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: NewClientRecord): Promise<ClientRecord> {
    const [client] = await this.db.insert(clientsTable).values(input).returning();
    return client;
  }

  async findById(id: string): Promise<ClientRecord | undefined> {
    const [client] = await this.db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id));
    return client;
  }

  async updateConsent(
    id: string,
    consentStatus: ClientRecord["consentStatus"],
    consentPayload: Record<string, unknown>
  ): Promise<ClientRecord | undefined> {
    const [client] = await this.db
      .update(clientsTable)
      .set({
        consentStatus,
        consentPayload
      })
      .where(eq(clientsTable.id, id))
      .returning();

    return client;
  }
}
