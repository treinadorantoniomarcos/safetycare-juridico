"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeScoreReviewDecision,
  type LegalScoreTrafficLight
} from "../../features/dashboard/legal-score-classification";

type ScoreReviewActionsProps = {
  caseId: string;
  currentLegalStatus: string;
  defaultDecision?: string | null;
  defaultNote?: string;
  defaultReviewerId: string;
};

const scoreColorOptions: Array<{
  key: LegalScoreTrafficLight;
  label: string;
  summary: string;
  noteHint: string;
}> = [
  {
    key: "green",
    label: "Verde",
    summary: "Pode continuar",
    noteHint: "Opcional: informe observacoes adicionais."
  },
  {
    key: "yellow",
    label: "Amarelo",
    summary: "Precisa complementar",
    noteHint: "Informe o que precisa ser complementado."
  },
  {
    key: "red",
    label: "Vermelho",
    summary: "Nao cabe acao juridica",
    noteHint: "Explique por que o caso deve ser bloqueado."
  }
];

function buildRequestBody(decision: LegalScoreTrafficLight, reviewerId: string, note: string) {
  return {
    decision,
    reviewerId,
    note
  };
}

function getDecisionSuccessMessage(decision: LegalScoreTrafficLight) {
  if (decision === "green") {
    return "Classificacao verde salva. A etapa 2 pode ser liberada.";
  }

  if (decision === "yellow") {
    return "Classificacao amarela salva. A etapa 2 foi liberada com complementacao.";
  }

  return "Classificacao vermelha salva. A etapa 2 ficou bloqueada.";
}

export function ScoreReviewActions({
  caseId,
  currentLegalStatus,
  defaultDecision,
  defaultNote,
  defaultReviewerId
}: ScoreReviewActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<LegalScoreTrafficLight | null>(() =>
    normalizeScoreReviewDecision(defaultDecision)
  );
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);
  const [note, setNote] = useState(defaultNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitDecision() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);

    const normalizedReviewerId = reviewerId.trim();
    const normalizedNote = note.trim();

    if (!selectedDecision) {
      setError("Escolha uma cor para classificar o score.");
      return;
    }

    if (!normalizedReviewerId) {
      setError("Informe a identificacao do revisor.");
      return;
    }

    if (selectedDecision !== "green" && !normalizedNote) {
      setError("Descreva o motivo da classificacao antes de enviar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/intake/cases/${caseId}/score/review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(buildRequestBody(selectedDecision, normalizedReviewerId, normalizedNote))
      });

      const payload = (await response.json()) as
        | { error?: string; detail?: string; correlationId?: string }
        | {
            caseStatus?: { legalStatus?: string };
            decision?: LegalScoreTrafficLight;
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
            setError("Descreva o motivo da classificacao antes de enviar.");
            return;
          }
        }

        setError("Nao foi possivel registrar a decisao. Tente novamente.");
        return;
      }

      setSuccess(getDecisionSuccessMessage(selectedDecision));

      router.refresh();
    } catch {
      setError("Falha de conexao ao registrar a decisao.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedOption = selectedDecision
    ? scoreColorOptions.find((option) => option.key === selectedDecision)
    : null;

  return (
    <section className="form-section-card legal-review-actions-card">
      <div className="form-section-head">
        <p className="section-eyebrow">Decisao humana</p>
        <h3>Classificacao manual do score juridico</h3>
        <p className="section-note">
          O status atual do caso e {currentLegalStatus}. Escolha verde, amarelo ou vermelho para
          definir se a etapa 2 pode seguir.
        </p>
      </div>

      <form
        className="legal-review-actions-form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <fieldset className="score-choice-fieldset">
          <legend className="score-choice-legend">Escolha a cor final</legend>
          <div className="score-choice-grid" role="radiogroup" aria-label="Classificacao do score">
            {scoreColorOptions.map((option) => {
              const isSelected = selectedDecision === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  className={`score-choice-card score-choice-card--${option.key} ${
                    isSelected ? "score-choice-card--selected" : ""
                  }`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDecision(option.key);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  <span className="score-choice-card__dot" aria-hidden="true" />
                  <span className="score-choice-card__body">
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                    <small>{option.noteHint}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {selectedOption ? (
          <p className={`score-choice-note score-choice-note--${selectedOption.key}`}>
            Classificacao selecionada: <strong>{selectedOption.label}</strong>.{" "}
            {selectedOption.summary}.
          </p>
        ) : null}

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
            placeholder={
              selectedDecision === "green"
                ? "Informe observacoes adicionais, se houver."
                : selectedDecision === "yellow"
                  ? "Descreva o que precisa ser complementado."
                  : selectedDecision === "red"
                    ? "Explique por que o caso nao deve seguir."
                    : "Escolha uma cor para liberar o campo de observacao."
            }
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="completion-success-message">{success}</p> : null}

        <div className="review-action-row">
          <button
            type="button"
            className="button-primary inline-action"
            disabled={isSubmitting || !selectedDecision}
            onClick={() => {
              void submitDecision();
            }}
          >
            {isSubmitting ? "Salvando..." : "Salvar classificacao"}
          </button>
        </div>
      </form>
    </section>
  );
}
