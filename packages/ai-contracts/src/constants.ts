export const CONTRACT_VERSION = "0.1.0";

export const leadSources = ["whatsapp", "form", "site", "referral"] as const;
export const consentStatuses = ["pending", "granted", "revoked"] as const;
export const intakeActorTypes = ["system", "agent", "user", "integration"] as const;
export const workflowJobTypes = [
  "intake.orchestrator.bootstrap",
  "triage.classification",
  "journey.timeline",
  "clinical.analysis",
  "rights.assessment",
  "evidence.builder",
  "legal.score",
  "legal.execution"
] as const;
export const triageCaseTypes = [
  "medical_error",
  "hospital_failure",
  "aesthetic",
  "health_plan",
  "unclassified"
] as const;
export const triagePriorityLevels = ["low", "medium", "high"] as const;
export const triageUrgencyLevels = ["low", "medium", "high", "critical"] as const;
export const triageLegalPotentialLevels = ["low", "medium", "high"] as const;
export const journeyRiskLevels = ["low", "medium", "high", "critical"] as const;
export const clinicalRiskLevels = ["low", "medium", "high", "critical"] as const;
export const legalBriefProblemTypes = [
  "atendimento",
  "plano",
  "hospital",
  "medico",
  "clinica",
  "medicamento",
  "cirurgia",
  "uti",
  "reembolso",
  "outro"
] as const;
export const clinicalFindingTypes = [
  "delay",
  "protocol_failure",
  "no_intervention",
  "red_flag"
] as const;
export const patientRightKeys = [
  "dignity",
  "autonomy_of_will",
  "clear_information",
  "informed_consent",
  "records_access",
  "privacy_confidentiality",
  "second_opinion",
  "companion_presence",
  "continuity_of_care",
  "patient_safety",
  "palliative_care",
  "advance_directives",
  "therapeutic_refusal",
  "non_discrimination"
] as const;
export const patientRightStatuses = ["ok", "possible_violation"] as const;
export const evidenceChecklistStatuses = ["present", "missing", "partial"] as const;
export const evidenceChecklistImportanceLevels = ["low", "medium", "high", "critical"] as const;
export const legalComplexityLevels = ["low", "medium", "high"] as const;
export const scoreReviewDecisions = ["approve", "reject"] as const;
export const legalBriefReviewDecisions = ["approve", "reject", "request_changes"] as const;
export const conversionDecisions = ["signed", "lost"] as const;
