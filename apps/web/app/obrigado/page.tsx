import Link from "next/link";
import { SiteHeader } from "../../src/components/brand/site-header";
import { ConversionPixel } from "../../src/components/intake/conversion-pixel";
import { PublicLegalBriefAccessRefreshButton } from "../../src/components/intake/public-legal-brief-access-refresh-button";
import { PublicCaseAccessSync } from "../../src/components/intake/public-case-access-sync";
import {
  buildPublicCaseCompletionHref,
  buildPublicCaseResumeHref,
  createPublicCaseAccessCode
} from "../../src/features/intake/public-case-access-code";
import { resolvePublicLegalBriefAccess } from "../../src/features/intake/public-legal-brief-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ObrigadoPageProps = {
  searchParams: SearchParams;
};

function readSingleParam(value: string | string[] | undefined) {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ObrigadoPage({ searchParams }: ObrigadoPageProps) {
  const params = await searchParams;
  const caseId = readSingleParam(params.caseId);
  const workflowJobId = readSingleParam(params.workflowJobId);
  const source = readSingleParam(params.source);
  const utmSource = readSingleParam(params.utm_source);
  const utmMedium = readSingleParam(params.utm_medium);
  const utmCampaign = readSingleParam(params.utm_campaign);
  const utmContent = readSingleParam(params.utm_content);
  const utmTerm = readSingleParam(params.utm_term);
  const accessCode = caseId && workflowJobId ? createPublicCaseAccessCode(caseId, workflowJobId) : undefined;
  const legalBriefAccess = await resolvePublicLegalBriefAccess(caseId, workflowJobId);
  const canOpenLegalBrief = legalBriefAccess.status === "ready";
  const legalBriefHref = accessCode ? buildPublicCaseCompletionHref(accessCode) : undefined;
  const accessMessage =
    legalBriefAccess.status === "ready"
      ? legalBriefAccess.classification.key === "yellow"
        ? "Seu formulario foi liberado com complementacao pela classificacao amarela da equipe."
        : "Seu formulario foi liberado pela classificacao verde da equipe."
      : legalBriefAccess.message;
  const isAwaitingHumanScore = legalBriefAccess.status === "awaiting_human_score";

  return (
    <main className="brand-shell">
      <SiteHeader />

      <ConversionPixel
        caseId={caseId}
        workflowJobId={workflowJobId}
        source={source}
        utmSource={utmSource}
        utmMedium={utmMedium}
        utmCampaign={utmCampaign}
        utmContent={utmContent}
        utmTerm={utmTerm}
      />
      <PublicCaseAccessSync caseId={caseId} workflowJobId={workflowJobId} />

      <section className="thanks-panel">
        <p className="section-eyebrow">Solicitacao recebida</p>
        <h1>Cadastro concluido. Analise dos agentes em andamento.</h1>
        <p>
          Sua jornada foi registrada e agora passa pela classificacao manual do score. A proxima
          etapa so sera liberada quando a equipe selecionar verde ou amarelo.
        </p>

        <p>
          Quando o caso for liberado, voce seguira para o formulario de parametros da peca, onde
          informara a historia, as datas-chave e os pedidos principais.
        </p>

        <div className="thanks-action-row">
          {canOpenLegalBrief ? (
            <Link
              className="button-primary thanks-action thanks-action--ready"
              href={legalBriefHref ?? "/retomar-caso"}
            >
              {legalBriefAccess.classification.key === "yellow"
                ? "Liberado com complementacao"
                : "Liberado o formulario"}
            </Link>
          ) : legalBriefAccess.status === "blocked" ? (
            <p className="thanks-status-note thanks-status-note--blocked">
              Nao cabe acao juridica neste momento
            </p>
          ) : (
            <p className="thanks-status-note thanks-status-note--blocked">
              {isAwaitingHumanScore
                ? "Aguardando classificacao manual do score"
                : "Aguardando liberacao do formulario"}
            </p>
          )}
        </div>

        <div className="thanks-meta">
          <p>{accessMessage}</p>
          {accessCode ? (
            <p>
              Codigo de acesso: <strong>{accessCode}</strong>
            </p>
          ) : null}
          {!canOpenLegalBrief ? (
            <p>
              A liberacao acontece quando a equipe classificar o score manualmente em verde ou amarelo. Se
              fechar a pagina, voce pode retomar pelo menu "Retomar caso". Se a pagina nao
              atualizar, recarregue manualmente.
            </p>
          ) : null}
        </div>

        {!canOpenLegalBrief ? <PublicLegalBriefAccessRefreshButton /> : null}

        <Link className="button-ghost thanks-action" href="/">
          Voltar para a pagina principal
        </Link>
        <Link className="button-ghost thanks-action" href={accessCode ? buildPublicCaseResumeHref(accessCode) : "/retomar-caso"}>
          Retomar caso
        </Link>
      </section>
    </main>
  );
}
