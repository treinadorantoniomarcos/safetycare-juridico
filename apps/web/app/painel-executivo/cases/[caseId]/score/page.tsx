import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "../../../../../src/components/brand/site-header";
import { CaseReviewStageNav } from "../../../../../src/components/dashboard/case-review-stage-nav";
import { getHumanScoreClassification } from "../../../../../src/features/dashboard/legal-score-classification";
import { ScoreReviewActions } from "../../../../../src/components/dashboard/score-review-actions";
import { getScoreReviewCase } from "../../../../../src/features/dashboard/get-score-review-case";
import { hasDashboardSessionFromCookieStore } from "../../../../../src/lib/dashboard-auth";

type PageProps = {
  params:
    | {
        caseId: string;
      }
    | Promise<{
        caseId: string;
      }>;
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

function renderEntries(entries: Record<string, unknown>) {
  const items = Object.entries(entries);

  if (items.length === 0) {
    return <p className="review-empty-state">Nenhum metadado informado.</p>;
  }

  return (
    <ul className="review-list">
      {items.map(([key, value]) => (
        <li key={key}>
          <strong>{key}</strong> -{" "}
          {typeof value === "string"
            ? value
            : typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : JSON.stringify(value)}
        </li>
      ))}
    </ul>
  );
}

function renderMaybeJson(value: unknown) {
  if (value === null || value === undefined) {
    return <p className="review-empty-state">Nenhum dado informado.</p>;
  }

  if (typeof value === "string") {
    return <p className="review-paragraph">{value}</p>;
  }

  return (
    <details className="draft-preview-markdown">
      <summary>Ver JSON completo</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default async function ScoreReviewPage({ params }: PageProps) {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  const { caseId } = await Promise.resolve(params);
  const reviewCase = await getScoreReviewCase(caseId);

  if (!reviewCase) {
    notFound();
  }

  const reviewerIdDefault = process.env.DASHBOARD_AUTH_USER ?? "painel-executivo";
  const scoreClassification = getHumanScoreClassification(reviewCase.score?.decision);

  return (
    <main className="brand-shell">
      <SiteHeader current="dashboard" />

      <section className="panel-section legal-review-page">
        <div className="section-heading">
          <p className="section-eyebrow">Revisao do score</p>
          <h1>Analise humana do score juridico</h1>
          <p className="hero-lede">
            Abra a triagem consolidada, o score, os alertas e as analises ja produzidas antes de
            decidir se o caso avanca para conversao.
          </p>
        </div>

        <CaseReviewStageNav caseId={caseId} activeStage="score" />

        <div className="review-metadata">
          <div className="review-pill-row">
            <span className="review-pill">Caso {reviewCase.caseId.slice(0, 8)}</span>
            <span className="review-pill">Status juridico: {reviewCase.legalStatus}</span>
            <span className="review-pill">Status comercial: {reviewCase.commercialStatus}</span>
            <span className="review-pill">Cliente: {reviewCase.client.fullName}</span>
          </div>

          <p className="section-note">
            Atualizado em {formatDateTime(reviewCase.caseUpdatedAt)} | Cliente:&nbsp;
            {reviewCase.client.email ?? "sem e-mail"} | {reviewCase.client.phone ?? "sem telefone"}
          </p>
        </div>

        <div className="legal-review-grid">
          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Dados principais</p>
              <h3>Identificacao e contexto</h3>
              <p className="section-note">
                O humano deve conferir a narrativa original, a triagem e o score antes da decisao.
              </p>
            </div>

            <div className="review-kv-grid">
              <div className="review-kv">
                <span>Cliente</span>
                <strong>{reviewCase.client.fullName}</strong>
              </div>
              <div className="review-kv">
                <span>Origem</span>
                <strong>{reviewCase.lead.source}</strong>
              </div>
              <div className="review-kv">
                <span>Consentimento</span>
                <strong>{reviewCase.client.consentStatus}</strong>
              </div>
              <div className="review-kv">
                <span>Prioridade</span>
                <strong>{reviewCase.priority}</strong>
              </div>
              <div className="review-kv">
                <span>Urgencia</span>
                <strong>{reviewCase.urgency}</strong>
              </div>
              <div className="review-kv">
                <span>Telefone</span>
                <strong>{reviewCase.lead.phone ?? "nao informado"}</strong>
              </div>
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Texto original</p>
              <h3>Relato enviado pelo cliente</h3>
            </div>

            <div className="review-block">
              <h4>Mensagem original</h4>
              <p className="review-paragraph" style={{ whiteSpace: "pre-wrap" }}>
                {reviewCase.lead.rawMessage}
              </p>
            </div>

            <div className="review-block">
              <h4>Metadados</h4>
              {renderEntries(reviewCase.lead.metadata)}
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Triagem consolidada</p>
              <h3>Resultado anterior da classificacao</h3>
            </div>

            {reviewCase.triage ? (
              <div className="review-kv-grid">
                <div className="review-kv">
                  <span>Tipo de caso</span>
                  <strong>{reviewCase.triage.caseType}</strong>
                </div>
                <div className="review-kv">
                  <span>Prioridade</span>
                  <strong>{reviewCase.triage.priority}</strong>
                </div>
                <div className="review-kv">
                  <span>Urgencia</span>
                  <strong>{reviewCase.triage.urgency}</strong>
                </div>
                <div className="review-kv">
                  <span>Dano</span>
                  <strong>{reviewCase.triage.hasDamage ? "sim" : "nao"}</strong>
                </div>
                <div className="review-kv">
                  <span>Potencial juridico</span>
                  <strong>{reviewCase.triage.legalPotential}</strong>
                </div>
                <div className="review-kv">
                  <span>Confianca</span>
                  <strong>{reviewCase.triage.confidence}%</strong>
                </div>
              </div>
            ) : (
              <p className="review-empty-state">Nenhuma triagem automatica foi localizada.</p>
            )}

            {reviewCase.triage ? (
              <div className="review-block">
                <h4>Racional</h4>
                {renderMaybeJson(reviewCase.triage.rationale)}
              </div>
            ) : null}
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Score</p>
              <h3>Classificacao manual do score juridico</h3>
              <p className="section-note">
                Nao existe score automatico nesta etapa. A equipe escolhe a cor manualmente para
                liberar ou bloquear a etapa 2.
              </p>
            </div>

            <ScoreReviewActions
              caseId={caseId}
              currentLegalStatus={reviewCase.legalStatus}
              defaultDecision={reviewCase.score?.decision ?? null}
              defaultNote={reviewCase.score?.reviewNote ?? ""}
              defaultReviewerId={reviewCase.score?.reviewedBy ?? reviewerIdDefault}
            />

            {scoreClassification ? (
              <div className="review-block">
                <h4>Classificacao atual</h4>
                <div className={`score-status-card score-status-card--${scoreClassification.key}`}>
                  <div className="score-status-card__current">
                    <span className="score-status-card__dot" aria-hidden="true" />
                    <div>
                      <p className="section-eyebrow">Classificacao manual</p>
                      <h4>{scoreClassification.label}</h4>
                      <p className="review-paragraph">{scoreClassification.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="review-empty-state">Nenhuma classificacao manual foi registrada.</p>
            )}
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Camadas do caso</p>
              <h3>Jornada, clinica, direitos e prova</h3>
            </div>

            <div className="review-block">
              <h4>Jornada</h4>
              {reviewCase.journey ? (
                <>
                  <p className="review-paragraph">{reviewCase.journey.summary}</p>
                  <details className="draft-preview-markdown">
                    <summary>Ver timeline</summary>
                    <pre>{JSON.stringify(reviewCase.journey.timeline, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p className="review-empty-state">Nenhuma jornada consolidada.</p>
              )}
            </div>

            <div className="review-block">
              <h4>Analise clinica</h4>
              {reviewCase.clinical ? (
                <>
                  <p className="review-paragraph">{reviewCase.clinical.summary}</p>
                  <details className="draft-preview-markdown">
                    <summary>Ver achados clinicos</summary>
                    <pre>{JSON.stringify(reviewCase.clinical.findings, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p className="review-empty-state">Nenhuma analise clinica consolidada.</p>
              )}
            </div>

            <div className="review-block">
              <h4>Direitos do paciente</h4>
              {reviewCase.rights ? (
                <>
                  <p className="review-paragraph">{reviewCase.rights.summary}</p>
                  <details className="draft-preview-markdown">
                    <summary>Ver direitos identificados</summary>
                    <pre>{JSON.stringify(reviewCase.rights.rights, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p className="review-empty-state">Nenhuma avaliacao de direitos consolidada.</p>
              )}
            </div>

            <div className="review-block">
              <h4>Checklist de prova</h4>
              {reviewCase.evidence ? (
                <>
                  <p className="review-paragraph">{reviewCase.evidence.summary}</p>
                  <details className="draft-preview-markdown">
                    <summary>Ver itens e solicitações</summary>
                    <pre>
                      {JSON.stringify(
                        {
                          items: reviewCase.evidence.items,
                          requiredInformationRequests: reviewCase.evidence.requiredInformationRequests
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </>
              ) : (
                <p className="review-empty-state">Nenhum checklist de prova consolidado.</p>
              )}
            </div>
          </section>

          {reviewCase.score ? (
            <ScoreReviewActions
              caseId={caseId}
              currentLegalStatus={reviewCase.legalStatus}
              defaultDecision={reviewCase.score.decision}
              defaultNote={reviewCase.score.reviewNote ?? ""}
              defaultReviewerId={reviewCase.score.reviewedBy ?? reviewerIdDefault}
            />
          ) : null}
        </div>

        <Link className="button-ghost inline-action legal-review-back-link" href="/painel-executivo">
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
