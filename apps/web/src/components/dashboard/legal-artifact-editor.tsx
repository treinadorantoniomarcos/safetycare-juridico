"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  legalArtifactLabels,
  legalArtifactOrder,
  type LegalArtifactType
} from "../../features/dashboard/legal-artifact-export";
import type { LegalBriefReviewArtifactView } from "../../features/dashboard/get-legal-brief-review-case";

type LegalArtifactGroup = {
  artifactType: string;
  current: LegalBriefReviewArtifactView;
  history: LegalBriefReviewArtifactView[];
};

type ArtifactDraftState = {
  title: string;
  subtitle: string;
  summary: string;
  contentMarkdown: string;
};

type SaveFeedback = {
  kind: "error" | "success";
  message: string;
};

type LegalArtifactEditorProps = {
  artifacts: LegalBriefReviewArtifactView[];
  caseId: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "sem registro";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR", { hour12: false });
}

function buildDownloadUrl(caseId: string, format: "pdf" | "docx" | "doc", artifactType?: string) {
  const searchParams = new URLSearchParams({ format });

  if (artifactType) {
    searchParams.set("artifactType", artifactType);
  }

  return `/api/dashboard/protect/cases/${caseId}/legal-artifacts?${searchParams.toString()}`;
}

function groupArtifacts(artifacts: LegalBriefReviewArtifactView[]) {
  const grouped = new Map<string, LegalBriefReviewArtifactView[]>();

  for (const artifact of artifacts) {
    const current = grouped.get(artifact.artifactType) ?? [];
    current.push(artifact);
    grouped.set(artifact.artifactType, current);
  }

  const orderIndex = new Map<string, number>(legalArtifactOrder.map((artifactType, index) => [artifactType, index]));

  return [...grouped.entries()]
    .map(([artifactType, versions]) => ({
      artifactType,
      current: versions[0] as LegalBriefReviewArtifactView,
      history: versions.slice(1)
    }))
    .sort((left, right) => {
      const leftOrder = orderIndex.get(left.artifactType) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderIndex.get(right.artifactType) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.current.versionNumber - right.current.versionNumber;
    });
}

function buildDraftMap(groups: LegalArtifactGroup[]) {
  const drafts: Record<string, ArtifactDraftState> = {};

  for (const group of groups) {
    drafts[group.artifactType] = {
      title: group.current.title,
      subtitle: group.current.subtitle,
      summary: group.current.summary,
      contentMarkdown: group.current.contentMarkdown
    };
  }

  return drafts;
}

function getArtifactLabel(artifactType: string) {
  return legalArtifactLabels[artifactType as LegalArtifactType] ?? artifactType;
}

export function LegalArtifactEditor({ artifacts, caseId }: LegalArtifactEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const groupedArtifacts = useMemo(() => groupArtifacts(artifacts), [artifacts]);
  const [drafts, setDrafts] = useState<Record<string, ArtifactDraftState>>(() =>
    buildDraftMap(groupedArtifacts)
  );
  const [savingArtifactType, setSavingArtifactType] = useState<string | null>(null);
  const [feedbackByArtifactType, setFeedbackByArtifactType] = useState<
    Record<string, SaveFeedback | undefined>
  >({});

  useEffect(() => {
    setDrafts(buildDraftMap(groupedArtifacts));
    setFeedbackByArtifactType({});
  }, [groupedArtifacts]);

  async function saveArtifact(artifactType: string) {
    const currentDraft = drafts[artifactType];

    if (!currentDraft) {
      setFeedbackByArtifactType((previous) => ({
        ...previous,
        [artifactType]: {
          kind: "error",
          message: "Nao foi possivel localizar o texto atual para salvar."
        }
      }));
      return;
    }

    setSavingArtifactType(artifactType);
    setFeedbackByArtifactType((previous) => ({
      ...previous,
      [artifactType]: undefined
    }));

    try {
      const response = await fetch(`/api/dashboard/protect/cases/${caseId}/legal-artifacts`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          artifactType,
          title: currentDraft.title.trim(),
          subtitle: currentDraft.subtitle.trim(),
          summary: currentDraft.summary.trim(),
          contentMarkdown: currentDraft.contentMarkdown
        })
      });

      const payload = (await response.json()) as
        | {
            error?: string;
            detail?: string;
            correlationId?: string;
          }
        | {
            artifact?: {
              versionNumber?: number;
            };
          };

      if (!response.ok) {
        const message =
          "error" in payload && payload.error === "legal_artifact_not_found"
            ? "Nao foi encontrado artefato para editar neste caso."
            : "Nao foi possivel salvar as alteracoes. Tente novamente.";

        setFeedbackByArtifactType((previous) => ({
          ...previous,
          [artifactType]: {
            kind: "error",
            message
          }
        }));
        return;
      }

      setFeedbackByArtifactType((previous) => ({
        ...previous,
        [artifactType]: {
          kind: "success",
          message: `Nova versao salva${"artifact" in payload && payload.artifact?.versionNumber ? ` na versao ${payload.artifact.versionNumber}` : ""}.`
        }
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedbackByArtifactType((previous) => ({
        ...previous,
        [artifactType]: {
          kind: "error",
          message: "Falha de conexao ao salvar o texto editado."
        }
      }));
    } finally {
      setSavingArtifactType(null);
    }
  }

  if (groupedArtifacts.length === 0) {
    return (
      <section className="form-section-card supporting-documents-card legal-artifact-editor">
        <div className="form-section-head">
          <p className="section-eyebrow">Artefatos gerados</p>
          <h3>Editar, salvar e baixar</h3>
          <p className="section-note">
            Ainda nao ha artefatos gravados. A aprovacao humana vai disparar a geracao final.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="form-section-card supporting-documents-card legal-artifact-editor">
      <div className="form-section-head">
        <p className="section-eyebrow">Artefatos gerados</p>
        <h3>Editar, salvar e baixar</h3>
        <p className="section-note">
          As alteracoes criam uma nova versao no banco. Os downloads em PDF, DOCX e DOC sempre usam
          a versao mais recente.
        </p>
      </div>

      <div className="review-download-row legal-artifact-editor__bundle-actions">
        <a
          className="button-ghost inline-action legal-artifact-editor__download-link"
          href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=doc`}
        >
          Baixar pacote DOC
        </a>
        <a
          className="button-ghost inline-action"
          href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=pdf`}
        >
          Baixar pacote PDF
        </a>
        <a
          className="button-ghost inline-action"
          href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=docx`}
        >
          Baixar pacote DOCX
        </a>
      </div>

      <div className="legal-artifact-editor__list">
        {groupedArtifacts.map((group) => {
          const draft = drafts[group.artifactType];
          const feedback = feedbackByArtifactType[group.artifactType];
          const isSaving = savingArtifactType === group.artifactType;
          const label = getArtifactLabel(group.artifactType);

          if (!draft) {
            return null;
          }

          return (
            <article key={group.artifactType} className="review-artifact-item legal-artifact-editor__card">
              <div className="supporting-document-head">
                <p className="section-eyebrow">{label}</p>
                <h4>
                  {draft.title} | Versao {group.current.versionNumber}
                </h4>
                <p className="section-note">
                  Status: {group.current.status} | Atualizado em {formatDateTime(group.current.updatedAt)}
                </p>
              </div>

              <div className="legal-artifact-editor__fields">
                <label className="field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [group.artifactType]: {
                          ...draft,
                          title: event.target.value
                        }
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Subtitulo</span>
                  <input
                    type="text"
                    value={draft.subtitle}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [group.artifactType]: {
                          ...draft,
                          subtitle: event.target.value
                        }
                      }))
                    }
                  />
                </label>

                <label className="field legal-artifact-editor__summary-field">
                  <span>Resumo</span>
                  <textarea
                    rows={3}
                    value={draft.summary}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [group.artifactType]: {
                          ...draft,
                          summary: event.target.value
                        }
                      }))
                    }
                  />
                </label>

                <label className="field legal-artifact-editor__markdown-field">
                  <span>Texto integral</span>
                  <textarea
                    rows={24}
                    value={draft.contentMarkdown}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [group.artifactType]: {
                          ...draft,
                          contentMarkdown: event.target.value
                        }
                      }))
                    }
                  />
                </label>
              </div>

              {feedback ? (
                <p className={feedback.kind === "success" ? "completion-success-message" : "form-error"}>
                  {feedback.message}
                </p>
              ) : null}

              <div className="review-download-row legal-artifact-editor__actions">
                <button
                  type="button"
                  className="button-primary inline-action"
                  disabled={isSaving || isPending}
                  onClick={() => {
                    void saveArtifact(group.artifactType);
                  }}
                >
                  {isSaving || isPending ? "Salvando..." : "Salvar nova versao"}
                </button>
                <a
                  className="button-ghost inline-action"
                  href={buildDownloadUrl(caseId, "doc", group.artifactType)}
                >
                  Baixar DOC
                </a>
                <a
                  className="button-ghost inline-action"
                  href={buildDownloadUrl(caseId, "pdf", group.artifactType)}
                >
                  Baixar PDF
                </a>
                <a
                  className="button-ghost inline-action"
                  href={buildDownloadUrl(caseId, "docx", group.artifactType)}
                >
                  Baixar DOCX
                </a>
              </div>

              {group.history.length > 0 ? (
                <details className="draft-preview-markdown legal-artifact-editor__history">
                  <summary>Ver historico de versoes</summary>
                  <div className="legal-artifact-editor__history-list">
                    {group.history.map((version) => (
                      <article key={`${version.artifactType}-${version.versionNumber}`} className="legal-artifact-editor__history-item">
                        <p className="section-eyebrow">
                          Versao {version.versionNumber} | {version.status}
                        </p>
                        <p className="section-note">Atualizada em {formatDateTime(version.updatedAt)}</p>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
