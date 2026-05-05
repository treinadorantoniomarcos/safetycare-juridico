import { describe, expect, it } from "vitest";
import {
  auditLogEventSchema,
  clinicalAnalysisSchema,
  caseInitializationSchema,
  consentSchema,
  conversionDecisionSchema,
  evidenceChecklistSchema,
  journeyTimelineSchema,
  legalScoreSchema,
  leadIntakeSchema,
  legalDocumentPackSchema,
  legalArtifactRevisionSchema,
  legalBriefInputSchema,
  scoreReviewDecisionSchema,
  rightsAssessmentSchema,
  triageClassificationSchema
} from "../src";

describe("leadIntakeSchema", () => {
  it("accepts a valid intake payload", () => {
    const result = leadIntakeSchema.parse({
      source: "form",
      name: "Maria da Silva",
      phone: "11999999999",
      message: "Sai do hospital pior do que entrei e preciso de orientacao."
    });

    expect(result.source).toBe("form");
  });

  it("rejects message shorter than minimum length", () => {
    const result = leadIntakeSchema.safeParse({
      source: "site",
      message: "curta"
    });

    expect(result.success).toBe(false);
  });
});

describe("consentSchema", () => {
  it("accepts a consent payload", () => {
    const result = consentSchema.parse({
      status: "granted",
      version: "v1",
      acceptedAt: "2026-04-25T12:00:00.000Z"
    });

    expect(result.status).toBe("granted");
  });
});

describe("conversionDecisionSchema", () => {
  it("accepts a valid conversion decision payload", () => {
    const result = conversionDecisionSchema.parse({
      decision: "signed",
      closerId: "closer-1",
      note: "Cliente assinou termo de representacao."
    });

    expect(result.decision).toBe("signed");
  });
});

describe("caseInitializationSchema", () => {
  it("creates a valid initialization contract", () => {
    const result = caseInitializationSchema.parse({
      leadId: "11111111-1111-4111-8111-111111111111",
      client: {
        fullName: "Joao Pereira"
      },
      case: {
        source: "whatsapp"
      }
    });

    expect(result.case.legalStatus).toBe("intake");
  });
});

describe("auditLogEventSchema", () => {
  it("requires actor metadata", () => {
    const result = auditLogEventSchema.safeParse({
      actorType: "system",
      action: "lead.created"
    });

    expect(result.success).toBe(false);
  });
});

describe("triageClassificationSchema", () => {
  it("accepts a valid triage result", () => {
    const result = triageClassificationSchema.parse({
      caseType: "hospital_failure",
      priority: "high",
      urgency: "critical",
      hasDamage: true,
      legalPotential: "high",
      confidence: 84,
      rationale: {
        matchedSignals: ["uti", "piora"],
        notes: ["Relato sugere agravamento apos internacao."]
      }
    });

    expect(result.caseType).toBe("hospital_failure");
    expect(result.confidence).toBe(84);
  });
});

describe("journeyTimelineSchema", () => {
  it("accepts a valid journey timeline", () => {
    const result = journeyTimelineSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      summary: "Entrada hospitalar seguida de agravamento e alta prematura.",
      riskLevel: "high",
      confidence: 79,
      events: [
        {
          order: 1,
          title: "Entrada hospitalar",
          description: "Paciente buscou atendimento e foi internado.",
          approximateTiming: "inicio do relato",
          risk: false,
          evidenceHints: ["prontuario"]
        },
        {
          order: 2,
          title: "Agravamento",
          description: "Relato indica piora apos a intervencao.",
          risk: true,
          evidenceHints: []
        }
      ]
    });

    expect(result.riskLevel).toBe("high");
    expect(result.events).toHaveLength(2);
  });
});

describe("clinicalAnalysisSchema", () => {
  it("accepts a valid clinical analysis", () => {
    const result = clinicalAnalysisSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      summary: "Atraso, alta precoce e ausencia de intervencao adequada.",
      riskLevel: "critical",
      confidence: 88,
      findings: [
        {
          order: 1,
          findingType: "delay",
          description: "Houve atraso na conduta assistencial.",
          risk: true,
          evidenceHints: ["prontuario"]
        }
      ]
    });

    expect(result.riskLevel).toBe("critical");
    expect(result.findings).toHaveLength(1);
  });
});

describe("rightsAssessmentSchema", () => {
  it("accepts a valid rights assessment", () => {
    const result = rightsAssessmentSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "form",
      summary: "Foram detectadas 2 possiveis violacoes de direitos do paciente.",
      confidence: 84,
      violationCount: 2,
      rights: [
        {
          rightKey: "clear_information",
          status: "possible_violation",
          justification: "Relato indica ausencia de orientacao clara na alta.",
          signals: ["sem orientacao", "alta"]
        },
        {
          rightKey: "informed_consent",
          status: "ok",
          justification: "Nao ha sinal claro de ausencia de consentimento informado.",
          signals: []
        },
        {
          rightKey: "records_access",
          status: "ok",
          justification: "Nao ha indicio de negativa de acesso ao prontuario.",
          signals: []
        },
        {
          rightKey: "continuity_of_care",
          status: "possible_violation",
          justification: "Agravamento apos alta sugere risco de descontinuidade do cuidado.",
          signals: ["piora", "alta"]
        },
        {
          rightKey: "patient_safety",
          status: "ok",
          justification: "Nao foram detectados sinais suficientes para afirmar violacao.",
          signals: []
        }
      ]
    });

    expect(result.violationCount).toBe(2);
    expect(result.rights).toHaveLength(5);
  });
});

describe("evidenceChecklistSchema", () => {
  it("accepts a valid evidence checklist", () => {
    const result = evidenceChecklistSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      source: "whatsapp",
      summary: "Checklist probatorio inicial com lacunas relevantes.",
      confidence: 81,
      missingCount: 2,
      items: [
        {
          itemKey: "medical_records",
          label: "Prontuario medico completo",
          status: "missing",
          importance: "critical",
          notes: "Solicitar ao hospital com urgencia.",
          sourceHints: ["prontuario", "hospital"]
        }
      ]
    });

    expect(result.missingCount).toBe(2);
    expect(result.items[0]?.importance).toBe("critical");
  });
});

describe("legalScoreSchema", () => {
  it("accepts a valid legal score payload", () => {
    const result = legalScoreSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      viabilityScore: 79,
      complexity: "high",
      estimatedValueCents: 12000000,
      confidence: 83,
      reviewRequired: true,
      reviewReasons: ["high_complexity"],
      strategicLegalGuidance: {
        statutoryReferences: [
          {
            key: "lei_15378_2026",
            title: "Lei no 15.378/2026",
            authority: "Presidencia da Republica",
            scope: "Estatuto dos Direitos do Paciente",
            url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15378.htm"
          }
        ],
        jurisprudentialReferences: [
          {
            key: "stf_tema_793",
            title: "Tema 793",
            authority: "STF",
            scope: "Responsabilidade solidaria",
            url: "https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?numeroTema=793"
          }
        ],
        regulatoryReferences: [
          {
            key: "cnj_res_530_2023",
            title: "Resolucao CNJ 530/2023",
            authority: "CNJ",
            scope: "Politica de demandas em saude",
            url: "https://atos.cnj.jus.br/atos/detalhar/5330"
          }
        ],
        internationalReferences: [
          {
            key: "oviedo_convention",
            title: "Convencao de Oviedo",
            authority: "Council of Europe",
            scope: "Consentimento e autonomia",
            url: "https://www.coe.int/en/web/human-rights-and-biomedicine/the-oviedo-convention-and-human-rights-principles-regarding-health"
          }
        ],
        lgpd: {
          containsSensitiveHealthData: true,
          legalBases: ["regular_exercise_of_rights"],
          safeguards: ["minimizacao", "controle de acesso", "trilha de auditoria"]
        },
        oabMarketing: {
          allowedPractices: ["comunicacao informativa", "conteudo educativo"],
          forbiddenPractices: ["promessa de resultado", "captacao indevida"],
          mandatoryDisclaimers: ["revisao humana obrigatoria"],
          references: [
            {
              key: "provimento_205_2021",
              title: "Provimento 205/2021",
              authority: "OAB",
              scope: "Marketing juridico",
              url: "https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021"
            }
          ]
        },
        bibliography: [
          {
            area: "direito_saude",
            focusTopics: ["judicializacao", "direito fundamental"],
            recommendedDatabases: ["STF"],
            priorityKeywords: ["estatuto do paciente", "direito a saude", "judicializacao"]
          }
        ],
        jurisprudenceResearch: {
          asOfDate: "2026-04-26",
          officialSources: ["https://portal.stf.jus.br/"],
          queryTerms: [
            "estatuto dos direitos do paciente",
            "consentimento informado",
            "acesso a prontuario",
            "seguranca do paciente",
            "responsabilidade assistencial"
          ],
          notes: ["usar bases oficiais"]
        },
        sourceAccessControl: {
          policy: "must_verify_before_legal_drafting",
          checkedAt: "2026-04-26T12:00:00.000Z",
          sourceItems: [
            {
              referenceKey: "lei_15378_2026",
              referenceUrl:
                "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15378.htm",
              isEssential: true,
              status: "verified",
              lastCheckedAt: "2026-04-26T12:00:00.000Z",
              details: "fonte acessada"
            }
          ],
          inaccessibleEssentialSources: [],
          canDraftProceduralPiece: true
        }
      },
      rationale: {
        inputs: ["triage", "journey", "clinical", "rights", "evidence"],
        notes: ["Dano relevante com lacuna documental critica."],
        legalAuthorities: [
          {
            key: "lei_15378_2026",
            title: "Lei no 15.378/2026",
            authority: "Presidencia da Republica",
            scope: "Estatuto",
            url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15378.htm"
          }
        ],
        jurisprudenceTags: ["stf_tema_793"],
        claimValueRecommendation: {
          suggestedClaimValueCents: 9500000,
          suggestedMinValueCents: 7000000,
          suggestedMaxValueCents: 14000000,
          confidenceBand: "balanced",
          methodology: "Faixa de mercado por complexidade com ajuste por viabilidade.",
          benchmarks: [
            {
              segment: "alta_complexidade",
              minValueCents: 8000000,
              medianValueCents: 18000000,
              maxValueCents: 50000000,
              sourceLabel: "benchmark interno",
              sourceDate: "2026-04-26"
            }
          ],
          assumptions: ["Estimativa inicial sujeita a validacao humana."]
        },
        draftingStyleGuide: {
          voice: "specialist_health_lawyer",
          tone: ["tecnico", "objetivo"],
          forbiddenPatterns: ["nao usar auto-referencia de IA", "nao prometer resultado", "nao usar generalidades"],
          mandatorySections: ["fatos", "fundamentos legais", "jurisprudencia", "provas", "pedidos"],
          qualityChecklist: [
            "fundamentar alegacoes",
            "linguagem sobria",
            "coerencia entre fatos e pedidos",
            "distinguir premissa medica e juridica",
            "alerta de validacao humana"
          ]
        }
      }
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.complexity).toBe("high");
  });
});

describe("legalBriefInputSchema", () => {
  it("accepts a valid civil health brief payload", () => {
    const result = legalBriefInputSchema.parse({
      caseId: "11111111-1111-4111-8111-111111111111",
      workflowJobId: "22222222-2222-4222-8222-222222222222",
      draftScope: "civil_health",
      patientFullName: "Ana Souza",
      patientCpf: "12345678901",
      city: "Curitiba",
      contact: "(41) 99999-9999",
      patientAddress: "Rua do Paciente, 123, Curitiba-PR",
      patientWhatsapp: "(41) 97777-6666",
      patientEmail: "ana.souza@example.com",
      patientRg: "9876543",
      relationToPatient: "Filha",
      contactFullName: "Maria Souza",
      contactAddress: "Rua A, 123, Centro, Curitiba-PR",
      contactWhatsapp: "(41) 98888-7777",
      contactEmail: "maria.souza@example.com",
      contactCpf: "22233344455",
      contactRg: "1234567",
      problemType: "plano",
      currentUrgency: "high",
      keyDates: [{ label: "Negativa do plano", date: "2025-05-02" }],
      objectiveDescription: "Paciente teve negativa de cobertura para tratamento essencial.",
      materialLosses: "Gastos com exames e consultas particulares.",
      moralImpact: "Angustia, inseguranca e agravamento do quadro clinico.",
      uploadedDocuments: [],
      documentsAttached: ["negativa.pdf"],
      witnesses: ["Joao Silva"],
      mainRequest: "Custeio integral do tratamento.",
      subsidiaryRequest: "Tutela de urgencia para cobertura imediata."
    });

    expect(result.contactFullName).toBe("Maria Souza");
    expect(result.contactEmail).toBe("maria.souza@example.com");
    expect(result.patientEmail).toBe("ana.souza@example.com");
  });
});

describe("legalDocumentPackSchema", () => {
  it("accepts a valid supporting document pack", () => {
    const result = legalDocumentPackSchema.parse({
      draftScope: "civil_health",
      title: "Modelos complementares",
      subtitle: "Procuração e contrato parametrizados",
      summary: "Pacote complementar para revisão humana.",
      documents: [
        {
          key: "procurao_civel_saude",
          type: "power_of_attorney",
          title: "Procuração",
          subtitle: "Mandato cível e extrajudicial",
          summary: "Modelo de procuração com poderes gerais e especiais.",
          placeholders: ["outorgante_nome", "numero_dos_autos"],
          reviewNotes: ["Conferir poderes especiais antes da assinatura."],
          markdown: "PROCURAÇÃO\n"
        },
        {
          key: "contrato_honorarios_civel_saude",
          type: "fee_agreement",
          title: "Contrato de prestação de serviços e honorários advocatícios",
          subtitle: "Modelo parametrizado",
          summary: "Minuta de contrato com campos variáveis para honorários.",
          placeholders: ["contratante_nome", "valor_total_dos_honorarios"],
          reviewNotes: ["Definir valores e foro na revisão humana."],
          markdown: "CONTRATO\n"
        }
      ],
      generatedAt: "2026-05-04T12:00:00.000Z"
    });

    expect(result.documents).toHaveLength(2);
    expect(result.documents[0]?.type).toBe("power_of_attorney");
  });
});

describe("legalArtifactRevisionSchema", () => {
  it("accepts a valid revision payload", () => {
    const result = legalArtifactRevisionSchema.parse({
      artifactType: "power_of_attorney",
      title: "Procuração revisada",
      subtitle: "Mandato cível e extrajudicial",
      summary: "Texto ajustado manualmente pela equipe humana.",
      contentMarkdown: "PROCURAÇÃO\n\nTexto ajustado.",
      reviewerId: "revisor-1",
      note: "Ajuste de redação"
    });

    expect(result.artifactType).toBe("power_of_attorney");
    expect(result.title).toBe("Procuração revisada");
  });
});

describe("scoreReviewDecisionSchema", () => {
  it("accepts valid review decision payload", () => {
    const result = scoreReviewDecisionSchema.parse({
      decision: "approve",
      reviewerId: "user-123",
      note: "Caso aprovado para conversao."
    });

    expect(result.decision).toBe("approve");
  });

  it("accepts request_changes review decision payload", () => {
    const result = scoreReviewDecisionSchema.parse({
      decision: "request_changes",
      reviewerId: "user-456",
      note: "Faltam exames e comprovantes."
    });

    expect(result.decision).toBe("request_changes");
  });
});
