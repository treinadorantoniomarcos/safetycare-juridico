import { describe, expect, it, vi } from "vitest";

const {
  findCaseByIdMock,
  findWorkflowJobByIdMock,
  findLatestJobByCaseAndTypeMock,
  requeueWorkflowJobMock,
  findEvidenceByCaseIdMock,
  recordAuditLogMock,
  getDatabaseClientMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  findLatestJobByCaseAndTypeMock: vi.fn(),
  requeueWorkflowJobMock: vi.fn(),
  findEvidenceByCaseIdMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  WorkflowJobRepository: class {
    findById = findWorkflowJobByIdMock;
    findLatestByCaseIdAndType = findLatestJobByCaseAndTypeMock;
    requeue = requeueWorkflowJobMock;
  },
  EvidenceChecklistRepository: class {
    findByCaseId = findEvidenceByCaseIdMock;
  },
  AuditLogRepository: class {
    record = recordAuditLogMock;
  }
}));

vi.mock("../src/lib/database", () => ({
  getDatabaseClient: getDatabaseClientMock
}));

import { GET, POST } from "../app/api/intake/public/cases/[caseId]/requirements/route";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

describe("Public requirements route", () => {
  it("returns requirements when evidence checklist is ready", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId,
      legalStatus: "evidence_pending"
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findEvidenceByCaseIdMock.mockResolvedValueOnce({
      caseId,
      summary: "Checklist com lacunas essenciais para robustez da prova.",
      missingCount: 1,
      requiredInformationRequests: [
        {
          requestKey: "medical_records_full",
          title: "Prontuário médico completo",
          justification: "Necessário para comprovar condutas e linha do tempo assistencial.",
          urgency: "critical",
          dueInHours: 24,
          channelSuggestion: "whatsapp"
        }
      ],
      items: [
        {
          itemKey: "medical_records",
          label: "Prontuário médico completo",
          status: "missing",
          importance: "critical",
          notes: "Solicitar cópia integral assinada digitalmente.",
          sourceHints: ["hospital", "setor de prontuário"]
        }
      ]
    });

    const response = await GET(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/requirements?workflowJobId=${workflowJobId}`)
    , {
      params: { caseId }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.requiredInformationRequests).toHaveLength(1);
    expect(body.missingChecklistItems).toHaveLength(1);
  });

  it("rejects access when workflowJob does not belong to case", async () => {
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
      new Request(`http://localhost/api/intake/public/cases/${caseId}/requirements?workflowJobId=${workflowJobId}`)
    , {
      params: Promise.resolve({ caseId })
    });

    expect(response.status).toBe(403);
  });

  it("stores client completion payload and requeues blocked evidence job", async () => {
    getDatabaseClientMock.mockReturnValue({
      db: {}
    });
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId
    });
    findWorkflowJobByIdMock.mockResolvedValueOnce({
      id: workflowJobId,
      caseId,
      jobType: "intake.orchestrator.bootstrap"
    });
    findLatestJobByCaseAndTypeMock.mockResolvedValueOnce({
      id: "44444444-4444-4444-8444-444444444444",
      status: "blocked"
    });
    requeueWorkflowJobMock.mockResolvedValueOnce({
      id: "44444444-4444-4444-8444-444444444444",
      status: "queued"
    });
    recordAuditLogMock.mockResolvedValueOnce({
      id: "55555555-5555-4555-8555-555555555555"
    });

    const response = await POST(
      new Request(`http://localhost/api/intake/public/cases/${caseId}/requirements`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          workflowJobId,
          contactEmail: "cliente@safetycare.com.br",
          preferredContactWindow: "8h às 12h",
          additionalContext: "Paciente relata piora após alta.",
          consentToContact: true,
          responses: [
            {
              requestKey: "medical_records_full",
              answer: "Hospital informou prazo de 48h para entrega.",
              provided: false
            }
          ],
          documentsDeclared: ["Prontuário médico completo"]
        })
      }),
      {
        params: { caseId }
      }
    );

    expect(response.status).toBe(202);
    expect(requeueWorkflowJobMock).toHaveBeenCalledTimes(1);
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
  });
});
