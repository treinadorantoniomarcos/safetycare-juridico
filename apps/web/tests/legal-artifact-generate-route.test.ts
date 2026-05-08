import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findBriefByCaseIdMock,
  findLatestArtifactByCaseIdAndTypeMock,
  findLatestWorkflowJobByCaseIdAndTypeMock,
  createVersionMock,
  markCompletedMock,
  updateStatusesMock,
  recordAuditLogMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock,
  buildCivilHealthLegalDraftMock,
  buildCivilHealthSupportingDocumentPackMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findBriefByCaseIdMock: vi.fn(),
  findLatestArtifactByCaseIdAndTypeMock: vi.fn(),
  findLatestWorkflowJobByCaseIdAndTypeMock: vi.fn(),
  createVersionMock: vi.fn(),
  markCompletedMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn(),
  buildCivilHealthLegalDraftMock: vi.fn(),
  buildCivilHealthSupportingDocumentPackMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordAuditLogMock;
  },
  CaseRepository: class {
    findById = findCaseByIdMock;
    updateStatuses = updateStatusesMock;
  },
  LegalBriefInputRepository: class {
    findByCaseId = findBriefByCaseIdMock;
  },
  LegalArtifactRepository: class {
    findLatestByCaseIdAndType = findLatestArtifactByCaseIdAndTypeMock;
    createVersion = createVersionMock;
  },
  WorkflowJobRepository: class {
    findLatestByCaseIdAndType = findLatestWorkflowJobByCaseIdAndTypeMock;
    markCompleted = markCompletedMock;
  }
}));

vi.mock("@safetycare/orchestrator", () => ({
  buildCivilHealthLegalDraft: buildCivilHealthLegalDraftMock,
  buildCivilHealthSupportingDocumentPack: buildCivilHealthSupportingDocumentPackMock
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

vi.mock("../src/lib/dashboard-auth", () => ({
  hasDashboardSessionFromRequest: hasDashboardSessionFromRequestMock
}));

vi.mock("../src/lib/operations-auth", () => ({
  hasOperationsAccess: hasOperationsAccessMock
}));

import { POST } from "../app/api/dashboard/protect/cases/[caseId]/legal-artifacts/generate/route";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

function buildSubmission() {
  return {
    id: "brief-1",
    sourceWorkflowJobId: workflowJobId,
    patientFullName: "Paciente Demo",
    patientCpf: "111.222.333-44",
    city: "Sao Paulo",
    contact: "Familia",
    patientAddress: "Rua A, 123",
    patientWhatsapp: "(11) 99999-0000",
    patientEmail: "paciente@example.com",
    patientRg: "MG-1.234.567",
    relationToPatient: "Filho",
    contactFullName: "Responsavel Demo",
    contactAddress: "Rua B, 456",
    contactWhatsapp: "(11) 98888-0000",
    contactEmail: "responsavel@example.com",
    contactCpf: "222.333.444-55",
    contactRg: "SP-7.654.321",
    problemType: "hospital",
    currentUrgency: "alta",
    keyDates: [{ label: "Internacao", date: "2026-05-07", time: "09:30" }],
    objectiveDescription: "Descricao objetiva.",
    materialLosses: "Gastos e prejuizos.",
    moralImpact: "Impacto moral.",
    uploadedDocuments: [],
    documentsAttached: ["Prontuario"],
    witnesses: [
      {
        fullName: "Maria",
        cpf: "333.444.555-66",
        rg: "MG-9.876.543",
        address: "Rua C, 789, Centro, Sao Paulo-SP",
        whatsapp: "(11) 97777-1111"
      }
    ],
    mainRequest: "Pedido principal.",
    subsidiaryRequest: "Pedido subsidiario."
  };
}

describe("POST /api/dashboard/protect/cases/[caseId]/legal-artifacts/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseClientMock.mockReturnValue({ db: {} });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
    buildCivilHealthLegalDraftMock.mockReturnValue({
      draftScope: "civil_health",
      title: "Minuta preliminar",
      subtitle: "Subtitulo da minuta",
      summary: "Resumo da minuta",
      markdown: "# Minuta\n\nTexto gerado."
    });
    buildCivilHealthSupportingDocumentPackMock.mockReturnValue({
      draftScope: "civil_health",
      documents: [
        {
          key: "power_of_attorney",
          type: "power_of_attorney",
          title: "Procuraçao",
          subtitle: "Subtitulo da procuraçao",
          summary: "Resumo da procuraçao",
          markdown: "# Procuraçao\n\nTexto gerado."
        },
        {
          key: "fee_agreement",
          type: "fee_agreement",
          title: "Contrato",
          subtitle: "Subtitulo do contrato",
          summary: "Resumo do contrato",
          markdown: "# Contrato\n\nTexto gerado."
        }
      ]
    });
    findLatestArtifactByCaseIdAndTypeMock.mockResolvedValue(undefined);
    findLatestWorkflowJobByCaseIdAndTypeMock.mockResolvedValue({
      id: "job-1",
      caseId,
      jobType: "legal.execution",
      status: "queued",
      payload: {},
      correlationId: "corr-1",
      retryAt: null,
      completedAt: null,
      blockedAt: null,
      failedAt: null,
      createdAt: new Date("2026-05-07T12:00:00Z"),
      updatedAt: new Date("2026-05-07T12:00:00Z")
    });
    createVersionMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: `${input.artifactType as string}-1`,
      caseId,
      sourceWorkflowJobId: workflowJobId,
      artifactType: input.artifactType as string,
      versionNumber: 1,
      status: input.status as string,
      title: input.title as string,
      subtitle: input.subtitle as string,
      summary: input.summary as string,
      contentMarkdown: input.contentMarkdown as string,
      metadata: input.metadata as Record<string, unknown>,
      createdAt: new Date("2026-05-07T12:10:00Z"),
      updatedAt: new Date("2026-05-07T12:10:00Z")
    }));
    markCompletedMock.mockResolvedValue({
      id: "job-1",
      jobType: "legal.execution",
      status: "completed"
    });
    updateStatusesMock.mockResolvedValue({
      id: caseId,
      legalStatus: "legal_execution_in_progress"
    });
    recordAuditLogMock.mockResolvedValue({ id: "audit-1" });
    findLatestArtifactByCaseIdAndTypeMock.mockResolvedValue({
      id: "artifact-previous",
      caseId,
      sourceWorkflowJobId: workflowJobId,
      artifactType: "civil_health_draft",
      versionNumber: 1,
      status: "draft",
      title: "Minuta preliminar",
      subtitle: "Subtitulo anterior",
      summary: "Resumo anterior",
      contentMarkdown: "# Minuta\n\nTexto anterior.",
      metadata: {
        source: "worker"
      },
      createdAt: new Date("2026-05-07T11:00:00Z"),
      updatedAt: new Date("2026-05-07T11:00:00Z")
    });
    process.env.DASHBOARD_AUTH_USER = "painel-executivo";
  });

  it("generates the legal artifacts manually when the case is ready", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      legalStatus: "legal_execution_pending"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce(buildSubmission());

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-artifacts/generate`, {
        method: "POST"
      }),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.createdArtifactTypes).toEqual([
      "civil_health_draft",
      "power_of_attorney",
      "fee_agreement"
    ]);
    expect(createVersionMock).toHaveBeenCalledTimes(3);
    expect(findLatestArtifactByCaseIdAndTypeMock).not.toHaveBeenCalled();
    expect(markCompletedMock).toHaveBeenCalledTimes(1);
    expect(updateStatusesMock).toHaveBeenCalledWith(caseId, {
      legalStatus: "legal_execution_in_progress"
    });
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("rejects generation while the case is still pending review", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      legalStatus: "conversion_pending"
    });

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-artifacts/generate`, {
        method: "POST"
      }),
      {
        params: Promise.resolve({ caseId })
      }
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("invalid_case_stage");
    expect(createVersionMock).not.toHaveBeenCalled();
    expect(findBriefByCaseIdMock).not.toHaveBeenCalled();
  });
});
