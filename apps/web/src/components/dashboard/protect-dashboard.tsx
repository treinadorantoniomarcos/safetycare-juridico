"use client";

import type { ProtectOverview } from "../../features/dashboard/get-protect-overview";

type ProtectDashboardProps = {
  initialData: ProtectOverview;
};

export function ProtectDashboard({ initialData }: ProtectDashboardProps) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <p className="section-eyebrow">Modulo Protect</p>
        <h1>Modulo removido</h1>
        <p className="hero-lede">{initialData.message}</p>
      </div>
    </section>
  );
}
