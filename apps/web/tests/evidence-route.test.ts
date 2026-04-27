import { describe, expect, it, vi } from "vitest";

const { findCaseByIdMock, findEvidenceByCaseIdMock, getDatabaseClientMock } =
  vi.hoisted(() => ({
    findCaseByIdMock: vi.fn(),
    findEvidenceByCaseIdMock: vi.fn(),
    getDatabaseClientMock: vi.fn()
  }));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  EvidenceChecklistRepository: class {
    findByCaseId = findEvidenceByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/cases/[caseId]/evidence/route";

describe("GET /api/intake/cases/[caseId]/evidence", () => {
  it("returns evidence checklist details for an existing case", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1",
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "triaged",
      legalStatus: "score_pending"
    });
    findEvidenceByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      source: "form",
      summary: "Checklist com lacunas criticas de prova.",
      confidence: 80,
      missingCount: 2,
      items: [
        {
          itemKey: "medical_records",
          status: "missing",
          importance: "critical"
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
    expect(body.caseStatus.legalStatus).toBe("score_pending");
    expect(body.evidence.missingCount).toBe(2);
  });

  it("returns 404 when evidence checklist is missing", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: "case-1"
    });
    findEvidenceByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        caseId: "case-1"
      })
    });

    expect(response.status).toBe(404);
  });
});
