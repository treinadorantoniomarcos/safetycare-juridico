import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

type LegalBriefUploadedDocumentRecord = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

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

export const legalBriefInputsTable = pgTable(
  "legal_brief_inputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    sourceWorkflowJobId: uuid("source_workflow_job_id").references(() => workflowJobsTable.id),
    draftScope: text("draft_scope").notNull().default("civil_health"),
    patientFullName: text("patient_full_name").notNull(),
    patientCpf: text("patient_cpf").notNull(),
    city: text("city").notNull(),
    contact: text("contact").notNull(),
    patientAddress: text("patient_address").notNull().default(""),
    patientWhatsapp: text("patient_whatsapp").notNull().default(""),
    patientEmail: text("patient_email").notNull().default(""),
    patientRg: text("patient_rg").notNull().default(""),
    relationToPatient: text("relation_to_patient").notNull(),
    contactFullName: text("contact_full_name").notNull().default(""),
    contactAddress: text("contact_address").notNull().default(""),
    contactWhatsapp: text("contact_whatsapp").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactCpf: text("contact_cpf").notNull().default(""),
    contactRg: text("contact_rg").notNull().default(""),
    problemType: text("problem_type").notNull(),
    currentUrgency: text("current_urgency").notNull(),
    keyDates: jsonb("key_dates")
      .$type<Array<{ label: string; date: string }>>()
      .notNull()
      .default([]),
    objectiveDescription: text("objective_description").notNull(),
    materialLosses: text("material_losses").notNull(),
    moralImpact: text("moral_impact").notNull(),
    uploadedDocuments: jsonb("uploaded_documents")
      .$type<LegalBriefUploadedDocumentRecord[]>()
      .notNull()
      .default([]),
    documentsAttached: jsonb("documents_attached").$type<string[]>().notNull().default([]),
    witnesses: jsonb("witnesses").$type<string[]>().notNull().default([]),
    mainRequest: text("main_request").notNull(),
    subsidiaryRequest: text("subsidiary_request").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseIdx: uniqueIndex("uq_legal_brief_inputs_case_id").on(table.caseId)
  })
);

export const legalArtifactsTable = pgTable(
  "legal_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => casesTable.id),
    sourceWorkflowJobId: uuid("source_workflow_job_id").references(() => workflowJobsTable.id),
    artifactType: text("artifact_type").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    summary: text("summary").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    versionIdx: uniqueIndex("uq_legal_artifacts_case_type_version").on(
      table.caseId,
      table.artifactType,
      table.versionNumber
    ),
    caseTypeIdx: index("idx_legal_artifacts_case_type").on(
      table.caseId,
      table.artifactType,
      table.versionNumber
    )
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

export const patientsTable = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  documentId: text("document_id").notNull(),
  birthDate: date("birth_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const hospitalCasesTable = pgTable("hospital_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patientsTable.id),
  admissionDate: timestamp("admission_date", { withTimezone: true }).notNull().defaultNow(),
  dischargeDate: timestamp("discharge_date", { withTimezone: true }),
  department: text("department").notNull(),
  currentRiskScore: integer("current_risk_score").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const patientJourneyTable = pgTable(
  "patient_journey",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => hospitalCasesTable.id),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    eventType: text("event_type").notNull(),
    description: text("description"),
    riskLevel: text("risk_level").notNull().default("low"),
    sourceSystem: text("source_system"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseEventIdx: index("idx_patient_journey_case_event").on(table.caseId, table.eventDate)
  })
);

export const evidenceDocsTable = pgTable(
  "evidence_docs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => hospitalCasesTable.id),
    docType: text("doc_type").notNull(),
    fileUrl: text("file_url"),
    validationStatus: text("validation_status").notNull().default("pending"),
    gapDetails: text("gap_details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseDocIdx: index("idx_evidence_docs_case_created").on(table.caseId, table.createdAt)
  })
);

export const agentIntelligenceTable = pgTable(
  "agent_intelligence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => hospitalCasesTable.id),
    squadName: text("squad_name").notNull(),
    agentId: text("agent_id").notNull(),
    findings: jsonb("findings").$type<Record<string, unknown>>().notNull().default({}),
    recommendation: text("recommendation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseAgentIdx: index("idx_agent_intelligence_case_created").on(table.caseId, table.createdAt)
  })
);

export const legalAlertsTable = pgTable(
  "legal_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id").references(() => hospitalCasesTable.id),
    severity: text("severity").notNull(),
    message: text("message").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    caseResolvedIdx: index("idx_legal_alerts_case_resolved").on(table.caseId, table.isResolved)
  })
);
