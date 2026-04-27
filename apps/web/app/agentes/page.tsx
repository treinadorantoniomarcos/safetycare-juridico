import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../src/components/brand/site-header";
import { AgentsLiveView } from "../../src/components/agents/agents-live-view";
import { getAgentsOperationalOverview } from "../../src/features/dashboard/get-agents-operational-overview";
import { hasDashboardSessionFromCookieStore } from "../../src/lib/dashboard-auth";

export default async function AgentesPage() {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  try {
    const overview = await getAgentsOperationalOverview();

    return (
      <main className="brand-shell">
        <SiteHeader current="agentes" />
        <AgentsLiveView initialData={overview} />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "agents_unavailable";
    const missingDatabaseUrl = message.includes("Missing required environment variable: DATABASE_URL");

    return (
      <main className="brand-shell">
        <SiteHeader current="agentes" />
        <section className="panel-section">
          <div className="section-heading">
            <p className="section-eyebrow">Painel de agentes</p>
            <h1>Painel indisponível no momento.</h1>
            <p className="hero-lede">
              {missingDatabaseUrl
                ? "Configure DATABASE_URL para ativar a visão operacional automática dos agentes."
                : "Não foi possível carregar os dados operacionais dos agentes agora."}
            </p>
          </div>
        </section>
      </main>
    );
  }
}
