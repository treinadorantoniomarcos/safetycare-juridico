import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../../../../src/components/brand/site-header";
import { CaseReviewStageNav } from "../../../../src/components/dashboard/case-review-stage-nav";
import { LegalArtifactEditor } from "../../../../src/components/dashboard/legal-artifact-editor";
import { LegalBriefReviewActions } from "../../../../src/components/dashboard/legal-brief-review-actions";
import { hasDashboardSessionFromCookieStore } from "../../../../src/lib/dashboard-auth";
import { getLegalBriefReviewCase } from "../../../../src/features/dashboard/get-legal-brief-review-case";

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

function formatProblemType(value: string) {
  const labels: Record<string, string> = {
    atendimento: "Atendimento",
    plano: "Plano de saude",
    hospital: "Hospital",
    medico: "Medico",
    clinica: "Clinica",
    medicamento: "Medicamento",
    cirurgia: "Cirurgia",
    uti: "UTI",
    reembolso: "Reembolso",
    outro: "Outro"
  };

  return labels[value] ?? value;
}

function renderList(items: string[]) {
  if (items.length === 0) {
    return <p className="review-empty-state">Nenhum item informado.</p>;
  }

  return (
    <ul className="review-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function renderKeyDates(items: Array<{ label: string; date: string }>) {
  if (items.length === 0) {
    return <p className="review-empty-state">Nenhuma data-chave informada.</p>;
  }

  return (
    <ul className="review-list">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <strong>{item.label}</strong> - {item.date}
        </li>
      ))}
    </ul>
  );
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isPreviewableImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isPdfDocument(mimeType: string) {
  return mimeType === "application/pdf";
}

function renderUploadedDocuments(
  documents: Array<{
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
    uploadedAt: string;
  }>
) {
  if (documents.length === 0) {
    return <p className="review-empty-state">Nenhum arquivo real foi enviado.</p>;
  }

  return (
    <div className="review-attachment-grid">
      {documents.map((document) => (
        <article key={`${document.name}-${document.uploadedAt}`} className="review-attachment-card">
          <div className="review-attachment-card__head">
            <div>
              <h4>{document.name}</h4>
              <p className="section-note">
                {document.mimeType} | {formatFileSize(document.size)} | enviado em{" "}
                {formatDateTime(document.uploadedAt)}
              </p>
            </div>
          </div>

          <div className="review-attachment-preview">
            {isPreviewableImage(document.mimeType) ? (
              <img src={document.dataUrl} alt={document.name} />
            ) : isPdfDocument(document.mimeType) ? (
              <iframe title={document.name} src={document.dataUrl} />
            ) : (
              <div className="review-attachment-fallback">
                <p>Pré-visualização nativa indisponível para este formato.</p>
              </div>
            )}
          </div>

          <div className="review-download-row">
            <a className="button-ghost inline-action" href={document.dataUrl} download={document.name}>
              Baixar arquivo
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function LegalBriefReviewPage({ params }: PageProps) {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  const { caseId } = await Promise.resolve(params);
  const reviewCase = await getLegalBriefReviewCase(caseId);

  if (!reviewCase) {
    notFound();
  }

  const submission = reviewCase.submission;
  const draft = reviewCase.draft;
  const supportingDocumentPack = reviewCase.supportingDocumentPack;
  const reviewerIdDefault = process.env.DASHBOARD_AUTH_USER ?? "painel-executivo";

  return (
    <main className="brand-shell">
      <SiteHeader current="dashboard" />

      <section className="panel-section legal-review-page">
        <div className="section-heading">
          <p className="section-eyebrow">Decisão humana</p>
          <h1>Liberação ou bloqueio da etapa 2</h1>
          <p className="hero-lede">
            Abra a história, os anexos e a minuta preliminar. A liberação aciona os agentes para
            gerar a peça jurídica, a procuração e o contrato. O bloqueio mantém o caso em
            revisão.
          </p>
        </div>

        <CaseReviewStageNav caseId={caseId} activeStage="legal" />

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

        {!submission ? (
          <section className="form-section-card">
            <p className="completion-status">
              A etapa 2 ainda nao foi enviada para este caso. A equipe humana nao encontra texto
              consolidado para revisar.
            </p>
          </section>
        ) : (
          <div className="legal-review-grid">
            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Dados principais</p>
                <h3>Identificacao e contexto</h3>
                <p className="section-note">
                  O humano deve conferir a narrativa, a linha do tempo, os dados do solicitante e
                  a consistencia dos pedidos antes da liberacao.
                </p>
              </div>

              <div className="review-kv-grid">
                <div className="review-kv">
                  <span>Paciente</span>
                  <strong>{submission.patientFullName}</strong>
                </div>
                <div className="review-kv">
                  <span>CPF</span>
                  <strong>{submission.patientCpf}</strong>
                </div>
                <div className="review-kv">
                  <span>Cidade</span>
                  <strong>{submission.city}</strong>
                </div>
                <div className="review-kv">
                  <span>Contato</span>
                  <strong>{submission.contact}</strong>
                </div>
                <div className="review-kv">
                  <span>Relacao</span>
                  <strong>{submission.relationToPatient}</strong>
                </div>
                <div className="review-kv">
                  <span>Tipo de problema</span>
                  <strong>{formatProblemType(submission.problemType)}</strong>
                </div>
                <div className="review-kv">
                  <span>Urgencia</span>
                  <strong>{submission.currentUrgency}</strong>
                </div>
              </div>

              <div className="review-block">
                <h4>Dados adicionais do paciente</h4>
                <div className="review-kv-grid">
                  <div className="review-kv">
                    <span>Endereço</span>
                    <strong>{submission.patientAddress}</strong>
                  </div>
                  <div className="review-kv">
                    <span>RG</span>
                    <strong>{submission.patientRg}</strong>
                  </div>
                  <div className="review-kv">
                    <span>WhatsApp</span>
                    <strong>{submission.patientWhatsapp}</strong>
                  </div>
                  <div className="review-kv">
                    <span>E-mail</span>
                    <strong>{submission.patientEmail}</strong>
                  </div>
                </div>
              </div>

              <div className="review-block">
                <h4>Dados de quem está preenchendo</h4>
                <div className="review-kv-grid">
                  <div className="review-kv">
                    <span>Nome completo</span>
                    <strong>{submission.contactFullName}</strong>
                  </div>
                  <div className="review-kv">
                    <span>CPF</span>
                    <strong>{submission.contactCpf}</strong>
                  </div>
                  <div className="review-kv">
                    <span>RG</span>
                    <strong>{submission.contactRg}</strong>
                  </div>
                  <div className="review-kv">
                    <span>E-mail</span>
                    <strong>{submission.contactEmail}</strong>
                  </div>
                  <div className="review-kv">
                    <span>WhatsApp</span>
                    <strong>{submission.contactWhatsapp}</strong>
                  </div>
                  <div className="review-kv">
                    <span>Endereço</span>
                    <strong>{submission.contactAddress}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Linha do tempo</p>
                <h3>Datas-chave e narrativa objetiva</h3>
              </div>

              <div className="review-block">
                <h4>Datas-chave</h4>
                {renderKeyDates(submission.keyDates)}
              </div>

              <div className="review-block">
                <h4>Descricao objetiva da conduta</h4>
                <p className="review-paragraph">{submission.objectiveDescription}</p>
              </div>

              <div className="review-block">
                <h4>Prejuizos materiais</h4>
                <p className="review-paragraph">{submission.materialLosses}</p>
              </div>

              <div className="review-block">
                <h4>Impacto moral e assistencial</h4>
                <p className="review-paragraph">{submission.moralImpact}</p>
              </div>
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Provas informadas</p>
                <h3>Documentos anexos e testemunhas</h3>
              </div>

              <div className="review-block">
                <h4>Documentos anexos</h4>
                {renderList(submission.documentsAttached)}
              </div>

              <div className="review-block">
                <h4>Arquivos enviados</h4>
                {renderUploadedDocuments(submission.uploadedDocuments)}
              </div>

              <div className="review-block">
                <h4>Testemunhas</h4>
                {renderList(submission.witnesses)}
              </div>
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Pedidos</p>
                <h3>Pedido principal e subsidiario</h3>
              </div>

              <div className="review-block">
                <h4>Pedido principal</h4>
                <p className="review-paragraph">{submission.mainRequest}</p>
              </div>

              <div className="review-block">
                <h4>Pedido subsidiario</h4>
                <p className="review-paragraph">{submission.subsidiaryRequest}</p>
              </div>
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Minuta preliminar</p>
                <h3>Texto que os agentes vao transformar</h3>
              </div>

              {draft ? (
                <>
                  <p className="draft-preview-summary">{draft.summary}</p>
                  <div className="draft-preview-sections">
                    {draft.sections.map((section) => (
                      <article key={section.key} className="draft-preview-section">
                        <h4>{section.title}</h4>
                        <p>{section.body}</p>
                      </article>
                    ))}
                  </div>

                  <details className="draft-preview-markdown">
                    <summary>Ver texto integral em Markdown</summary>
                    <pre>{draft.markdown}</pre>
                  </details>
                </>
              ) : (
                <p className="review-empty-state">Nenhuma minuta conseguiu ser montada.</p>
              )}
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Modelos complementares</p>
                <h3>Procuração e contrato</h3>
              </div>

              {supportingDocumentPack ? (
                <div className="supporting-documents-grid">
                  {supportingDocumentPack.documents.map((document) => (
                    <article key={document.key} className="supporting-document-item">
                      <div className="supporting-document-head">
                        <p className="section-eyebrow">
                          {document.type === "power_of_attorney" ? "Procuração" : "Contrato"}
                        </p>
                        <h4>{document.title}</h4>
                        <p className="section-note">{document.subtitle}</p>
                      </div>

                      <p className="supporting-document-summary">{document.summary}</p>

                      <div className="supporting-document-placeholders">
                        <h5>Campos ainda para preencher</h5>
                        {renderList(document.placeholders)}
                      </div>

                      <div className="supporting-document-notes">
                        <h5>Notas de revisão</h5>
                        {renderList(document.reviewNotes)}
                      </div>

                      <details className="draft-preview-markdown supporting-document-markdown">
                        <summary>Ver minuta completa</summary>
                        <pre>{document.markdown}</pre>
                      </details>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="review-empty-state">Nenhum modelo complementar conseguiu ser montado.</p>
              )}
            </section>

            <LegalArtifactEditor caseId={caseId} artifacts={reviewCase.artifacts} />

            <section className="form-section-card">
              <div className="form-section-head">
                <p className="section-eyebrow">Artefatos gerados</p>
                <h3>Versões já gravadas no banco</h3>
              </div>

              {reviewCase.artifacts.length > 0 ? (
                <div className="review-artifact-list">
                  {reviewCase.artifacts.map((artifact) => (
                    <article key={`${artifact.artifactType}-${artifact.versionNumber}`} className="review-artifact-item">
                      <p className="section-eyebrow">
                        {artifact.artifactType} | Versao {artifact.versionNumber} | {artifact.status}
                      </p>
                      <h4>{artifact.title}</h4>
                      <p className="section-note">{artifact.subtitle}</p>
                      <p className="review-paragraph">{artifact.summary}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="review-empty-state">
                  Ainda nao ha artefatos gravados. A aprovacao humana vai disparar a geracao final.
                </p>
              )}

              {reviewCase.artifacts.length > 0 ? (
                <div className="review-download-row">
                  <a
                    className="button-ghost inline-action"
                    href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=doc`}
                  >
                    Baixar DOC
                  </a>
                  <a
                    className="button-ghost inline-action"
                    href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=pdf`}
                  >
                    Baixar PDF
                  </a>
                  <a
                    className="button-ghost inline-action"
                    href={`/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=docx`}
                  >
                    Baixar DOCX
                  </a>
                </div>
              ) : null}
            </section>

            <LegalBriefReviewActions
              caseId={caseId}
              currentLegalStatus={reviewCase.legalStatus}
              defaultReviewerId={reviewerIdDefault}
              publicAccessJobId={reviewCase.publicAccessJob?.id ?? null}
            />
          </div>
        )}

        <Link className="button-ghost inline-action legal-review-back-link" href="/painel-executivo">
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
