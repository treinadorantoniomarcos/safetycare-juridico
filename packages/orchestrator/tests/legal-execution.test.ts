import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimMock,
  findByIdMock,
  findLegalBriefByCaseIdMock,
  createVersionMock,
  updateStatusesMock,
  markBlockedMock,
  markCompletedMock,
  markFailedMock,
  recordMock
} = vi.hoisted(() => ({
  claimMock: vi.fn(),
  findByIdMock: vi.fn(),
  findLegalBriefByCaseIdMock: vi.fn(),
  createVersionMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  markBlockedMock: vi.fn(),
  markCompletedMock: vi.fn(),
  markFailedMock: vi.fn(),
  recordMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  WorkflowJobRepository: class {
    claim = claimMock;
    markBlocked = markBlockedMock;
    markCompleted = markCompletedMock;
    markFailed = markFailedMock;
  },
  CaseRepository: class {
    findById = findByIdMock;
    updateStatuses = updateStatusesMock;
  },
  LegalBriefInputRepository: class {
    findByCaseId = findLegalBriefByCaseIdMock;
  },
  LegalArtifactRepository: class {
    createVersion = createVersionMock;
  },
  AuditLogRepository: class {
    record = recordMock;
  },
  TriageAnalysisRepository: class {},
  JourneyTimelineRepository: class {},
  ClinicalAnalysisRepository: class {},
  RightsAssessmentRepository: class {},
  EvidenceChecklistRepository: class {},
  LegalScoreRepository: class {}
}));

vi.mock("@safetycare/observability", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

import { runLegalExecution } from "../src/index";

describe("runLegalExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts legal execution when case is pending", async () => {
    claimMock.mockResolvedValueOnce({
      id: "job-1",
      caseId: "case-1",
      correlationId: "corr-1"
    });
    findByIdMock.mockResolvedValueOnce({
      id: "case-1",
      legalStatus: "legal_execution_pending"
    });
    findLegalBriefByCaseIdMock.mockResolvedValueOnce({
      caseId: "case-1",
      sourceWorkflowJobId: "brief-job-1",
      draftScope: "civil_health",
      patientFullName: "Paciente Exemplo",
      patientCpf: "12345678901",
      city: "Curitiba",
      contact: "41 99999-9999",
      patientAddress: "Rua do Paciente, 123, Curitiba-PR",
      patientWhatsapp: "(41) 97777-6666",
      patientEmail: "paciente@example.com",
      patientRg: "9876543",
      relationToPatient: "Filho",
      contactFullName: "Responsavel Exemplo",
      contactAddress: "Rua A, 123, Curitiba-PR",
      contactWhatsapp: "(41) 98888-7777",
      contactEmail: "responsavel@example.com",
      contactCpf: "22233344455",
      contactRg: "1234567",
      problemType: "atendimento",
      currentUrgency: "medium",
      keyDates: [{ label: "Consulta", date: "2025-05-01" }],
      objectiveDescription: "Descrição objetiva",
      materialLosses: "Perdas materiais",
      moralImpact: "Impacto moral",
      uploadedDocuments: [],
      documentsAttached: ["doc.pdf"],
      witnesses: ["Testemunha"],
      mainRequest: "Pedido principal",
      subsidiaryRequest: "Pedido subsidiário",
      createdAt: new Date("2025-05-01T00:00:00Z"),
      updatedAt: new Date("2025-05-01T00:00:00Z")
    });
    updateStatusesMock.mockResolvedValueOnce({
      id: "case-1",
      legalStatus: "legal_execution_in_progress"
    });
    markCompletedMock.mockResolvedValueOnce(undefined);
    recordMock.mockResolvedValue(undefined);

    const result = await runLegalExecution({} as never, "job-1");

    expect(updateStatusesMock).toHaveBeenCalledWith("case-1", {
      legalStatus: "legal_execution_in_progress"
    });
    expect(markCompletedMock).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        stage: "legal_execution_in_progress",
        generatedArtifactTypes: [
          "civil_health_draft",
          "power_of_attorney",
          "fee_agreement"
        ]
      })
    );
    expect(result.status).toBe("completed");
    expect(result.nextStage).toBe("legal_execution_in_progress");
  });

  it("blocks execution when case is not in pending stage", async () => {
    claimMock.mockResolvedValueOnce({
      id: "job-2",
      caseId: "case-2",
      correlationId: "corr-2"
    });
    findByIdMock.mockResolvedValueOnce({
      id: "case-2",
      legalStatus: "triaged"
    });
    markBlockedMock.mockResolvedValueOnce(undefined);
    recordMock.mockResolvedValue(undefined);

    const result = await runLegalExecution({} as never, "job-2");

    expect(markBlockedMock).toHaveBeenCalledTimes(1);
    expect(updateStatusesMock).not.toHaveBeenCalled();
    expect(result.status).toBe("blocked");
    expect(result.nextStage).toBe("legal_execution_pending");
  });

  it("blocks legal execution when the legal brief parameters are missing", async () => {
    claimMock.mockResolvedValueOnce({
      id: "job-3",
      caseId: "case-3",
      correlationId: "corr-3"
    });
    findByIdMock.mockResolvedValueOnce({
      id: "case-3",
      legalStatus: "legal_execution_pending"
    });
    findLegalBriefByCaseIdMock.mockResolvedValueOnce(undefined);
    markBlockedMock.mockResolvedValueOnce(undefined);
    recordMock.mockResolvedValue(undefined);

    const result = await runLegalExecution({} as never, "job-3");

    expect(markBlockedMock).toHaveBeenCalledWith(
      "job-3",
      expect.objectContaining({
        reason: "legal_brief_missing"
      }),
      expect.any(Date)
    );
    expect(updateStatusesMock).not.toHaveBeenCalled();
    expect(result.status).toBe("blocked");
    expect(result.nextStage).toBe("legal_execution_pending");
  });
});
