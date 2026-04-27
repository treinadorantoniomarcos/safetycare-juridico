import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findJourneyByCaseIdMock, getDatabaseClientMock } =
  vi.hoisted(() => ({
    findCaseByIdMock: vi.fn(),
    findJourneyByCaseIdMock: vi.fn(),
    getDatabaseClientMock: vi.fn()
  }));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  JourneyTimelineRepository: class {
    findByCaseId = findJourneyByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/journey/route";

describe("GET /api/intake/cases/[caseId]/journey", () => {
  it("returns journey details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "clinical_pending"
    });
    findJourneyByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      source: "form",
      summary: "Jornada estruturada com agravamento e alta prematura.",
      riskLevel: "critical",
      confidence: 84,
      timeline: {
        events: [
          {
            order: 1,
            title: "Entrada do caso",
            description: "Relato inicial recebido.",
            risk: false,
            evidenceHints: []
          }
        ]
      }
    });

    const response = await GET(new Request("http://localhost"), {
      params: {
        caseId: "case-1"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseStatus.legalStatus).toBe("clinical_pending");
    expect(body.journey.riskLevel).toBe("critical");
  });

  it("returns 404 when journey is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findJourneyByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
