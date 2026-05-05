import { SiteHeader } from "../../src/components/brand/site-header";
import { LegalBriefForm } from "../../src/components/intake/legal-brief-form";
import { PublicLegalBriefAccessRefreshButton } from "../../src/components/intake/public-legal-brief-access-refresh-button";
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
  const isReady = legalBriefAccess.status === "ready";

  return (
    <main className="brand-shell">
      <SiteHeader />

      <section className="thanks-panel">
        <p className="section-eyebrow">Etapa 2 de 2</p>
        <h1>Formulario de parametros da peca</h1>
        <p>
          Liberado apos a analise humana, este formulario organiza os dados objetivos do caso para
          revisao e adaptacao da peca civil ou de saude. O modelo serve apenas como parametro e
          continua sujeito a validacao humana.
        </p>

        {!isReady ? (
          <>
            <div className="thanks-meta">
              <p>
                {legalBriefAccess.message ??
                  "A proxima etapa ainda nao foi liberada pela validacao humana."}
              </p>
              <p>
                A liberacao e manual. Quando o humano aprovar no dashboard, recarregue a pagina
                para abrir o formulario.
              </p>
            </div>

            <PublicLegalBriefAccessRefreshButton />
          </>
        ) : (
          <LegalBriefForm caseId={caseId} workflowJobId={workflowJobId} />
        )}
      </section>
    </main>
  );
}
