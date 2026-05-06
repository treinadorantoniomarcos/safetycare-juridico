"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LegalBriefReviewActionsProps = {
  caseId: string;
  currentLegalStatus: string;
  defaultReviewerId: string;
  publicAccessJobId: string | null;
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
  defaultReviewerId,
  publicAccessJobId
}: LegalBriefReviewActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState("");

  const publicLinkPath = useMemo(() => {
    if (!publicAccessJobId) {
      return "";
    }

    const query = new URLSearchParams({
      caseId,
      workflowJobId: publicAccessJobId
    });

    return `/completar-caso?${query.toString()}`;
  }, [caseId, publicAccessJobId]);

  useEffect(() => {
    if (!publicLinkPath) {
      setPublicLink("");
      return;
    }

    setPublicLink(`${window.location.origin}${publicLinkPath}`);
  }, [publicLinkPath]);

  async function copyPublicLink() {
    if (!publicLinkPath) {
      setError("Nao foi possivel gerar o link do segundo formulario.");
      return;
    }

    try {
      const valueToCopy = publicLink || `${window.location.origin}${publicLinkPath}`;
      await navigator.clipboard.writeText(valueToCopy);
      setCopyStatus("Link copiado para envio por WhatsApp ou e-mail.");
    } catch {
      setError("Nao foi possivel copiar o link. Copie manualmente o endereco exibido.");
    }
  }

  async function submitDecision(decision: "approve" | "reject" | "request_changes") {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);
    setCopyStatus(null);

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
          ? "Etapa 2 liberada. Copie o link abaixo e envie ao cliente por WhatsApp ou e-mail."
          : decision === "request_changes"
            ? "Complementacao solicitada. O caso voltou para ajuste."
            : "Etapa 2 bloqueada. O caso permanece em analise."
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
        }}
      >
        <div className="review-block">
          <h4>Link para encaminhar ao cliente</h4>
          <p className="section-note">
            Copie este endereco e envie ao WhatsApp ou e-mail cadastrado para o cliente continuar
            o segundo formulario.
          </p>

          <div className="review-copy-link-row">
            <input
              type="text"
              value={publicLink || publicLinkPath || "Link indisponivel neste momento"}
              readOnly
              aria-label="Link para encaminhar ao cliente"
            />
            <button
              type="button"
              className="button-ghost inline-action"
              disabled={!publicLinkPath || isSubmitting}
              onClick={() => {
                void copyPublicLink();
              }}
            >
              Copiar link
            </button>
          </div>

          {copyStatus ? <p className="completion-success-message">{copyStatus}</p> : null}
        </div>

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
            type="button"
            className="button-primary inline-action"
            disabled={isSubmitting}
            onClick={() => {
              void submitDecision("approve");
            }}
          >
            {isSubmitting ? "Liberando..." : "Liberar etapa 2"}
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
            Bloquear etapa 2
          </button>
        </div>
      </form>
    </section>
  );
}
