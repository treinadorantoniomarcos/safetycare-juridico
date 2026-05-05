"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScoreReviewActionsProps = {
  caseId: string;
  currentLegalStatus: string;
  defaultReviewerId: string;
};

function buildRequestBody(
  decision: "approve" | "request_changes" | "reject",
  reviewerId: string,
  note: string
) {
  return {
    decision,
    reviewerId,
    note
  };
}

export function ScoreReviewActions({
  caseId,
  currentLegalStatus,
  defaultReviewerId
}: ScoreReviewActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitDecision(decision: "approve" | "request_changes" | "reject") {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);

    const normalizedReviewerId = reviewerId.trim();
    const normalizedNote = note.trim();

    if (!normalizedReviewerId) {
      setError("Informe a identificacao do revisor.");
      return;
    }

    if (decision === "request_changes" && !normalizedNote) {
      setError("Descreva o que precisa ser complementado.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/intake/cases/${caseId}/score/review`, {
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
            decision?: "approve" | "request_changes" | "reject";
          };

      if (!response.ok) {
        if ("error" in payload) {
          if (payload.error === "invalid_case_stage") {
            setError("Este caso ainda nao esta liberado para a decisao solicitada.");
            return;
          }

          if (payload.error === "score_not_found") {
            setError("Nao foi possivel localizar o score do caso.");
            return;
          }

          if (payload.error === "note_required") {
            setError("Descreva o motivo da complementacao antes de enviar.");
            return;
          }
        }

        setError("Nao foi possivel registrar a decisao. Tente novamente.");
        return;
      }

      setSuccess(
        decision === "approve"
          ? "Score aprovado. O caso pode seguir para a etapa 2."
          : decision === "request_changes"
            ? "Complementacao solicitada. O caso voltou para ajuste."
            : "Score bloqueado. O caso foi encerrado nesta etapa."
      );

      router.refresh();
    } catch {
      setError("Falha de conexao ao registrar a decisao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="form-section-card legal-review-actions-card">
      <div className="form-section-head">
        <p className="section-eyebrow">Decisao humana</p>
        <h3>Liberacao ou bloqueio do score juridico</h3>
        <p className="section-note">
          O status atual do caso e {currentLegalStatus}. A aprovacao libera a conversao; o bloqueio
          encerra o caso nesta etapa.
        </p>
      </div>

      <form
        className="legal-review-actions-form"
        onSubmit={(event) => {
          event.preventDefault();
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
            placeholder="Informe o motivo da aprovacao, complementacao ou bloqueio"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="completion-success-message">{success}</p> : null}

        <div className="review-action-row">
          <button
            type="button"
            className="button-primary inline-action"
            disabled={isSubmitting}
            onClick={() => {
              void submitDecision("approve");
            }}
          >
            {isSubmitting ? "Liberando..." : "Continuar para etapa 2"}
          </button>

          <button
            type="button"
            className="button-ghost inline-action"
            disabled={isSubmitting}
            onClick={() => {
              void submitDecision("request_changes");
            }}
          >
            Solicitar complementacao
          </button>

          <button
            type="button"
            className="button-ghost inline-action inline-action--danger"
            disabled={isSubmitting}
            onClick={() => {
              void submitDecision("reject");
            }}
          >
            Nao cabe acao juridica
          </button>
        </div>
      </form>
    </section>
  );
}
