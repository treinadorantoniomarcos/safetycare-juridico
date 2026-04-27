import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  auditLogsTable,
  clinicalAnalysesTable,
  evidenceChecklistsTable,
  legalScoresTable,
  rightsAssessmentsTable,
  casesTable,
  clientsTable,
  journeyTimelinesTable,
  leadsTable,
  triageAnalysesTable,
  workflowJobsTable
} from "./schema";

export const databaseSchema = {
  leadsTable,
  clientsTable,
  casesTable,
  workflowJobsTable,
  triageAnalysesTable,
  journeyTimelinesTable,
  clinicalAnalysesTable,
  rightsAssessmentsTable,
  evidenceChecklistsTable,
  legalScoresTable,
  auditLogsTable
};

export function createDatabaseClient(connectionString: string) {
  const pool = new Pool({
    connectionString
  });

  const db = drizzle(pool, {
    schema: databaseSchema
  });

  return {
    db,
    pool
  };
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>["db"];
