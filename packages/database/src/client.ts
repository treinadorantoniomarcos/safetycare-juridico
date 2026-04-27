import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  agentIntelligenceTable,
  auditLogsTable,
  clinicalAnalysesTable,
  evidenceChecklistsTable,
  evidenceDocsTable,
  hospitalCasesTable,
  legalAlertsTable,
  legalScoresTable,
  patientJourneyTable,
  patientsTable,
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
  auditLogsTable,
  patientsTable,
  hospitalCasesTable,
  patientJourneyTable,
  evidenceDocsTable,
  agentIntelligenceTable,
  legalAlertsTable
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
