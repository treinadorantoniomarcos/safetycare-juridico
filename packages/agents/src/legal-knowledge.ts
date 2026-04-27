import type {
  ClinicalAnalysisResult,
  EvidenceChecklistResult,
  RightsAssessmentResult,
  StrategicLegalGuidance,
  TriageClassificationResult
} from "@safetycare/ai-contracts";

type LegalKnowledgeInput = {
  triage: TriageClassificationResult;
  clinical: ClinicalAnalysisResult;
  rights: RightsAssessmentResult;
  evidence: EvidenceChecklistResult;
};

const asOfDate = "2026-04-26";

const statutoryReferences: StrategicLegalGuidance["statutoryReferences"] = [
  {
    key: "lei_15378_2026",
    title: "Lei no 15.378/2026 (Estatuto dos Direitos do Paciente)",
    authority: "Presidencia da Republica",
    scope: "Direitos, deveres e responsabilidade assistencial em saude",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15378.htm"
  },
  {
    key: "cf_1988_saude",
    title: "Constituicao Federal de 1988 (arts. 6o, 23, II, 196 a 200)",
    authority: "Presidencia da Republica",
    scope: "Direito fundamental a saude e competencia comum dos entes federativos",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm"
  },
  {
    key: "lgpd_13709_2018",
    title: "Lei no 13.709/2018 (LGPD)",
    authority: "Presidencia da Republica",
    scope: "Tratamento de dados pessoais e dados sensiveis de saude",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
  },
  {
    key: "lei_9656_1998",
    title: "Lei no 9.656/1998 (Planos e Seguros Privados de Assistencia a Saude)",
    authority: "Presidencia da Republica",
    scope: "Regime juridico da saude suplementar",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l9656.htm"
  },
  {
    key: "lei_8906_1994",
    title: "Lei no 8.906/1994 (Estatuto da Advocacia e da OAB)",
    authority: "Presidencia da Republica",
    scope: "Etica, deveres profissionais e infracoes disciplinares",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8906.htm"
  }
];

const jurisprudentialReferencesBase: StrategicLegalGuidance["jurisprudentialReferences"] = [
  {
    key: "stf_tema_793",
    title: "STF Tema 793 - Responsabilidade solidaria dos entes federativos em saude",
    authority: "Supremo Tribunal Federal",
    scope: "Demandas prestacionais no SUS",
    url: "https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?classeProcesso=RE&incidente=4678356&numeroProcesso=855178&numeroTema=793"
  },
  {
    key: "stf_tema_500",
    title: "STF Tema 500 - Medicamento sem registro na Anvisa",
    authority: "Supremo Tribunal Federal",
    scope: "Requisitos para excecao e vedacao de experimental",
    url: "https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?classeProcesso=RE&incidente=4143144&numeroProcesso=657718&numeroTema=500"
  },
  {
    key: "stf_tema_1234",
    title: "STF Tema 1234 - Medicamento registrado na Anvisa e nao incorporado ao SUS",
    authority: "Supremo Tribunal Federal",
    scope: "Competencia, legitimidade passiva e criterios de concessao",
    url: "https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?classeProcesso=RE&incidente=6335939&numeroProcesso=1366243&numeroTema=1234"
  },
  {
    key: "stj_tema_106",
    title: "STJ Tema 106 - Fornecimento de medicamentos fora das listas do SUS",
    authority: "Superior Tribunal de Justica",
    scope: "Requisitos para concessao judicial em saude publica",
    url: "https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&cod_tema_inicial=106&cod_tema_final=106"
  },
  {
    key: "stj_rol_ans_2022",
    title: "STJ - Rol da ANS (taxatividade mitigada)",
    authority: "Superior Tribunal de Justica",
    scope: "Criterios de cobertura excepcional em saude suplementar",
    url: "https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/08062022-Rol-da-ANS-e-taxativo--com-possibilidades-de-cobertura-de-procedimentos-nao-previstos-na-lista.aspx"
  }
];

const regulatoryReferences: StrategicLegalGuidance["regulatoryReferences"] = [
  {
    key: "cnj_res_530_2023",
    title: "Resolucao CNJ no 530/2023",
    authority: "Conselho Nacional de Justica",
    scope: "Politica Judiciaria de Resolucao Adequada das Demandas de Saude",
    url: "https://atos.cnj.jus.br/atos/detalhar/5330"
  },
  {
    key: "cnj_enatjus",
    title: "e-NatJus",
    authority: "Conselho Nacional de Justica",
    scope: "Notas tecnicas e apoio tecnico-cientifico para demandas de saude",
    url: "https://www.cnj.jus.br/programas-e-acoes/forum-da-saude-3/e-natjus/"
  },
  {
    key: "ans_estatuto_paciente_2026",
    title: "ANS destaca Lei no 15.378/2026",
    authority: "ANS",
    scope: "Aplicacao do Estatuto do Paciente no setor suplementar",
    url: "https://www.gov.br/ans/pt-br/assuntos/noticias/beneficiario/ans-destaca-lei-no-15-378-institui-estatuto-dos-direitos-do-paciente"
  },
  {
    key: "conitec",
    title: "CONITEC",
    authority: "Ministerio da Saude",
    scope: "Avaliacao e incorporacao de tecnologias no SUS",
    url: "https://www.gov.br/conitec/pt-br"
  },
  {
    key: "anvisa",
    title: "Anvisa",
    authority: "Anvisa",
    scope: "Registro sanitario e monitoramento de medicamentos e produtos",
    url: "https://www.gov.br/anvisa/pt-br"
  },
  {
    key: "oab_provimento_205",
    title: "Provimento no 205/2021 (Marketing Juridico)",
    authority: "Conselho Federal da OAB",
    scope: "Diretrizes de publicidade informativa e vedacoes eticas",
    url: "https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021"
  },
  {
    key: "oab_codigo_etica",
    title: "Codigo de Etica e Disciplina da OAB (Res. 02/2015)",
    authority: "Conselho Federal da OAB",
    scope: "Normas eticas para comunicacao e captacao de clientela",
    url: "https://www.oab.org.br/leisnormas/legislacao/resolucoes/02-2015"
  }
];

const internationalReferences: StrategicLegalGuidance["internationalReferences"] = [
  {
    key: "eu_directive_2011_24",
    title: "Directive 2011/24/EU",
    authority: "Uniao Europeia",
    scope: "Direitos dos pacientes em cuidados de saude transfronteiricos",
    url: "https://eur-lex.europa.eu/eli/dir/2011/24/oj/eng"
  },
  {
    key: "oviedo_convention",
    title: "Convention on Human Rights and Biomedicine (Oviedo)",
    authority: "Council of Europe",
    scope: "Consentimento informado, autonomia e privacidade em saude",
    url: "https://www.coe.int/en/web/human-rights-and-biomedicine/the-oviedo-convention-and-human-rights-principles-regarding-health"
  },
  {
    key: "hipaa_privacy_rule",
    title: "HIPAA Privacy Rule",
    authority: "U.S. Department of Health and Human Services",
    scope: "Privacidade e acesso a informacao de saude",
    url: "https://www.hhs.gov/hipaa/for-professionals/privacy/index.html"
  },
  {
    key: "emtala",
    title: "Emergency Medical Treatment and Labor Act (EMTALA)",
    authority: "Centers for Medicare & Medicaid Services",
    scope: "Triagem, estabilizacao e transferencia em emergencia",
    url: "https://www.cms.gov/medicare/regulations-guidance/legislation/emergency-medical-treatment-labor-act"
  }
];

const bibliography: StrategicLegalGuidance["bibliography"] = [
  {
    area: "direito_saude",
    focusTopics: [
      "judicializacao da saude",
      "fornecimento de medicamentos e tecnologias",
      "competencia federativa e politicas publicas"
    ],
    recommendedDatabases: ["STF", "STJ", "CNJ", "SciELO", "CAPES", "BVS"],
    priorityKeywords: ["direito a saude", "judicializacao", "SUS", "CONITEC", "ANS"]
  },
  {
    area: "direito_medico",
    focusTopics: [
      "responsabilidade civil medica e hospitalar",
      "dever de informacao e consentimento informado",
      "nexo causal e prova tecnica"
    ],
    recommendedDatabases: ["STJ", "TRFs", "TJs", "SciELO", "BDTD"],
    priorityKeywords: ["erro medico", "falha assistencial", "nexo causal", "consentimento informado"]
  },
  {
    area: "direito_odontologico",
    focusTopics: [
      "responsabilidade profissional odontologica",
      "obrigacao de meio e de resultado em estetica",
      "prontuario odontologico e prova pericial"
    ],
    recommendedDatabases: ["TJs", "TRFs", "SciELO", "BBO", "LILACS"],
    priorityKeywords: ["responsabilidade odontologica", "odontologia estetica", "prontuario odontologico"]
  },
  {
    area: "bioetica_medica",
    focusTopics: [
      "autonomia relacional",
      "vulnerabilidade e decisao compartilhada",
      "consentimento livre e esclarecido"
    ],
    recommendedDatabases: ["BVS", "SciELO", "PubMed", "CAPES"],
    priorityKeywords: ["bioetica clinica", "autonomia do paciente", "direitos humanos dos pacientes"]
  },
  {
    area: "cuidados_paliativos",
    focusTopics: [
      "dignidade no fim da vida",
      "diretivas antecipadas de vontade",
      "proporcionalidade terapeutica e controle de dor"
    ],
    recommendedDatabases: ["ANCP", "BVS", "SciELO", "PubMed"],
    priorityKeywords: ["cuidados paliativos", "ortotanasia", "diretivas antecipadas", "morte digna"]
  }
];

const essentialReferenceKeys = new Set([
  "lei_15378_2026",
  "lgpd_13709_2018",
  "lei_8906_1994",
  "stf_tema_793",
  "stf_tema_500",
  "stf_tema_1234",
  "stj_tema_106",
  "stj_rol_ans_2022",
  "cnj_res_530_2023",
  "cnj_enatjus"
]);

function resolveJurisprudenceReferences(
  triage: TriageClassificationResult
): StrategicLegalGuidance["jurisprudentialReferences"] {
  if (triage.caseType === "health_plan") {
    return jurisprudentialReferencesBase.filter(
      (reference) =>
        reference.key === "stj_rol_ans_2022" ||
        reference.key === "stf_tema_500" ||
        reference.key === "stf_tema_1234"
    );
  }

  if (triage.caseType === "hospital_failure" || triage.caseType === "medical_error") {
    return jurisprudentialReferencesBase.filter(
      (reference) =>
        reference.key === "stf_tema_793" ||
        reference.key === "stj_tema_106" ||
        reference.key === "stj_rol_ans_2022"
    );
  }

  return jurisprudentialReferencesBase;
}

function resolveLgpdGuidance(input: LegalKnowledgeInput): StrategicLegalGuidance["lgpd"] {
  const containsSensitiveHealthData = true;
  const hasHighRisk =
    input.clinical.riskLevel === "critical" ||
    input.clinical.riskLevel === "high" ||
    input.rights.violationCount >= 2;

  const legalBases: StrategicLegalGuidance["lgpd"]["legalBases"] = hasHighRisk
    ? ["regular_exercise_of_rights", "health_protection", "legal_obligation"]
    : ["consent", "regular_exercise_of_rights"];

  return {
    containsSensitiveHealthData,
    legalBases,
    safeguards: [
      "Aplicar minimizacao de dados no intake e em todos os relatorios tecnicos.",
      "Manter trilha de acesso por perfil com controle estrito para dados sensiveis.",
      "Anonimizar prontuarios para uso analitico e treinamento interno.",
      "Registrar base legal, finalidade e tempo de retencao por categoria documental.",
      "Bloquear compartilhamento externo sem autorizacao e validacao de advogado responsavel."
    ]
  };
}

function resolveOabMarketingGuidance(): StrategicLegalGuidance["oabMarketing"] {
  return {
    allowedPractices: [
      "Comunicacao informativa, educativa e institucional com linguagem sobria.",
      "Divulgacao de areas de atuacao, equipe, canais de contato e conteudo tecnico.",
      "Uso de redes sociais sem promessa de resultado e sem mercantilizacao da advocacia."
    ],
    forbiddenPractices: [
      "Promessa de ganho de causa, garantia de indenizacao ou comparacao com concorrentes.",
      "Captacao indevida de clientela com sensacionalismo, assedio ou oferta de vantagens.",
      "Exibicao de casos concretos com identificacao de pacientes sem anonimizar dados."
    ],
    mandatoryDisclaimers: [
      "Material de apoio tecnico-juridico sujeito a revisao por advogado regularmente inscrito na OAB.",
      "Conteudo informativo sem promessa de resultado e sem substituicao de consulta juridica individualizada."
    ],
    references: [
      {
        key: "lei_8906_1994",
        title: "Lei no 8.906/1994 (Estatuto da Advocacia e da OAB)",
        authority: "Presidencia da Republica",
        scope: "Infracoes disciplinares e vedacao de captacao indevida",
        url: "https://www.planalto.gov.br/ccivil_03/leis/l8906.htm"
      },
      {
        key: "provimento_205_2021",
        title: "Provimento no 205/2021",
        authority: "Conselho Federal da OAB",
        scope: "Publicidade profissional e marketing juridico",
        url: "https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021"
      },
      {
        key: "ced_oab_2015",
        title: "Codigo de Etica e Disciplina da OAB (Res. 02/2015)",
        authority: "Conselho Federal da OAB",
        scope: "Parametros eticos para publicidade na advocacia",
        url: "https://www.oab.org.br/leisnormas/legislacao/resolucoes/02-2015"
      }
    ]
  };
}

function buildJurisprudenceQueryTerms(triage: TriageClassificationResult): string[] {
  const baseTerms = [
    "lei 15.378/2026 estatuto dos direitos do paciente",
    "violacao de consentimento informado em saude",
    "acesso ao prontuario e direito do paciente",
    "seguranca do paciente falha assistencial",
    "responsabilidade civil hospitalar dano moral em saude",
    "stf tema 793 demanda de saude",
    "stf tema 500 anvisa medicamento sem registro",
    "stf tema 1234 medicamento nao incorporado sus",
    "stj tema 106 fornecimento de medicamento",
    "rol ans taxatividade mitigada stj"
  ];

  if (triage.caseType === "health_plan") {
    return [...baseTerms, "negativa de cobertura plano de saude urgencia emergencia"];
  }

  if (triage.caseType === "aesthetic") {
    return [...baseTerms, "responsabilidade civil procedimento estetico consentimento informado"];
  }

  return [...baseTerms, "falha hospitalar alta indevida continuidade do cuidado"];
}

function buildSourceAccessControl(
  references: Array<{ key: string; url: string }>
): StrategicLegalGuidance["sourceAccessControl"] {
  const checkedAt = new Date().toISOString();
  const sourceItems: StrategicLegalGuidance["sourceAccessControl"]["sourceItems"] = references.map(
    (reference) => ({
      referenceKey: reference.key,
      referenceUrl: reference.url,
      isEssential: essentialReferenceKeys.has(reference.key),
      status: "not_checked",
      lastCheckedAt: checkedAt,
      details: "Acesso automatico nao confirmado nesta execucao."
    })
  );

  const inaccessibleEssentialSources = sourceItems.filter(
    (item) => item.isEssential && item.status !== "verified"
  );

  return {
    policy: "must_verify_before_legal_drafting",
    checkedAt,
    sourceItems,
    inaccessibleEssentialSources,
    canDraftProceduralPiece: inaccessibleEssentialSources.length === 0,
    blockingMessage:
      inaccessibleEssentialSources.length > 0
        ? "Nao foi possivel confirmar acesso atualizado a fontes imprescindiveis. Revisao humana e checagem oficial obrigatorias antes de elaborar peca processual."
        : undefined
  };
}

export function buildStrategicLegalGuidance(
  input: LegalKnowledgeInput
): StrategicLegalGuidance {
  const jurisprudentialReferences = resolveJurisprudenceReferences(input.triage);
  const allReferences = [
    ...statutoryReferences,
    ...jurisprudentialReferences,
    ...regulatoryReferences,
    ...internationalReferences
  ];

  return {
    statutoryReferences,
    jurisprudentialReferences,
    regulatoryReferences,
    internationalReferences,
    lgpd: resolveLgpdGuidance(input),
    oabMarketing: resolveOabMarketingGuidance(),
    bibliography,
    jurisprudenceResearch: {
      asOfDate,
      officialSources: [
        "https://portal.stf.jus.br/",
        "https://www.stj.jus.br/",
        "https://www.cnj.jus.br/",
        "https://www.tst.jus.br/",
        "https://www.oab.org.br/leisnormas/legislacao"
      ],
      queryTerms: buildJurisprudenceQueryTerms(input.triage),
      notes: [
        "Priorizar bases oficiais e registrar data da consulta em cada parecer.",
        "Pesquisar termos do Estatuto do Paciente em conjunto com direitos especificos (consentimento, prontuario, seguranca, autonomia).",
        "Em caso de divergencia entre tribunais, sinalizar precedente vinculante superior no resumo executivo."
      ]
    },
    sourceAccessControl: buildSourceAccessControl(allReferences)
  };
}
