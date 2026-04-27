import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findRightsByCaseIdMock, getDatabaseClientMock } = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findRightsByCaseIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  RightsAssessmentRepository: class {
    findByCaseId = findRightsByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/rights/route";

describe("GET /api/intake/cases/[caseId]/rights", () => {
  it("returns rights assessment details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "evidence_pending"
    });
    findRightsByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      source: "form",
      summary: "Foram detectadas 2 possiveis violacoes de direitos do paciente.",
      confidence: 84,
      violationCount: 2,
      rights: [
        {
          rightKey: "patient_safety",
          status: "possible_violation",
          justification: "Sinais clinicos de risco elevado na jornada.",
          signals: ["red_flag"]
        }
      ]
    });

    const response = await GET(new Request("http://localhost"), {
      params: {
        caseId: "case-1"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseStatus.legalStatus).toBe("evidence_pending");
    expect(body.rights.violationCount).toBe(2);
  });

  it("returns 404 when rights assessment is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findRightsByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
