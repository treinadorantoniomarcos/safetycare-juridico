"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  legalArtifactLabels,
  legalArtifactOrder,
  type LegalArtifactType
} from "../../features/dashboard/legal-artifact-export";
import type {
  LegalArtifactsHubArtifactView,
  LegalArtifactsHubCaseView,
  LegalArtifactsHubOverview
} from "../../features/dashboard/get-legal-artifacts-hub-overview";

type ArtifactTypeFilter = "all" | LegalArtifactType;

type LegalArtifactsHubProps = {
  initialData: LegalArtifactsHubOverview;
};

type ArtifactGroup = {
  artifactLabel: string;
  artifactType: LegalArtifactType;
  versions: LegalArtifactsHubArtifactView[];
};

function formatDateTime(value?: string) {
  if (!value) {
    return "sem registro";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR", { hour12: false });
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildArtifactDownloadUrl(
  caseId: string,
  format: "doc" | "pdf" | "docx",
  artifactType: string,
  versionNumber?: number
) {
  const searchParams = new URLSearchParams({
    format,
    artifactType
  });

  if (versionNumber) {
    searchParams.set("versionNumber", String(versionNumber));
  }

  return `/api/dashboard/protect/cases/${caseId}/legal-artifacts?${searchParams.toString()}`;
}

function buildCaseBundleDownloadUrl(caseId: string, format: "doc" | "pdf" | "docx") {
  return `/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=${format}`;
}

function buildCaseEditUrl(caseId: string) {
  return `/painel-executivo/cases/${caseId}#artefatos`;
}

function groupArtifactsByType(artifacts: LegalArtifactsHubArtifactView[]) {
  const grouped = new Map<LegalArtifactType, LegalArtifactsHubArtifactView[]>();

  for (const artifact of artifacts) {
    const current = grouped.get(artifact.artifactType) ?? [];
    current.push(artifact);
    grouped.set(artifact.artifactType, current);
  }

  return legalArtifactOrder
    .map((artifactType) => {
      const versions = grouped.get(artifactType) ?? [];

      if (versions.length === 0) {
        return null;
      }

      return {
        artifactLabel: legalArtifactLabels[artifactType],
        artifactType,
        versions: [...versions].sort((left, right) => right.versionNumber - left.versionNumber)
      } satisfies ArtifactGroup;
    })
    .filter((item): item is ArtifactGroup => Boolean(item));
}

function buildSearchIndex(caseItem: LegalArtifactsHubCaseView) {
  return normalizeSearchText(
    [
      caseItem.clientName,
      caseItem.caseId,
      caseItem.clientEmail ?? "",
      caseItem.clientPhone ?? "",
      caseItem.commercialStatus,
      caseItem.legalStatus,
      ...caseItem.artifacts.flatMap((artifact) => [
        artifact.artifactLabel,
        artifact.artifactType,
        artifact.title,
        artifact.subtitle,
        artifact.summary,
        String(artifact.versionNumber),
        artifact.status
      ])
    ].join(" ")
  );
}

function filterArtifactGroups(groups: ArtifactGroup[], selectedFilter: ArtifactTypeFilter) {
  if (selectedFilter === "all") {
    return groups;
  }

  return groups.filter((group) => group.artifactType === selectedFilter);
}

export function LegalArtifactsHub({ initialData }: LegalArtifactsHubProps) {
  const router = useRouter();
  const [data, setData] = useState<LegalArtifactsHubOverview>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ArtifactTypeFilter>("all");
  const [isRefreshing, startTransition] = useTransition();

  const normalizedSearchTerm = useMemo(() => normalizeSearchText(searchTerm), [searchTerm]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredCases = useMemo(() => {
    return data.cases.filter((caseItem) => {
      if (normalizedSearchTerm && !buildSearchIndex(caseItem).includes(normalizedSearchTerm)) {
        return false;
      }

      const groups = groupArtifactsByType(caseItem.artifacts);

      if (selectedFilter === "all") {
        return true;
      }

      return groups.some((group) => group.artifactType === selectedFilter);
    });
  }, [data.cases, normalizedSearchTerm, selectedFilter]);

  const filterOptions: Array<{ label: string; value: ArtifactTypeFilter }> = [
    { label: "Todos", value: "all" },
    ...legalArtifactOrder.map((artifactType) => ({
      label: legalArtifactLabels[artifactType],
      value: artifactType
    }))
  ];

  return (
    <section className="panel-section legal-artifacts-hub">
      <header className="section-heading legal-artifacts-hub__header">
        <div>
          <p className="section-eyebrow">Painel executivo</p>
          <h1>Biblioteca de peças, contratos e procurações</h1>
          <p className="hero-lede">
            Veja tudo em uma única tela, filtre por tipo de documento, abra a edição do caso e
            baixe em DOC, DOCX ou PDF.
          </p>
        </div>

        <div className="legal-artifacts-hub__header-actions">
          <button
            type="button"
            className="button-ghost inline-action"
            disabled={isRefreshing}
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <Link className="button-ghost inline-action" href="/painel-executivo">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <div className="legal-artifacts-hub__summary-row">
        <p className="section-note">
          Casos com artefatos: <strong>{data.totalCases}</strong> | Versões totais:{" "}
          <strong>{data.totalArtifacts}</strong> | Atualizado em {formatDateTime(data.generatedAt)}
        </p>

        <label className="field legal-artifacts-hub__search">
          <span>Buscar por cliente</span>
          <input
            type="search"
            value={searchTerm}
            placeholder="Digite nome, caso, e-mail, telefone ou documento"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      </div>

      <div className="legal-artifacts-hub__filters">
        <p className="section-note">Filtrar por tipo de documento</p>
        <div className="legal-artifacts-hub__filter-bar" role="tablist" aria-label="Filtro de documento">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                selectedFilter === option.value
                  ? "button-primary inline-action"
                  : "button-ghost inline-action"
              }
              onClick={() => setSelectedFilter(option.value)}
              aria-pressed={selectedFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <section className="form-section-card">
          <p className="completion-status">
            Nenhum cliente encontrado com esse filtro. Tente buscar por outro nome, outro tipo de
            documento ou abra a biblioteca sem pesquisa.
          </p>
        </section>
      ) : (
        <div className="legal-artifacts-hub__case-list">
          {filteredCases.map((caseItem) => {
            const groups = filterArtifactGroups(groupArtifactsByType(caseItem.artifacts), selectedFilter);
            const latestVersionNumber = caseItem.artifacts.reduce(
              (max, artifact) => Math.max(max, artifact.versionNumber),
              0
            );

            return (
              <article key={caseItem.caseId} className="form-section-card legal-artifacts-hub__case-card">
                <div className="legal-artifacts-hub__case-head">
                  <div>
                    <p className="section-eyebrow">Cliente</p>
                    <h2>{caseItem.clientName}</h2>
                    <p className="hero-lede">
                      Caso {caseItem.caseId.slice(0, 8)} | Status juridico: {caseItem.legalStatus} |{" "}
                      Comercial: {caseItem.commercialStatus}
                    </p>
                    <p className="section-note">
                      Cliente: {caseItem.clientEmail ?? "sem e-mail"} |{" "}
                      {caseItem.clientPhone ?? "sem telefone"} | Atualizado em{" "}
                      {formatDateTime(caseItem.latestArtifactUpdatedAt)}
                    </p>
                  </div>

                  <div className="review-pill-row">
                    <span className="review-pill">Tipos: {groups.length}</span>
                    <span className="review-pill">Versões: {caseItem.artifacts.length}</span>
                    <span className="review-pill">Maior versão: {latestVersionNumber}</span>
                  </div>
                </div>

                <div className="review-download-row legal-artifacts-hub__case-actions">
                  <Link className="button-primary inline-action" href={buildCaseEditUrl(caseItem.caseId)}>
                    Abrir edição
                  </Link>
                  <a
                    className="button-ghost inline-action"
                    href={buildCaseBundleDownloadUrl(caseItem.caseId, "doc")}
                  >
                    Pacote DOC
                  </a>
                  <a
                    className="button-ghost inline-action"
                    href={buildCaseBundleDownloadUrl(caseItem.caseId, "pdf")}
                  >
                    Pacote PDF
                  </a>
                  <a
                    className="button-ghost inline-action"
                    href={buildCaseBundleDownloadUrl(caseItem.caseId, "docx")}
                  >
                    Pacote DOCX
                  </a>
                </div>

                <div className="legal-artifacts-hub__artifact-groups">
                  {groups.map((group) => {
                    const [currentVersion, ...olderVersions] = group.versions;

                    if (!currentVersion) {
                      return null;
                    }

                    return (
                      <article
                        key={`${caseItem.caseId}-${group.artifactType}`}
                        className="review-artifact-item legal-artifacts-hub__artifact-group"
                      >
                        <div className="supporting-document-head">
                          <p className="section-eyebrow">{group.artifactLabel}</p>
                          <h3>
                            {currentVersion.title} | Versão {currentVersion.versionNumber}
                          </h3>
                          <p className="section-note">
                            {currentVersion.subtitle} | Status: {currentVersion.status} | Atualizado em{" "}
                            {formatDateTime(currentVersion.updatedAt)}
                          </p>
                        </div>

                        <p className="review-paragraph">{currentVersion.summary}</p>

                        <div className="review-download-row">
                          <a
                            className="button-ghost inline-action"
                            href={buildArtifactDownloadUrl(
                              caseItem.caseId,
                              "doc",
                              group.artifactType,
                              currentVersion.versionNumber
                            )}
                          >
                            Baixar DOC desta versao
                          </a>
                          <a
                            className="button-ghost inline-action"
                            href={buildArtifactDownloadUrl(
                              caseItem.caseId,
                              "pdf",
                              group.artifactType,
                              currentVersion.versionNumber
                            )}
                          >
                            Baixar PDF desta versao
                          </a>
                          <a
                            className="button-ghost inline-action"
                            href={buildArtifactDownloadUrl(
                              caseItem.caseId,
                              "docx",
                              group.artifactType,
                              currentVersion.versionNumber
                            )}
                          >
                            Baixar DOCX desta versao
                          </a>
                        </div>

                        {olderVersions.length > 0 ? (
                          <details className="legal-artifacts-hub__version-history">
                            <summary>Ver versoes antigas ({olderVersions.length})</summary>
                            <div className="legal-artifacts-hub__version-list">
                              {olderVersions.map((version) => (
                                <article
                                  key={`${version.artifactType}-${version.versionNumber}`}
                                  className="legal-artifacts-hub__version-card"
                                >
                                  <div>
                                    <p className="section-eyebrow">
                                      Versao {version.versionNumber} | {version.status}
                                    </p>
                                    <h4>{version.title}</h4>
                                    <p className="section-note">
                                      {version.subtitle} | Atualizado em {formatDateTime(version.updatedAt)}
                                    </p>
                                    <p className="review-paragraph">{version.summary}</p>
                                  </div>

                                  <div className="review-download-row">
                                    <a
                                      className="button-ghost inline-action"
                                      href={buildArtifactDownloadUrl(
                                        caseItem.caseId,
                                        "doc",
                                        version.artifactType,
                                        version.versionNumber
                                      )}
                                    >
                                      DOC
                                    </a>
                                    <a
                                      className="button-ghost inline-action"
                                      href={buildArtifactDownloadUrl(
                                        caseItem.caseId,
                                        "pdf",
                                        version.artifactType,
                                        version.versionNumber
                                      )}
                                    >
                                      PDF
                                    </a>
                                    <a
                                      className="button-ghost inline-action"
                                      href={buildArtifactDownloadUrl(
                                        caseItem.caseId,
                                        "docx",
                                        version.artifactType,
                                        version.versionNumber
                                      )}
                                    >
                                      DOCX
                                    </a>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <p className="section-note">Nenhuma versao antiga para este documento.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
