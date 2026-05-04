import { SiteHeader } from "../../src/components/brand/site-header";
import { LegalBriefForm } from "../../src/components/intake/legal-brief-form";

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
