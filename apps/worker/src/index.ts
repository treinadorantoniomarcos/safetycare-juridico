import { createLogger } from "@safetycare/observability";
import { requireEnv, runWorkerCycle } from "./worker-cycle";

const logger = createLogger("worker-bootstrap");

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  await runWorkerCycle(databaseUrl, 10);
}

void main().catch((error) => {
  logger.error(
    `worker_cycle_failed error=${error instanceof Error ? error.message : "unknown"}`
  );
  process.exitCode = 1;
});
