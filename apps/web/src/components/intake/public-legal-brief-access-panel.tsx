"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicLegalBriefAccessState } from "../../features/intake/public-legal-brief-access";
import { PublicLegalBriefAccessRefreshButton } from "./public-legal-brief-access-refresh-button";

type ConnectionStatus = "connecting" | "online" | "offline";

type PublicLegalBriefAccessPanelProps = {
  caseId?: string;
  workflowJobId?: string;
  initialState: PublicLegalBriefAccessState;
};

function buildStreamUrl(caseId: string, workflowJobId: string) {
  return `/api/intake/public/cases/${caseId}/brief/stream?workflowJobId=${workflowJobId}`;
}

export function PublicLegalBriefAccessPanel({
  caseId,
  workflowJobId,
  initialState
}: PublicLegalBriefAccessPanelProps) {
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
    return (
      <div className="thanks-action-row">
        <Link
          className="button-primary thanks-action thanks-action--ready"
          href={`/completar-caso?caseId=${caseId}&workflowJobId=${workflowJobId}`}
        >
          Liberado o formulario
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="thanks-action-row">
        <button className="button-ghost thanks-action thanks-action--blocked" type="button" disabled>
          Aguardando liberacao do formulario
        </button>
      </div>

      <div className="thanks-meta">
        <p>{accessState.message}</p>
        <p>
          A pagina acompanha a liberacao em tempo real. Se a mudanca nao aparecer, use o botao
          manual de atualizacao.
        </p>
        <p>Conexao ao vivo: {connectionStatus === "online" ? "ativa" : "em reconexao"}</p>
      </div>

      <PublicLegalBriefAccessRefreshButton label="Atualizar pagina agora" />
    </>
  );
}
