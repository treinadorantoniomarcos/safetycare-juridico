import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findTriageByCaseIdMock, getDatabaseClientMock } = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findTriageByCaseIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  TriageAnalysisRepository: class {
    findByCaseId = findTriageByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/triage/route";

describe("GET /api/intake/cases/[caseId]/triage", () => {
  it("returns triage details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "triaged"
    });
    findTriageByCaseIdMock.mockResolvedValueOnce({
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      legalPotential: "high",
      confidence: 86
    });

    const response = await GET(new Request("http://localhost"), {
      params: {
        caseId: "case-1"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseStatus.caseType).toBe("hospital_failure");
    expect(body.triage.confidence).toBe(86);
  });

  it("returns 404 when triage is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findTriageByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
