import { createDatabaseClient } from "@safetycare/database";
import { createLogger } from "@safetycare/observability";
import {
  clinicalAnalysisJobType,
  drainClinicalAnalysisQueue,
  drainEvidenceBuilderQueue,
  drainIntakeBootstrapQueue,
  drainJourneyTimelineQueue,
  drainLegalExecutionQueue,
  drainLegalScoreQueue,
  drainRightsAssessmentQueue,
  drainTriageClassificationQueue,
  evidenceBuilderJobType,
  intakeBootstrapJobType,
  journeyTimelineJobType,
  legalExecutionJobType,
  legalScoreJobType,
  rightsAssessmentJobType,
  triageClassificationJobType
} from "@safetycare/orchestrator";

const logger = createLogger("worker-bootstrap");

export async function runWorkerCycle(databaseUrl: string, limit = 10) {
  const { db, pool } = createDatabaseClient(databaseUrl);

  try {
    logger.info(
      `worker_started jobTypes=${intakeBootstrapJobType},${triageClassificationJobType},${journeyTimelineJobType},${clinicalAnalysisJobType},${rightsAssessmentJobType},${evidenceBuilderJobType},${legalScoreJobType},${legalExecutionJobType}`
    );

    const intakeResult = await drainIntakeBootstrapQueue(db, limit);
    const triageResult = await drainTriageClassificationQueue(db, limit);
    const journeyResult = await drainJourneyTimelineQueue(db, limit);
    const clinicalResult = await drainClinicalAnalysisQueue(db, limit);
    const rightsResult = await drainRightsAssessmentQueue(db, limit);
    const evidenceResult = await drainEvidenceBuilderQueue(db, limit);
    const scoreResult = await drainLegalScoreQueue(db, limit);
    const legalExecutionResult = await drainLegalExecutionQueue(db, limit);

    logger.info(
      `worker_cycle_finished intakeProcessed=${String(intakeResult.processed)} triageProcessed=${String(triageResult.processed)} journeyProcessed=${String(journeyResult.processed)} clinicalProcessed=${String(clinicalResult.processed)} rightsProcessed=${String(rightsResult.processed)} evidenceProcessed=${String(evidenceResult.processed)} scoreProcessed=${String(scoreResult.processed)} legalExecutionProcessed=${String(legalExecutionResult.processed)}`
    );

    return {
      intakeResult,
      triageResult,
      journeyResult,
      clinicalResult,
      rightsResult,
      evidenceResult,
      scoreResult,
      legalExecutionResult
    };
  } finally {
    await pool.end();
  }
}

export function requireEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env
) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
