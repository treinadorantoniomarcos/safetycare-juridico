import Link from "next/link";

type SiteHeaderProps = {
  current?: "home" | "metodo" | "faq" | "dashboard";
};

function linkClass(active: boolean) {
  return active ? "brand-nav-link brand-nav-link--active" : "brand-nav-link";
}

export function SiteHeader({ current = "home" }: SiteHeaderProps) {
  const dashboardHref =
    current === "dashboard" ? "/painel-executivo" : "https://bright-orbit-nexus.lovable.app";

  return (
    <header className="brand-header">
      <Link href="/" className="brand-mark">
        SAFETYCARE
      </Link>

      <nav className="brand-nav" aria-label="Navegacao principal">
        <Link href="/" className={linkClass(current === "home")}>
          Inicio
        </Link>
        <Link href="/metodo" className={linkClass(current === "metodo")}>
          Metodo
        </Link>
        <Link href="/faq" className={linkClass(current === "faq")}>
          FAQ
        </Link>
        <Link href={dashboardHref} className={linkClass(current === "dashboard")}>
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
