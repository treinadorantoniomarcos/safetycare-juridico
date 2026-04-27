"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Requirement = {
  requestKey: string;
  title: string;
  justification: string;
  urgency: "low" | "medium" | "high" | "critical";
  dueInHours: number;
  channelSuggestion: "whatsapp" | "email" | "portal" | "phone";
};

type MissingItem = {
  itemKey: string;
  label: string;
  status: "present" | "missing" | "partial";
  importance: "low" | "medium" | "high" | "critical";
  notes: string;
  sourceHints: string[];
};

type RequirementsResponse =
  | {
      status: "processing";
      message: string;
    }
  | {
      status: "ready";
      evidenceSummary: string;
      missingCount: number;
      requiredInformationRequests: Requirement[];
      missingChecklistItems: MissingItem[];
    };

type CaseCompletionFormProps = {
  caseId?: string;
  workflowJobId?: string;
};

type ResponseState = {
  requestKey: string;
  answer: string;
  provided: boolean;
};

function urgencyLabel(urgency: Requirement["urgency"]) {
  switch (urgency) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    default:
      return "Baixa";
  }
}

export function CaseCompletionForm({ caseId, workflowJobId }: CaseCompletionFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RequirementsResponse | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [preferredContactWindow, setPreferredContactWindow] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requirements = useMemo(() => {
    if (!status || status.status !== "ready") {
      return [];
    }
    return status.requiredInformationRequests;
  }, [status]);

  useEffect(() => {
    if (!caseId || !workflowJobId) {
      setLoading(false);
      setError("Não foi possível validar o caso. Refaça o envio inicial.");
      return;
    }

    const controller = new AbortController();

    async function loadRequirements() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/intake/public/cases/${caseId}/requirements?workflowJobId=${workflowJobId}`,
          {
            method: "GET",
            signal: controller.signal
          }
        );

        const payload = (await response.json()) as
          | {
              status: "processing";
              message: string;
            }
          | {
              status: "ready";
              evidenceSummary: string;
              missingCount: number;
              requiredInformationRequests: Requirement[];
              missingChecklistItems: MissingItem[];
            }
          | { error?: string };

        if (!response.ok && response.status !== 202) {
          setError("Não foi possível carregar os requisitos do caso neste momento.");
          return;
        }

        if (!("status" in payload)) {
          setError("Não foi possível carregar os requisitos do caso neste momento.");
          return;
        }

        setStatus(payload);

        if (payload.status === "ready") {
          const nextResponses: Record<string, ResponseState> = {};

          for (const requirement of payload.requiredInformationRequests) {
            nextResponses[requirement.requestKey] = {
              requestKey: requirement.requestKey,
              answer: "",
              provided: false
            };
          }

          setResponses(nextResponses);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Falha de conexão ao buscar os requisitos do caso.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRequirements();

    return () => {
      controller.abort();
    };
  }, [caseId, workflowJobId]);

  function updateResponse(requestKey: string, patch: Partial<ResponseState>) {
    setResponses((prev) => ({
      ...prev,
      [requestKey]: {
        requestKey,
        answer: patch.answer ?? prev[requestKey]?.answer ?? "",
        provided: patch.provided ?? prev[requestKey]?.provided ?? false
      }
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caseId || !workflowJobId) {
      setError("Não foi possível validar o caso para envio.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const serializedResponses = Object.values(responses).filter(
        (response) => response.answer.trim().length > 0 || response.provided
      );
      const documentsDeclared =
        status && status.status === "ready"
          ? status.missingChecklistItems
              .filter((item) => item.status === "missing" || item.status === "partial")
              .map((item) => item.label)
          : [];

      const response = await fetch(`/api/intake/public/cases/${caseId}/requirements`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          workflowJobId,
          contactEmail,
          preferredContactWindow,
          additionalContext,
          consentToContact: true,
          responses: serializedResponses,
          documentsDeclared
        })
      });

      if (!response.ok) {
        setError("Não foi possível registrar suas informações agora. Tente novamente.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Falha de conexão ao enviar as informações.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <p className="completion-status">Carregando requisitos do seu caso...</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (submitted) {
    return (
      <p className="completion-success">
        Informações recebidas. Nossa equipe vai revisar o material e poderá entrar em contato se
        precisar de mais detalhes.
      </p>
    );
  }

  if (status?.status === "processing") {
    return (
      <p className="completion-status">
        {status.message} Você pode retornar em alguns minutos com o mesmo link.
      </p>
    );
  }

  return (
    <form className="completion-form" onSubmit={handleSubmit}>
      {status && status.status === "ready" ? (
        <div className="evidence-summary-card">
          <p className="section-eyebrow">O que ainda precisamos receber</p>
          <p>{status.evidenceSummary}</p>
          <p>
            <strong>Documentos ou informações pendentes:</strong> {status.missingCount}
          </p>
        </div>
      ) : null}

      <div className="field-grid">
        <label className="field">
          <span>E-mail para retorno</span>
          <input
            type="email"
            name="contactEmail"
            autoComplete="email"
            placeholder="seuemail@dominio.com"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Melhor horário para contato</span>
          <input
            type="text"
            name="preferredContactWindow"
            placeholder="Ex.: 9h às 12h"
            value={preferredContactWindow}
            onChange={(event) => setPreferredContactWindow(event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span>Informações adicionais relevantes</span>
        <textarea
          name="additionalContext"
          rows={5}
          maxLength={4000}
          placeholder="Inclua fatos novos, datas, sintomas, recusas, atendimentos ou orientações recebidas."
          value={additionalContext}
          onChange={(event) => setAdditionalContext(event.target.value)}
        />
      </label>

      {requirements.length > 0 ? (
        <section className="requirements-section">
          <h3>Informações essenciais para continuar a avaliação inicial</h3>
          {requirements.map((requirement) => (
            <article key={requirement.requestKey} className="requirement-card">
              <p className="requirement-title">{requirement.title}</p>
              <p>{requirement.justification}</p>
              <p className="requirement-meta">
                Urgência: {urgencyLabel(requirement.urgency)} | Prazo sugerido: {requirement.dueInHours}h
              </p>

              <label className="field">
                <span>Resposta</span>
                <textarea
                  rows={4}
                  maxLength={2000}
                  placeholder="Descreva aqui a informação ou documento correspondente."
                  value={responses[requirement.requestKey]?.answer ?? ""}
                  onChange={(event) =>
                    updateResponse(requirement.requestKey, { answer: event.target.value })
                  }
                />
              </label>

              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={responses[requirement.requestKey]?.provided ?? false}
                  onChange={(event) =>
                    updateResponse(requirement.requestKey, { provided: event.target.checked })
                  }
                />
                <span>Já tenho este documento/informação para envio.</span>
              </label>
            </article>
          ))}
        </section>
      ) : null}

      <button type="submit" className="button-primary form-submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando informações..." : "Enviar complementação do caso"}
      </button>
    </form>
  );
}
