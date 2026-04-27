import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../src/components/brand/site-header";
import { OperationsLiveDashboard } from "../../src/components/dashboard/operations-live-dashboard";
import { getOperationsLiveOverview } from "../../src/features/dashboard/get-operations-live-overview";
import { hasDashboardSessionFromCookieStore } from "../../src/lib/dashboard-auth";

export default async function PainelExecutivoPage() {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  try {
    const overview = await getOperationsLiveOverview();

    return (
      <main className="brand-shell">
        <SiteHeader current="dashboard" />
        <OperationsLiveDashboard initialData={overview} />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "dashboard_unavailable";
    const missingDatabaseUrl = message.includes("Missing required environment variable: DATABASE_URL");

    return (
      <main className="brand-shell">
        <SiteHeader current="dashboard" />
        <section className="panel-section">
          <div className="section-heading">
            <p className="section-eyebrow">Painel Executivo SAFETYCARE</p>
            <h1>Painel indisponivel no momento.</h1>
            <p className="hero-lede">
              {missingDatabaseUrl
                ? "Configure DATABASE_URL para ativar o dashboard com dados reais."
                : "Nao foi possivel carregar os dados do painel agora."}
            </p>
          </div>
        </section>
      </main>
    );
  }
}
