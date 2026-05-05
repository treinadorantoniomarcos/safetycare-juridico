import Link from "next/link";
import { SiteHeader } from "../../src/components/brand/site-header";
import { ConversionPixel } from "../../src/components/intake/conversion-pixel";
import { PublicLegalBriefAccessRefreshButton } from "../../src/components/intake/public-legal-brief-access-refresh-button";
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
  const legalBriefAccess = await resolvePublicLegalBriefAccess(caseId, workflowJobId);
  const canOpenLegalBrief = legalBriefAccess.status === "ready";
  const accessMessage =
    legalBriefAccess.status === "ready"
      ? legalBriefAccess.classification.key === "yellow"
        ? "Seu formulario foi liberado com complementacao pelo primeiro score juridico."
        : "Seu formulario foi liberado pelo primeiro score juridico."
      : legalBriefAccess.message;

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

      <section className="thanks-panel">
        <p className="section-eyebrow">Solicitacao recebida</p>
        <h1>Cadastro concluido. Analise dos agentes em andamento.</h1>
        <p>
          Sua jornada foi registrada e agora passa pela analise automatica dos agentes. A proxima
          etapa so sera liberada quando o primeiro score juridico ficar verde ou amarelo.
        </p>

        <p>
          Quando o caso for liberado, voce seguira para o formulario de parametros da peca, onde
          informara a historia, as datas-chave e os pedidos principais.
        </p>

        <div className="thanks-action-row">
          {canOpenLegalBrief ? (
            <Link
              className="button-primary thanks-action thanks-action--ready"
              href={`/completar-caso?caseId=${caseId}&workflowJobId=${workflowJobId}`}
            >
              {legalBriefAccess.classification.key === "yellow"
                ? "Liberado com complementacao"
                : "Liberado o formulario"}
            </Link>
          ) : legalBriefAccess.status === "blocked" ? (
            <button className="button-ghost thanks-action thanks-action--blocked" type="button" disabled>
              Nao cabe acao juridica neste momento
            </button>
          ) : (
            <button className="button-ghost thanks-action thanks-action--blocked" type="button" disabled>
              Aguardando liberacao do formulario
            </button>
          )}
        </div>

        <div className="thanks-meta">
          <p>{accessMessage}</p>
          {!canOpenLegalBrief ? (
            <p>
              A liberacao acontece quando o score dos agentes ficar verde ou amarelo. Se a pagina
              nao atualizar, recarregue manualmente.
            </p>
          ) : null}
        </div>

        {!canOpenLegalBrief ? <PublicLegalBriefAccessRefreshButton /> : null}

        <Link className="button-ghost thanks-action" href="/">
          Voltar para a pagina principal
        </Link>
      </section>
    </main>
  );
}
