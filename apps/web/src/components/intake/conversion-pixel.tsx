"use client";

import { useEffect } from "react";

type ConversionPixelProps = {
  caseId?: string;
  workflowJobId?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export function ConversionPixel({
  caseId,
  workflowJobId,
  source,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  utmTerm
}: ConversionPixelProps) {
  useEffect(() => {
    const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;

    void fetch("/api/intake/conversion-event", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        caseId,
        workflowJobId,
        eventName: "thank_you_viewed",
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer
      })
    });
  }, [caseId, source, utmCampaign, utmContent, utmMedium, utmSource, utmTerm, workflowJobId]);

  return null;
}

