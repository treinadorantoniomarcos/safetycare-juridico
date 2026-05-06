import { leadIntakeSchema, type LeadIntakeInput } from "@safetycare/ai-contracts";
import { createIntakeCase } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";
import { createPublicCaseAccessCode } from "./public-case-access-code";

export async function createCaseFromIntake(
  payload: unknown,
  correlationId: string
): Promise<{ caseId: string; workflowJobId: string; accessCode: string }> {
  const parsedPayload = leadIntakeSchema.parse(payload);
  const { db } = getDatabaseClient();

  const result = await createIntakeCase(db, parsedPayload as LeadIntakeInput, correlationId);
  const accessCode = createPublicCaseAccessCode(result.caseId, result.workflowJobId);

  return {
    caseId: result.caseId,
    workflowJobId: result.workflowJobId,
    accessCode
  };
}
