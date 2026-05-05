import Link from "next/link";
import { SiteHeader } from "../../src/components/brand/site-header";
import { LegalBriefForm } from "../../src/components/intake/legal-brief-form";
import { PublicLegalBriefAccessRefreshButton } from "../../src/components/intake/public-legal-brief-access-refresh-button";
import { PublicLegalBriefAccessPoller } from "../../src/components/intake/public-legal-brief-access-poller";
import { resolvePublicLegalBriefAccess } from "../../src/features/intake/public-legal-brief-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CompletarCasoPageProps = {
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

export default async function CompletarCasoPage({ searchParams }: CompletarCasoPageProps) {
  const params = await searchParams;
  const caseId = readSingleParam(params.caseId);
  const workflowJobId = readSingleParam(params.workflowJobId);
  const legalBriefAccess = await resolvePublicLegalBriefAccess(caseId, workflowJobId);

  if (legalBriefAccess.status !== "ready") {
    return (
      <main className="brand-shell">
        <SiteHeader />

        <section className="thanks-panel">
          <p className="section-eyebrow">Etapa 2 de 2</p>
          <h1>Formulário de parâmetros da peça</h1>
          <p>
            Liberado após a análise humana, este formulário organiza os dados objetivos do caso
            para revisão e adaptação da peça civil ou de saúde. O modelo serve apenas como
            parâmetro e continua sujeito à validação humana.
          </p>

          <div className="thanks-meta">
            <p>
              {legalBriefAccess.message ??
                "A próxima etapa ainda não foi liberada pela validação humana."}
            </p>
            <p>
              A página é atualizada automaticamente. Se a liberação não aparecer em alguns
              segundos, atualize a página manualmente.
            </p>
          </div>

          <PublicLegalBriefAccessPoller enabled={true} />
          <PublicLegalBriefAccessRefreshButton />

          <Link className="button-ghost thanks-action" href="/obrigado">
            Voltar para a confirmação
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="brand-shell">
      <SiteHeader />

      <section className="thanks-panel">
        <p className="section-eyebrow">Etapa 2 de 2</p>
        <h1>Formulário de parâmetros da peça</h1>
        <p>
          Liberado após a análise humana, este formulário organiza os dados objetivos do caso para
          revisão e adaptação da peça civil ou de saúde. O modelo serve apenas como parâmetro e
          continua sujeito à validação humana.
        </p>
        <LegalBriefForm caseId={caseId} workflowJobId={workflowJobId} />
      </section>
    </main>
  );
}
