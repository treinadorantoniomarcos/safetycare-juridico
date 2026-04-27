import { WorkflowJobRepository } from "@safetycare/database";
import { intakeBootstrapJobType } from "@safetycare/orchestrator";
import { getDatabaseClient } from "../../lib/database";

export async function getIntakeQueueSummary() {
  const { db } = getDatabaseClient();
  const workflowJobs = new WorkflowJobRepository(db);
  const summary = await workflowJobs.summarizeByStatus(intakeBootstrapJobType);

  return {
    jobType: intakeBootstrapJobType,
    summary,
    total: summary.reduce((accumulator, item) => accumulator + item.total, 0)
  };
}
