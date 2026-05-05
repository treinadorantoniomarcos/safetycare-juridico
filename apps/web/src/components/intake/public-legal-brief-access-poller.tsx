"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PublicLegalBriefAccessPollerProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function PublicLegalBriefAccessPoller({
  enabled,
  intervalMs = 5000
}: PublicLegalBriefAccessPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const refresh = () => {
      router.refresh();
    };

    const timer = window.setInterval(refresh, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
