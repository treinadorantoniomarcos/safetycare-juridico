import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const leadsTable = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  name: text("name"),
  phone: text("phone"),
  rawMessage: text("raw_message").notNull(),
  status: text("status").notNull().default("new"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow()
});

export const clientsTable = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").references(() => leadsTable.id),
  fullName: text("full_name").notNull(),
  cpfHash: text("cpf_hash"),
  email: text("email"),
  phone: text("phone"),
  consentStatus: text("consent_status").notNull().default("pending"),
  consentPayload: jsonb("consent_payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const casesTable = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    caseType: text("case_type"),
    priority: text("priority").notNull().default("medium"),
    urgency: text("urgency").notNull().default("medium"),
    commercialStatus: text("commercial_status").notNull().default("screening"),
    legalStatus: text("legal_status").notNull().default("intake"),
    estimatedValueCents: bigint("estimated_value_cents", { mode: "number" }),
    currentOwnerUserId: uuid("current_owner_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    statusIdx: index("idx_cases_status").on(table.commercialStatus, table.legalStatus)
  })
);

export const workflowJobsTable = pgTable(
  "workflow_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => casesTable.id),
    jobType: text("job_type").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true }),
    correlationId: text("correlation_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    statusIdx: index("idx_workflow_jobs_status").on(table.status, table.runAfter),
    correlationIdx: uniqueIndex("uq_workflow_jobs_correlation_type").on(
      table.correlationId,
      table.jobType
    )
  })
);

export const triageAnalysesTable = pgTable(
  "triage_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    caseType: text("case_type").notNull(),
    priority: text("priority").notNull(),
    urgency: text("urgency").notNull(),
    hasDamage: boolean("has_damage").notNull(),
    legalPotential: text("legal_potential").notNull(),
    confidence: integer("confidence").notNull(),
    rationale: jsonb("rationale").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_triage_analyses_case_id").on(table.caseId)
  })
);

export const journeyTimelinesTable = pgTable(
  "journey_timelines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    riskLevel: text("risk_level").notNull(),
    confidence: integer("confidence").notNull(),
    timeline: jsonb("timeline").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_journey_timelines_case_id").on(table.caseId)
  })
);

export const clinicalAnalysesTable = pgTable(
  "clinical_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    riskLevel: text("risk_level").notNull(),
    confidence: integer("confidence").notNull(),
    findings: jsonb("findings").$type<unknown>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_clinical_analyses_case_id").on(table.caseId)
  })
);

export const rightsAssessmentsTable = pgTable(
  "rights_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    confidence: integer("confidence").notNull(),
    violationCount: integer("violation_count").notNull(),
    rights: jsonb("rights").$type<unknown>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_rights_assessments_case_id").on(table.caseId)
  })
);

export const evidenceChecklistsTable = pgTable(
  "evidence_checklists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    confidence: integer("confidence").notNull(),
    missingCount: integer("missing_count").notNull(),
    items: jsonb("items").$type<unknown>().notNull().default({}),
    requiredInformationRequests: jsonb("required_information_requests")
      .$type<unknown>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_evidence_checklists_case_id").on(table.caseId)
  })
);

export const legalScoresTable = pgTable(
  "legal_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    viabilityScore: integer("viability_score").notNull(),
    complexity: text("complexity").notNull(),
    estimatedValueCents: bigint("estimated_value_cents", { mode: "number" }).notNull(),
    confidence: integer("confidence").notNull(),
    reviewRequired: boolean("review_required").notNull(),
    reviewReasons: jsonb("review_reasons").$type<unknown>().notNull().default({}),
    decision: text("decision"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rationale: jsonb("rationale").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_legal_scores_case_id").on(table.caseId)
  })
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => casesTable.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    beforePayload: jsonb("before_payload").$type<Record<string, unknown> | null>(),
    afterPayload: jsonb("after_payload").$type<Record<string, unknown> | null>(),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: index("idx_audit_logs_case_id").on(table.caseId, table.createdAt)
  })
);
