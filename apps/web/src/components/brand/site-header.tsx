import Link from "next/link";

type SiteHeaderProps = {
  current?: "home" | "metodo" | "faq" | "agentes" | "dashboard" | "protect";
};

function linkClass(active: boolean) {
  return active ? "brand-nav-link brand-nav-link--active" : "brand-nav-link";
}

export function SiteHeader({ current = "home" }: SiteHeaderProps) {
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
        <Link href="/agentes" className={linkClass(current === "agentes")}>
          Agentes
        </Link>
        <Link href="/painel-executivo" className={linkClass(current === "dashboard")}>
          Dashboard
        </Link>
        <Link href="/dashboard/protect" className={linkClass(current === "protect")}>
          Protect
        </Link>
      </nav>
    </header>
  );
}
