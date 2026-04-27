import { CaseRepository, type CaseStatusRecord } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

const DEFAULT_LIMIT = 100;

export const caseSlaAlertStatuses = [
  "human_review_required",
  "conversion_pending",
  "legal_execution_pending"
] as const;

type CaseSlaAlertStatus = (typeof caseSlaAlertStatuses)[number];

const caseSlaHoursByStatus: Record<CaseSlaAlertStatus, number> = {
  human_review_required: 4,
  conversion_pending: 12,
  legal_execution_pending: 24
};

export type CaseSlaSummaryItem = {
  status: string;
  total: number;
  breachTotal: number;
  slaHours: number;
};

export type CaseSlaAlertItem = {
  caseId: string;
  legalStatus: string;
  commercialStatus: string;
  updatedAt: Date;
  ageMinutes: number;
  slaHours: number;
  breach: boolean;
};

export type CaseSlaAlertsResult = {
  generatedAt: Date;
  statuses: string[];
  total: number;
  breachTotal: number;
  summary: CaseSlaSummaryItem[];
  alerts: CaseSlaAlertItem[];
};

function sanitizeLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.floor(limit));
}

function isCaseSlaAlertStatus(status: string): status is CaseSlaAlertStatus {
  return caseSlaAlertStatuses.includes(status as CaseSlaAlertStatus);
}

function calculateAlert(caseRecord: CaseStatusRecord, generatedAt: Date): CaseSlaAlertItem | undefined {
  if (!isCaseSlaAlertStatus(caseRecord.legalStatus)) {
    return undefined;
  }

  const ageMs = generatedAt.getTime() - caseRecord.updatedAt.getTime();
  const ageMinutes = Math.max(0, Math.floor(ageMs / 60000));
  const slaHours = caseSlaHoursByStatus[caseRecord.legalStatus];
  const breach = ageMinutes >= slaHours * 60;

  return {
    caseId: caseRecord.id,
    legalStatus: caseRecord.legalStatus,
    commercialStatus: caseRecord.commercialStatus,
    updatedAt: caseRecord.updatedAt,
    ageMinutes,
    slaHours,
    breach
  };
}

export async function getCaseSlaAlerts(limit?: number): Promise<CaseSlaAlertsResult> {
  const { db } = getDatabaseClient();
  const cases = new CaseRepository(db);
  const statuses = [...caseSlaAlertStatuses];
  const generatedAt = new Date();
  const queue = await cases.listByLegalStatuses(statuses, sanitizeLimit(limit));
  const alerts = queue
    .map((caseRecord) => calculateAlert(caseRecord, generatedAt))
    .filter((alert): alert is CaseSlaAlertItem => alert !== undefined);
  const summaryByStatus = new Map<CaseSlaAlertStatus, { total: number; breachTotal: number }>(
    caseSlaAlertStatuses.map((status) => [status, { total: 0, breachTotal: 0 }])
  );

  for (const alert of alerts) {
    if (!isCaseSlaAlertStatus(alert.legalStatus)) {
      continue;
    }

    const currentStatusSummary = summaryByStatus.get(alert.legalStatus);

    if (!currentStatusSummary) {
      continue;
    }

    currentStatusSummary.total += 1;

    if (alert.breach) {
      currentStatusSummary.breachTotal += 1;
    }
  }

  return {
    generatedAt,
    statuses,
    total: alerts.length,
    breachTotal: alerts.filter((alert) => alert.breach).length,
    summary: statuses.map((status) => {
      const statusSummary = summaryByStatus.get(status);

      return {
        status,
        total: statusSummary?.total ?? 0,
        breachTotal: statusSummary?.breachTotal ?? 0,
        slaHours: caseSlaHoursByStatus[status]
      };
    }),
    alerts
  };
}
