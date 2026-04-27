import { getOperationsNotifyWebhookUrl } from "../config/env";

export type SlaNotificationMessage = {
  correlationId: string;
  caseId: string;
  legalStatus?: string;
  commercialStatus?: string;
  ageMinutes?: number;
  slaHours?: number;
};

export type OperationsNotificationResult = {
  status: "sent" | "internal";
  channel: "webhook" | "internal";
  responseStatus?: number;
};

export async function notifySlaEscalation(
  message: SlaNotificationMessage
): Promise<OperationsNotificationResult> {
  const webhookUrl = getOperationsNotifyWebhookUrl();

  if (!webhookUrl) {
    return {
      status: "internal",
      channel: "internal"
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      event: "sla.escalation_triggered",
      at: new Date().toISOString(),
      ...message
    })
  });

  if (!response.ok) {
    throw new Error(`operations_notify_webhook_failed_${response.status}`);
  }

  return {
    status: "sent",
    channel: "webhook",
    responseStatus: response.status
  };
}
