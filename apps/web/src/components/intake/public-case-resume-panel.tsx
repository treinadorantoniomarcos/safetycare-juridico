"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearPublicCaseAccess,
  loadPublicCaseAccess,
  type PublicCaseAccess
} from "../../features/intake/public-case-access-storage";

type PublicCaseResumePanelProps = {
  title?: string;
  description?: string;
};

function formatSavedAt(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function PublicCaseResumePanel({
  title = "Retomar etapa 2",
  description = "Se voce fechou a janela, voce pode abrir novamente o formulario usando o acesso salvo neste navegador."
}: PublicCaseResumePanelProps) {
  const [savedAccess, setSavedAccess] = useState<PublicCaseAccess | null>(null);
  const [manualCaseId, setManualCaseId] = useState("");
  const [manualWorkflowJobId, setManualWorkflowJobId] = useState("");

  useEffect(() => {
    setSavedAccess(loadPublicCaseAccess());
  }, []);

  const savedHref = useMemo(() => {
    if (!savedAccess) {
      return null;
    }

    const query = new URLSearchParams({
      caseId: savedAccess.caseId,
      workflowJobId: savedAccess.workflowJobId
    });

    return `/completar-caso?${query.toString()}`;
  }, [savedAccess]);

  const canOpenManual = manualCaseId.trim().length > 0 && manualWorkflowJobId.trim().length > 0;

  return (
    <section className="thanks-panel">
      <p className="section-eyebrow">{title}</p>
      <h1>Acesse novamente a etapa 2</h1>
      <p>{description}</p>

      {savedAccess && savedHref ? (
        <div className="thanks-meta">
          <p>
            Acesso salvo neste navegador. Caso tenha fechado a pagina, retome por aqui sem precisar
            reenviar o primeiro formulario.
          </p>
          <p>
            Salvo em {formatSavedAt(savedAccess.savedAt) ?? "momento anterior"}.
          </p>
        </div>
      ) : (
        <div className="thanks-meta">
          <p>
            Nao encontramos um acesso salvo neste navegador. Se voce tem o codigo do caso, pode
            abrir manualmente a etapa 2 abaixo.
          </p>
        </div>
      )}

      {savedAccess && savedHref ? (
        <div className="thanks-action-row">
          <Link className="button-primary thanks-action thanks-action--ready" href={savedHref}>
            Abrir formulario novamente
          </Link>
          <button
            className="button-ghost thanks-action"
            type="button"
            onClick={() => {
              clearPublicCaseAccess();
              setSavedAccess(null);
            }}
          >
            Limpar acesso salvo
          </button>
        </div>
      ) : null}

      <div className="field-grid">
        <label className="field">
          <span>Codigo do caso</span>
          <input
            type="text"
            placeholder="Cole o caseId"
            value={manualCaseId}
            onChange={(event) => setManualCaseId(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Codigo do acesso</span>
          <input
            type="text"
            placeholder="Cole o workflowJobId"
            value={manualWorkflowJobId}
            onChange={(event) => setManualWorkflowJobId(event.target.value)}
          />
        </label>
      </div>

      <div className="thanks-action-row">
        {canOpenManual ? (
          <Link
            className="button-ghost thanks-action thanks-action--ready"
            href={`/completar-caso?caseId=${encodeURIComponent(
              manualCaseId.trim()
            )}&workflowJobId=${encodeURIComponent(manualWorkflowJobId.trim())}`}
          >
            Abrir com esses dados
          </Link>
        ) : (
          <button className="button-ghost thanks-action" type="button" disabled>
            Preencha os dois codigos para abrir
          </button>
        )}
      </div>
    </section>
  );
}
