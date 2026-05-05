import { SiteHeader } from "../../src/components/brand/site-header";
import { LegalBriefForm } from "../../src/components/intake/legal-brief-form";
import { PublicCaseAccessSync } from "../../src/components/intake/public-case-access-sync";
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
      <PublicCaseAccessSync caseId={caseId} workflowJobId={workflowJobId} />

      <section className="thanks-panel">
        <p className="section-eyebrow">Etapa 2 de 2</p>
        <h1>Formulario de parametros da peca</h1>
        <p>
          Liberado apos a analise dos agentes e o primeiro score juridico, este formulario organiza
          os dados objetivos do caso para revisao e adaptacao da peca civil ou de saude. O modelo
          serve apenas como parametro e continua sujeito a validacao humana.
        </p>

        {!isReady ? (
          <>
            <div className="thanks-meta">
              <p>
                {legalBriefAccess.message ??
                  "A proxima etapa ainda nao foi liberada pelo primeiro score juridico."}
              </p>
              <p>
                A liberacao acontece quando o score dos agentes ficar verde ou amarelo. Se fechar a
                pagina, voce pode retomar pelo menu "Retomar caso". Se a pagina nao atualizar,
                recarregue manualmente.
              </p>
            </div>

            <PublicLegalBriefAccessRefreshButton />
          </>
        ) : (
          <>
            {legalBriefAccess.classification.key === "yellow" ? (
              <div className="thanks-meta">
                <p>
                  Score amarelo: o formulario foi liberado, mas a equipe pode pedir
                  complementacoes antes da minuta final.
                </p>
              </div>
            ) : null}

            <LegalBriefForm caseId={caseId} workflowJobId={workflowJobId} />
          </>
        )}
      </section>
    </main>
  );
}
