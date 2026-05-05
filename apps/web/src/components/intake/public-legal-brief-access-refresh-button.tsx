"use client";

import { useState } from "react";

type PublicLegalBriefAccessRefreshButtonProps = {
  label?: string;
};

export function PublicLegalBriefAccessRefreshButton({
  label = "Atualizar página agora"
}: PublicLegalBriefAccessRefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    window.location.reload();
  }

  return (
    <button
      className="button-ghost thanks-action"
      type="button"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Atualizando..." : label}
    </button>
  );
}
