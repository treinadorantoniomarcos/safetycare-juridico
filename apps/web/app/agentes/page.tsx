import { SiteHeader } from "../../src/components/brand/site-header";
import { AgentsLiveView } from "../../src/components/agents/agents-live-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AgentesPageProps = {
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

export default async function AgentesPage({ searchParams }: AgentesPageProps) {
  const params = await searchParams;
  const caseId = readSingleParam(params.caseId);
  const workflowJobId = readSingleParam(params.workflowJobId);

  return (
    <main className="brand-shell">
      <SiteHeader current="agentes" />
      <AgentsLiveView initialCaseId={caseId} initialWorkflowJobId={workflowJobId} />
    </main>
  );
}
