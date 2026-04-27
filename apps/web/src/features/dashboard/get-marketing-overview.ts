import { AuditLogRepository, casesTable, leadsTable } from "@safetycare/database";
import { desc, gte } from "drizzle-orm";
import { getDatabaseClient } from "../../lib/database";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const MAX_ROWS = 5000;
const MAX_EVENT_ROWS = 500;

type FunnelStage = {
  stage: string;
  total: number;
};

type SourceBreakdownItem = {
  source: string;
  total: number;
};

type UtmBreakdownItem = {
  landing: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  total: number;
};

type LegalStatusBreakdownItem = {
  legalStatus: string;
  total: number;
};

export type MarketingOverview = {
  generatedAt: Date;
  periodDays: number;
  since: Date;
  funnel: FunnelStage[];
  sources: SourceBreakdownItem[];
  utm: UtmBreakdownItem[];
  legalStatuses: LegalStatusBreakdownItem[];
};

function normalizePeriodDays(days?: number) {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return DEFAULT_DAYS;
  }

  return Math.max(1, Math.min(MAX_DAYS, Math.floor(days)));
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function incrementCounter(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortBreakdown<T extends { total: number }>(items: T[]) {
  return [...items].sort((left, right) => right.total - left.total);
}

export async function getMarketingOverview(days?: number): Promise<MarketingOverview> {
  const periodDays = normalizePeriodDays(days);
  const generatedAt = new Date();
  const since = new Date(generatedAt.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const { db } = getDatabaseClient();
  const auditLogs = new AuditLogRepository(db);

  const [leads, cases, leadSubmittedEvents, thankYouViewedEvents] = await Promise.all([
    db
      .select({
        id: leadsTable.id,
        source: leadsTable.source
      })
      .from(leadsTable)
      .where(gte(leadsTable.receivedAt, since))
      .orderBy(desc(leadsTable.receivedAt))
      .limit(MAX_ROWS),
    db
      .select({
        id: casesTable.id,
        legalStatus: casesTable.legalStatus
      })
      .from(casesTable)
      .where(gte(casesTable.createdAt, since))
      .orderBy(desc(casesTable.createdAt))
      .limit(MAX_ROWS),
    auditLogs.listByAction("marketing.lead_submitted", since, MAX_EVENT_ROWS),
    auditLogs.listByAction("marketing.thank_you_viewed", since, MAX_EVENT_ROWS)
  ]);

  const sourceCounters = new Map<string, number>();
  const legalStatusCounters = new Map<string, number>();
  const utmCounters = new Map<string, number>();

  for (const lead of leads) {
    incrementCounter(sourceCounters, lead.source || "unknown");
  }

  for (const caseRecord of cases) {
    incrementCounter(legalStatusCounters, caseRecord.legalStatus || "unknown");
  }

  for (const event of leadSubmittedEvents) {
    const payload = event.afterPayload ?? {};
    const payloadRecord = payload as Record<string, unknown>;
    const utmRecord = (payloadRecord.utm ?? {}) as Record<string, unknown>;

    const landing = readString(payloadRecord.source) ?? "unknown";
    const utmSource = readString(utmRecord.source) ?? "unknown";
    const utmMedium = readString(utmRecord.medium) ?? "unknown";
    const utmCampaign = readString(utmRecord.campaign) ?? "unknown";
    const key = `${landing}|${utmSource}|${utmMedium}|${utmCampaign}`;

    incrementCounter(utmCounters, key);
  }

  const sourceBreakdown = sortBreakdown(
    Array.from(sourceCounters.entries()).map(([source, total]) => ({
      source,
      total
    }))
  );

  const legalStatusBreakdown = sortBreakdown(
    Array.from(legalStatusCounters.entries()).map(([legalStatus, total]) => ({
      legalStatus,
      total
    }))
  );

  const utmBreakdown = sortBreakdown(
    Array.from(utmCounters.entries()).map(([key, total]) => {
      const [landing, utmSource, utmMedium, utmCampaign] = key.split("|");
      return {
        landing: landing ?? "unknown",
        utmSource: utmSource ?? "unknown",
        utmMedium: utmMedium ?? "unknown",
        utmCampaign: utmCampaign ?? "unknown",
        total
      };
    })
  );

  const legalStatusTotal = (status: string) =>
    legalStatusBreakdown.find((item) => item.legalStatus === status)?.total ?? 0;

  return {
    generatedAt,
    periodDays,
    since,
    funnel: [
      { stage: "Leads recebidos", total: leads.length },
      { stage: "Leads enviados", total: leadSubmittedEvents.length },
      { stage: "Página de obrigado visualizada", total: thankYouViewedEvents.length },
      { stage: "Casos criados", total: cases.length },
      { stage: "Revisão humana", total: legalStatusTotal("human_review_required") },
      { stage: "Conversão pendente", total: legalStatusTotal("conversion_pending") },
      { stage: "Execução jurídica pendente", total: legalStatusTotal("legal_execution_pending") },
      {
        stage: "Execução jurídica em andamento",
        total: legalStatusTotal("legal_execution_in_progress")
      }
    ],
    sources: sourceBreakdown,
    utm: utmBreakdown,
    legalStatuses: legalStatusBreakdown
  };
}
