import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../../src/components/brand/site-header";
import { LegalArtifactsHub } from "../../../src/components/dashboard/legal-artifacts-hub";
import { getLegalArtifactsHubOverview } from "../../../src/features/dashboard/get-legal-artifacts-hub-overview";
import { hasDashboardSessionFromCookieStore } from "../../../src/lib/dashboard-auth";

export default async function LegalArtifactsPage() {
  const cookieStore = await cookies();

  if (!hasDashboardSessionFromCookieStore(cookieStore)) {
    redirect("/painel-executivo/login");
  }

  const overview = await getLegalArtifactsHubOverview();

  return (
    <main className="brand-shell">
      <SiteHeader current="artifacts" />
      <LegalArtifactsHub initialData={overview} />
    </main>
  );
}
