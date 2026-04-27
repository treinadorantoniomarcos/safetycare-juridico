import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findClinicalByCaseIdMock, getDatabaseClientMock } =
  vi.hoisted(() => ({
    findCaseByIdMock: vi.fn(),
    findClinicalByCaseIdMock: vi.fn(),
    getDatabaseClientMock: vi.fn()
  }));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  ClinicalAnalysisRepository: class {
    findByCaseId = findClinicalByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/clinical/route";

describe("GET /api/intake/cases/[caseId]/clinical", () => {
  it("returns clinical analysis details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "rights_pending"
    });
    findClinicalByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      source: "form",
      summary: "Analise clinica com alerta critico.",
      riskLevel: "critical",
      confidence: 90,
      findings: [
        {
          order: 1,
          findingType: "red_flag",
          description: "Sinal de alerta importante.",
          risk: true,
          evidenceHints: ["prontuario"]
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
    expect(body.caseStatus.legalStatus).toBe("rights_pending");
    expect(body.clinical.riskLevel).toBe("critical");
  });

  it("returns 404 when clinical analysis is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findClinicalByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
