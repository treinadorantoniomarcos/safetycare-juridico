"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  LegalArtifactsHubArtifactView,
  LegalArtifactsHubCaseView,
  LegalArtifactsHubOverview
} from "../../features/dashboard/get-legal-artifacts-hub-overview";

type LegalArtifactsHubProps = {
  initialData: LegalArtifactsHubOverview;
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
  artifactType: string
) {
  const searchParams = new URLSearchParams({
    format,
    artifactType
  });

  return `/api/dashboard/protect/cases/${caseId}/legal-artifacts?${searchParams.toString()}`;
}

function buildCaseBundleDownloadUrl(caseId: string, format: "doc" | "pdf" | "docx") {
  return `/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=${format}`;
}

function buildCaseEditUrl(caseId: string) {
  return `/painel-executivo/cases/${caseId}#artefatos`;
}

export function LegalArtifactsHub({ initialData }: LegalArtifactsHubProps) {
  const router = useRouter();
  const [data, setData] = useState<LegalArtifactsHubOverview>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, startTransition] = useTransition();

  const normalizedSearchTerm = useMemo(() => normalizeSearchText(searchTerm), [searchTerm]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredCases = useMemo(() => {
    if (!normalizedSearchTerm) {
      return data.cases;
    }

    return data.cases.filter((caseItem) => {
      const searchableText = normalizeSearchText(
        [
          caseItem.clientName,
          caseItem.caseId,
          caseItem.clientEmail ?? "",
          caseItem.clientPhone ?? "",
          caseItem.commercialStatus,
          caseItem.legalStatus,
          ...caseItem.artifacts.flatMap((artifact: LegalArtifactsHubArtifactView) => [
            artifact.artifactLabel,
            artifact.title,
            artifact.subtitle,
            artifact.summary,
            String(artifact.versionNumber),
            artifact.status
          ])
        ].join(" ")
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [data.cases, normalizedSearchTerm]);

  return (
    <section className="panel-section legal-artifacts-hub">
      <header className="section-heading legal-artifacts-hub__header">
        <div>
          <p className="section-eyebrow">Painel executivo</p>
          <h1>Biblioteca de peças, contratos e procurações</h1>
          <p className="hero-lede">
            Busque pelo nome do cliente, abra a versão mais recente, edite no caso e baixe em DOC,
            DOCX ou PDF.
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
          Casos com artefatos: <strong>{data.totalCases}</strong> | Documentos ativos:{" "}
          <strong>{data.totalArtifacts}</strong> | Atualizado em {formatDateTime(data.generatedAt)}
        </p>
        <label className="field legal-artifacts-hub__search">
          <span>Buscar por cliente</span>
          <input
            type="search"
            value={searchTerm}
            placeholder="Digite o nome do cliente, caso ou documento"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      </div>

      {filteredCases.length === 0 ? (
        <section className="form-section-card">
          <p className="completion-status">
            Nenhum cliente encontrado com esse filtro. Tente buscar por outro nome ou abra a
            biblioteca sem pesquisa.
          </p>
        </section>
      ) : (
        <div className="legal-artifacts-hub__case-list">
          {filteredCases.map((caseItem: LegalArtifactsHubCaseView) => {
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
                    <span className="review-pill">Peças: {caseItem.artifacts.length}</span>
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

                <div className="legal-artifacts-hub__artifact-list">
                  {caseItem.artifacts.map((artifact) => (
                    <article
                      key={`${artifact.artifactType}-${artifact.versionNumber}`}
                      className="review-artifact-item legal-artifacts-hub__artifact-card"
                    >
                      <div className="supporting-document-head">
                        <p className="section-eyebrow">{artifact.artifactLabel}</p>
                        <h3>
                          {artifact.title} | Versão {artifact.versionNumber}
                        </h3>
                        <p className="section-note">
                          {artifact.subtitle} | Status: {artifact.status} | Atualizado em{" "}
                          {formatDateTime(artifact.updatedAt)}
                        </p>
                      </div>

                      <p className="review-paragraph">{artifact.summary}</p>

                      <div className="review-download-row">
                        <a
                          className="button-ghost inline-action"
                          href={buildArtifactDownloadUrl(
                            caseItem.caseId,
                            "doc",
                            artifact.artifactType
                          )}
                        >
                          Baixar DOC
                        </a>
                        <a
                          className="button-ghost inline-action"
                          href={buildArtifactDownloadUrl(
                            caseItem.caseId,
                            "pdf",
                            artifact.artifactType
                          )}
                        >
                          Baixar PDF
                        </a>
                        <a
                          className="button-ghost inline-action"
                          href={buildArtifactDownloadUrl(
                            caseItem.caseId,
                            "docx",
                            artifact.artifactType
                          )}
                        >
                          Baixar DOCX
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
