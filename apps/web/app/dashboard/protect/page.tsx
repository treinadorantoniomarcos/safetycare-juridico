import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../../src/components/brand/site-header";
import { ProtectDashboard } from "../../../src/components/dashboard/protect-dashboard";
import { getProtectOverview } from "../../../src/features/dashboard/get-protect-overview";
import { hasDashboardSessionFromCookieStore } from "../../../src/lib/dashboard-auth";

export default async function ProtectPage() {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  try {
    const overview = await getProtectOverview();

    return (
      <main className="brand-shell">
        <SiteHeader current="protect" />
        <ProtectDashboard initialData={overview} />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "protect_unavailable";
    const missingDatabaseUrl = message.includes("Missing required environment variable: DATABASE_URL");

    return (
      <main className="brand-shell">
        <SiteHeader current="protect" />
        <section className="panel-section">
          <div className="section-heading">
            <p className="section-eyebrow">Safetycare Protect</p>
            <h1>Dashboard Protect indisponivel no momento.</h1>
            <p className="hero-lede">
              {missingDatabaseUrl
                ? "Configure DATABASE_URL para ativar o modulo Protect com dados reais."
                : "Nao foi possivel carregar os dados do modulo Protect agora."}
            </p>
          </div>
        </section>
      </main>
    );
  }
}
