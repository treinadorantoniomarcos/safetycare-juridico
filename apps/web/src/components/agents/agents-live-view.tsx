"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentsOperationalOverview, CasePhaseItem } from "../../features/dashboard/get-agents-operational-overview";

type AgentsLiveViewProps = {
  initialData: AgentsOperationalOverview;
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

function phaseBadgeClass(status: CasePhaseItem["status"]) {
  switch (status) {
    case "completed":
      return "agent-badge agent-badge--completed";
    case "running":
      return "agent-badge agent-badge--running";
    case "pending":
      return "agent-badge agent-badge--pending";
    case "review_required":
    case "manual":
      return "agent-badge agent-badge--review";
    case "blocked":
    case "error":
      return "agent-badge agent-badge--error";
    default:
      return "agent-badge";
  }
}

function phaseStatusLabel(status: CasePhaseItem["status"]) {
  switch (status) {
    case "completed":
      return "Concluído";
    case "running":
      return "Em execução";
    case "pending":
      return "Pendente";
    case "review_required":
      return "Revisão humana";
    case "manual":
      return "Ação manual";
    case "blocked":
      return "Bloqueado";
    case "error":
      return "Falha";
    default:
      return "Não iniciado";
  }
}

export function AgentsLiveView({ initialData }: AgentsLiveViewProps) {
  const [data, setData] = useState<AgentsOperationalOverview>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline">("online");

  async function refreshOverview() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/agents/overview");
      const payload = (await response.json()) as AgentsOperationalOverview & { error?: string };

      if (!response.ok) {
        setConnectionStatus("offline");
        setError("Não foi possível atualizar a visão de agentes.");
        return;
      }

      setData(payload);
      setConnectionStatus("online");
      setError(null);
    } catch {
      setConnectionStatus("offline");
      setError("Falha de conexão ao atualizar os agentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshOverview();
    }, 12000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const groupedAgents = useMemo(() => {
    const groups = new Map<string, typeof data.agents>();

    for (const agent of data.agents) {
      if (!groups.has(agent.layer)) {
        groups.set(agent.layer, []);
      }
      groups.get(agent.layer)?.push(agent);
    }

    return [...groups.entries()];
  }, [data.agents]);

  return (
    <section className="panel-section">
      <div className="section-heading">
        <p className="section-eyebrow">Inteligência operacional</p>
        <h2>Agentes humanos e IA atuando em todos os casos</h2>
        <p className="hero-lede">
          Métricas consolidadas por caso com atualização automática, sem busca manual de agentes.
          Última atualização: {formatDateTime(data.generatedAt)}.
        </p>
      </div>

      <div className="agents-toolbar">
        <span className={connectionStatus === "online" ? "ops-system-badge" : "ops-system-badge ops-system-badge--warning"}>
          {connectionStatus === "online" ? "Operação online" : "Operação em reconexão"}
        </span>
        <button
          type="button"
          className="button-ghost"
          onClick={() => {
            void refreshOverview();
          }}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Atualizar agora"}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="metric-grid">
        <article className="metric-card">
          <p>Registros de inteligência</p>
          <strong>{data.intelligence.recordsTotal}</strong>
        </article>
        <article className="metric-card">
          <p>Casos com inteligência</p>
          <strong>{data.intelligence.casesWithIntelligence}</strong>
        </article>
        <article className="metric-card">
          <p>Inteligências em 24h</p>
          <strong>{data.intelligence.recordsLast24h}</strong>
        </article>
        <article className="metric-card">
          <p>Ações humanas em 24h</p>
          <strong>{data.intelligence.humanActionsLast24h}</strong>
        </article>
      </section>

      <article className="phase-metric-card">
        <h3>Squads de inteligência mais ativos</h3>
        <div className="protect-list">
          {data.intelligence.topSquads.length > 0 ? (
            data.intelligence.topSquads.map((item) => (
              <p key={item.squadName}>
                {item.squadName}: {item.total} registros
              </p>
            ))
          ) : (
            <p>Sem registros de squad no período.</p>
          )}
        </div>
      </article>

      <article className="orchestrator-panel">
        <div>
          <p className="section-eyebrow">Orquestrador central</p>
          <h3>{data.orchestrator.name}</h3>
        </div>
        <span className={phaseBadgeClass(data.orchestrator.status)}>{phaseStatusLabel(data.orchestrator.status)}</span>
        <p className="orchestrator-flow-label">Fluxo operacional aplicado</p>
        <div className="orchestrator-flow">
          {data.orchestrator.flow.map((step) => (
            <span key={step} className="orchestrator-flow-item">
              {step}
            </span>
          ))}
        </div>
      </article>

      <section className="agents-layer-grid">
        {groupedAgents.map(([layerName, agents]) => (
          <section className="agent-layer" key={layerName}>
            <h3>{layerName}</h3>
            <div className="agent-card-grid">
              {agents.map((agent) => (
                  <article key={agent.key} className="agent-card">
                    <div className="agent-card-head">
                      <p className="agent-name">{agent.name}</p>
                      <span className={phaseBadgeClass(agent.status)}>{phaseStatusLabel(agent.status)}</span>
                    </div>
                    <p>{agent.summary}</p>
                    <p className="requirement-meta">
                      Ultima acao: {agent.lastActionDescription ?? "Sem acao registrada"}
                    </p>
                    <p className="requirement-meta">
                      Latencia media: {agent.latencyMs} ms | Data/hora:{" "}
                      {formatDateTime(agent.lastActionAt ?? agent.lastProcessedAt)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
        ))}
      </section>

      <section className="phase-metrics-grid">
        {data.phases.map((phase) => (
          <article className="phase-metric-card" key={phase.key}>
            <h3>{phase.label}</h3>
            <p className="phase-metric-percent">{phase.completionPercent}% concluído</p>
            <p>Total de casos: {phase.totalCases}</p>
            <p>Concluídos: {phase.completed}</p>
            <p>Em andamento: {phase.inProgress}</p>
            <p>Revisão humana: {phase.reviewRequired}</p>
            <p>Bloqueado/falha: {phase.blockedOrError}</p>
            <p>Não iniciado: {phase.notStarted}</p>
          </article>
        ))}
      </section>

      <section className="agents-cases-grid">
        {data.cases.map((caseItem) => (
          <article className="case-operational-card" key={caseItem.caseId}>
            <div className="case-operational-head">
              <div>
                <p className="section-eyebrow">Caso {caseItem.caseId.slice(0, 8)}...</p>
                <h3>{caseItem.caseType ?? "não classificado"}</h3>
              </div>
              <p className="phase-metric-percent">{caseItem.progressPercent}%</p>
            </div>

            <p className="requirement-meta">
              Prioridade: {caseItem.priority} | Urgência: {caseItem.urgency}
            </p>
            <p className="requirement-meta">
              Comercial: {caseItem.commercialStatus} | Jurídico: {caseItem.legalStatus}
            </p>
            <p className="requirement-meta">Atualizado em {formatDateTime(caseItem.updatedAt)}</p>

            <div className="case-phases-list">
              {caseItem.phases.map((phase) => (
                <div key={`${caseItem.caseId}-${phase.key}`} className="case-phase-item">
                  <div>
                    <span>{phase.label}</span>
                    <p className="requirement-meta">
                      Ultima acao: {phase.lastActionDescription ?? "Sem acao registrada"}
                    </p>
                    <p className="requirement-meta">
                      Data/hora: {formatDateTime(phase.lastActionAt)}
                    </p>
                  </div>
                  <span className={phaseBadgeClass(phase.status)}>{phaseStatusLabel(phase.status)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
