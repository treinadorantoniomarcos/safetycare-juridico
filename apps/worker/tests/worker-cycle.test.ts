import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createDatabaseClientMock,
  drainIntakeBootstrapQueueMock,
  drainTriageClassificationQueueMock,
  drainJourneyTimelineQueueMock,
  drainClinicalAnalysisQueueMock,
  drainRightsAssessmentQueueMock,
  drainEvidenceBuilderQueueMock,
  drainLegalScoreQueueMock,
  drainLegalExecutionQueueMock
} = vi.hoisted(() => ({
  createDatabaseClientMock: vi.fn(),
  drainIntakeBootstrapQueueMock: vi.fn(),
  drainTriageClassificationQueueMock: vi.fn(),
  drainJourneyTimelineQueueMock: vi.fn(),
  drainClinicalAnalysisQueueMock: vi.fn(),
  drainRightsAssessmentQueueMock: vi.fn(),
  drainEvidenceBuilderQueueMock: vi.fn(),
  drainLegalScoreQueueMock: vi.fn(),
  drainLegalExecutionQueueMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  createDatabaseClient: createDatabaseClientMock
}));

vi.mock("@safetycare/orchestrator", () => ({
  intakeBootstrapJobType: "intake_bootstrap",
  triageClassificationJobType: "triage_classification",
  journeyTimelineJobType: "journey_timeline",
  clinicalAnalysisJobType: "clinical_analysis",
  rightsAssessmentJobType: "rights_assessment",
  evidenceBuilderJobType: "evidence_builder",
  legalScoreJobType: "legal_score",
  legalExecutionJobType: "legal_execution",
  drainIntakeBootstrapQueue: drainIntakeBootstrapQueueMock,
  drainTriageClassificationQueue: drainTriageClassificationQueueMock,
  drainJourneyTimelineQueue: drainJourneyTimelineQueueMock,
  drainClinicalAnalysisQueue: drainClinicalAnalysisQueueMock,
  drainRightsAssessmentQueue: drainRightsAssessmentQueueMock,
  drainEvidenceBuilderQueue: drainEvidenceBuilderQueueMock,
  drainLegalScoreQueue: drainLegalScoreQueueMock,
  drainLegalExecutionQueue: drainLegalExecutionQueueMock
}));

vi.mock("@safetycare/observability", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

import { requireEnv, runWorkerCycle } from "../src/worker-cycle";

describe("requireEnv", () => {
  it("returns env value when present", () => {
    expect(requireEnv("DATABASE_URL", { DATABASE_URL: "postgres://db" })).toBe(
      "postgres://db"
    );
  });

  it("throws when env is missing", () => {
    expect(() => requireEnv("DATABASE_URL", {})).toThrow(
      "Missing required environment variable: DATABASE_URL"
    );
  });
});

describe("runWorkerCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createDatabaseClientMock.mockReturnValue({
      db: { marker: "db-client" },
      pool: { end: vi.fn().mockResolvedValue(undefined) }
    });

    drainIntakeBootstrapQueueMock.mockResolvedValue({ processed: 1 });
    drainTriageClassificationQueueMock.mockResolvedValue({ processed: 2 });
    drainJourneyTimelineQueueMock.mockResolvedValue({ processed: 3 });
    drainClinicalAnalysisQueueMock.mockResolvedValue({ processed: 4 });
    drainRightsAssessmentQueueMock.mockResolvedValue({ processed: 5 });
    drainEvidenceBuilderQueueMock.mockResolvedValue({ processed: 6 });
    drainLegalScoreQueueMock.mockResolvedValue({ processed: 7 });
    drainLegalExecutionQueueMock.mockResolvedValue({ processed: 8 });
  });

  it("drains all queues with configured limit and closes pool", async () => {
    const result = await runWorkerCycle("postgres://db", 25);
    const { db, pool } = createDatabaseClientMock.mock.results[0]?.value as {
      db: unknown;
      pool: { end: ReturnType<typeof vi.fn> };
    };

    expect(drainIntakeBootstrapQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainTriageClassificationQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainJourneyTimelineQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainClinicalAnalysisQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainRightsAssessmentQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainEvidenceBuilderQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainLegalScoreQueueMock).toHaveBeenCalledWith(db, 25);
    expect(drainLegalExecutionQueueMock).toHaveBeenCalledWith(db, 25);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(result.scoreResult.processed).toBe(7);
  });

  it("closes pool even when a queue fails", async () => {
    drainLegalScoreQueueMock.mockRejectedValueOnce(new Error("score_failure"));

    await expect(runWorkerCycle("postgres://db")).rejects.toThrow("score_failure");

    const { pool } = createDatabaseClientMock.mock.results[0]?.value as {
      pool: { end: ReturnType<typeof vi.fn> };
    };

    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(drainIntakeBootstrapQueueMock).toHaveBeenCalledWith(
      expect.anything(),
      10
    );
  });
});
