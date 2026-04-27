import { leadIntakeSchema, type LeadIntakeInput } from "@safetycare/ai-contracts";
import { createIntakeCase } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

export async function createCaseFromIntake(
  payload: unknown,
  correlationId: string
): Promise<{ caseId: string; workflowJobId: string }> {
  const parsedPayload = leadIntakeSchema.parse(payload);
  const { db } = getDatabaseClient();

  const result = await createIntakeCase(db, parsedPayload as LeadIntakeInput, correlationId);

  return {
    caseId: result.caseId,
    workflowJobId: result.workflowJobId
  };
}
