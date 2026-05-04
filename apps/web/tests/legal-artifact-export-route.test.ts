import { describe, expect, it, vi } from "vitest";

const {
  findLatestByCaseIdAndTypeMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock
} = vi.hoisted(() => ({
  findLatestByCaseIdAndTypeMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn()
}));

vi.mock("@safetycare/database", () => ({
  LegalArtifactRepository: class {
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
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

import { GET } from "../app/api/dashboard/protect/cases/[caseId]/legal-artifacts/route";

const caseId = "11111111-1111-4111-8111-111111111111";
const workflowJobId = "22222222-2222-4222-8222-222222222222";

function makeArtifact(
  artifactType: "civil_health_draft" | "power_of_attorney" | "fee_agreement",
  title: string
) {
  return {
    id: `${artifactType}-1`,
    caseId,
    sourceWorkflowJobId: workflowJobId,
    artifactType,
    versionNumber: 1,
    status: "draft",
    title,
    subtitle: `${title} subtitle`,
    summary: `${title} summary`,
    contentMarkdown: `${title}\n\nConteudo de teste.`,
    metadata: {
      source: "public_legal_brief_form"
    },
    createdAt: new Date("2026-05-01T12:00:00Z"),
    updatedAt: new Date("2026-05-01T12:00:00Z")
  } as const;
}

describe("legal artifact export route", () => {
  const artifacts = {
    civil_health_draft: makeArtifact("civil_health_draft", "Minuta"),
    power_of_attorney: makeArtifact("power_of_attorney", "ProcuraÃ§Ã£o"),
    fee_agreement: makeArtifact("fee_agreement", "Contrato")
  };

  hasDashboardSessionFromRequestMock.mockReturnValue(true);
  hasOperationsAccessMock.mockReturnValue(false);
  getDatabaseClientMock.mockReturnValue({ db: {} });
  findLatestByCaseIdAndTypeMock.mockImplementation(async (_caseId: string, artifactType: string) => {
    return artifacts[artifactType as keyof typeof artifacts];
  });

  it("returns a pdf download when the requested format is pdf", async () => {
    const response = await GET(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=pdf`),
      {
        params: { caseId }
      }
    );

    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(`safetycare-legal-artifacts-${caseId}.pdf`);
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("returns a docx download when the requested format is docx", async () => {
    const response = await GET(
      new Request(`http://localhost/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=docx`),
      {
        params: Promise.resolve({ caseId })
      }
    );

    const docxBuffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(response.headers.get("content-disposition")).toContain(`safetycare-legal-artifacts-${caseId}.docx`);
    expect(docxBuffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});
