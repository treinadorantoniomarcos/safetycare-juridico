import { describe, expect, it } from "vitest";

import {
  buildPublicCaseCompletionHref,
  createPublicCaseAccessCode,
  parsePublicCaseAccessCode
} from "../src/features/intake/public-case-access-code";

describe("Public case access code", () => {
  it("encodes and decodes the case access payload", () => {
    const caseId = "11111111-1111-4111-8111-111111111111";
    const workflowJobId = "22222222-2222-4222-8222-222222222222";

    const code = createPublicCaseAccessCode(caseId, workflowJobId);
    const parsed = parsePublicCaseAccessCode(code);

    expect(code.startsWith("SC1.")).toBe(true);
    expect(parsed).toEqual({
      caseId,
      workflowJobId,
      accessCode: code
    });
  });

  it("builds the completion href using the access code", () => {
    const accessCode = "SC1.dGVzdC1jb2Rl";

    expect(buildPublicCaseCompletionHref(accessCode)).toBe(
      `/completar-caso?accessCode=${encodeURIComponent(accessCode)}`
    );
  });
});
