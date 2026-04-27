"use client";

import { FormEvent, useMemo, useState } from "react";

type AgentStatus =
  | "not_started"
  | "pending"
  | "running"
  | "blocked"
  | "completed"
  | "review_required"
  | "manual"
  | "error";

type AgentSnapshot = {
  key: string;
  layer: string;
  name: string;
  status: AgentStatus;
  summary: string;
};

type AgentsApiResponse = {
  orchestrator: {
    name: string;
    status: AgentStatus;
    flow: string[];
  };
  caseSnapshot: {
    caseType: string | null;
    priority: string;
    urgency: string;
    commercialStatus: string;
    legalStatus: string;
  };
  agents: AgentSnapshot[];
};

type AgentsLiveViewProps = {
  initialCaseId?: string;
  initialWorkflowJobId?: string;
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  not_started: "Nao iniciado",
  pending: "Pendente",
  running: "Em execucao",
  blocked: "Bloqueado",
  completed: "Concluido",
  review_required: "Revisao humana",
  manual: "Acao manual",
  error: "Falha"
};

function statusClassName(status: AgentStatus) {
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

export function AgentsLiveView({ initialCaseId, initialWorkflowJobId }: AgentsLiveViewProps) {
  const [caseId, setCaseId] = useState(initialCaseId ?? "");
  const [workflowJobId, setWorkflowJobId] = useState(initialWorkflowJobId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AgentsApiResponse | null>(null);

  const groupedAgents = useMemo(() => {
    const groups = new Map<string, AgentSnapshot[]>();

    for (const agent of snapshot?.agents ?? []) {
      if (!groups.has(agent.layer)) {
        groups.set(agent.layer, []);
      }
      groups.get(agent.layer)?.push(agent);
    }

    return [...groups.entries()];
  }, [snapshot]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!caseId.trim() || !workflowJobId.trim()) {
        setError("Informe caseId e workflowJobId para carregar a operacao completa.");
        return;
      }

      const response = await fetch(
        `/api/intake/public/cases/${caseId.trim()}/agents?workflowJobId=${workflowJobId.trim()}`
      );
      const payload = (await response.json()) as AgentsApiResponse & { error?: string };

      if (!response.ok) {
        setError("Nao foi possivel carregar os agentes com esses identificadores.");
        return;
      }

      setSnapshot(payload);
    } catch {
      setError("Falha de conexao ao consultar os agentes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <p className="section-eyebrow">Painel de agentes</p>
        <h2>Estrutura completa dos agentes em funcionamento</h2>
        <p className="hero-lede">
          Esta tela demonstra o orquestrador, as camadas operacionais e o status de cada agente
          para um caso real.
        </p>
      </div>

      <form className="agent-filter-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Case ID</span>
          <input
            type="text"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="UUID do caso"
          />
        </label>

        <label className="field">
          <span>Workflow Job ID</span>
          <input
            type="text"
            value={workflowJobId}
            onChange={(event) => setWorkflowJobId(event.target.value)}
            placeholder="UUID de acesso publico"
          />
        </label>

        <button className="button-primary agent-filter-button" type="submit" disabled={loading}>
          {loading ? "Carregando..." : "Carregar operacao"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      {snapshot ? (
        <>
          <article className="orchestrator-panel">
            <div>
              <p className="section-eyebrow">Orquestrador central</p>
              <h3>{snapshot.orchestrator.name}</h3>
            </div>
            <span className={statusClassName(snapshot.orchestrator.status)}>
              {STATUS_LABEL[snapshot.orchestrator.status]}
            </span>
            <p className="orchestrator-flow-label">Fluxo aplicado</p>
            <div className="orchestrator-flow">
              {snapshot.orchestrator.flow.map((step) => (
                <span key={step} className="orchestrator-flow-item">
                  {step}
                </span>
              ))}
            </div>
            <div className="case-snapshot">
              <p>
                <strong>Tipo:</strong> {snapshot.caseSnapshot.caseType ?? "nao classificado"}
              </p>
              <p>
                <strong>Prioridade:</strong> {snapshot.caseSnapshot.priority}
              </p>
              <p>
                <strong>Urgencia:</strong> {snapshot.caseSnapshot.urgency}
              </p>
              <p>
                <strong>Status comercial:</strong> {snapshot.caseSnapshot.commercialStatus}
              </p>
              <p>
                <strong>Status juridico:</strong> {snapshot.caseSnapshot.legalStatus}
              </p>
            </div>
          </article>

          <div className="agents-layer-grid">
            {groupedAgents.map(([layerName, agents]) => (
              <section className="agent-layer" key={layerName}>
                <h3>{layerName}</h3>
                <div className="agent-card-grid">
                  {agents.map((agent) => (
                    <article key={agent.key} className="agent-card">
                      <div className="agent-card-head">
                        <p className="agent-name">{agent.name}</p>
                        <span className={statusClassName(agent.status)}>
                          {STATUS_LABEL[agent.status]}
                        </span>
                      </div>
                      <p>{agent.summary}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <p className="completion-status">
          Informe os identificadores do caso para visualizar todos os agentes em operacao.
        </p>
      )}
    </section>
  );
}
