import { LegalArtifactRepository } from "@safetycare/database";
import { NextResponse } from "next/server";
import { hasDashboardSessionFromRequest } from "../../../../../../../src/lib/dashboard-auth";
import { getDatabaseClient } from "../../../../../../../src/lib/database";
import { hasOperationsAccess } from "../../../../../../../src/lib/operations-auth";
import {
  buildLegalArtifactExportBundle,
  createLegalArtifactDocxBuffer,
  createLegalArtifactPdfBuffer,
  type LegalArtifactExportFormat
} from "../../../../../../../src/features/dashboard/legal-artifact-export";

type RouteContext = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
};

const exportedArtifactTypes = ["civil_health_draft", "power_of_attorney", "fee_agreement"] as const;

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

export async function GET(request: Request, context: RouteContext) {
  const correlationId = crypto.randomUUID();
  const hasSession = hasDashboardSessionFromRequest(request);
  const hasOpsAccess = hasOperationsAccess(request);

  if (!hasSession && !hasOpsAccess) {
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

  if (!format) {
    return NextResponse.json(
      {
        correlationId,
        error: "invalid_format"
      },
      { status: 400 }
    );
  }

  try {
    const { db } = getDatabaseClient();
    const legalArtifacts = new LegalArtifactRepository(db);

    const latestArtifacts = await Promise.all(
      exportedArtifactTypes.map(async (artifactType) => [
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
      artifactType: artifact.artifactType as (typeof exportedArtifactTypes)[number]
    }));

    const bundle = buildLegalArtifactExportBundle(caseId, normalizedArtifacts);

    const body =
      format === "pdf" ? createLegalArtifactPdfBuffer(bundle) : createLegalArtifactDocxBuffer(bundle);

    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="safetycare-legal-artifacts-${caseId}.${format}"`,
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
