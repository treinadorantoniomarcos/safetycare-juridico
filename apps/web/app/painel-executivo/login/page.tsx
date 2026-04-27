import { SiteHeader } from "../../../src/components/brand/site-header";
import { DashboardLoginForm } from "../../../src/components/dashboard/dashboard-login-form";
import {
  hasDashboardSessionFromCookieStore,
  isDashboardAuthConfigured
} from "../../../src/lib/dashboard-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function PainelExecutivoLoginPage() {
  const cookieStore = await cookies();

  if (hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo");
  }

  const authConfigured = isDashboardAuthConfigured();

  return (
    <main className="brand-shell">
      <SiteHeader />

      <section className="contact-section">
        <p className="section-eyebrow">Acesso restrito</p>
        <h1>Painel Executivo SAFETYCARE</h1>
        <p>
          Informe login e senha para acessar o dashboard com dados de aquisicao, conversao e
          status juridico.
        </p>

        {!authConfigured ? (
          <p className="form-error">
            Ambiente nao configurado para autenticacao. Defina DASHBOARD_AUTH_USER,
            DASHBOARD_AUTH_PASSWORD, DASHBOARD_AUTH_SECRET e DATABASE_URL.
          </p>
        ) : null}

        <DashboardLoginForm />
      </section>
    </main>
  );
}
