"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  clearPublicCaseAccess,
  loadPublicCaseAccess,
  type PublicCaseAccess
} from "../../features/intake/public-case-access-storage";
import {
  buildPublicCaseCompletionHref,
  createPublicCaseAccessCode,
  parsePublicCaseAccessCode
} from "../../features/intake/public-case-access-code";

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
  const searchParams = useSearchParams();
  const [savedAccess, setSavedAccess] = useState<PublicCaseAccess | null>(null);
  const [manualAccessCode, setManualAccessCode] = useState("");
  const [manualCaseId, setManualCaseId] = useState("");
  const [manualWorkflowJobId, setManualWorkflowJobId] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedAccess(loadPublicCaseAccess());
  }, []);

  const accessCodeFromUrl = searchParams.get("accessCode")?.trim() ?? "";

  const urlAccess = useMemo(() => parsePublicCaseAccessCode(accessCodeFromUrl), [accessCodeFromUrl]);

  const manualAccessFromCode = useMemo(
    () => parsePublicCaseAccessCode(manualAccessCode),
    [manualAccessCode]
  );

  const manualAccessFromIds = useMemo(() => {
    const normalizedCaseId = manualCaseId.trim();
    const normalizedWorkflowJobId = manualWorkflowJobId.trim();

    if (!normalizedCaseId || !normalizedWorkflowJobId) {
      return null;
    }

    return {
      caseId: normalizedCaseId,
      workflowJobId: normalizedWorkflowJobId,
      accessCode: createPublicCaseAccessCode(normalizedCaseId, normalizedWorkflowJobId)
    };
  }, [manualCaseId, manualWorkflowJobId]);

  const hasManualInput =
    manualAccessCode.trim().length > 0 ||
    manualCaseId.trim().length > 0 ||
    manualWorkflowJobId.trim().length > 0;
  const hasUrlInput = accessCodeFromUrl.length > 0;
  const manualAccessAttempt = manualAccessFromCode ?? manualAccessFromIds;
  const resolvedAccess = hasManualInput
    ? manualAccessAttempt
    : hasUrlInput
      ? urlAccess
      : savedAccess;
  const completionHref = resolvedAccess
    ? buildPublicCaseCompletionHref(resolvedAccess.accessCode)
    : null;
  const accessCodeToShow = resolvedAccess?.accessCode ?? manualAccessCode.trim() ?? "";
  const canOpenManual = Boolean(completionHref);
  const hasInvalidAccessInput = (hasManualInput && !manualAccessAttempt) || (hasUrlInput && !urlAccess);

  async function copyText(value: string, successMessage: string) {
    if (!value) {
      setError("Nao foi possivel gerar o codigo de acesso.");
      return;
    }

    try {
      const valueToCopy =
        value.startsWith("/") && typeof window !== "undefined"
          ? `${window.location.origin}${value}`
          : value;

      await navigator.clipboard.writeText(valueToCopy);
      setCopyStatus(successMessage);
      setError(null);
    } catch {
      setError("Nao foi possivel copiar agora. Copie manualmente o endereco exibido.");
    }
  }

  return (
    <section className="thanks-panel">
      <p className="section-eyebrow">{title}</p>
      <h1>Acesse novamente a etapa 2</h1>
      <p>{description}</p>

      {savedAccess && completionHref ? (
        <div className="thanks-meta">
          <p>
            Acesso salvo neste navegador. Caso tenha fechado a pagina, retome por aqui sem precisar
            reenviar o primeiro formulario.
          </p>
          <p>
            Salvo em {formatSavedAt(savedAccess.savedAt) ?? "momento anterior"}.
          </p>
          <p>
            Codigo de acesso: <strong>{savedAccess.accessCode}</strong>
          </p>
        </div>
      ) : (
        <div className="thanks-meta">
          <p>
            Nao encontramos um acesso salvo neste navegador. Se voce tem o codigo de acesso, pode
            abrir manualmente a etapa 2 abaixo.
          </p>
        </div>
      )}

      {hasInvalidAccessInput ? (
        <div className="thanks-meta">
          <p>O codigo informado nao parece valido. Confira se ele foi copiado por completo.</p>
        </div>
      ) : null}

      {completionHref ? (
        <div className="thanks-action-row">
          <Link className="button-primary thanks-action thanks-action--ready" href={completionHref}>
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

      <div className="review-block">
        <h4>Codigo de acesso</h4>
        <p className="section-note">
          Copie este codigo para reenviar por WhatsApp ou e-mail, ou use o link abaixo para abrir
          o segundo formulario.
        </p>

        <div className="review-copy-link-row">
          <input
            type="text"
            readOnly
            value={accessCodeToShow || "Codigo indisponivel neste momento"}
            aria-label="Codigo de acesso"
          />
          <button
            type="button"
            className="button-ghost inline-action"
            disabled={!accessCodeToShow}
            onClick={() => {
              void copyText(accessCodeToShow, "Codigo de acesso copiado para o cliente.");
            }}
          >
            Copiar codigo
          </button>
        </div>

        <div className="review-copy-link-row">
          <input
            type="text"
            readOnly
            value={completionHref ?? "Link indisponivel neste momento"}
            aria-label="Link para o segundo formulario"
          />
          <button
            type="button"
            className="button-ghost inline-action"
            disabled={!completionHref}
            onClick={() => {
              void copyText(
                completionHref ?? "",
                "Link copiado para envio por WhatsApp ou e-mail."
              );
            }}
          >
            Copiar link
          </button>
        </div>

        {copyStatus ? <p className="completion-success-message">{copyStatus}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Codigo de acesso</span>
          <input
            type="text"
            placeholder="Cole o codigo de acesso"
            value={manualAccessCode}
            onChange={(event) => setManualAccessCode(event.target.value)}
          />
        </label>

        <div className="field">
          <span>Ou informe os codigos separados</span>
          <p className="section-note">
            Se preferir, informe o codigo do caso e o codigo do acesso manualmente.
          </p>
        </div>
      </div>

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
            href={completionHref ?? "#"}
          >
            Abrir formulario novamente
          </Link>
        ) : (
          <button className="button-ghost thanks-action" type="button" disabled>
            Preencha o codigo para abrir
          </button>
        )}
      </div>
    </section>
  );
}
