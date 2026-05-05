"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LegalBriefReviewActionsProps = {
  caseId: string;
  currentLegalStatus: string;
  defaultReviewerId: string;
};

function buildRequestBody(
  decision: "approve" | "reject" | "request_changes",
  reviewerId: string,
  note: string
) {
  return {
    decision,
    reviewerId,
    note
  };
}

export function LegalBriefReviewActions({
  caseId,
  currentLegalStatus,
  defaultReviewerId
}: LegalBriefReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitDecision(decision: "approve" | "reject" | "request_changes") {
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

    try {
      const requestBody = buildRequestBody(decision, normalizedReviewerId, normalizedNote);

      const response = await fetch(`/api/dashboard/protect/cases/${caseId}/legal-review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const payload = (await response.json()) as
        | { error?: string; detail?: string; correlationId?: string }
        | {
            caseStatus?: { legalStatus?: string };
            decision?: "approve" | "reject" | "request_changes";
          };

      if (!response.ok) {
        if ("error" in payload) {
          if (payload.error === "invalid_case_stage") {
            setError("Este caso ainda nao esta liberado para a decisao solicitada.");
            return;
          }

          if (payload.error === "legal_brief_missing") {
            setError("A etapa 2 ainda nao foi preenchida pelo cliente.");
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
          ? "Etapa 2 liberada. Os agentes podem gerar a minuta, a procuração e o contrato."
          : decision === "request_changes"
            ? "Complementacao solicitada. O caso voltou para ajuste."
            : "Etapa 2 bloqueada. O caso permanece em analise."
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
        <h3>Liberacao, bloqueio ou complementacao da etapa 2</h3>
        <p className="section-note">
          O status atual do caso e {currentLegalStatus}. A liberacao autoriza a geracao dos
          artefatos juridicos pelos agentes; a complementacao reabre a etapa para ajustes; o
          bloqueio mantem o caso em analise.
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
          <span>Observacao / complementacao</span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Informe o que precisa ser complementado, ou o motivo da liberacao/bloqueio"
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
                return;
              }
            }}
          >
            {isPending ? "Liberando..." : "Liberar etapa 2"}
          </button>

          <button
            type="button"
            className="button-ghost inline-action"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void submitDecision("request_changes");
            }}
          >
            Solicitar complementacao
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
            Bloquear etapa 2
          </button>
        </div>
      </form>
    </section>
  );
}
