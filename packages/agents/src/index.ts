import {
  clinicalAnalysisSchema,
  evidenceChecklistSchema,
  legalScoreSchema,
  rightsAssessmentSchema,
  triageClassificationSchema,
  journeyTimelineSchema,
  type ClinicalAnalysisResult,
  type EvidenceChecklistResult,
  type JourneyTimelineResult,
  type LegalScoreResult,
  type RightsAssessmentResult,
  type TriageClassificationResult
} from "@safetycare/ai-contracts";
import { buildStrategicLegalGuidance } from "./legal-knowledge";

type TriageClassifierInput = {
  message: string;
  source: string;
};

type JourneyBuilderInput = {
  caseId: string;
  source: string;
  message: string;
  triage: TriageClassificationResult;
};

type ClinicalAnalysisInput = {
  caseId: string;
  source: string;
  journey: JourneyTimelineResult;
  triage: TriageClassificationResult;
};

type RightsAssessmentInput = {
  caseId: string;
  source: string;
  message: string;
  consentStatus: "pending" | "granted" | "revoked";
  triage: TriageClassificationResult;
  journey: JourneyTimelineResult;
  clinical: ClinicalAnalysisResult;
};

type EvidenceChecklistInput = {
  caseId: string;
  source: string;
  triage: TriageClassificationResult;
  journey: JourneyTimelineResult;
  clinical: ClinicalAnalysisResult;
  rights: RightsAssessmentResult;
};

type LegalScoreInput = {
  caseId: string;
  triage: TriageClassificationResult;
  clinical: ClinicalAnalysisResult;
  rights: RightsAssessmentResult;
  evidence: EvidenceChecklistResult;
};

const caseTypeSignals = [
  {
    caseType: "health_plan",
    signals: ["plano", "convenio", "negativa", "autoriza", "cobertura"]
  },
  {
    caseType: "aesthetic",
    signals: ["harmonizacao", "implante", "estetica", "botox"]
  },
  {
    caseType: "medical_error",
    signals: ["erro medico", "negligencia", "diagnostico"]
  },
  {
    caseType: "hospital_failure",
    signals: ["hospital", "uti", "cirurgia", "alta", "pronto socorro", "internacao"]
  }
] as const;

const urgencySignals = {
  critical: ["uti", "morreu", "morte", "hemorragia", "coma", "sem respiracao"],
  high: ["cirurgia", "risco", "grave", "sequela", "perdeu", "piorou", "piora"],
  medium: ["dor", "internacao", "alta", "complicacao"]
} as const;

const damageSignals = ["pior", "piorou", "morreu", "sequela", "dor", "lesao", "trauma"];
const evidenceSignals = ["exame", "laudo", "prontuario", "relatorio", "foto"];
const privacySignals = ["vazou", "exposicao", "sigilo", "dados", "grupo", "privacidade"];
const companionSignals = ["sem acompanhante", "impediram acompanhante", "acompanhante proibido"];
const secondOpinionSignals = ["segunda opiniao", "outro medico", "nao deixaram consultar"];
const palliativeSignals = ["paliativo", "dor intensa", "sem controle de dor", "terminal"];
const advanceDirectiveSignals = ["testamento vital", "diretiva antecipada", "vontade previa"];
const refusalSignals = ["recusa", "nao quis", "obrigaram tratamento", "forcaram procedimento"];
const discriminationSignals = ["discrimin", "humilh", "preconceito", "tratamento desumano"];

export function classifyCaseTriage(input: TriageClassifierInput): TriageClassificationResult {
  const normalizedMessage = normalize(input.message);
  const matchedSignals: string[] = [];
  const notes: string[] = [];

  let caseType: TriageClassificationResult["caseType"] = "unclassified";

  for (const definition of caseTypeSignals) {
    const match = definition.signals.find((signal) => normalizedMessage.includes(normalize(signal)));

    if (match) {
      caseType = definition.caseType;
      matchedSignals.push(match);
      break;
    }
  }

  const urgency = detectUrgency(normalizedMessage, matchedSignals);
  const hasDamage = damageSignals.some((signal) => normalizedMessage.includes(normalize(signal)));

  if (hasDamage) {
    notes.push("Relato contem indicios de dano ou agravamento.");
  }

  const hasEvidenceHint = evidenceSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );

  if (hasEvidenceHint) {
    notes.push("Relato indica existencia potencial de documentos ou provas.");
  }

  if (input.source === "whatsapp") {
    notes.push("Origem whatsapp tende a exigir confirmacao de contexto documental.");
  }

  const legalPotential = resolveLegalPotential(hasDamage, hasEvidenceHint, urgency);
  const priority = resolvePriority(urgency, legalPotential);
  const confidence = resolveConfidence(caseType, matchedSignals, hasEvidenceHint);

  if (caseType === "unclassified") {
    notes.push("Caso precisa de revisao humana para classificacao mais precisa.");
  }

  return triageClassificationSchema.parse({
    caseType,
    priority,
    urgency,
    hasDamage,
    legalPotential,
    confidence,
    rationale: {
      matchedSignals,
      notes
    }
  });
}

export function buildPatientJourneyTimeline(
  input: JourneyBuilderInput
): JourneyTimelineResult {
  const normalizedMessage = normalize(input.message);
  const events = buildJourneyEvents(normalizedMessage, input.triage);
  const riskLevel = resolveJourneyRisk(input.triage, events);
  const summary = buildJourneySummary(input.triage, events);
  const confidence = resolveJourneyConfidence(input.triage, events);

  return journeyTimelineSchema.parse({
    caseId: input.caseId,
    source: input.source as JourneyTimelineResult["source"],
    summary,
    riskLevel,
    confidence,
    events
  });
}

export function analyzeClinicalSignals(input: ClinicalAnalysisInput): ClinicalAnalysisResult {
  const normalizedSummary = normalize(input.journey.summary);
  const normalizedEvents = input.journey.events.map((event) => normalize(event.title + " " + event.description));
  const findings: ClinicalAnalysisResult["findings"] = [];

  if (input.triage.urgency === "critical" || input.journey.riskLevel === "critical") {
    findings.push({
      order: findings.length + 1,
      findingType: "red_flag",
      description: "Caso apresenta sinal de alerta clinico importante.",
      risk: true,
      evidenceHints: ["jornada", "triagem"]
    });
  }

  if (normalizedSummary.includes("alta") || normalizedEvents.some((text) => text.includes("alta"))) {
    findings.push({
      order: findings.length + 1,
      findingType: "delay",
      description: "Encerramento do cuidado pode ter ocorrido sem estabilidade adequada.",
      risk: input.triage.urgency !== "low",
      evidenceHints: ["alta", "orientacoes"]
    });
  }

  if (normalizedEvents.some((text) => text.includes("cirurg"))) {
    findings.push({
      order: findings.length + 1,
      findingType: "protocol_failure",
      description: "Procedimento cirurgico exige revisao de protocolo e timing.",
      risk: true,
      evidenceHints: ["laudo", "prontuario"]
    });
  }

  if (normalizedEvents.some((text) => text.includes("pior") || text.includes("agrav"))) {
    findings.push({
      order: findings.length + 1,
      findingType: "no_intervention",
      description: "Narrativa sugere agravamento apos a conduta assistencial.",
      risk: true,
      evidenceHints: ["exame", "relatorio"]
    });
  }

  if (input.triage.caseType === "health_plan") {
    findings.push({
      order: findings.length + 1,
      findingType: "delay",
      description: "Negativa do plano pode ter provocado atraso no acesso ao cuidado.",
      risk: true,
      evidenceHints: ["negativa", "protocolo"]
    });
  }

  if (findings.length === 0) {
    findings.push({
      order: 1,
      findingType: "no_intervention",
      description: "Nao foram detectados sinais clinicos suficientes na narrativa atual.",
      risk: false,
      evidenceHints: ["jornada"]
    });
  }

  const riskLevel = resolveClinicalRisk(input.triage, input.journey, findings);
  const confidence = resolveClinicalConfidence(input.triage, input.journey, findings);
  const summary = buildClinicalSummary(input, findings, riskLevel);

  return clinicalAnalysisSchema.parse({
    caseId: input.caseId,
    source: input.source as ClinicalAnalysisResult["source"],
    summary,
    riskLevel,
    confidence,
    findings
  });
}

export function assessPatientRights(input: RightsAssessmentInput): RightsAssessmentResult {
  const normalizedMessage = normalize(input.message);
  const eventTexts = input.journey.events.map((event) => normalize(`${event.title} ${event.description}`));
  const findingTypes = input.clinical.findings.map((finding) => finding.findingType);

  const hasNoOrientationSignal =
    normalizedMessage.includes("sem orientacao") ||
    normalizedMessage.includes("nao explic") ||
    eventTexts.some((text) => text.includes("alta")) && input.clinical.riskLevel !== "low";

  const hasConsentSignal =
    normalizedMessage.includes("sem consentimento") ||
    normalizedMessage.includes("nao assinei") ||
    normalizedMessage.includes("nao autorizei") ||
    (input.triage.caseType === "aesthetic" && findingTypes.includes("protocol_failure"));

  const hasRecordsSignal =
    normalizedMessage.includes("prontuario negado") ||
    normalizedMessage.includes("nao entregaram prontuario") ||
    normalizedMessage.includes("sem acesso ao prontuario");

  const hasContinuitySignal =
    findingTypes.includes("delay") ||
    findingTypes.includes("no_intervention") ||
    eventTexts.some((text) => text.includes("alta") && text.includes("agrav"));

  const hasSafetySignal =
    input.clinical.riskLevel === "critical" ||
    input.clinical.riskLevel === "high" ||
    findingTypes.includes("red_flag") ||
    findingTypes.includes("protocol_failure");

  const hasPrivacySignal = privacySignals.some((signal) => normalizedMessage.includes(normalize(signal)));
  const hasSecondOpinionSignal = secondOpinionSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasCompanionSignal = companionSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasPalliativeSignal = palliativeSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasAdvanceDirectiveSignal = advanceDirectiveSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasRefusalSignal = refusalSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasDiscriminationSignal = discriminationSignals.some((signal) =>
    normalizedMessage.includes(normalize(signal))
  );
  const hasAutonomySignal =
    hasConsentSignal || hasRefusalSignal || hasSecondOpinionSignal || hasAdvanceDirectiveSignal;
  const hasDignitySignal = hasDiscriminationSignal || hasNoOrientationSignal || hasSafetySignal;

  const rights: RightsAssessmentResult["rights"] = [
    {
      rightKey: "dignity",
      status: hasDignitySignal ? "possible_violation" : "ok",
      justification: hasDignitySignal
        ? "A narrativa apresenta sinais de tratamento possivelmente incompativel com a dignidade do paciente."
        : "Nao ha elemento objetivo suficiente para violacao de dignidade nesta etapa.",
      signals: hasDignitySignal ? ["dignidade", "tratamento"] : []
    },
    {
      rightKey: "autonomy_of_will",
      status: hasAutonomySignal ? "possible_violation" : "ok",
      justification: hasAutonomySignal
        ? "Foram detectados sinais de limitacao da autonomia decisoria do paciente."
        : "Nao ha indicios claros de restricao da autonomia da vontade.",
      signals: hasAutonomySignal ? ["autonomia", "decisao"] : []
    },
    {
      rightKey: "clear_information",
      status: hasNoOrientationSignal ? "possible_violation" : "ok",
      justification: hasNoOrientationSignal
        ? "Relato e sinais clinicos indicam possivel ausencia de informacao clara ao paciente."
        : "Nao ha indicio suficiente de falha na clareza da informacao prestada.",
      signals: hasNoOrientationSignal ? ["sem orientacao", "alta"] : []
    },
    {
      rightKey: "informed_consent",
      status: hasConsentSignal || input.consentStatus === "revoked" ? "possible_violation" : "ok",
      justification:
        hasConsentSignal || input.consentStatus === "revoked"
          ? "Foram detectados sinais de ausencia ou fragilidade de consentimento informado."
          : "Nao ha sinal claro de violacao do consentimento informado na narrativa atual.",
      signals: hasConsentSignal ? ["sem consentimento"] : []
    },
    {
      rightKey: "records_access",
      status: hasRecordsSignal ? "possible_violation" : "ok",
      justification: hasRecordsSignal
        ? "Narrativa sugere barreira no acesso ao prontuario ou documentos clinicos."
        : "Nao ha indicio objetivo de negativa de acesso ao prontuario.",
      signals: hasRecordsSignal ? ["prontuario"] : []
    },
    {
      rightKey: "privacy_confidentiality",
      status: hasPrivacySignal ? "possible_violation" : "ok",
      justification: hasPrivacySignal
        ? "A narrativa indica possivel exposicao indevida de dados ou quebra de sigilo assistencial."
        : "Nao ha indicios suficientes de violacao de privacidade/confidencialidade.",
      signals: hasPrivacySignal ? ["sigilo", "dados"] : []
    },
    {
      rightKey: "second_opinion",
      status: hasSecondOpinionSignal ? "possible_violation" : "ok",
      justification: hasSecondOpinionSignal
        ? "Ha sinal de obstaculo ao direito de buscar segunda opiniao clinica."
        : "Nao ha evidencia de impedimento de segunda opiniao na narrativa analisada.",
      signals: hasSecondOpinionSignal ? ["segunda opiniao"] : []
    },
    {
      rightKey: "companion_presence",
      status: hasCompanionSignal ? "possible_violation" : "ok",
      justification: hasCompanionSignal
        ? "A narrativa aponta possivel restricao indevida de acompanhante em contexto assistencial."
        : "Nao foram identificados sinais de restricao indevida de acompanhante.",
      signals: hasCompanionSignal ? ["acompanhante"] : []
    },
    {
      rightKey: "continuity_of_care",
      status: hasContinuitySignal ? "possible_violation" : "ok",
      justification: hasContinuitySignal
        ? "Achados indicam possivel descontinuidade do cuidado entre eventos da jornada."
        : "Nao foram identificados sinais consistentes de quebra de continuidade do cuidado.",
      signals: hasContinuitySignal ? ["atraso", "agravamento"] : []
    },
    {
      rightKey: "patient_safety",
      status: hasSafetySignal ? "possible_violation" : "ok",
      justification: hasSafetySignal
        ? "Risco clinico elevado e achados relevantes indicam potencial violacao de seguranca."
        : "Nao ha evidencias suficientes de violacao de seguranca do paciente nesta etapa.",
      signals: hasSafetySignal ? ["red_flag", "protocol_failure"] : []
    },
    {
      rightKey: "palliative_care",
      status: hasPalliativeSignal ? "possible_violation" : "ok",
      justification: hasPalliativeSignal
        ? "Narrativa sugere falha potencial no acesso a cuidado paliativo e controle de sofrimento."
        : "Nao ha sinais suficientes para violacao de cuidados paliativos.",
      signals: hasPalliativeSignal ? ["paliativo", "dor"] : []
    },
    {
      rightKey: "advance_directives",
      status: hasAdvanceDirectiveSignal ? "possible_violation" : "ok",
      justification: hasAdvanceDirectiveSignal
        ? "Foram identificados sinais de desconsideracao de diretivas antecipadas de vontade."
        : "Nao ha indicios de desrespeito a diretivas antecipadas na narrativa atual.",
      signals: hasAdvanceDirectiveSignal ? ["diretiva antecipada"] : []
    },
    {
      rightKey: "therapeutic_refusal",
      status: hasRefusalSignal ? "possible_violation" : "ok",
      justification: hasRefusalSignal
        ? "Ha indicio de possivel desrespeito ao direito de recusa terapeutica informada."
        : "Nao ha sinais claros de violacao ao direito de recusa terapeutica.",
      signals: hasRefusalSignal ? ["recusa"] : []
    },
    {
      rightKey: "non_discrimination",
      status: hasDiscriminationSignal ? "possible_violation" : "ok",
      justification: hasDiscriminationSignal
        ? "A narrativa aponta possivel tratamento discriminatorio ou desumano."
        : "Nao ha indicios objetivos de discriminacao no contexto analisado.",
      signals: hasDiscriminationSignal ? ["discriminacao"] : []
    }
  ];

  const violationCount = rights.filter((item) => item.status === "possible_violation").length;
  const confidence = Math.min(
    96,
    Math.max(58, Math.round((input.triage.confidence + input.journey.confidence + input.clinical.confidence) / 3))
  );
  const summary =
    violationCount > 0
      ? `Foram detectadas ${violationCount} possiveis violacoes de direitos do paciente.`
      : "Nao foram detectadas violacoes claras de direitos do paciente na analise inicial.";

  return rightsAssessmentSchema.parse({
    caseId: input.caseId,
    source: input.source as RightsAssessmentResult["source"],
    summary,
    confidence,
    violationCount,
    rights
  });
}

export function buildEvidenceChecklist(input: EvidenceChecklistInput): EvidenceChecklistResult {
  const items: EvidenceChecklistResult["items"] = [
    {
      itemKey: "medical_records",
      label: "Prontuario medico completo",
      status: "missing",
      importance: "critical",
      notes: "Solicitar copia integral com evolucao, prescricoes e alta.",
      sourceHints: ["prontuario", "hospital"]
    },
    {
      itemKey: "exam_results",
      label: "Exames e laudos relacionados",
      status: "partial",
      importance: "high",
      notes: "Consolidar exames antes/depois do evento principal.",
      sourceHints: ["exame", "laudo"]
    },
    {
      itemKey: "discharge_documents",
      label: "Documentos de alta e orientacoes",
      status: "missing",
      importance: "high",
      notes: "Checar orientacoes formais e justificativa clinica da alta.",
      sourceHints: ["alta", "orientacoes"]
    },
    {
      itemKey: "informed_consent_form",
      label: "Termo de consentimento informado",
      status: "missing",
      importance: "critical",
      notes: "Conferir data, assinatura, riscos informados e alternativas terapeuticas.",
      sourceHints: ["consentimento", "assinatura"]
    },
    {
      itemKey: "communication_log",
      label: "Historico de comunicacao com hospital/plano",
      status: "partial",
      importance: "medium",
      notes: "Consolidar protocolos, emails, mensagens e atendimentos telefonicos.",
      sourceHints: ["protocolo", "mensagem", "email"]
    },
    {
      itemKey: "expense_proof",
      label: "Comprovantes de despesas e danos materiais",
      status: "missing",
      importance: "high",
      notes: "Reunir notas fiscais, recibos, transporte, cuidador e medicamentos.",
      sourceHints: ["nota fiscal", "recibo", "despesa"]
    }
  ];

  if (input.triage.caseType === "health_plan") {
    items.push({
      itemKey: "health_plan_denial",
      label: "Comprovantes de negativa do plano",
      status: "missing",
      importance: "critical",
      notes: "Incluir protocolo, negativa formal e datas de tentativa.",
      sourceHints: ["negativa", "protocolo"]
    });
  }

  if (input.clinical.riskLevel === "critical" || input.clinical.riskLevel === "high") {
    items.push({
      itemKey: "specialist_report",
      label: "Parecer tecnico especializado",
      status: "missing",
      importance: "critical",
      notes: "Recomendado para fortalecer nexo de causalidade.",
      sourceHints: ["parecer", "especialista"]
    });
  }

  const rightsByKey = new Map(input.rights.rights.map((item) => [item.rightKey, item]));

  if (rightsByKey.get("privacy_confidentiality")?.status === "possible_violation") {
    items.push({
      itemKey: "privacy_incident_records",
      label: "Registros de incidente de privacidade e tratamento de dados",
      status: "missing",
      importance: "high",
      notes: "Documentar eventual quebra de sigilo e fluxo de compartilhamento dos dados sensiveis.",
      sourceHints: ["sigilo", "dados", "lgpd"]
    });
  }

  if (rightsByKey.get("advance_directives")?.status === "possible_violation") {
    items.push({
      itemKey: "advance_directive_documents",
      label: "Documentos de diretivas antecipadas e representante",
      status: "missing",
      importance: "high",
      notes: "Incluir testamento vital, procuracao e registros de vontade do paciente.",
      sourceHints: ["diretiva antecipada", "testamento vital"]
    });
  }

  if (rightsByKey.get("palliative_care")?.status === "possible_violation") {
    items.push({
      itemKey: "palliative_plan",
      label: "Plano de cuidados paliativos e controle de dor",
      status: "missing",
      importance: "high",
      notes: "Solicitar evolucao multiprofissional e plano terapeutico de alivio de sofrimento.",
      sourceHints: ["paliativo", "dor", "analgesia"]
    });
  }

  if (input.rights.violationCount === 0) {
    const recordsItem = items.find((item) => item.itemKey === "medical_records");
    if (recordsItem) {
      recordsItem.status = "partial";
      recordsItem.notes = "Prioridade moderada: confirmar se prontuario ja esta completo.";
    }
  }

  const missingCount = items.filter((item) => item.status === "missing").length;
  const confidence = Math.min(
    95,
    Math.max(60, Math.round((input.triage.confidence + input.clinical.confidence + input.rights.confidence) / 3))
  );
  const summary =
    missingCount > 0
      ? `Checklist probatorio com ${missingCount} item(ns) critico(s) ainda ausentes.`
      : "Checklist probatorio inicial sem lacunas criticas.";
  const requiredInformationRequests = buildRequiredInformationRequests(items, input.triage.urgency);

  return evidenceChecklistSchema.parse({
    caseId: input.caseId,
    source: input.source as EvidenceChecklistResult["source"],
    summary,
    confidence,
    missingCount,
    items,
    requiredInformationRequests
  });
}

export function calculateLegalScore(input: LegalScoreInput): LegalScoreResult {
  const reviewReasons: string[] = [];
  let score = 40;
  const strategicLegalGuidance = buildStrategicLegalGuidance(input);
  const jurisprudenceTags = strategicLegalGuidance.jurisprudentialReferences.map(
    (reference) => reference.key
  );

  if (input.triage.legalPotential === "high") {
    score += 18;
  } else if (input.triage.legalPotential === "medium") {
    score += 10;
  }

  if (input.triage.hasDamage) {
    score += 12;
  }

  if (input.clinical.riskLevel === "critical") {
    score += 16;
  } else if (input.clinical.riskLevel === "high") {
    score += 10;
  } else if (input.clinical.riskLevel === "medium") {
    score += 5;
  }

  score += input.rights.violationCount * 4;
  score -= input.evidence.missingCount * 6;

  const viabilityScore = Math.max(0, Math.min(100, score));
  const complexity: LegalScoreResult["complexity"] =
    input.triage.urgency === "critical" || input.clinical.riskLevel === "critical"
      ? "high"
      : input.evidence.missingCount >= 2 || input.rights.violationCount >= 2
        ? "medium"
        : "low";

  const baseValue = input.triage.caseType === "aesthetic" ? 4000000 : 7000000;
  const estimatedValueCents = Math.max(
    500000,
    Math.round(baseValue * (0.65 + viabilityScore / 100) + input.rights.violationCount * 900000)
  );

  if (complexity === "high") {
    reviewReasons.push("high_complexity");
  }
  if (input.evidence.missingCount >= 2) {
    reviewReasons.push("critical_evidence_gaps");
  }
  if (input.clinical.riskLevel === "critical" && input.evidence.missingCount > 0) {
    reviewReasons.push("critical_risk_with_missing_evidence");
  }
  if (input.rights.rights.some((item) => item.rightKey === "privacy_confidentiality" && item.status === "possible_violation")) {
    reviewReasons.push("lgpd_sensitive_data_risk");
  }
  if (input.rights.rights.some((item) => item.rightKey === "non_discrimination" && item.status === "possible_violation")) {
    reviewReasons.push("potential_human_rights_violation");
  }
  if (!strategicLegalGuidance.sourceAccessControl.canDraftProceduralPiece) {
    reviewReasons.push("essential_sources_not_verified");
  }

  const reviewRequired = reviewReasons.length > 0 || viabilityScore < 45 || viabilityScore > 85;
  const confidence = Math.min(
    95,
    Math.max(58, Math.round((input.triage.confidence + input.clinical.confidence + input.evidence.confidence) / 3))
  );
  const claimValueRecommendation = buildClaimValueRecommendation(
    input.triage.caseType,
    complexity,
    viabilityScore,
    estimatedValueCents
  );
  const draftingStyleGuide = buildDraftingStyleGuide();

  return legalScoreSchema.parse({
    caseId: input.caseId,
    viabilityScore,
    complexity,
    estimatedValueCents,
    confidence,
    reviewRequired,
    reviewReasons,
    strategicLegalGuidance,
    rationale: {
      inputs: ["triage", "clinical", "rights", "evidence"],
      notes: [
        `rights_violations=${String(input.rights.violationCount)}`,
        `evidence_missing=${String(input.evidence.missingCount)}`,
        `lgpd_sensitive_data=${String(strategicLegalGuidance.lgpd.containsSensitiveHealthData)}`,
        `oab_marketing_guardrails=${String(strategicLegalGuidance.oabMarketing.references.length)}`,
        `can_draft_procedural_piece=${String(strategicLegalGuidance.sourceAccessControl.canDraftProceduralPiece)}`
      ],
      legalAuthorities: [
        ...strategicLegalGuidance.statutoryReferences,
        ...strategicLegalGuidance.regulatoryReferences
      ],
      jurisprudenceTags,
      claimValueRecommendation,
      draftingStyleGuide
    }
  });
}

function detectUrgency(
  normalizedMessage: string,
  matchedSignals: string[]
): TriageClassificationResult["urgency"] {
  for (const signal of urgencySignals.critical) {
    if (normalizedMessage.includes(normalize(signal))) {
      matchedSignals.push(signal);
      return "critical";
    }
  }

  for (const signal of urgencySignals.high) {
    if (normalizedMessage.includes(normalize(signal))) {
      matchedSignals.push(signal);
      return "high";
    }
  }

  for (const signal of urgencySignals.medium) {
    if (normalizedMessage.includes(normalize(signal))) {
      matchedSignals.push(signal);
      return "medium";
    }
  }

  return "low";
}

function resolveLegalPotential(
  hasDamage: boolean,
  hasEvidenceHint: boolean,
  urgency: TriageClassificationResult["urgency"]
): TriageClassificationResult["legalPotential"] {
  if (hasDamage && (hasEvidenceHint || urgency === "critical" || urgency === "high")) {
    return "high";
  }

  if (hasDamage || hasEvidenceHint || urgency === "medium") {
    return "medium";
  }

  return "low";
}

function resolvePriority(
  urgency: TriageClassificationResult["urgency"],
  legalPotential: TriageClassificationResult["legalPotential"]
): TriageClassificationResult["priority"] {
  if (urgency === "critical" || legalPotential === "high") {
    return "high";
  }

  if (urgency === "medium" || urgency === "high" || legalPotential === "medium") {
    return "medium";
  }

  return "low";
}

function resolveConfidence(
  caseType: TriageClassificationResult["caseType"],
  matchedSignals: string[],
  hasEvidenceHint: boolean
) {
  let confidence = caseType === "unclassified" ? 45 : 68;

  confidence += Math.min(matchedSignals.length * 6, 18);

  if (hasEvidenceHint) {
    confidence += 6;
  }

  return Math.min(confidence, 95);
}

function buildJourneyEvents(
  normalizedMessage: string,
  triage: TriageClassificationResult
): JourneyTimelineResult["events"] {
  const events: JourneyTimelineResult["events"] = [
    {
      order: 1,
      title: "Entrada do caso",
      description: "Relato inicial recebido e registrado na operacao.",
      approximateTiming: "primeiro contato",
      risk: false,
      evidenceHints: []
    }
  ];

  if (normalizedMessage.includes("hospital") || triage.caseType === "hospital_failure") {
    events.push({
      order: events.length + 1,
      title: "Atendimento hospitalar",
      description: "Narrativa menciona atendimento hospitalar ou internacao.",
      approximateTiming: "fase assistencial",
      risk: triage.urgency === "high" || triage.urgency === "critical",
      evidenceHints: ["prontuario", "alta"]
    });
  }

  if (normalizedMessage.includes("cirurgia")) {
    events.push({
      order: events.length + 1,
      title: "Procedimento cirurgico",
      description: "Relato menciona cirurgia ou decisao cirurgica.",
      approximateTiming: "durante o atendimento",
      risk: true,
      evidenceHints: ["laudo", "prontuario"]
    });
  }

  if (normalizedMessage.includes("alta")) {
    events.push({
      order: events.length + 1,
      title: "Alta ou encerramento",
      description: "Relato aponta alta, saida precoce ou encerramento do cuidado.",
      approximateTiming: "final do atendimento",
      risk: triage.urgency !== "low",
      evidenceHints: ["alta", "orientacoes"]
    });
  }

  if (normalizedMessage.includes("pior") || normalizedMessage.includes("piora")) {
    events.push({
      order: events.length + 1,
      title: "Agravamento dos sintomas",
      description: "Relato sugere piora apos o atendimento ou procedimento.",
      approximateTiming: "apos o evento principal",
      risk: true,
      evidenceHints: ["exame", "relatorio"]
    });
  }

  if (normalizedMessage.includes("plano") || normalizedMessage.includes("negativa")) {
    events.push({
      order: events.length + 1,
      title: "Negativa do plano",
      description: "Narrativa menciona negativa de cobertura ou autorizacao.",
      approximateTiming: "fase de acesso ao cuidado",
      risk: true,
      evidenceHints: ["negativa", "protocolo"]
    });
  }

  if (normalizedMessage.includes("laudo") || normalizedMessage.includes("prontuario")) {
    events.push({
      order: events.length + 1,
      title: "Documentacao identificada",
      description: "Relato menciona documentos que podem sustentar a prova.",
      approximateTiming: "coleta documental",
      risk: false,
      evidenceHints: ["laudo", "prontuario"]
    });
  }

  return events;
}

function resolveJourneyRisk(
  triage: TriageClassificationResult,
  events: JourneyTimelineResult["events"]
): JourneyTimelineResult["riskLevel"] {
  if (triage.urgency === "critical" || events.some((event) => event.risk && event.order <= 3)) {
    return "critical";
  }

  if (triage.urgency === "high" || events.some((event) => event.risk)) {
    return "high";
  }

  if (triage.urgency === "medium") {
    return "medium";
  }

  return "low";
}

function buildJourneySummary(
  triage: TriageClassificationResult,
  events: JourneyTimelineResult["events"]
) {
  const eventTitles = events.map((event) => event.title.toLowerCase());
  const suffix = eventTitles.length > 1 ? `: ${eventTitles.slice(1).join(", ")}` : ".";

  return `Jornada estruturada para caso ${triage.caseType} com foco em ${eventTitles[0]}${suffix}`;
}

function resolveJourneyConfidence(
  triage: TriageClassificationResult,
  events: JourneyTimelineResult["events"]
) {
  const base = triage.confidence >= 80 ? 78 : 64;
  const confidence = base + Math.min(events.length * 4, 16);

  return Math.min(confidence, 96);
}

function resolveClinicalRisk(
  triage: TriageClassificationResult,
  journey: JourneyTimelineResult,
  findings: ClinicalAnalysisResult["findings"]
): ClinicalAnalysisResult["riskLevel"] {
  if (triage.urgency === "critical" || journey.riskLevel === "critical") {
    return "critical";
  }

  if (triage.urgency === "high" || journey.riskLevel === "high" || findings.some((item) => item.risk)) {
    return "high";
  }

  if (triage.urgency === "medium" || journey.riskLevel === "medium") {
    return "medium";
  }

  return "low";
}

function resolveClinicalConfidence(
  triage: TriageClassificationResult,
  journey: JourneyTimelineResult,
  findings: ClinicalAnalysisResult["findings"]
) {
  const base = triage.confidence >= 80 || journey.confidence >= 80 ? 74 : 62;
  const confidence = base + Math.min(findings.length * 5, 20);

  return Math.min(confidence, 96);
}

function buildClinicalSummary(
  input: ClinicalAnalysisInput,
  findings: ClinicalAnalysisResult["findings"],
  riskLevel: ClinicalAnalysisResult["riskLevel"]
) {
  const headline = findings[0]?.description ?? "Analise clinica inicial sem achados relevantes.";
  return `Analise clinica do caso ${input.caseId} classificou risco ${riskLevel} com foco em ${headline}`;
}

function buildRequiredInformationRequests(
  items: EvidenceChecklistResult["items"],
  urgency: TriageClassificationResult["urgency"]
): EvidenceChecklistResult["requiredInformationRequests"] {
  const urgencyHours: Record<TriageClassificationResult["urgency"], number> = {
    low: 72,
    medium: 48,
    high: 24,
    critical: 12
  };

  const candidateItems = items.filter((item) => {
    if (item.status === "missing") {
      return item.importance === "critical" || item.importance === "high";
    }

    if (item.status === "partial") {
      return item.importance === "critical";
    }

    return false;
  });

  return candidateItems.map((item) => ({
    requestKey: `request_${item.itemKey}`,
    title: `Enviar ${item.label.toLowerCase()}`,
    justification: item.notes || "Documento essencial para robustez probatoria e redacao da peca.",
    urgency: urgency === "critical" || item.importance === "critical" ? "critical" : "high",
    dueInHours: urgencyHours[urgency],
    channelSuggestion: "whatsapp"
  }));
}

function buildClaimValueRecommendation(
  caseType: TriageClassificationResult["caseType"],
  complexity: LegalScoreResult["complexity"],
  viabilityScore: number,
  estimatedValueCents: number
) {
  const benchmarkDate = "2026-04-26";
  const benchmarks = [
    {
      segment: "baixa_complexidade" as const,
      minValueCents: 500000,
      medianValueCents: 1250000,
      maxValueCents: 2000000,
      sourceLabel: "Benchmark interno SAFETYCARE + mercado judicializacao saude",
      sourceDate: benchmarkDate
    },
    {
      segment: "media_complexidade" as const,
      minValueCents: 2000000,
      medianValueCents: 5000000,
      maxValueCents: 8000000,
      sourceLabel: "Benchmark interno SAFETYCARE + mercado judicializacao saude",
      sourceDate: benchmarkDate
    },
    {
      segment: "alta_complexidade" as const,
      minValueCents: 8000000,
      medianValueCents: 18000000,
      maxValueCents: 50000000,
      sourceLabel: "Benchmark interno SAFETYCARE + mercado judicializacao saude",
      sourceDate: benchmarkDate
    }
  ];

  const targetSegment =
    complexity === "high"
      ? benchmarks[2]
      : complexity === "medium"
        ? benchmarks[1]
        : benchmarks[0];

  const caseTypeMultiplier =
    caseType === "medical_error" || caseType === "hospital_failure"
      ? 1.15
      : caseType === "health_plan"
        ? 1.05
        : 0.95;

  const viabilityFactor = 0.8 + viabilityScore / 250;
  const suggestedClaimValueCents = Math.round(
    Math.max(targetSegment.minValueCents, estimatedValueCents * viabilityFactor * caseTypeMultiplier)
  );

  const suggestedMinValueCents = Math.max(
    targetSegment.minValueCents,
    Math.round(suggestedClaimValueCents * 0.75)
  );
  const suggestedMaxValueCents = Math.min(
    targetSegment.maxValueCents,
    Math.round(suggestedClaimValueCents * 1.3)
  );

  const confidenceBand =
    viabilityScore >= 75 ? "balanced" : viabilityScore >= 55 ? "conservative" : "aggressive";

  return {
    suggestedClaimValueCents,
    suggestedMinValueCents,
    suggestedMaxValueCents,
    confidenceBand,
    methodology:
      "Composicao de benchmark de mercado por faixa de complexidade, calibrada por tipo de caso, score de viabilidade e gravidade do dano documental.",
    benchmarks,
    assumptions: [
      "Valores preliminares para estrategia inicial e negociacao processual.",
      "Necessita validacao humana com documentos finais, pericia e jurisprudencia local.",
      "Nao substitui liquidacao de danos em fase instrutoria."
    ]
  };
}

function buildDraftingStyleGuide() {
  return {
    voice: "specialist_health_lawyer" as const,
    tone: ["tecnico", "objetivo", "forense", "sobrio", "assertivo_sem_excesso"] as const,
    forbiddenPatterns: [
      "Nao iniciar texto com auto-referencia de IA.",
      "Nao usar linguagem promocional ou promessa de resultado.",
      "Nao usar frases genericas sem fundamento tecnico-juridico."
    ],
    mandatorySections: [
      "fatos com cronologia clinica",
      "fundamentos legais aplicaveis",
      "jurisprudencia superior pertinente",
      "analise probatoria e nexo causal",
      "pedidos com tutela e delimitacao precisa"
    ],
    qualityChecklist: [
      "Cada alegacao relevante deve ter suporte documental indicado.",
      "Separar claramente premissa medica de conclusao juridica.",
      "Evitar adjetivacao excessiva e manter objetividade forense.",
      "Revisar coerencia entre causa de pedir, pedidos e valor da causa sugerido.",
      "Encerrar com alerta de validacao por advogado responsavel."
    ]
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
