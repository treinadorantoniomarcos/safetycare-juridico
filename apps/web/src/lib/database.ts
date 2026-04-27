import { createDatabaseClient } from "@safetycare/database";
import { getDatabaseUrl } from "../config/env";

let databaseClient: ReturnType<typeof createDatabaseClient> | null = null;

export function getDatabaseClient() {
  if (!databaseClient) {
    databaseClient = createDatabaseClient(getDatabaseUrl());
  }

  return databaseClient;
}
