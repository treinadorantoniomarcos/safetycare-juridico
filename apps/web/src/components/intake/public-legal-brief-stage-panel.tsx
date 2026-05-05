"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicLegalBriefAccessState } from "../../features/intake/public-legal-brief-access";
import { LegalBriefForm } from "./legal-brief-form";
import { PublicLegalBriefAccessRefreshButton } from "./public-legal-brief-access-refresh-button";

type ConnectionStatus = "connecting" | "online" | "offline";

type PublicLegalBriefStagePanelProps = {
  caseId?: string;
  workflowJobId?: string;
  initialState: PublicLegalBriefAccessState;
};

function buildStreamUrl(caseId: string, workflowJobId: string) {
  return `/api/intake/public/cases/${caseId}/brief/stream?workflowJobId=${workflowJobId}`;
}

export function PublicLegalBriefStagePanel({
  caseId,
  workflowJobId,
  initialState
}: PublicLegalBriefStagePanelProps) {
  const [accessState, setAccessState] = useState(initialState);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    initialState.status === "ready" ? "online" : "connecting"
  );

  useEffect(() => {
    if (!caseId || !workflowJobId || accessState.status === "ready") {
      return undefined;
    }

    let active = true;
    const source = new EventSource(buildStreamUrl(caseId, workflowJobId));

    source.onopen = () => {
      if (!active) {
        return;
      }

      setConnectionStatus("online");
    };

    source.addEventListener("brief_access", (event) => {
      if (!active) {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as PublicLegalBriefAccessState;
        setAccessState(payload);
        setConnectionStatus("online");

        if (payload.status === "ready") {
          source.close();
        }
      } catch {
        setConnectionStatus("offline");
      }
    });

    source.addEventListener("brief_access_error", () => {
      if (!active) {
        return;
      }

      setConnectionStatus("offline");
    });

    source.onerror = () => {
      if (!active) {
        return;
      }

      setConnectionStatus("offline");
    };

    return () => {
      active = false;
      source.close();
    };
  }, [accessState.status, caseId, workflowJobId]);

  if (accessState.status === "ready") {
    return <LegalBriefForm caseId={caseId} workflowJobId={workflowJobId} />;
  }

  return (
    <>
      <div className="thanks-meta">
        <p>
          {accessState.message ?? "A proxima etapa ainda nao foi liberada pela validacao humana."}
        </p>
        <p>
          A pagina acompanha a liberacao em tempo real. Se a mudanca nao aparecer, use o botao
          manual de atualizacao.
        </p>
        <p>Conexao ao vivo: {connectionStatus === "online" ? "ativa" : "em reconexao"}</p>
      </div>

      <PublicLegalBriefAccessRefreshButton label="Atualizar pagina agora" />

      <Link className="button-ghost thanks-action" href="/obrigado">
        Voltar para a confirmacao
      </Link>
    </>
  );
}
