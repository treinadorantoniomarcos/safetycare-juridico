"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type HumanTriageReviewActionsProps = {
  caseId: string;
  currentLegalStatus: string;
  defaultReviewerId: string;
};

function buildRequestBody(decision: "approve" | "reject", reviewerId: string, note: string) {
  return {
    decision,
    reviewerId,
    note
  };
}

export function HumanTriageReviewActions({
  caseId,
  currentLegalStatus,
  defaultReviewerId
}: HumanTriageReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitDecision(decision: "approve" | "reject") {
    setError(null);
    setSuccess(null);

    const normalizedReviewerId = reviewerId.trim();
    const normalizedNote = note.trim();

    if (!normalizedReviewerId) {
      setError("Informe a identificacao do revisor.");
      return;
    }

    try {
      const response = await fetch(`/api/intake/cases/${caseId}/human-triage`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(buildRequestBody(decision, normalizedReviewerId, normalizedNote))
      });

      const payload = (await response.json()) as
        | { error?: string; detail?: string; correlationId?: string }
        | {
            caseStatus?: { legalStatus?: string };
            decision?: "approve" | "reject";
          };

      if (!response.ok) {
        if ("error" in payload) {
          if (payload.error === "invalid_case_stage") {
            setError("Este caso ainda nao esta liberado para a decisao solicitada.");
            return;
          }

          if (payload.error === "bootstrap_job_not_found") {
            setError("Nao foi possivel localizar a triagem inicial do caso.");
            return;
          }
        }

        setError("Nao foi possivel registrar a decisao. Tente novamente.");
        return;
      }

      setSuccess(
        decision === "approve"
          ? "Triagem liberada. O caso pode seguir para a operacao automatica."
          : "Triagem bloqueada. O caso permaneceu sob analise."
      );

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Falha de conexao ao registrar a decisao.");
    }
  }

  return (
    <section className="form-section-card legal-review-actions-card">
      <div className="form-section-head">
        <p className="section-eyebrow">Decisao humana</p>
        <h3>Liberacao ou bloqueio da triagem inicial</h3>
        <p className="section-note">
          O status atual do caso e {currentLegalStatus}. A aprovacao libera o fluxo automatico;
          o bloqueio encerra a entrada para revisao interna.
        </p>
      </div>

      <form
        className="legal-review-actions-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitDecision("approve");
        }}
      >
        <label className="field">
          <span>Identificacao do revisor</span>
          <input
            type="text"
            value={reviewerId}
            onChange={(event) => setReviewerId(event.target.value)}
            placeholder="Nome ou identificador do revisor"
          />
        </label>

        <label className="field">
          <span>Observacao</span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Informe o motivo da aprovacao ou do bloqueio"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="completion-success-message">{success}</p> : null}

        <div className="review-action-row">
          <button
            type="submit"
            className="button-primary inline-action"
            disabled={isPending}
            onClick={(event) => {
              if (isPending) {
                event.preventDefault();
              }
            }}
          >
            {isPending ? "Liberando..." : "Aprovar triagem"}
          </button>

          <button
            type="button"
            className="button-ghost inline-action inline-action--danger"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void submitDecision("reject");
            }}
          >
            Bloquear triagem
          </button>
        </div>
      </form>
    </section>
  );
}
