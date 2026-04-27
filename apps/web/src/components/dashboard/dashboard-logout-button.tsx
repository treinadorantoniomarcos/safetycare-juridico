"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DashboardLogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/dashboard/auth/logout", {
        method: "POST"
      });
    } finally {
      setIsSubmitting(false);
      startTransition(() => {
        router.push("/painel-executivo/login");
      });
    }
  }

  return (
    <button
      type="button"
      className="button-ghost"
      onClick={handleLogout}
      disabled={isSubmitting || isPending}
    >
      {isSubmitting || isPending ? "Saindo..." : "Sair"}
    </button>
  );
}

