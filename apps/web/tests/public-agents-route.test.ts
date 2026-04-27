import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findWorkflowJobByIdMock,
  findLatestByCaseIdAndTypeMock,
  findTriageByCaseIdMock,
  findJourneyByCaseIdMock,
  findClinicalByCaseIdMock,
  findRightsByCaseIdMock,
  findEvidenceByCaseIdMock,
  findScoreByCaseIdMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  findTriageByCaseIdMock: vi.fn(),
  findJourneyByCaseIdMock: vi.fn(),
  findClinicalByCaseIdMock: vi.fn(),
  findRightsByCaseIdMock: vi.fn(),
  findEvidenceByCaseIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  WorkflowJobRepository: class {
    findById = findWorkflowJobByIdMock;
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
  },
  TriageAnalysisRepository: class {
    findByCaseId = findTriageByCaseIdMock;
  },
  JourneyTimelineRepository: class {
    findByCaseId = findJourneyByCaseIdMock;
  },
  ClinicalAnalysisRepository: class {
    findByCaseId = findClinicalByCaseIdMock;
  },
  RightsAssessmentRepository: class {
    findByCaseId = findRightsByCaseIdMock;
  },
  EvidenceChecklistRepository: class {
    findByCaseId = findEvidenceByCaseIdMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET } from "../app/api/intake/public/cases/[caseId]/agents/route";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

describe("GET /api/intake/public/cases/[caseId]/agents", () => {
  it("returns full agents snapshot when token is valid", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });

    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      caseType: "medical_error",
      priority: "high",
      urgency: "critical",
      commercialStatus: "screening",
      legalStatus: "score_pending"
    });

    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });

    findTriageByCaseIdMock.mockResolvedValueOnce({
      caseType: "medical_error",
      priority: "high",
      urgency: "critical"
    });
    findJourneyByCaseIdMock.mockResolvedValueOnce({
      summary: "Linha do tempo consolidada."
    });
    findClinicalByCaseIdMock.mockResolvedValueOnce({
      summary: "Risco clinico elevado por atraso terapeutico."
    });
    findRightsByCaseIdMock.mockResolvedValueOnce({
      violationCount: 2
    });
    findEvidenceByCaseIdMock.mockResolvedValueOnce({
      missingCount: 3
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      viabilityScore: 82,
      complexity: "high",
      reviewRequired: true
    });

    findLatestByCaseIdAndTypeMock.mockResolvedValue({
      status: "completed",
      jobType: "triage.classification"
    });

    const response = await GET(
      new Request(
        `http://localhost/api/intake/public/cases/${caseId}/agents?workflowJobId=${workflowJobId}`
      ),
      { params: { caseId } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents).toHaveLength(12);
    expect(body.orchestrator.name).toBe("Safetycare Orchestrator");
  });

  it("blocks access when workflow token is invalid", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });

    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId: "33333333-3333-4333-8333-333333333333",
      jobType: "intake.orchestrator.bootstrap"
    });

    const response = await GET(
      new Request(
        `http://localhost/api/intake/public/cases/${caseId}/agents?workflowJobId=${workflowJobId}`
      ),
      { params: { caseId } }
    );

    expect(response.status).toBe(403);
  });
});
