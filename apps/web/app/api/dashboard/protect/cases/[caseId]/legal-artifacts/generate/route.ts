import { AuditLogRepository, CaseRepository, LegalArtifactRepository, LegalBriefInputRepository, WorkflowJobRepository } from "@safetycare/database";
import { buildCivilHealthLegalDraft, buildCivilHealthSupportingDocumentPack } from "@safetycare/orchestrator";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../../../../../src/lib/database";
import { hasDashboardSessionFromRequest } from "../../../../../../../../src/lib/dashboard-auth";
import { hasOperationsAccess } from "../../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

type CivilHealthBriefInput = Parameters<typeof buildCivilHealthLegalDraft>[0];

function canAccess(request: Request) {
  return hasDashboardSessionFromRequest(request) || hasOperationsAccess(request);
}

function canGenerateForStatus(legalStatus: string) {
  return legalStatus === "legal_execution_pending" || legalStatus === "legal_execution_in_progress";
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();

  if (!canAccess(request)) {
    return NextResponse.json(
      {
        correlationId,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  const { caseId } = await Promise.resolve(context.params);

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const legalBriefInputs = new LegalBriefInputRepository(db);
    const legalArtifacts = new LegalArtifactRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);
    const auditLogs = new AuditLogRepository(db);

    const caseRecord = await cases.findById(caseId);

    if (!caseRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "case_not_found"
        },
        { status: 404 }
      );
    }

    if (!canGenerateForStatus(caseRecord.legalStatus)) {
      return NextResponse.json(
        {
          correlationId,
          error: "invalid_case_stage",
          legalStatus: caseRecord.legalStatus,
          message:
            "A etapa 2 ainda nao foi aprovada. Gere a minuta, a procuração e o contrato apenas depois da liberacao humana."
        },
        { status: 409 }
      );
    }

    const submissionRecord = await legalBriefInputs.findByCaseId(caseId);

    if (!submissionRecord) {
      return NextResponse.json(
        {
          correlationId,
          error: "legal_brief_missing"
        },
        { status: 404 }
      );
    }

    const submission = {
      draftScope: "civil_health" as const,
      patientFullName: submissionRecord.patientFullName,
      patientCpf: submissionRecord.patientCpf,
      city: submissionRecord.city,
      contact: submissionRecord.contact,
      patientAddress: submissionRecord.patientAddress ?? "",
      patientWhatsapp: submissionRecord.patientWhatsapp ?? "",
      patientEmail: submissionRecord.patientEmail ?? "",
      patientAdditionalEmails: submissionRecord.patientAdditionalEmails ?? [],
      patientAdditionalWhatsapps: submissionRecord.patientAdditionalWhatsapps ?? [],
      patientRg: submissionRecord.patientRg ?? "",
      relationToPatient: submissionRecord.relationToPatient,
      contactFullName: submissionRecord.contactFullName ?? "",
      contactAddress: submissionRecord.contactAddress ?? "",
      contactWhatsapp: submissionRecord.contactWhatsapp ?? "",
      contactEmail: submissionRecord.contactEmail ?? "",
      contactAdditionalEmails: submissionRecord.contactAdditionalEmails ?? [],
      contactAdditionalWhatsapps: submissionRecord.contactAdditionalWhatsapps ?? [],
      contactCpf: submissionRecord.contactCpf ?? "",
      contactRg: submissionRecord.contactRg ?? "",
      problemType: submissionRecord.problemType as CivilHealthBriefInput["problemType"],
      currentUrgency: submissionRecord.currentUrgency as CivilHealthBriefInput["currentUrgency"],
      keyDates: submissionRecord.keyDates as CivilHealthBriefInput["keyDates"],
      objectiveDescription: submissionRecord.objectiveDescription,
      materialLosses: submissionRecord.materialLosses,
      moralImpact: submissionRecord.moralImpact,
      uploadedDocuments: submissionRecord.uploadedDocuments ?? [],
      documentsAttached: submissionRecord.documentsAttached,
      witnesses: submissionRecord.witnesses,
      mainRequest: submissionRecord.mainRequest,
      subsidiaryRequest: submissionRecord.subsidiaryRequest
    } satisfies CivilHealthBriefInput;

    const generatedDraft = buildCivilHealthLegalDraft(submission);
    const supportingDocumentPack = buildCivilHealthSupportingDocumentPack(submission);

    const artifactDescriptors = [
      {
        artifactType: "civil_health_draft" as const,
        title: generatedDraft.title,
        subtitle: generatedDraft.subtitle,
        summary: generatedDraft.summary,
        contentMarkdown: generatedDraft.markdown,
        metadata: {
          draftScope: generatedDraft.draftScope,
          source: "manual_generation_button",
          documentCount: supportingDocumentPack.documents.length
        }
      },
      ...supportingDocumentPack.documents.map((document) => ({
        artifactType: document.type,
        title: document.title,
        subtitle: document.subtitle,
        summary: document.summary,
        contentMarkdown: document.markdown,
        metadata: {
          draftScope: supportingDocumentPack.draftScope,
          source: "manual_generation_button",
          documentKey: document.key
        }
      }))
    ];

    const createdArtifactTypes: string[] = [];
    const artifacts = [];

    for (const descriptor of artifactDescriptors) {
      const created = await legalArtifacts.createVersion({
        caseId,
        sourceWorkflowJobId: submissionRecord.sourceWorkflowJobId,
        artifactType: descriptor.artifactType,
        status: "final",
        title: descriptor.title,
        subtitle: descriptor.subtitle,
        summary: descriptor.summary,
        contentMarkdown: descriptor.contentMarkdown,
        metadata: descriptor.metadata
      });

      createdArtifactTypes.push(created.artifactType);
      artifacts.push(created);
    }

    const latestJob = await workflowJobs.findLatestByCaseIdAndType(caseId, "legal.execution");

    if (latestJob && latestJob.status !== "completed") {
      await workflowJobs.markCompleted(latestJob.id, {
        stage: "legal_execution_in_progress",
        generatedArtifactTypes: artifactDescriptors.map((descriptor) => descriptor.artifactType)
      });
    }

    const updatedCase = await cases.updateStatuses(caseId, {
      legalStatus: "legal_execution_in_progress"
    });

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: process.env.DASHBOARD_AUTH_USER ?? "painel-executivo",
      action: "legal_execution.manual_generated",
      correlationId,
      beforePayload: {
        legalStatus: caseRecord.legalStatus,
        createdArtifactTypes
      },
      afterPayload: {
        legalStatus: updatedCase?.legalStatus ?? "legal_execution_in_progress",
        createdArtifactTypes,
        generatedArtifactTypes: artifactDescriptors.map((descriptor) => descriptor.artifactType)
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        legalStatus: updatedCase?.legalStatus ?? "legal_execution_in_progress",
        createdArtifactTypes,
        artifacts: artifacts.map((artifact) => ({
          artifactType: artifact.artifactType,
          versionNumber: artifact.versionNumber,
          status: artifact.status,
          title: artifact.title,
          subtitle: artifact.subtitle,
          summary: artifact.summary,
          contentMarkdown: artifact.contentMarkdown,
          metadata: artifact.metadata ?? {},
          updatedAt: artifact.updatedAt
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "legal_artifact_generation_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
