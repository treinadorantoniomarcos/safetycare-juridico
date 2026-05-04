import Link from "next/link";
import { SiteHeader } from "../../src/components/brand/site-header";
import { ConversionPixel } from "../../src/components/intake/conversion-pixel";

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
        <h1>Cadastro concluído. Triagem humana em andamento.</h1>
        <p>
          Sua jornada foi registrada e agora passa por validação humana inicial. A próxima etapa
          só será liberada após essa aprovação.
        </p>

        <p>
          Quando o caso for liberado, você seguirá para o formulário de parâmetros da peça, onde
          informará a história, as datas-chave e os pedidos principais.
        </p>

        {caseId && workflowJobId ? (
          <Link
            className="button-primary thanks-action"
            href={`/completar-caso?caseId=${caseId}&workflowJobId=${workflowJobId}`}
          >
            Abrir formulário de parâmetros
          </Link>
        ) : null}

        <Link className="button-ghost thanks-action" href="/">
          Voltar para a pagina principal
        </Link>
      </section>
    </main>
  );
}
