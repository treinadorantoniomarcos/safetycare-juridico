import { SiteHeader } from "../../src/components/brand/site-header";
import { PublicCaseResumePanel } from "../../src/components/intake/public-case-resume-panel";

export default function RetomarCasoPage() {
  return (
    <main className="brand-shell">
      <SiteHeader current="resume" />
      <PublicCaseResumePanel />
    </main>
  );
}
