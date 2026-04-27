"use client";

import { useEffect, useState } from "react";
import { DashboardLogoutButton } from "./dashboard-logout-button";
import type { OperationsLiveOverview } from "../../features/dashboard/get-operations-live-overview";

type OperationsLiveDashboardProps = {
  initialData: OperationsLiveOverview;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "sem registro";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "sem registro";
  }

  return parsed.toLocaleString("pt-BR", { hour12: false });
}

export function OperationsLiveDashboard({ initialData }: OperationsLiveDashboardProps) {
  const [data, setData] = useState<OperationsLiveOverview>(initialData);
  const [liveClock, setLiveClock] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "online" | "offline">(
    "connecting"
  );

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setLiveClock(new Date());
    }, 1000);

    return () => {
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const source = new EventSource("/api/dashboard/operations-live/stream");

    source.onopen = () => {
      if (!active) {
        return;
      }

      setConnectionStatus("online");
      setError(null);
    };

    source.addEventListener("operations_live", (event) => {
      if (!active) {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as OperationsLiveOverview;
        setData(payload);
        setConnectionStatus("online");
        setError(null);
      } catch {
        setConnectionStatus("offline");
        setError("Falha ao processar atualizacao em tempo real.");
      }
    });

    source.addEventListener("operations_error", () => {
      if (!active) {
        return;
      }

      setConnectionStatus("offline");
      setError("Atualizacao em tempo real indisponivel no momento.");
    });

    source.onerror = () => {
      if (!active) {
        return;
      }

      setConnectionStatus("offline");
      setError("Conexao em tempo real instavel. Tentando reconectar...");
    };

    return () => {
      active = false;
      source.close();
    };
  }, []);

  const generatedAt = formatDateTime(data.generatedAt);
  const liveClockLabel = liveClock.toLocaleTimeString("pt-BR", { hour12: false });
  const systemBadgeLabel =
    connectionStatus === "online" && data.systemOnline ? "Sistema Online" : "Sistema em reconexao";
  const systemBadgeClassName =
    connectionStatus === "online" && data.systemOnline
      ? "ops-system-badge"
      : "ops-system-badge ops-system-badge--warning";

  return (
    <section className="ops-dashboard">
      <header className="ops-header">
        <div>
          <p className="section-eyebrow">Painel Executivo - SAFETYCARE</p>
          <h1>Futuros clientes com informacoes enviadas</h1>
          <p className="hero-lede">Atualizado em {generatedAt}</p>
        </div>

        <div className="ops-header-right">
          <p className="ops-clock">{liveClockLabel}</p>
          <span className={systemBadgeClassName}>{systemBadgeLabel}</span>
          <DashboardLogoutButton />
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="ops-kpi-grid">
        <article className="ops-kpi-card">
          <p>Dados enviados hoje</p>
          <strong>{data.kpis.leadsHoje}</strong>
        </article>
        <article className="ops-kpi-card">
          <p>Em triagem</p>
          <strong>{data.kpis.casosEmTriagem}</strong>
        </article>
        <article className="ops-kpi-card">
          <p>Score juridico medio</p>
          <strong>{data.kpis.scoreJuridicoMedio}</strong>
        </article>
        <article className="ops-kpi-card">
          <p>Conversao</p>
          <strong>{data.kpis.conversaoPercentual}%</strong>
        </article>
        <article className="ops-kpi-card">
          <p>SLA</p>
          <strong>{data.kpis.slaConformidadePercentual}%</strong>
        </article>
      </section>

      <section className="ops-main-grid">
        <section className="ops-agents-column">
          <article className="ops-layer-card">
            <h3>Clientes aptos para continuidade</h3>
            <p>Total: {data.futureClients.total}</p>
            <div className="ops-list">
              {data.futureClients.items.length > 0 ? (
                data.futureClients.items.map((item) => (
                  <p key={item.caseId}>
                    {item.fullName} | {item.legalStatus} | envio: {formatDateTime(item.submittedAt)}
                  </p>
                ))
              ) : (
                <p>Nenhum cliente com complementacao enviada no momento.</p>
              )}
            </div>
          </article>
        </section>

        <aside className="ops-right-column">
          <article className="ops-right-card">
            <h3>Fila ao vivo</h3>
            <p>Total: {data.queue.total}</p>
            <div className="ops-list">
              {data.queue.items.length > 0 ? (
                data.queue.items.map((item) => (
                  <p key={item.caseId}>
                    {item.caseId.slice(0, 8)}... | {item.legalStatus}
                  </p>
                ))
              ) : (
                <p>Sem casos em fila agora.</p>
              )}
            </div>
          </article>

          <article className="ops-right-card">
            <h3>Alertas criticos</h3>
            <p>Total: {data.alerts.total}</p>
            <div className="ops-list">
              {data.alerts.items.length > 0 ? (
                data.alerts.items.map((item) => (
                  <p key={`${item.caseId}-${item.legalStatus}`}>
                    {item.caseId.slice(0, 8)}... | {item.legalStatus} | {item.ageMinutes} min
                  </p>
                ))
              ) : (
                <p>Nenhum alerta critico no momento.</p>
              )}
            </div>
          </article>
        </aside>
      </section>

      <footer className="ops-footer">
        Atualizacao push em tempo real via SSE | conexao: {connectionStatus}
      </footer>
    </section>
  );
}
