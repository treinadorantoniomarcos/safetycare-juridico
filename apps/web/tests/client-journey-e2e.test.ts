import { workflowJobTypes } from "@safetycare/ai-contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createCaseFromIntakeMock,
  findCaseByIdMock,
  findWithClientByIdMock,
  updateStatusesMock,
  findWorkflowJobByIdMock,
  findLatestByCaseIdAndTypeMock,
  requeueMock,
  markCompletedMock,
  createOrGetMock,
  markBlockedMock,
  findScoreByCaseIdMock,
  upsertScoreMock,
  applyHumanReviewDecisionMock,
  findBriefByCaseIdMock,
  upsertBriefMock,
  findLatestArtifactByCaseIdAndTypeMock,
  createVersionMock,
  recordAuditLogMock,
  getDatabaseClientMock,
  hasDashboardSessionFromRequestMock,
  hasOperationsAccessMock
} = vi.hoisted(() => ({
  createCaseFromIntakeMock: vi.fn(),
  findCaseByIdMock: vi.fn(),
  findWithClientByIdMock: vi.fn(),
  updateStatusesMock: vi.fn(),
  findWorkflowJobByIdMock: vi.fn(),
  findLatestByCaseIdAndTypeMock: vi.fn(),
  requeueMock: vi.fn(),
  markCompletedMock: vi.fn(),
  createOrGetMock: vi.fn(),
  markBlockedMock: vi.fn(),
  findScoreByCaseIdMock: vi.fn(),
  upsertScoreMock: vi.fn(),
  applyHumanReviewDecisionMock: vi.fn(),
  findBriefByCaseIdMock: vi.fn(),
  upsertBriefMock: vi.fn(),
  findLatestArtifactByCaseIdAndTypeMock: vi.fn(),
  createVersionMock: vi.fn(),
  recordAuditLogMock: vi.fn(),
  getDatabaseClientMock: vi.fn(),
  hasDashboardSessionFromRequestMock: vi.fn(),
  hasOperationsAccessMock: vi.fn()
}));

const journeyState = vi.hoisted(() => ({
  caseId: "11111111-1111-4111-8111-111111111111",
  workflowJobId: "22222222-2222-4222-8222-222222222222",
  legalExecutionJobId: "44444444-4444-4444-8444-444444444444",
  accessCode: "",
  caseRecord: null as
    | {
        id: string;
        commercialStatus: string;
        legalStatus: string;
        caseType: string;
        priority: string;
        urgency: string;
      }
    | null,
  clientRecord: null as { consentStatus: string } | null,
  workflowJobs: [] as Array<{
    id: string;
    caseId: string;
    jobType: string;
    status: string;
    correlationId?: string;
    payload?: Record<string, unknown>;
    runAfter?: string;
  }>,
  scoreRecord: undefined as
    | {
        caseId: string;
        viabilityScore: number;
        complexity?: string;
        estimatedValueCents?: number;
        confidence?: number;
        reviewRequired: boolean;
        decision?: "green" | "yellow" | "red";
      }
    | undefined,
  briefRecord: undefined as
    | {
        caseId: string;
        sourceWorkflowJobId: string;
        draftScope: "civil_health";
        patientFullName: string;
        patientCpf: string;
        city: string;
        contact: string;
        patientAddress: string;
        patientWhatsapp: string;
        patientEmail: string;
        patientRg: string;
        relationToPatient: string;
        contactFullName: string;
        contactAddress: string;
        contactWhatsapp: string;
        contactEmail: string;
        contactCpf: string;
        contactRg: string;
        problemType: string;
        currentUrgency: string;
        keyDates: Array<{ label: string; date: string; time?: string }>;
        objectiveDescription: string;
        materialLosses: string;
        moralImpact: string;
        uploadedDocuments: Array<{
          name: string;
          mimeType: string;
          size: number;
          dataUrl: string;
          uploadedAt: string;
        }>;
        documentsAttached: string[];
        witnesses: Array<{
          fullName: string;
          cpf?: string;
          rg?: string;
          address?: string;
          whatsapp?: string;
        }>;
        mainRequest: string;
        subsidiaryRequest: string;
        createdAt: Date;
        updatedAt: Date;
      }
    | undefined,
  artifactVersions: {
    civil_health_draft: [] as Array<any>,
    power_of_attorney: [] as Array<any>,
    fee_agreement: [] as Array<any>,
  },
  auditLogs: [] as Array<Record<string, unknown>>
}));

vi.mock("@safetycare/database", () => ({
  AuditLogRepository: class {
    record = recordAuditLogMock;
  },
  CaseRepository: class {
    findById = findCaseByIdMock;
    findWithClientById = findWithClientByIdMock;
    updateStatuses = updateStatusesMock;
  },
  LegalArtifactRepository: class {
    findLatestByCaseIdAndType = findLatestArtifactByCaseIdAndTypeMock;
    createVersion = createVersionMock;
  },
  LegalBriefInputRepository: class {
    findByCaseId = findBriefByCaseIdMock;
    upsert = upsertBriefMock;
  },
  LegalScoreRepository: class {
    findByCaseId = findScoreByCaseIdMock;
    upsert = upsertScoreMock;
    applyHumanReviewDecision = applyHumanReviewDecisionMock;
  },
  WorkflowJobRepository: class {
    findById = findWorkflowJobByIdMock;
    findLatestByCaseIdAndType = findLatestByCaseIdAndTypeMock;
    requeue = requeueMock;
    markCompleted = markCompletedMock;
    createOrGet = createOrGetMock;
    markBlocked = markBlockedMock;
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

vi.mock("../src/features/intake/create-case-from-intake", () => ({
  createCaseFromIntake: createCaseFromIntakeMock
}));

import { createPublicCaseAccessCode } from "../src/features/intake/public-case-access-code";
import { POST as leadPost } from "../app/api/intake/lead/route";
import { POST as humanTriagePost } from "../app/api/intake/cases/[caseId]/human-triage/route";
import { POST as scoreReviewPost } from "../app/api/intake/cases/[caseId]/score/review/route";
import { GET as publicBriefGet, POST as publicBriefPost } from "../app/api/intake/public/cases/[caseId]/brief/route";
import { POST as legalReviewPost } from "../app/api/dashboard/protect/cases/[caseId]/legal-review/route";
import {
  GET as legalArtifactsGet,
  POST as legalArtifactsPost
} from "../app/api/dashboard/protect/cases/[caseId]/legal-artifacts/route";

function resetJourneyState() {
  journeyState.accessCode = "";
  journeyState.caseRecord = null;
  journeyState.clientRecord = null;
  journeyState.workflowJobs = [];
  journeyState.scoreRecord = undefined;
  journeyState.briefRecord = undefined;
  journeyState.artifactVersions = {
    civil_health_draft: [],
    power_of_attorney: [],
    fee_agreement: []
  };
  journeyState.auditLogs = [];
}

function makeSeedArtifact(
  artifactType: "civil_health_draft" | "power_of_attorney" | "fee_agreement",
  seed: {
    title: string;
    subtitle: string;
    summary: string;
    contentMarkdown: string;
  }
) {
  const versions = journeyState.artifactVersions[artifactType];
  const versionNumber = versions.length + 1;
  const createdAt = new Date("2026-05-06T12:00:00.000Z");

  const artifact = {
    id: `${journeyState.caseId}-${artifactType}-${versionNumber}`,
    caseId: journeyState.caseId,
    sourceWorkflowJobId: journeyState.workflowJobId,
    artifactType,
    versionNumber,
    status: "final",
    title: seed.title,
    subtitle: seed.subtitle,
    summary: seed.summary,
    contentMarkdown: seed.contentMarkdown,
    metadata: {
      source: "public_legal_brief_form"
    },
    createdAt,
    updatedAt: createdAt
  } as const;

  versions.push(artifact);

  return artifact;
}

function seedArtifactsFromBriefResponse(body: any) {
  makeSeedArtifact("civil_health_draft", {
    title: body.draft.title,
    subtitle: body.draft.subtitle,
    summary: body.draft.summary,
    contentMarkdown: body.draft.markdown
  });

  for (const document of body.supportingDocumentPack.documents as Array<{
    type: "power_of_attorney" | "fee_agreement";
    title: string;
    subtitle: string;
    summary: string;
    markdown: string;
  }>) {
    makeSeedArtifact(document.type, {
      title: document.title,
      subtitle: document.subtitle,
      summary: document.summary,
      contentMarkdown: document.markdown
    });
  }
}

const leadPayload = {
  source: "form",
  name: "Maria Costa",
  email: "maria.costa@example.com",
  phone: "11999999999",
  message: "Sai do hospital pior do que entrei e preciso de ajuda juridica imediata."
};

const briefPayload = {
  caseId: journeyState.caseId,
  workflowJobId: journeyState.workflowJobId,
  draftScope: "civil_health",
  patientFullName: "Maria Costa",
  patientCpf: "12345678901",
  city: "Curitiba",
  contact: "41 98888-7777",
  patientAddress: "Rua do Paciente, 456, Curitiba-PR",
  patientWhatsapp: "(41) 96666-5555",
  patientEmail: "maria.costa@example.com",
  patientRg: "1234568",
  relationToPatient: "Mae",
  contactFullName: "Joao Costa",
  contactAddress: "Rua B, 456, Centro, Curitiba-PR",
  contactWhatsapp: "(41) 97777-6666",
  contactEmail: "joao.costa@example.com",
  contactCpf: "33344455566",
  contactRg: "7654321",
  problemType: "medicamento",
  currentUrgency: "critical",
  keyDates: [{ label: "Negativa do remedio", date: "2026-05-02", time: "10:00" }],
  objectiveDescription: "Medicamento foi negado pelo plano e o quadro clinico exige resposta rapida.",
  materialLosses: "Compra particular e deslocamentos.",
  moralImpact: "Risco clinico e sofrimento intenso.",
  uploadedDocuments: [
    {
      name: "receita.pdf",
      mimeType: "application/pdf",
      size: 10,
      dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
      uploadedAt: new Date("2026-05-03T12:00:00.000Z").toISOString()
    }
  ],
  documentsAttached: ["receita.pdf"],
  witnesses: [
    {
      fullName: "Carlos Mendes",
      cpf: "222.333.444-55",
      rg: "SP-7.654.321",
      address: "Rua B, 456, Centro, Curitiba-PR",
      whatsapp: "(41) 97777-6666"
    }
  ],
  mainRequest: "Fornecimento imediato do medicamento.",
  subsidiaryRequest: "Subsidiariamente, reembolso integral."
};

const triageApprovePayload = {
  decision: "approve",
  reviewerId: "painel-executivo",
  note: "Caso segue para a analise humana interna."
};

const scoreReviewPayload = {
  decision: "yellow",
  reviewerId: "painel-executivo",
  note: "Pode seguir com complementacao de documentos."
};

const legalReviewApprovePayload = {
  decision: "approve",
  reviewerId: "painel-executivo",
  note: "Liberar para geracao da minuta e dos modelos."
};

beforeEach(() => {
  resetJourneyState();
  vi.clearAllMocks();

  getDatabaseClientMock.mockReturnValue({ db: {} });
  hasDashboardSessionFromRequestMock.mockReturnValue(true);
  hasOperationsAccessMock.mockReturnValue(false);
  recordAuditLogMock.mockImplementation(async (entry: Record<string, unknown>) => {
    journeyState.auditLogs.push(entry);
    return { id: `audit-${journeyState.auditLogs.length}` };
  });
  createCaseFromIntakeMock.mockImplementation(async () => {
    journeyState.caseRecord = {
      id: journeyState.caseId,
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      commercialStatus: "screening_pending",
      legalStatus: "human_triage_pending"
    };
    journeyState.clientRecord = {
      consentStatus: "granted"
    };
    journeyState.workflowJobs = [
      {
        id: journeyState.workflowJobId,
        caseId: journeyState.caseId,
        jobType: workflowJobTypes[0],
        status: "blocked",
        correlationId: `${journeyState.caseId}:bootstrap`,
        payload: {
          stage: "bootstrap"
        }
      }
    ];
    journeyState.accessCode = createPublicCaseAccessCode(journeyState.caseId, journeyState.workflowJobId);
    return {
      caseId: journeyState.caseId,
      workflowJobId: journeyState.workflowJobId,
      accessCode: journeyState.accessCode
    };
  });

  findCaseByIdMock.mockImplementation(async (caseId: string) => {
    if (!journeyState.caseRecord || journeyState.caseRecord.id !== caseId) {
      return undefined;
    }

    return { ...journeyState.caseRecord };
  });

  findWithClientByIdMock.mockImplementation(async (caseId: string) => {
    if (!journeyState.caseRecord || journeyState.caseRecord.id !== caseId || !journeyState.clientRecord) {
      return undefined;
    }

    return {
      caseRecord: { ...journeyState.caseRecord },
      clientRecord: { ...journeyState.clientRecord }
    };
  });

  updateStatusesMock.mockImplementation(async (caseId: string, statuses: Record<string, string>) => {
    if (!journeyState.caseRecord || journeyState.caseRecord.id !== caseId) {
      return undefined;
    }

    journeyState.caseRecord = {
      ...journeyState.caseRecord,
      ...statuses
    };

    return { ...journeyState.caseRecord };
  });

  findWorkflowJobByIdMock.mockImplementation(async (workflowJobId: string) => {
    const job = journeyState.workflowJobs.find((item) => item.id === workflowJobId);
    return job ? { ...job } : undefined;
  });

  findLatestByCaseIdAndTypeMock.mockImplementation(async (caseId: string, jobType: string) => {
    const job = [...journeyState.workflowJobs].filter(
      (item) => item.caseId === caseId && item.jobType === jobType
    );
    const latest = job[job.length - 1];
    return latest ? { ...latest } : undefined;
  });

  requeueMock.mockImplementation(async (jobId: string) => {
    const job = journeyState.workflowJobs.find((item) => item.id === jobId);

    if (!job) {
      return undefined;
    }

    job.status = "queued";
    return { ...job };
  });

  markCompletedMock.mockImplementation(async (jobId: string, payload: Record<string, unknown>) => {
    const job = journeyState.workflowJobs.find((item) => item.id === jobId);

    if (!job) {
      return undefined;
    }

    job.status = "completed";
    job.payload = payload;
    return { ...job };
  });

  createOrGetMock.mockImplementation(async (input: Record<string, any>) => {
    let job = journeyState.workflowJobs.find(
      (item) => item.caseId === input.caseId && item.jobType === input.jobType
    );

    if (!job) {
      job = {
        id: journeyState.legalExecutionJobId,
        caseId: input.caseId,
        jobType: input.jobType,
        status: input.status,
        correlationId: input.correlationId,
        payload: input.payload
      };
      journeyState.workflowJobs.push(job);
      return { ...job };
    }

    job.status = input.status;
    job.correlationId = input.correlationId;
    job.payload = input.payload;
    return { ...job };
  });

  markBlockedMock.mockImplementation(async (jobId: string, payload: Record<string, unknown>, runAfter: Date) => {
    const job = journeyState.workflowJobs.find((item) => item.id === jobId);

    if (!job) {
      return undefined;
    }

    job.status = "blocked";
    job.payload = payload;
    job.runAfter = runAfter.toISOString();
    return { ...job };
  });

  findScoreByCaseIdMock.mockImplementation(async (caseId: string) => {
    if (!journeyState.scoreRecord || journeyState.scoreRecord.caseId !== caseId) {
      return undefined;
    }

    return { ...journeyState.scoreRecord };
  });

  upsertScoreMock.mockImplementation(async (input: Record<string, any>) => {
    journeyState.scoreRecord = {
      caseId: input.caseId,
      viabilityScore: input.viabilityScore,
      complexity: input.complexity,
      estimatedValueCents: input.estimatedValueCents,
      confidence: input.confidence,
      reviewRequired: input.reviewRequired,
      decision: journeyState.scoreRecord?.decision
    };

    return { ...journeyState.scoreRecord };
  });

  applyHumanReviewDecisionMock.mockImplementation(async (caseId: string, input: Record<string, any>) => {
    if (!journeyState.scoreRecord || journeyState.scoreRecord.caseId !== caseId) {
      journeyState.scoreRecord = {
        caseId,
        viabilityScore: 0,
        reviewRequired: true
      };
    }

    journeyState.scoreRecord = {
      ...journeyState.scoreRecord,
      decision: input.decision,
      reviewRequired: input.decision === "yellow"
    };

    return { ...journeyState.scoreRecord };
  });

  findBriefByCaseIdMock.mockImplementation(async (caseId: string) => {
    if (!journeyState.briefRecord || journeyState.briefRecord.caseId !== caseId) {
      return undefined;
    }

    return { ...journeyState.briefRecord };
  });

  upsertBriefMock.mockImplementation(async (input: Record<string, any>) => {
    const now = new Date("2026-05-06T12:05:00.000Z");
    journeyState.briefRecord = {
      ...input,
      createdAt: now,
      updatedAt: now
    } as any;

    return { ...journeyState.briefRecord };
  });

  findLatestArtifactByCaseIdAndTypeMock.mockImplementation(async (caseId: string, artifactType: string) => {
    const versions = journeyState.artifactVersions[artifactType as keyof typeof journeyState.artifactVersions];
    const matchingVersions = [...versions].filter((artifact) => artifact.caseId === caseId);
    const latest = matchingVersions[matchingVersions.length - 1];
    return latest ? { ...latest } : undefined;
  });

  createVersionMock.mockImplementation(async (input: Record<string, any>) => {
    const versions = journeyState.artifactVersions[input.artifactType as keyof typeof journeyState.artifactVersions];
    const now = new Date("2026-05-06T12:10:00.000Z");
    const matchingVersions = [...versions].filter((artifact) => artifact.caseId === input.caseId);
    const latest = matchingVersions[matchingVersions.length - 1];

    const artifact = {
      id: `${input.caseId}-${input.artifactType}-${versions.length + 1}`,
      caseId: input.caseId,
      sourceWorkflowJobId: input.sourceWorkflowJobId,
      artifactType: input.artifactType,
      versionNumber: latest ? latest.versionNumber + 1 : 1,
      status: input.status ?? latest?.status ?? "final",
      title: input.title,
      subtitle: input.subtitle,
      summary: input.summary,
      contentMarkdown: input.contentMarkdown,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now
    };

    versions.push(artifact);
    return { ...artifact };
  });
});

describe("full client journey", () => {
  it("completes the journey from intake to legal artifact export", async () => {
    const leadResponse = await leadPost(
      new Request("http://localhost/api/intake/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(leadPayload)
      })
    );

    const leadBody = await leadResponse.json();

    expect(leadResponse.status).toBe(201);
    expect(leadBody.status).toBe("accepted");
    expect(leadBody.caseId).toBe(journeyState.caseId);
    expect(leadBody.workflowJobId).toBe(journeyState.workflowJobId);
    expect(leadBody.accessCode).toBe(createPublicCaseAccessCode(journeyState.caseId, journeyState.workflowJobId));

    const triageResponse = await humanTriagePost(
      new Request(`http://localhost/api/intake/cases/${journeyState.caseId}/human-triage`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(triageApprovePayload)
      }),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );

    const triageBody = await triageResponse.json();

    expect(triageResponse.status).toBe(200);
    expect(triageBody.decision).toBe("approve");
    expect(triageBody.workflowJobStatus).toBe("queued");
    expect(journeyState.caseRecord?.commercialStatus).toBe("screening");
    expect(journeyState.caseRecord?.legalStatus).toBe("intake");

    const briefBeforeScoreResponse = await publicBriefGet(
      new Request(
        `http://localhost/api/intake/public/cases/${journeyState.caseId}/brief?workflowJobId=${journeyState.workflowJobId}`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const briefBeforeScoreBody = await briefBeforeScoreResponse.json();

    expect(briefBeforeScoreResponse.status).toBe(202);
    expect(briefBeforeScoreBody.status).toBe("awaiting_human_score");

    journeyState.caseRecord = {
      ...journeyState.caseRecord!,
      legalStatus: "human_review_required"
    };

    const scoreReviewResponse = await scoreReviewPost(
      new Request(`http://localhost/api/intake/cases/${journeyState.caseId}/score/review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(scoreReviewPayload)
      }),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );

    const scoreReviewBody = await scoreReviewResponse.json();

    expect(scoreReviewResponse.status).toBe(200);
    expect(scoreReviewBody.decision).toBe("yellow");
    expect(journeyState.scoreRecord?.decision).toBe("yellow");
    expect(journeyState.caseRecord?.legalStatus).toBe("conversion_pending");

    const briefReadyResponse = await publicBriefGet(
      new Request(
        `http://localhost/api/intake/public/cases/${journeyState.caseId}/brief?workflowJobId=${journeyState.workflowJobId}`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const briefReadyBody = await briefReadyResponse.json();

    expect(briefReadyResponse.status).toBe(200);
    expect(briefReadyBody.status).toBe("ready");
    expect(briefReadyBody.submission).toBeNull();
    expect(briefReadyBody.draft).toBeNull();
    expect(briefReadyBody.supportingDocumentPack).toBeNull();

    const briefSubmissionResponse = await publicBriefPost(
      new Request(`http://localhost/api/intake/public/cases/${journeyState.caseId}/brief`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(briefPayload)
      }),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );

    const briefSubmissionBody = await briefSubmissionResponse.json();

    expect(briefSubmissionResponse.status).toBe(202);
    expect(briefSubmissionBody.status).toBe("accepted");
    expect(briefSubmissionBody.submission.patientFullName).toBe("Maria Costa");
    expect(briefSubmissionBody.submission.contactFullName).toBe("Joao Costa");
    expect(briefSubmissionBody.draft.sections.length).toBeGreaterThan(0);
    expect(briefSubmissionBody.supportingDocumentPack.documents).toHaveLength(2);

    const briefFetchedAfterSubmitResponse = await publicBriefGet(
      new Request(
        `http://localhost/api/intake/public/cases/${journeyState.caseId}/brief?workflowJobId=${journeyState.workflowJobId}`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const briefFetchedAfterSubmitBody = await briefFetchedAfterSubmitResponse.json();

    expect(briefFetchedAfterSubmitResponse.status).toBe(200);
    expect(briefFetchedAfterSubmitBody.submission.patientFullName).toBe("Maria Costa");
    expect(briefFetchedAfterSubmitBody.submission.contactEmail).toBe("joao.costa@example.com");
    expect(briefFetchedAfterSubmitBody.supportingDocumentPack.documents).toHaveLength(2);

    seedArtifactsFromBriefResponse(briefSubmissionBody);

    const legalReviewResponse = await legalReviewPost(
      new Request(`http://localhost/api/dashboard/protect/cases/${journeyState.caseId}/legal-review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(legalReviewApprovePayload)
      }),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );

    const legalReviewBody = await legalReviewResponse.json();

    expect(legalReviewResponse.status).toBe(200);
    expect(legalReviewBody.decision).toBe("approve");
    expect(legalReviewBody.workflowJob.status).toBe("queued");
    expect(journeyState.caseRecord?.legalStatus).toBe("legal_execution_pending");

    const revisionResponse = await legalArtifactsPost(
      new Request(`http://localhost/api/dashboard/protect/cases/${journeyState.caseId}/legal-artifacts`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          artifactType: "power_of_attorney",
          title: "Procuracao revisada",
          subtitle: "Mandato ajustado",
          summary: "Resumo revisado",
          contentMarkdown: "PROCURA\u00c7\u00c3O\n\nTexto revisado com mais clareza.",
          reviewerId: "painel-executivo",
          note: "Ajuste de redacao final."
        })
      }),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );

    const revisionBody = await revisionResponse.json();

    expect(revisionResponse.status).toBe(200);
    expect(revisionBody.artifact.versionNumber).toBe(2);
    expect(revisionBody.artifact.metadata.source).toBe("human_review_panel");
    expect(
      journeyState.artifactVersions.power_of_attorney[journeyState.artifactVersions.power_of_attorney.length - 1]
        ?.versionNumber
    ).toBe(2);

    const pdfResponse = await legalArtifactsGet(
      new Request(
        `http://localhost/api/dashboard/protect/cases/${journeyState.caseId}/legal-artifacts?format=pdf`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toBe("application/pdf");
    expect(pdfResponse.headers.get("content-disposition")).toContain(
      `safetycare-legal-artifacts-${journeyState.caseId}.pdf`
    );
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const docxResponse = await legalArtifactsGet(
      new Request(
        `http://localhost/api/dashboard/protect/cases/${journeyState.caseId}/legal-artifacts?format=docx`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const docxBuffer = Buffer.from(await docxResponse.arrayBuffer());

    expect(docxResponse.status).toBe(200);
    expect(docxResponse.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(docxResponse.headers.get("content-disposition")).toContain(
      `safetycare-legal-artifacts-${journeyState.caseId}.docx`
    );
    expect(docxBuffer.subarray(0, 2).toString("ascii")).toBe("PK");

    const docResponse = await legalArtifactsGet(
      new Request(
        `http://localhost/api/dashboard/protect/cases/${journeyState.caseId}/legal-artifacts?format=doc&artifactType=power_of_attorney`
      ),
      {
        params: {
          caseId: journeyState.caseId
        }
      }
    );
    const docBuffer = Buffer.from(await docResponse.arrayBuffer());

    expect(docResponse.status).toBe(200);
    expect(docResponse.headers.get("content-type")).toBe("application/msword");
    expect(docResponse.headers.get("content-disposition")).toContain(
      `safetycare-legal-artifact-${journeyState.caseId}-power_of_attorney.doc`
    );
    expect(docBuffer.toString("utf8")).toContain("<html");
    expect(docBuffer.toString("utf8")).toContain("SAFETYCARE - Artefatos juridicos");

    expect(journeyState.auditLogs.length).toBeGreaterThanOrEqual(4);
  });
});
