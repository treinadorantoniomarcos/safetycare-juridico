import { SiteHeader } from "../../src/components/brand/site-header";
import { LegalBriefForm } from "../../src/components/intake/legal-brief-form";
import { PublicCaseAccessSync } from "../../src/components/intake/public-case-access-sync";
import { PublicLegalBriefAccessRefreshButton } from "../../src/components/intake/public-legal-brief-access-refresh-button";
import { parsePublicCaseAccessCode } from "../../src/features/intake/public-case-access-code";
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
  const accessCode = readSingleParam(params.accessCode);
  const parsedAccessCode = parsePublicCaseAccessCode(accessCode);
  const accessCodeProvided = Boolean(accessCode?.trim());
  const caseId = parsedAccessCode?.caseId ?? readSingleParam(params.caseId);
  const workflowJobId = parsedAccessCode?.workflowJobId ?? readSingleParam(params.workflowJobId);
  const legalBriefAccess =
    accessCodeProvided && !parsedAccessCode
      ? {
          status: "invalid_case_access" as const,
          message: "Codigo de acesso invalido. Volte em Retomar caso para gerar um novo link."
        }
      : await resolvePublicLegalBriefAccess(caseId, workflowJobId);
  const isReady = legalBriefAccess.status === "ready";

  return (
    <main className="brand-shell">
      <SiteHeader />
      <PublicCaseAccessSync caseId={caseId} workflowJobId={workflowJobId} />

      <section className="thanks-panel">
        <p className="section-eyebrow">Etapa 2 de 2</p>
        <h1>Formulario de parametros da peca</h1>
        <p>
          Liberado apos a classificacao manual do score em verde ou amarelo, este formulario
          organiza os dados objetivos do caso para revisao e adaptacao da peca civil ou de saude.
          O modelo serve apenas como parametro e continua sujeito a validacao humana.
        </p>

        {!isReady ? (
          <>
            <div className="thanks-meta">
              <p>
                {legalBriefAccess.message ??
                  "A proxima etapa ainda nao foi liberada pela classificacao humana do score."}
              </p>
              {accessCodeProvided ? (
                <p>
                  Se voce recebeu um codigo, confira se ele foi copiado por completo. O link
                  correto tambem pode ser reenviado pela equipe.
                </p>
              ) : null}
              <p>
                A liberacao acontece quando a equipe classificar o score manualmente em verde ou
                amarelo. Se
                fechar a pagina, voce pode retomar pelo menu "Retomar caso". Se a pagina nao
                atualizar, recarregue manualmente.
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
