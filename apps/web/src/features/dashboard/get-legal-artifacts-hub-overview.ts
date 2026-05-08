import { desc, eq } from "drizzle-orm";
import {
  type LegalArtifactRecord,
  casesTable,
  clientsTable,
  legalArtifactsTable
} from "@safetycare/database";
import {
  legalArtifactLabels,
  legalArtifactOrder,
  type LegalArtifactType
} from "./legal-artifact-export";
import { getDatabaseClient } from "../../lib/database";

export type LegalArtifactsHubArtifactView = {
  artifactType: LegalArtifactType;
  artifactLabel: string;
  versionNumber: number;
  status: string;
  title: string;
  subtitle: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type LegalArtifactsHubCaseView = {
  caseId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  commercialStatus: string;
  legalStatus: string;
  caseUpdatedAt: string;
  latestArtifactUpdatedAt: string;
  artifacts: LegalArtifactsHubArtifactView[];
};

export type LegalArtifactsHubOverview = {
  generatedAt: string;
  totalCases: number;
  totalArtifacts: number;
  cases: LegalArtifactsHubCaseView[];
};

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatArtifact(record: LegalArtifactRecord): LegalArtifactsHubArtifactView {
  return {
    artifactType: record.artifactType as LegalArtifactType,
    artifactLabel: legalArtifactLabels[record.artifactType as LegalArtifactType] ?? record.artifactType,
    versionNumber: record.versionNumber,
    status: record.status,
    title: record.title,
    subtitle: record.subtitle,
    summary: record.summary,
    createdAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt)
  };
}

function orderArtifacts(artifacts: LegalArtifactsHubArtifactView[]) {
  const orderIndex = new Map<LegalArtifactType, number>(
    legalArtifactOrder.map((artifactType, index) => [artifactType, index])
  );

  return [...artifacts].sort((left, right) => {
    const leftOrder = orderIndex.get(left.artifactType) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderIndex.get(right.artifactType) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return right.versionNumber - left.versionNumber;
  });
}

export async function getLegalArtifactsHubOverview(): Promise<LegalArtifactsHubOverview> {
  const { db } = getDatabaseClient();

  const caseRows = await db
    .select({
      caseRecord: casesTable,
      clientRecord: clientsTable
    })
    .from(casesTable)
    .innerJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .orderBy(desc(casesTable.updatedAt));

  const artifactRows = await db
    .select()
    .from(legalArtifactsTable)
    .orderBy(desc(legalArtifactsTable.updatedAt), desc(legalArtifactsTable.versionNumber));

  const artifactsByCase = new Map<string, LegalArtifactsHubArtifactView[]>();
  const latestArtifactUpdatedAtByCase = new Map<string, string>();

  for (const artifact of artifactRows) {
    const caseArtifacts = artifactsByCase.get(artifact.caseId) ?? [];
    caseArtifacts.push(formatArtifact(artifact));
    artifactsByCase.set(artifact.caseId, caseArtifacts);

    if (!latestArtifactUpdatedAtByCase.has(artifact.caseId)) {
      latestArtifactUpdatedAtByCase.set(artifact.caseId, toIsoDate(artifact.updatedAt));
    }
  }

  const cases = caseRows
    .map(({ caseRecord, clientRecord }) => {
      const artifacts = artifactsByCase.get(caseRecord.id) ?? [];

      if (artifacts.length === 0) {
        return null;
      }

      return {
        caseId: caseRecord.id,
        clientName: clientRecord.fullName,
        clientEmail: clientRecord.email,
        clientPhone: clientRecord.phone,
        commercialStatus: caseRecord.commercialStatus,
        legalStatus: caseRecord.legalStatus,
        caseUpdatedAt: toIsoDate(caseRecord.updatedAt),
        latestArtifactUpdatedAt:
          latestArtifactUpdatedAtByCase.get(caseRecord.id) ?? toIsoDate(caseRecord.updatedAt),
        artifacts: orderArtifacts(artifacts)
      } satisfies LegalArtifactsHubCaseView;
    })
    .filter((item): item is LegalArtifactsHubCaseView => Boolean(item))
    .sort((left, right) => {
      if (left.latestArtifactUpdatedAt !== right.latestArtifactUpdatedAt) {
        return right.latestArtifactUpdatedAt.localeCompare(left.latestArtifactUpdatedAt);
      }

      return left.clientName.localeCompare(right.clientName, "pt-BR");
    });

  return {
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    totalArtifacts: artifactRows.length,
    cases
  };
}
