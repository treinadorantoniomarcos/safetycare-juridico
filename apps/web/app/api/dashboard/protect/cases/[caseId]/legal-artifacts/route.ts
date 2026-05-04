import {
  legalArtifactRevisionSchema,
  legalArtifactTypeSchema,
  type LegalArtifactType
} from "@safetycare/ai-contracts";
import { AuditLogRepository, CaseRepository, LegalArtifactRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import {
  buildLegalArtifactExportBundle,
  createLegalArtifactDocxBuffer,
  createLegalArtifactPdfBuffer,
  type LegalArtifactExportFormat
} from "../../../../../../../src/features/dashboard/legal-artifact-export";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

const exportedArtifactTypes = legalArtifactTypeSchema.options;

function canAccess(request: Request) {
  return hasDashboardSessionFromRequest(request) || hasOperationsAccess(request);
}

function resolveExportFormat(value: string | null): LegalArtifactExportFormat | null {
  if (!value || value.trim().length === 0) {
    return "pdf";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "pdf" || normalized === "docx") {
    return normalized;
  }

  return null;
}

function resolveRequestedArtifactType(value: string | null): LegalArtifactType | "all" | null {
  if (!value || value.trim().length === 0) {
    return "all";
  }

  const validation = legalArtifactTypeSchema.safeParse(value.trim());

  if (!validation.success) {
    return null;
  }

  return validation.data;
}

function buildExportFilename(caseId: string, format: LegalArtifactExportFormat, artifactTypes: readonly LegalArtifactType[]) {
  if (artifactTypes.length === 1) {
    return `safetycare-legal-artifact-${caseId}-${artifactTypes[0]}.${format}`;
  }

  return `safetycare-legal-artifacts-${caseId}.${format}`;
}

export async function GET(request: Request, context: RouteContext) {
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
  const url = new URL(request.url);
  const format = resolveExportFormat(url.searchParams.get("format"));
  const requestedArtifactType = resolveRequestedArtifactType(url.searchParams.get("artifactType"));

  if (!format) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_format"
      },
      { status: 400 }
    );
  }

  if (!requestedArtifactType) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_artifact_type"
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const legalArtifacts = new LegalArtifactRepository(db);

    const requestedArtifactTypes =
      requestedArtifactType === "all" ? exportedArtifactTypes : [requestedArtifactType];

    const latestArtifacts = await Promise.all(
      requestedArtifactTypes.map(async (artifactType) => [
        artifactType,
        await legalArtifacts.findLatestByCaseIdAndType(caseId, artifactType)
      ] as const)
    );

    const missingArtifactTypes = latestArtifacts
      .filter(([, artifact]) => !artifact)
      .map(([artifactType]) => artifactType);

    if (missingArtifactTypes.length > 0) {
      return NextResponse.json(
        {
          correlationId,
          error: "legal_artifacts_missing",
          missingArtifactTypes
        },
        { status: 404 }
      );
    }

    const resolvedArtifacts = latestArtifacts
      .map(([, artifact]) => artifact)
      .filter((artifact): artifact is NonNullable<(typeof latestArtifacts)[number][1]> => Boolean(artifact));

    const normalizedArtifacts = resolvedArtifacts.map((artifact) => ({
      ...artifact,
      artifactType: artifact.artifactType as LegalArtifactType
    }));

    const bundle = buildLegalArtifactExportBundle(caseId, normalizedArtifacts);
    const body = format === "pdf" ? createLegalArtifactPdfBuffer(bundle) : createLegalArtifactDocxBuffer(bundle);

    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${buildExportFilename(caseId, format, requestedArtifactTypes)}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "legal_artifact_export_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
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

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_json"
      },
      { status: 400 }
    );
  }

  const validation = legalArtifactRevisionSchema.safeParse(payload);

  if (!validation.success) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_payload",
        details: validation.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const legalArtifacts = new LegalArtifactRepository(db);
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

    const latestArtifact = await legalArtifacts.findLatestByCaseIdAndType(
      caseId,
      validation.data.artifactType
    );

    if (!latestArtifact) {
      return NextResponse.json(
        {
          correlationId,
          error: "legal_artifact_not_found"
        },
        { status: 404 }
      );
    }

    const reviewerId = validation.data.reviewerId?.trim() || process.env.DASHBOARD_AUTH_USER || "painel-executivo";
    const note = validation.data.note?.trim() ?? "";

    const updatedArtifact = await legalArtifacts.createVersion({
      caseId,
      sourceWorkflowJobId: latestArtifact.sourceWorkflowJobId,
      artifactType: validation.data.artifactType,
      status: latestArtifact.status,
      title: validation.data.title?.trim() || latestArtifact.title,
      subtitle: validation.data.subtitle?.trim() || latestArtifact.subtitle,
      summary: validation.data.summary?.trim() || latestArtifact.summary,
      contentMarkdown: validation.data.contentMarkdown,
      metadata: {
        ...(latestArtifact.metadata ?? {}),
        source: "human_review_panel",
        editedBy: reviewerId,
        editedAt: new Date().toISOString(),
        editedFromVersionNumber: latestArtifact.versionNumber,
        ...(note ? { note } : {})
      }
    });

    await auditLogs.record({
      caseId,
      actorType: "user",
      actorId: reviewerId,
      action: "legal_artifact.updated",
      correlationId,
      beforePayload: {
        artifactType: latestArtifact.artifactType,
        versionNumber: latestArtifact.versionNumber,
        title: latestArtifact.title,
        subtitle: latestArtifact.subtitle,
        summary: latestArtifact.summary,
        contentMarkdown: latestArtifact.contentMarkdown
      },
      afterPayload: {
        artifactType: updatedArtifact.artifactType,
        versionNumber: updatedArtifact.versionNumber,
        title: updatedArtifact.title,
        subtitle: updatedArtifact.subtitle,
        summary: updatedArtifact.summary,
        contentMarkdown: updatedArtifact.contentMarkdown,
        note
      }
    });

    return NextResponse.json(
      {
        correlationId,
        caseId,
        artifact: {
          artifactType: updatedArtifact.artifactType,
          versionNumber: updatedArtifact.versionNumber,
          status: updatedArtifact.status,
          title: updatedArtifact.title,
          subtitle: updatedArtifact.subtitle,
          summary: updatedArtifact.summary,
          contentMarkdown: updatedArtifact.contentMarkdown,
          metadata: updatedArtifact.metadata ?? {},
          updatedAt: updatedArtifact.updatedAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDatabaseUrlMissing = message.includes("Missing required environment variable: DATABASE_URL");

    return NextResponse.json(
      {
        correlationId,
        error: isDatabaseUrlMissing ? "database_not_configured" : "legal_artifact_update_failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message || "unknown_error" } : {})
      },
      { status: 500 }
    );
  }
}
