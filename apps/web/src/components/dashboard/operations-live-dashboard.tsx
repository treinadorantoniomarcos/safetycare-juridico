"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLogoutButton } from "./dashboard-logout-button";
import type {
  AgentCardOverview,
  ConversionByHourItem,
  OperationsLiveOverview
} from "../../features/dashboard/get-operations-live-overview";

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

function statusClassName(status: AgentCardOverview["status"]) {
  switch (status) {
    case "online":
      return "ops-agent-badge ops-agent-badge--online";
    case "revisao":
      return "ops-agent-badge ops-agent-badge--review";
    case "fila":
      return "ops-agent-badge ops-agent-badge--queue";
    case "bloqueado":
      return "ops-agent-badge ops-agent-badge--blocked";
    case "erro":
      return "ops-agent-badge ops-agent-badge--error";
    default:
      return "ops-agent-badge ops-agent-badge--idle";
  }
}

function normalizePercentualToHeight(percentual: number) {
  const safe = Number.isFinite(percentual) ? percentual : 0;
  return `${Math.max(8, Math.min(100, safe))}%`;
}

function splitByLayer(agents: AgentCardOverview[]) {
  const grouped = new Map<string, AgentCardOverview[]>();

  for (const agent of agents) {
    if (!grouped.has(agent.layer)) {
      grouped.set(agent.layer, []);
    }

    grouped.get(agent.layer)?.push(agent);
  }

  return [...grouped.entries()];
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

  const layeredAgents = useMemo(() => splitByLayer(data.agents), [data.agents]);
  const chartData = useMemo(() => data.conversionByHour.slice(-12), [data.conversionByHour]);
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
          <p className="section-eyebrow">Painel Operacional de Agentes - SAFETYCARE</p>
          <h1>Funcionamento online da operacao juridica em saude</h1>
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
          <p>Leads Hoje</p>
          <strong>{data.kpis.leadsHoje}</strong>
        </article>
        <article className="ops-kpi-card">
          <p>Casos em Triagem</p>
          <strong>{data.kpis.casosEmTriagem}</strong>
        </article>
        <article className="ops-kpi-card">
          <p>Score Juridico Medio</p>
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
        <aside className="ops-orchestrator-card">
          <div className="ops-orchestrator-head">
            <p className="section-eyebrow">Orquestrador Central</p>
            <span className={statusClassName(data.orchestrator.status)}>
              {data.orchestrator.status === "online" ? "Online" : "Supervisionando"}
            </span>
          </div>
          <h2>{data.orchestrator.name}</h2>
          <div className="ops-flow-list">
            {data.orchestrator.flow.map((step) => (
              <div key={step} className="ops-flow-item">
                <span>{step}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="ops-agents-column">
          {layeredAgents.map(([layer, agents]) => (
            <article key={layer} className="ops-layer-card">
              <h3>{layer}</h3>
              <div className="ops-agent-grid">
                {agents.map((agent) => (
                  <article key={agent.key} className="ops-agent-card">
                    <div className="ops-agent-head">
                      <p className="ops-agent-name">{agent.name}</p>
                      <span className={statusClassName(agent.status)}>{agent.statusLabel}</span>
                    </div>
                    <p>{agent.summary}</p>
                    <p className="ops-agent-meta">
                      Latencia media: {agent.latencyMs} ms | Ultimo processamento:{" "}
                      {formatDateTime(agent.lastProcessedAt)}
                    </p>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="ops-right-column">
          <article className="ops-right-card">
            <h3>Fila ao Vivo</h3>
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
            <h3>Alertas Criticos</h3>
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

          <article className="ops-right-card">
            <h3>Casos por Modulo</h3>
            <div className="ops-list">
              {data.modules.map((item) => (
                <p key={item.module}>
                  {item.module}: {item.total}
                </p>
              ))}
            </div>
          </article>

          <article className="ops-right-card">
            <h3>Conversao por Hora</h3>
            <div className="ops-chart">
              {chartData.map((point: ConversionByHourItem) => (
                <div key={point.hour} className="ops-chart-bar-wrap">
                  <div
                    className="ops-chart-bar"
                    style={{ height: normalizePercentualToHeight(point.percentual) }}
                    title={`${point.hour} - ${point.percentual}%`}
                  />
                  <span>{point.hour}</span>
                </div>
              ))}
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
