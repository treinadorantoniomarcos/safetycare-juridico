import type { ScoreReviewDecisionInput } from "@safetycare/ai-contracts";
import {
  agentIntelligenceTable,
  auditLogsTable,
  clinicalAnalysesTable,
  evidenceChecklistsTable,
  evidenceDocsTable,
  hospitalCasesTable,
  legalAlertsTable,
  legalBriefInputsTable,
  legalArtifactsTable,
  legalScoresTable,
  patientJourneyTable,
  patientsTable,
  rightsAssessmentsTable,
  casesTable,
  clientsTable,
  journeyTimelinesTable,
  leadsTable,
  triageAnalysesTable,
  workflowJobsTable
} from "./schema";

export type LeadRecord = typeof leadsTable.$inferSelect;
export type NewLeadRecord = typeof leadsTable.$inferInsert;

export type ClientRecord = typeof clientsTable.$inferSelect;
export type NewClientRecord = typeof clientsTable.$inferInsert;

export type CaseRecord = typeof casesTable.$inferSelect;
export type NewCaseRecord = typeof casesTable.$inferInsert;
export type CaseStatusRecord = Pick<
  CaseRecord,
  "id" | "caseType" | "priority" | "urgency" | "commercialStatus" | "legalStatus" | "updatedAt"
>;

export type WorkflowJobRecord = typeof workflowJobsTable.$inferSelect;
export type NewWorkflowJobRecord = typeof workflowJobsTable.$inferInsert;
export type WorkflowJobStatusSummaryRecord = {
  status: string;
  total: number;
};

export type AuditLogRecord = typeof auditLogsTable.$inferSelect;
export type NewAuditLogRecord = typeof auditLogsTable.$inferInsert;
export type TriageAnalysisRecord = typeof triageAnalysesTable.$inferSelect;
export type NewTriageAnalysisRecord = typeof triageAnalysesTable.$inferInsert;
export type JourneyTimelineRecord = typeof journeyTimelinesTable.$inferSelect;
export type NewJourneyTimelineRecord = typeof journeyTimelinesTable.$inferInsert;
export type ClinicalAnalysisRecord = typeof clinicalAnalysesTable.$inferSelect;
export type NewClinicalAnalysisRecord = typeof clinicalAnalysesTable.$inferInsert;
export type RightsAssessmentRecord = typeof rightsAssessmentsTable.$inferSelect;
export type NewRightsAssessmentRecord = typeof rightsAssessmentsTable.$inferInsert;
export type EvidenceChecklistRecord = typeof evidenceChecklistsTable.$inferSelect;
export type NewEvidenceChecklistRecord = typeof evidenceChecklistsTable.$inferInsert;
export type LegalScoreRecord = typeof legalScoresTable.$inferSelect;
export type NewLegalScoreRecord = typeof legalScoresTable.$inferInsert;
export type LegalBriefInputRecord = typeof legalBriefInputsTable.$inferSelect;
export type NewLegalBriefInputRecord = typeof legalBriefInputsTable.$inferInsert;
export type LegalArtifactRecord = typeof legalArtifactsTable.$inferSelect;
export type NewLegalArtifactRecord = typeof legalArtifactsTable.$inferInsert;
export type LegalScoreHumanReviewInput = ScoreReviewDecisionInput & {
  reviewedAt?: Date;
};

export type CaseWithClientRecord = {
  caseRecord: CaseRecord;
  clientRecord: ClientRecord;
};

export type CaseIntakeContextRecord = {
  caseRecord: CaseRecord;
  clientRecord: ClientRecord;
  leadRecord: LeadRecord;
};

export type PatientRecord = typeof patientsTable.$inferSelect;
export type NewPatientRecord = typeof patientsTable.$inferInsert;
export type HospitalCaseRecord = typeof hospitalCasesTable.$inferSelect;
export type NewHospitalCaseRecord = typeof hospitalCasesTable.$inferInsert;
export type PatientJourneyRecord = typeof patientJourneyTable.$inferSelect;
export type NewPatientJourneyRecord = typeof patientJourneyTable.$inferInsert;
export type EvidenceDocRecord = typeof evidenceDocsTable.$inferSelect;
export type NewEvidenceDocRecord = typeof evidenceDocsTable.$inferInsert;
export type AgentIntelligenceRecord = typeof agentIntelligenceTable.$inferSelect;
export type NewAgentIntelligenceRecord = typeof agentIntelligenceTable.$inferInsert;
export type LegalAlertRecord = typeof legalAlertsTable.$inferSelect;
export type NewLegalAlertRecord = typeof legalAlertsTable.$inferInsert;
