import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findWorkflowJobByIdMock,
  findScoreByCaseIdMock,
  findBriefByCaseIdMock,
  upsertBriefMock,
  recordAuditLogMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  findBriefByCaseIdMock: vi.fn(),
  upsertBriefMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
  },
  WorkflowJobRepository: class {
    findById = findWorkflowJobByIdMock;
  },
  LegalBriefInputRepository: class {
    findByCaseId = findBriefByCaseIdMock;
    upsert = upsertBriefMock;
  },
  AuditLogRepository: class {
    record = recordAuditLogMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET, POST } from "../app/api/intake/public/cases/[caseId]/brief/route";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

describe("Public legal brief route", () => {
  it("returns processing while the human analysis has not released the form", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening_pending",
      legalStatus: "human_triage_pending"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce(undefined);

    const response = await GET(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/brief?workflowJobId=${workflowJobId}`),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.status).toBe("processing");
  });

  it("returns awaiting_human_score while the score exists but has not been classified", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "human_review_required"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 65,
      reviewRequired: true
    });

    const response = await GET(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/brief?workflowJobId=${workflowJobId}`),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.status).toBe("awaiting_human_score");
  });

  it("returns an existing brief submission when the case is ready", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "intake"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 82,
      reviewRequired: false,
      decision: "green"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce({
      caseId,
      sourceWorkflowJobId: workflowJobId,
      draftScope: "civil_health",
      patientFullName: "Ana Souza",
      patientCpf: "12345678901",
      city: "Curitiba",
      contact: "41 99999-9999",
      patientAddress: "Rua do Paciente, 123, Curitiba-PR",
      patientWhatsapp: "(41) 97777-6666",
      patientEmail: "ana.souza@example.com",
      patientRg: "9876543",
      relationToPatient: "Filha",
      contactFullName: "Maria Souza",
      contactAddress: "Rua A, 123, Centro, Curitiba-PR",
      contactWhatsapp: "(41) 98888-7777",
      contactEmail: "maria.souza@example.com",
      contactCpf: "22233344455",
      contactRg: "1234567",
      problemType: "plano",
      currentUrgency: "high",
      keyDates: [{ label: "Negativa do plano", date: "2025-05-02" }],
      objectiveDescription: "Paciente teve negativa de cobertura para tratamento essencial.",
      materialLosses: "Gastos com exames e consultas particulares.",
      moralImpact: "Angústia, insegurança e agravamento do quadro clínico.",
      uploadedDocuments: [
        {
          name: "negativa-plano.pdf",
          mimeType: "application/pdf",
          size: 12,
          dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
          uploadedAt: new Date("2025-05-03T12:00:00Z").toISOString()
        }
      ],
      documentsAttached: ["negativa.pdf"],
      witnesses: ["João Silva"],
      mainRequest: "Custeio integral do tratamento.",
      subsidiaryRequest: "Tutela de urgência para cobertura imediata.",
      createdAt: new Date("2025-05-03T12:00:00Z"),
      updatedAt: new Date("2025-05-04T15:30:00Z")
    });

    const response = await GET(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/brief?workflowJobId=${workflowJobId}`),
      {
        params: Promise.resolve({ caseId })
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.submission.patientFullName).toBe("Ana Souza");
    expect(body.submission.contactFullName).toBe("Maria Souza");
    expect(body.submission.uploadedDocuments).toHaveLength(1);
    expect(body.draft.title).toContain("Minuta preliminar");
    expect(body.supportingDocumentPack.title).toBe("Modelos complementares");
    expect(body.supportingDocumentPack.documents).toHaveLength(2);
  });

  it("stores the brief parameters when the form is submitted", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      commercialStatus: "screening",
      legalStatus: "intake"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findScoreByCaseIdMock.mockResolvedValueOnce({
      caseId,
      viabilityScore: 82,
      reviewRequired: false,
      decision: "green"
    });
    findBriefByCaseIdMock.mockResolvedValueOnce(undefined);
    upsertBriefMock.mockResolvedValueOnce({
      caseId,
      sourceWorkflowJobId: workflowJobId,
      draftScope: "civil_health",
      patientFullName: "Maria Costa",
      patientCpf: "12345678901",
      city: "Curitiba",
      contact: "41 98888-7777",
      patientAddress: "Rua do Paciente, 456, Curitiba-PR",
      patientWhatsapp: "(41) 96666-5555",
      patientEmail: "maria.costa@example.com",
      patientRg: "1234568",
      relationToPatient: "Mãe",
      contactFullName: "João Costa",
      contactAddress: "Rua B, 456, Centro, Curitiba-PR",
      contactWhatsapp: "(41) 97777-6666",
      contactEmail: "joao.costa@example.com",
      contactCpf: "33344455566",
      contactRg: "7654321",
      problemType: "medicamento",
      currentUrgency: "critical",
      keyDates: [{ label: "Negativa do remédio", date: "2025-05-02" }],
      objectiveDescription: "Medicamento foi negado pelo plano.",
      materialLosses: "Compra particular e deslocamentos.",
      moralImpact: "Risco clínico e sofrimento intenso.",
      uploadedDocuments: [
        {
          name: "receita.pdf",
          mimeType: "application/pdf",
          size: 10,
          dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
          uploadedAt: new Date("2025-05-03T12:00:00Z").toISOString()
        }
      ],
      documentsAttached: ["receita.pdf"],
      witnesses: ["Carlos Mendes"],
      mainRequest: "Fornecimento imediato do medicamento.",
      subsidiaryRequest: "Subsidiariamente, reembolso integral.",
      createdAt: new Date("2025-05-03T12:00:00Z"),
      updatedAt: new Date("2025-05-04T15:30:00Z")
    });
    recordAuditLogMock.mockResolvedValueOnce({
      id: "audit-1"
    });

    const response = await POST(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/brief`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          caseId,
          workflowJobId,
          draftScope: "civil_health",
          patientFullName: "Maria Costa",
          patientCpf: "12345678901",
          city: "Curitiba",
          contact: "41 98888-7777",
          patientAddress: "Rua do Paciente, 456, Curitiba-PR",
          patientWhatsapp: "(41) 96666-5555",
          patientEmail: "maria.costa@example.com",
          patientRg: "1234568",
          relationToPatient: "Mãe",
          contactFullName: "João Costa",
          contactAddress: "Rua B, 456, Centro, Curitiba-PR",
          contactWhatsapp: "(41) 97777-6666",
          contactEmail: "joao.costa@example.com",
          contactCpf: "33344455566",
          contactRg: "7654321",
          problemType: "medicamento",
          currentUrgency: "critical",
          keyDates: [{ label: "Negativa do remédio", date: "2025-05-02" }],
          objectiveDescription: "Medicamento foi negado pelo plano.",
          materialLosses: "Compra particular e deslocamentos.",
          moralImpact: "Risco clínico e sofrimento intenso.",
          uploadedDocuments: [
            {
              name: "receita.pdf",
              mimeType: "application/pdf",
              size: 10,
              dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
              uploadedAt: new Date("2025-05-03T12:00:00Z").toISOString()
            }
          ],
          documentsAttached: ["receita.pdf"],
          witnesses: ["Carlos Mendes"],
          mainRequest: "Fornecimento imediato do medicamento.",
          subsidiaryRequest: "Subsidiariamente, reembolso integral."
        })
      }),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.status).toBe("accepted");
    expect(upsertBriefMock).toHaveBeenCalledTimes(1);
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
    expect(body.draft.sections.length).toBeGreaterThan(0);
    expect(body.submission.uploadedDocuments).toHaveLength(1);
    expect(body.submission.patientEmail).toBe("maria.costa@example.com");
    expect(body.submission.contactEmail).toBe("joao.costa@example.com");
    expect(body.supportingDocumentPack.documents).toHaveLength(2);
  });
});
