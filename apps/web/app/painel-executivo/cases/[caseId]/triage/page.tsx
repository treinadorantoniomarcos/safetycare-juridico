import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "../../../../../src/components/brand/site-header";
import { CaseReviewStageNav } from "../../../../../src/components/dashboard/case-review-stage-nav";
import { HumanTriageReviewActions } from "../../../../../src/components/dashboard/human-triage-review-actions";
import { ScoreReviewActions } from "../../../../../src/components/dashboard/score-review-actions";
import { getHumanTriageReviewCase } from "../../../../../src/features/dashboard/get-human-triage-review-case";
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

export default async function HumanTriageReviewPage({ params }: PageProps) {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  const { caseId } = await Promise.resolve(params);
  const reviewCase = await getHumanTriageReviewCase(caseId);

  if (!reviewCase) {
    notFound();
  }

  const reviewerIdDefault = process.env.DASHBOARD_AUTH_USER ?? "painel-executivo";

  return (
    <main className="brand-shell">
      <SiteHeader current="dashboard" />

      <section className="panel-section legal-review-page">
        <div className="section-heading">
          <p className="section-eyebrow">Triagem humana inicial</p>
          <h1>Análise do primeiro formulário</h1>
          <p className="hero-lede">
            Leia a história original, confira os dados enviados e decida se o caso segue para o
            fluxo interno.
          </p>
        </div>

        <CaseReviewStageNav caseId={caseId} activeStage="triage" />

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
                O humano deve conferir a origem do contato, o consentimento e a narrativa antes da
                liberacao.
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
              <p className="section-note">
                Aqui esta o conteudo bruto do primeiro envio, exatamente como chegou ao intake.
              </p>
            </div>

            <div className="review-block">
              <h4>Mensagem original</h4>
              <p className="review-paragraph" style={{ whiteSpace: "pre-wrap" }}>
                {reviewCase.lead.rawMessage}
              </p>
            </div>

            <div className="review-block">
              <h4>Nome informado</h4>
              <p className="review-paragraph">{reviewCase.lead.name ?? reviewCase.client.fullName}</p>
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Metadados</p>
              <h3>Dados de captura e contexto</h3>
            </div>

            <div className="review-block">
              <h4>Metadados da submissao</h4>
              {renderEntries(reviewCase.lead.metadata)}
            </div>

            <div className="review-block">
              <h4>Carimbo de recebimento</h4>
              <p className="review-paragraph">{formatDateTime(reviewCase.lead.receivedAt)}</p>
            </div>
          </section>

          <section className="form-section-card">
            <div className="form-section-head">
              <p className="section-eyebrow">Fluxo</p>
              <h3>Fila da automacao</h3>
            </div>

            {reviewCase.bootstrapJob ? (
              <div className="review-kv-grid">
                <div className="review-kv">
                  <span>Job</span>
                  <strong>{reviewCase.bootstrapJob.jobType}</strong>
                </div>
                <div className="review-kv">
                  <span>Status</span>
                  <strong>{reviewCase.bootstrapJob.status}</strong>
                </div>
                <div className="review-kv">
                  <span>Agendado para</span>
                  <strong>{reviewCase.bootstrapJob.runAfter ?? "agora"}</strong>
                </div>
                <div className="review-kv">
                  <span>Criado em</span>
                  <strong>{formatDateTime(reviewCase.bootstrapJob.createdAt)}</strong>
                </div>
              </div>
            ) : (
              <p className="review-empty-state">Nenhum job de triagem foi localizado para este caso.</p>
            )}
          </section>

          <HumanTriageReviewActions
            caseId={caseId}
            currentLegalStatus={reviewCase.legalStatus}
            defaultReviewerId={reviewerIdDefault}
            layout="inline"
          />

          <ScoreReviewActions
            caseId={caseId}
            currentLegalStatus={reviewCase.legalStatus}
            defaultDecision={reviewCase.score?.decision ?? null}
            defaultNote={reviewCase.score?.reviewNote ?? ""}
            defaultReviewerId={reviewCase.score?.reviewedBy ?? reviewerIdDefault}
            layout="inline"
          />
        </div>

        <Link className="button-ghost inline-action legal-review-back-link" href="/painel-executivo">
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
