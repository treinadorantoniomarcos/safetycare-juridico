import { SiteHeader } from "../../src/components/brand/site-header";
import { CaseCompletionForm } from "../../src/components/intake/case-completion-form";

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
        <h1>Complementação de informações</h1>
        <p>
          Preencha os dados abaixo para continuar a avaliação inicial do seu atendimento.
        </p>
        <CaseCompletionForm caseId={caseId} workflowJobId={workflowJobId} />
      </section>
    </main>
  );
}
