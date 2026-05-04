import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  findCaseByIdMock,
  findLatestByCaseIdAndTypeMock,
  createVersionMock,
  recordAuditLogMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock
} = vi.hoisted(() => ({
  findCaseByIdMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  createVersionMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordAuditLogMock;
  },
  CaseRepository: class {
    findById = findCaseByIdMock;
  },
  LegalArtifactRepository: class {
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
    createVersion = createVersionMock;
  }
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

import { POST } from "../app/api/dashboard/protect/cases/[caseId]/legal-artifacts/route";

const caseId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/dashboard/protect/cases/[caseId]/legal-artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseClientMock.mockReturnValue({ db: {} });
    hasDashboardSessionFromRequestMock.mockReturnValue(true);
    hasOperationsAccessMock.mockReturnValue(false);
    process.env.DASHBOARD_AUTH_USER = "revisor-env";
  });

  it("creates a new version after a human edit", async () => {
    findCaseByIdMock.mockResolvedValueOnce({
      id: caseId
    });
    findLatestByCaseIdAndTypeMock.mockResolvedValueOnce({
      id: "artifact-1",
      caseId,
      sourceWorkflowJobId: "workflow-1",
      artifactType: "power_of_attorney",
      versionNumber: 1,
      status: "final",
      title: "Procuracao original",
      subtitle: "Mandato",
      summary: "Resumo original",
      contentMarkdown: "PROCURAÃ‡ÃƒO\n\nTexto original.",
      metadata: {
        source: "legal_execution_agent"
      },
      createdAt: new Date("2026-05-04T12:00:00Z"),
      updatedAt: new Date("2026-05-04T12:00:00Z")
    });
    createVersionMock.mockResolvedValueOnce({
      id: "artifact-2",
      caseId,
      sourceWorkflowJobId: "workflow-1",
      artifactType: "power_of_attorney",
      versionNumber: 2,
      status: "final",
      title: "Procuracao revisada",
      subtitle: "Mandato ajustado",
      summary: "Resumo revisado",
      contentMarkdown: "PROCURAÃ‡ÃƒO\n\nTexto revisado.",
      metadata: {
        source: "human_review_panel"
      },
      createdAt: new Date("2026-05-04T12:05:00Z"),
      updatedAt: new Date("2026-05-04T12:05:00Z")
    });
    recordAuditLogMock.mockResolvedValueOnce({ id: "audit-1" });

    const response = await POST(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-artifacts`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          artifactType: "power_of_attorney",
          title: "Procuracao revisada",
          subtitle: "Mandato ajustado",
          summary: "Resumo revisado",
          contentMarkdown: "PROCURAÃ‡ÃƒO\n\nTexto revisado."
        })
      }),
      {
        params: { caseId }
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.artifact.versionNumber).toBe(2);
    expect(createVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId,
        artifactType: "power_of_attorney",
        title: "Procuracao revisada",
        subtitle: "Mandato ajustado",
        summary: "Resumo revisado",
        contentMarkdown: "PROCURAÃ‡ÃƒO\n\nTexto revisado."
      })
    );
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
  });
});
