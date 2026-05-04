import {
  legalDocumentPackSchema,
  type LegalBriefInput,
  type LegalDocumentPack,
  type LegalSupportingDocument
} from "@safetycare/ai-contracts";

type CivilHealthSupportInput = Omit<LegalBriefInput, "caseId" | "workflowJobId" | "draftScope">;

const problemTypeLabels: Record<CivilHealthSupportInput["problemType"], string> = {
  atendimento: "falha no atendimento",
  plano: "negativa de cobertura por plano de saude",
  hospital: "falha hospitalar",
  medico: "erro medico",
  clinica: "falha de clinica",
  medicamento: "fornecimento de medicamento",
  cirurgia: "autorizacao de procedimento cirurgico",
  uti: "internacao em UTI",
  reembolso: "reembolso de despesas assistenciais",
  outro: "falha assistencial"
};

const lawFirmIdentity = {
  primaryLawyerName: "Dr. Flavio Jose Souza da Silva",
  primaryLawyerOab: "OAB-PR 35.358",
  secondaryLawyerName: "Dra. Polyana Assis",
  secondaryLawyerOab: "OAB-GO 70.985",
  officeName: "FLAVIO JOSE S. SILVA Advocacia",
  officeAddress: "Edificio Flamboyant Park Business, n. 3455, sala 711, Jardim Goias, CEP 74.810-180, Goiania-GO"
} as const;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatUrgency(value: CivilHealthSupportInput["currentUrgency"]) {
  switch (value) {
    case "critical":
      return "critica";
    case "high":
      return "alta";
    case "medium":
      return "media";
    default:
      return "baixa";
  }
}

function buildPowerOfAttorneyDocument(
  input: CivilHealthSupportInput,
  problemTypeLabel: string
): LegalSupportingDocument {
  const subtitle = `Mandato civel e extrajudicial para ${problemTypeLabel}`;

  const markdown = [
    "PROCURAÇÃO",
    "",
    "{{outorgante_nome}}, brasileiro(a), {{estado_civil}}, {{profissao}}, inscrito(a) no CPF nº {{outorgante_cpf}} e no RG {{outorgante_rg}}, e-mail {{outorgante_email}}, celular {{outorgante_telefone}}, residente e domiciliado(a) em {{outorgante_endereco}}, por este instrumento particular nomeia e constitui seus bastante procuradores o " +
      `${lawFirmIdentity.primaryLawyerName}, ${lawFirmIdentity.primaryLawyerOab}, e a ${lawFirmIdentity.secondaryLawyerName}, ${lawFirmIdentity.secondaryLawyerOab}, ambos com escritório profissional em ${lawFirmIdentity.officeAddress}, ` +
      "para o foro em geral, com a cláusula ad judicia, ad negotia e et extra, especialmente para representar em demandas cíveis e de saúde relacionadas a " +
      `${problemTypeLabel}, podendo, para tanto, praticar todos os atos necessários à defesa de seus interesses, em qualquer juízo, instância ou tribunal, bem como perante repartições públicas, autarquias, instituições bancárias, operadoras de saude e órgãos administrativos.`,
    "",
    "Ficam expressamente conferidos poderes para propor ações, apresentar defesas, petições e manifestações, acompanhar o feito, requerer diligências, produzir provas, requerer perícias, participar de audiências, receber intimações e notificações, firmar acordos, transigir, desistir, reconhecer a procedência do pedido, receber e dar quitação, firmar compromissos, requerer alvarás judiciais, assinar termos de recebimento e substabelecer, com ou sem reserva de poderes, quando necessário.",
    "",
    "O presente modelo deve ser conferido pela equipe humana antes da assinatura, com ajuste do número dos autos, quando houver, e com adequação dos poderes especiais ao caso concreto.",
    "",
    "Junto aos autos de número: {{numero_dos_autos}}",
    "",
    `{{cidade}}, {{data_da_outorga}}`
  ].join("\n");

  return {
    key: "procurao_civel_saude",
    type: "power_of_attorney",
    title: "Procuração",
    subtitle,
    summary: `Modelo de mandato judicial e extrajudicial para ${problemTypeLabel}, com contexto de urgencia ${formatUrgency(input.currentUrgency)} em ${normalizeText(input.city)}.`,
    placeholders: [
      "outorgante_nome",
      "outorgante_cpf",
      "outorgante_rg",
      "outorgante_email",
      "outorgante_telefone",
      "outorgante_endereco",
      "numero_dos_autos",
      "cidade",
      "data_da_outorga"
    ],
    reviewNotes: [
      "Ajustar a qualificacao do outorgante antes da assinatura, especialmente se o contratante nao for o proprio paciente.",
      "Conferir se os poderes especiais estao adequados ao tipo de medida que sera proposta.",
      "Definir se o cartorio ou o tribunal exigira firma reconhecida."
    ],
    markdown
  };
}

function buildFeeAgreementDocument(
  input: CivilHealthSupportInput,
  problemTypeLabel: string,
  urgencyLabel: string
): LegalSupportingDocument {
  const subtitle = `Contrato parametrizado para ${problemTypeLabel}`;

  const markdown = [
    "CONTRATO DE PRESTACAO DE SERVICOS E HONORARIOS ADVOCATICIOS",
    "",
    `Que entre si celebram {{contratante_nome}}, {{contratante_estado_civil}}, {{contratante_profissao}}, inscrito(a) no CPF nº {{contratante_cpf}} e no RG {{contratante_rg}}, e-mail {{contratante_email}}, telefone {{contratante_telefone}}, residente e domiciliado(a) em {{contratante_endereco}}, doravante denominado(a) CONTRATANTE, e, de outro lado, ${lawFirmIdentity.primaryLawyerName} ${lawFirmIdentity.primaryLawyerOab} e ${lawFirmIdentity.secondaryLawyerName} ${lawFirmIdentity.secondaryLawyerOab}, integrantes do escritório ${lawFirmIdentity.officeName}, localizado em ${lawFirmIdentity.officeAddress}, doravante denominados CONTRATADOS, tendo entre si justo e contratado o seguinte:`,
    "",
    "I - OBJETO DO CONTRATO",
    "CLAUSULA PRIMEIRA: O objeto do presente contrato consiste na prestacao de servicos profissionais dos CONTRATADOS para atuacao judicial e extrajudicial em demanda civel e de saude relacionada a " +
      `${problemTypeLabel}, com base nas informacoes prestadas no formulario de analise, incluindo a elaboracao de peticoes, manifestacoes, acompanhamento processual, audiencia, negociacao e demais atos necessarios ao patrocino da causa, observada a estrategia definida pela equipe humana.`,
    "",
    "II - DEVERES DOS CONTRATADOS",
    "CLAUSULA SEGUNDA: Os CONTRATADOS comprometem-se a empregar zelo tecnico e diligencia profissional, buscando o melhor resultado possivel para a causa, sem promessa de resultado, com revisao humana obrigatoria das pecas antes do protocolo.",
    "",
    "III - DEVERES DO CONTRATANTE",
    "CLAUSULA TERCEIRA: O CONTRATANTE obriga-se a fornecer informacoes verdadeiras e completas, manter seus contatos atualizados, entregar documentos e provas uteis, comparecer aos atos necessarios e comunicar imediatamente qualquer alteracao relevante do caso.",
    "",
    "IV - HONORARIOS ADVOCATICIOS",
    "CLAUSULA QUARTA: Em remuneracao aos servicos prestados, o CONTRATANTE pagara honorarios advocaticios no valor total de R$ {{valor_total_dos_honorarios}}, em {{forma_de_pagamento}}, com eventual previsao de honorarios de exito de {{percentual_de_exito}}, se aplicavel e se expressamente aprovada na revisao humana.",
    "",
    "V - CUSTAS E DESPESAS",
    "CLAUSULA QUINTA: Despesas extraordinarias, custas, emolumentos, laudos, copias, autenticacoes, atas notariais e demais gastos necessarios poderao ser reembolsados pelo CONTRATANTE, mediante demonstrativo e comprovacao.",
    "",
    "VI - RESCISAO E MULTA",
    "CLAUSULA SEXTA: O inadimplemento, a rescisao antecipada ou a desistencia injustificada poderao gerar multa contratual, sem prejuizo da apuracao do trabalho ja executado, conforme ajuste final da equipe responsavel.",
    "",
    "VII - FORO",
    "CLAUSULA SETIMA: Fica eleito o foro de {{foro_competente}}, com renuncia a qualquer outro, por mais privilegiado que seja.",
    "",
    "VIII - REVISAO HUMANA",
    "CLAUSULA OITAVA: Esta minuta e meramente parametrica e deve ser conferida antes da assinatura, com ajuste dos valores, do foro, do regime de honorarios e do escopo exato da contratacao.",
    "",
    `Contexto do caso: ${normalizeText(input.city)} | urgencia ${urgencyLabel} | ${input.keyDates.length} data(s)-chave informada(s).`,
    "",
    `{{cidade}}, {{data_da_assinatura}}`,
    "",
    "CONTRATANTE: ____________________________________",
    "",
    "CONTRATADOS: ____________________________________",
    "",
    "TESTEMUNHAS: ____________________________________"
  ].join("\n");

  return {
    key: "contrato_honorarios_civel_saude",
    type: "fee_agreement",
    title: "Contrato de prestação de serviços e honorários advocatícios",
    subtitle,
    summary:
      "Modelo de contrato com campos variaveis para honorarios, forma de pagamento, foro e reembolso de despesas.",
    placeholders: [
      "contratante_nome",
      "contratante_estado_civil",
      "contratante_profissao",
      "contratante_cpf",
      "contratante_rg",
      "contratante_email",
      "contratante_telefone",
      "contratante_endereco",
      "valor_total_dos_honorarios",
      "forma_de_pagamento",
      "percentual_de_exito",
      "foro_competente",
      "cidade",
      "data_da_assinatura"
    ],
    reviewNotes: [
      "Definir valor, parcela inicial, vencimentos e eventual percentual de exito antes da assinatura.",
      "Conferir se o regime de reembolso de despesas e a multa contratual estao adequados ao caso concreto.",
      "Ajustar o foro e o escopo da contratacao conforme a estrategia humanamente aprovada."
    ],
    markdown
  };
}

export function buildCivilHealthSupportingDocumentPack(
  input: CivilHealthSupportInput
): LegalDocumentPack {
  const problemTypeLabel = problemTypeLabels[input.problemType];
  const urgencyLabel = formatUrgency(input.currentUrgency);
  const documents = [
    buildPowerOfAttorneyDocument(input, problemTypeLabel),
    buildFeeAgreementDocument(input, problemTypeLabel, urgencyLabel)
  ];

  return legalDocumentPackSchema.parse({
    draftScope: "civil_health",
    title: "Modelos complementares",
    subtitle: "Procuração e contrato de honorarios parametrizados para revisao humana",
    summary: `Pacote complementar com ${documents.length} modelo(s) para ${problemTypeLabel} e urgencia ${urgencyLabel}.`,
    documents,
    generatedAt: new Date().toISOString()
  });
}
