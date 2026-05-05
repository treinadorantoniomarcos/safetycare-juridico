"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProtectOverview } from "../../features/dashboard/get-protect-overview";

type ProtectDashboardProps = {
  initialData: ProtectOverview;
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

function riskClassName(score: number) {
  if (score >= 80) {
    return "protect-risk-badge protect-risk-badge--critical";
  }

  if (score >= 50) {
    return "protect-risk-badge protect-risk-badge--warning";
  }

  return "protect-risk-badge protect-risk-badge--ok";
}

function alertClassName(severity: "critical" | "warning" | "info") {
  if (severity === "critical") {
    return "protect-alert-item protect-alert-item--critical";
  }

  if (severity === "warning") {
    return "protect-alert-item protect-alert-item--warning";
  }

  return "protect-alert-item";
}

export function ProtectDashboard({ initialData }: ProtectDashboardProps) {
  const [data, setData] = useState<ProtectOverview>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function refreshOverview() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/protect/overview");
      const payload = (await response.json()) as ProtectOverview & { error?: string };

      if (!response.ok) {
        setError("Nao foi possivel atualizar o dashboard Protect.");
        return;
      }

      setData(payload);
      setError(null);
    } catch {
      setError("Falha de conexao ao atualizar o dashboard Protect.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshOverview();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function handleNotifyLegal(caseId: string) {
    setBusyKey(`notify-${caseId}`);
    setActionMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/protect/cases/${caseId}/notify-legal`, {
        method: "POST"
      });

      if (!response.ok) {
        setError("Nao foi possivel encaminhar o caso ao juridico.");
        return;
      }

      setActionMessage("Caso encaminhado ao juridico com sucesso.");
      await refreshOverview();
    } catch {
      setError("Falha de conexao ao acionar o juridico.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleResolveAlert(alertId: string) {
    setBusyKey(`alert-${alertId}`);
    setActionMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/protect/alerts/${alertId}/resolve`, {
        method: "POST"
      });

      if (!response.ok) {
        setError("Nao foi possivel resolver o alerta.");
        return;
      }

      setActionMessage("Alerta marcado como resolvido.");
      await refreshOverview();
    } catch {
      setError("Falha de conexao ao resolver alerta.");
    } finally {
      setBusyKey(null);
    }
  }

  const selectedCase = data.selectedCase;
  const unresolvedAlerts = useMemo(
    () => data.alerts.filter((item) => item.isResolved === false),
    [data.alerts]
  );

  return (
    <section className="protect-dashboard">
      <header className="protect-header-card">
        <div>
          <p className="section-eyebrow">Safetycare Protect - Defesa Assistencial</p>
          <h1>Monitoramento juridico preventivo com dados reais</h1>
          <p className="hero-lede">Atualizado em {formatDateTime(data.generatedAt)}</p>
        </div>

        <div className="protect-header-actions">
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              void refreshOverview();
            }}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <a className="button-ghost" href="/painel-executivo">
            Ir para painel executivo
          </a>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {actionMessage ? <p className="completion-success">{actionMessage}</p> : null}

      <section className="protect-kpi-grid">
        <article className="protect-kpi-card">
          <p>Pacientes monitorados</p>
          <strong>{data.stats.patientsTotal}</strong>
        </article>
        <article className="protect-kpi-card">
          <p>Casos ativos</p>
          <strong>{data.stats.activeCasesTotal}</strong>
        </article>
        <article className="protect-kpi-card">
          <p>Alertas criticos</p>
          <strong>{data.stats.criticalAlertsTotal}</strong>
        </article>
        <article className="protect-kpi-card">
          <p>Em revisao juridica</p>
          <strong>{data.stats.legalReviewTotal}</strong>
        </article>
      </section>

      {selectedCase ? (
        <section className="protect-main-grid">
          <article className="protect-case-card">
            <div className="protect-case-head">
              <div>
                <p className="section-eyebrow">Caso priorizado</p>
                <h2>{selectedCase.patientName}</h2>
                <p className="hero-lede">
                  {selectedCase.department} | Status: {selectedCase.status}
                </p>
                <p className="hero-lede">Admissao: {formatDateTime(selectedCase.admissionDate)}</p>
              </div>
              <span className={riskClassName(selectedCase.riskScore)}>
                Risco {selectedCase.riskScore}%
              </span>
            </div>

            <div className="protect-actions-row">
              <button
                type="button"
                className="button-primary"
                disabled={busyKey === `notify-${selectedCase.caseId}`}
                onClick={() => {
                  void handleNotifyLegal(selectedCase.caseId);
                }}
              >
                {busyKey === `notify-${selectedCase.caseId}` ? "Processando..." : "Acionar juridico"}
              </button>
              <a
                className="button-ghost"
                href={`/api/dashboard/protect/cases/${selectedCase.caseId}/dossier?download=1`}
              >
                Exportar dossie tecnico
              </a>
            </div>

            <div className="protect-timeline-list">
              {data.timeline.length > 0 ? (
                data.timeline.map((item) => (
                  <article key={item.id} className="protect-timeline-item">
                    <p>
                      <strong>{formatDateTime(item.eventDate)}</strong> | {item.eventType}
                    </p>
                    <p>{item.description}</p>
                    <p className="protect-meta">Risco: {item.riskLevel}</p>
                  </article>
                ))
              ) : (
                <p className="completion-status">Sem eventos de jornada para o caso selecionado.</p>
              )}
            </div>
          </article>

          <aside className="protect-side-column">
            <article className="protect-side-card">
              <h3>Dossie de defesa</h3>
              <p>
                <strong>Tese:</strong> {data.dossier.thesis}
              </p>
              <p>
                <strong>Nexo:</strong> {data.dossier.nexus}
              </p>
              <p>
                <strong>Acao:</strong> {data.dossier.action}
              </p>
            </article>

            <article className="protect-side-card">
              <h3>Checklist documental</h3>
              {data.evidence.length > 0 ? (
                <div className="protect-list">
                  {data.evidence.map((item) => (
                    <p key={item.id}>
                      {item.docType} | {item.validationStatus}
                      {item.gapDetails ? ` | ${item.gapDetails}` : ""}
                    </p>
                  ))}
                </div>
              ) : (
                <p>Sem documentos registrados para este caso.</p>
              )}
            </article>

            <article className="protect-side-card">
              <h3>Alertas juridicos</h3>
              {data.alerts.length > 0 ? (
                <div className="protect-alerts-list">
                  {data.alerts.map((item) => (
                    <article key={item.id} className={alertClassName(item.severity)}>
                      <p>{item.message}</p>
                      <p className="protect-meta">
                        {item.severity} | {formatDateTime(item.createdAt)}
                      </p>
                      {!item.isResolved ? (
                        <button
                          type="button"
                          className="button-ghost"
                          disabled={busyKey === `alert-${item.id}`}
                          onClick={() => {
                            void handleResolveAlert(item.id);
                          }}
                        >
                          {busyKey === `alert-${item.id}` ? "Resolviendo..." : "Resolver alerta"}
                        </button>
                      ) : (
                        <p className="protect-meta">Resolvido</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p>Nenhum alerta juridico registrado.</p>
              )}

              <p className="protect-meta">Alertas abertos: {unresolvedAlerts.length}</p>
            </article>
          </aside>
        </section>
      ) : (
        <section className="panel-section">
          <div className="section-heading">
            <p className="section-eyebrow">Modulo Protect</p>
            <h2>Sem caso monitorado no momento.</h2>
            <p className="hero-lede">
              Assim que houver dados em `patients` e `hospital_cases`, o dashboard exibira jornada,
              prova e alertas em tempo real.
            </p>
          </div>
        </section>
      )}
    </section>
  );
}
