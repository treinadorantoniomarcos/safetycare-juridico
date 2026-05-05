-- 0010_seed_demo_intake_flow.sql
-- Demo seed for the public intake flow and the human dashboard.
-- The records below are intentionally deterministic so they survive deploys
-- and can be recreated safely on a clean database.

-- Leads
insert into leads (
  id,
  source,
  name,
  phone,
  raw_message,
  status,
  metadata,
  received_at
)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'form',
    'Marina Costa',
    '41 99901-1001',
    'Negativa de cobertura para tratamento essencial.',
    'new',
    $json${"seed": true, "scenario": "triage"}$json$::jsonb,
    now() - interval '4 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222201',
    'whatsapp',
    'Carlos Menezes',
    '41 98802-2002',
    'Demora relevante e ausencia de resposta objetiva do plano.',
    'new',
    $json${"seed": true, "scenario": "score"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333301',
    'site',
    'Patricia Almeida',
    '41 97703-3003',
    'Caso liberado na validacao humana para geracao dos artefatos.',
    'new',
    $json${"seed": true, "scenario": "stage2"}$json$::jsonb,
    now() - interval '1 hour'
  )
on conflict (id) do nothing;

-- Clients
insert into clients (
  id,
  lead_id,
  full_name,
  cpf_hash,
  email,
  phone,
  consent_status,
  consent_payload,
  created_at
)
values
  (
    '11111111-1111-4111-8111-111111111102',
    '11111111-1111-4111-8111-111111111101',
    'Marina Costa',
    null,
    'marina.costa@example.com',
    '41 99901-1001',
    'pending',
    $json${"seed": true, "source": "migration_0010"}$json$::jsonb,
    now() - interval '4 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '22222222-2222-4222-8222-222222222201',
    'Carlos Menezes',
    null,
    'carlos.menezes@example.com',
    '41 98802-2002',
    'granted',
    $json${"seed": true, "source": "migration_0010"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '33333333-3333-4333-8333-333333333301',
    'Patricia Almeida',
    null,
    'patricia.almeida@example.com',
    '41 97703-3003',
    'granted',
    $json${"seed": true, "source": "migration_0010"}$json$::jsonb,
    now() - interval '1 hour'
  )
on conflict (id) do nothing;

-- Cases
insert into cases (
  id,
  client_id,
  case_type,
  priority,
  urgency,
  commercial_status,
  legal_status,
  estimated_value_cents,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111102',
    'health_plan',
    'high',
    'high',
    'screening_pending',
    'human_triage_pending',
    25000000,
    now() - interval '4 hours',
    now() - interval '4 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '22222222-2222-4222-8222-222222222202',
    'hospital_failure',
    'high',
    'critical',
    'screening_pending',
    'human_review_required',
    18000000,
    now() - interval '5 hours',
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '33333333-3333-4333-8333-333333333302',
    'medical_error',
    'medium',
    'high',
    'retained',
    'conversion_pending',
    42000000,
    now() - interval '1 hour',
    now() - interval '1 hour'
  )
on conflict (id) do nothing;

-- Workflow jobs
insert into workflow_jobs (
  id,
  case_id,
  job_type,
  status,
  attempt_count,
  run_after,
  correlation_id,
  payload,
  created_at
)
values
  (
    '11111111-1111-4111-8111-111111111104',
    '11111111-1111-4111-8111-111111111103',
    'intake.orchestrator.bootstrap',
    'queued',
    0,
    null,
    'seed-case-a:bootstrap',
    $json${"seed": true, "stage": "human_triage_pending"}$json$::jsonb,
    now() - interval '4 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '22222222-2222-4222-8222-222222222203',
    'intake.orchestrator.bootstrap',
    'completed',
    0,
    null,
    'seed-case-b:bootstrap',
    $json${"seed": true, "stage": "human_review_required"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '33333333-3333-4333-8333-333333333303',
    'intake.orchestrator.bootstrap',
    'completed',
    0,
    null,
    'seed-case-c:bootstrap',
    $json${"seed": true, "stage": "conversion_pending"}$json$::jsonb,
    now() - interval '1 hour'
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    '11111111-1111-4111-8111-111111111103',
    'triage.classification',
    'completed',
    1,
    null,
    'seed-case-a:triage.classification',
    $json${"seed": true, "case": "A"}$json$::jsonb,
    now() - interval '3 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '22222222-2222-4222-8222-222222222203',
    'journey.timeline',
    'completed',
    1,
    null,
    'seed-case-b:journey.timeline',
    $json${"seed": true, "case": "B"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '22222222-2222-4222-8222-222222222203',
    'clinical.analysis',
    'blocked',
    1,
    null,
    'seed-case-b:clinical.analysis',
    $json${"seed": true, "case": "B"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '22222222-2222-4222-8222-222222222203',
    'rights.assessment',
    'failed',
    1,
    null,
    'seed-case-b:rights.assessment',
    $json${"seed": true, "case": "B"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '22222222-2222-4222-8222-222222222203',
    'evidence.builder',
    'completed',
    1,
    null,
    'seed-case-b:evidence.builder',
    $json${"seed": true, "case": "B"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222209',
    '22222222-2222-4222-8222-222222222203',
    'legal.score',
    'queued',
    0,
    null,
    'seed-case-b:legal.score',
    $json${"seed": true, "case": "B"}$json$::jsonb,
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '33333333-3333-4333-8333-333333333303',
    'legal.execution',
    'queued',
    0,
    null,
    'seed-case-c:legal.execution',
    $json${"seed": true, "case": "C"}$json$::jsonb,
    now() - interval '1 hour'
  )
on conflict (correlation_id, job_type) do nothing;

-- Audit logs
insert into audit_logs (
  id,
  case_id,
  actor_type,
  actor_id,
  action,
  before_payload,
  after_payload,
  correlation_id,
  created_at
)
values
  (
    '11111111-1111-4111-8111-111111111106',
    '11111111-1111-4111-8111-111111111103',
    'integration',
    'seed-ingest',
    'intake.client_information_submitted',
    null,
    $json${"seed": true, "scenario": "triage"}$json$::jsonb,
    'seed-case-a:intake.client_information_submitted',
    now() - interval '4 hours'
  ),
  (
    '22222222-2222-4222-8222-222222222210',
    '22222222-2222-4222-8222-222222222203',
    'integration',
    'seed-ingest',
    'intake.client_information_submitted',
    null,
    $json${"seed": true, "scenario": "score"}$json$::jsonb,
    'seed-case-b:intake.client_information_submitted',
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333306',
    '33333333-3333-4333-8333-333333333303',
    'integration',
    'seed-ingest',
    'intake.client_information_submitted',
    null,
    $json${"seed": true, "scenario": "stage2"}$json$::jsonb,
    'seed-case-c:intake.client_information_submitted',
    now() - interval '1 hour'
  ),
  (
    '33333333-3333-4333-8333-333333333307',
    '33333333-3333-4333-8333-333333333303',
    'user',
    'seed-reviewer',
    'conversion.decision_recorded',
    $json${"caseStatus": {"commercialStatus": "conversion_pending", "legalStatus": "conversion_pending"}}$json$::jsonb,
    $json${"decision": "signed", "note": "Seed demo conversion signed.", "caseStatus": {"commercialStatus": "retained", "legalStatus": "legal_execution_pending"}, "workflowJob": {"id": "33333333-3333-4333-8333-333333333305", "jobType": "legal.execution", "status": "queued"}}$json$::jsonb,
    'seed-case-c:conversion.decision_recorded',
    now() - interval '1 hour'
  )
on conflict (id) do nothing;

-- Triage analysis used by the score review screen
insert into triage_analyses (
  id,
  case_id,
  case_type,
  priority,
  urgency,
  has_damage,
  legal_potential,
  confidence,
  rationale,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222211',
    '22222222-2222-4222-8222-222222222203',
    'hospital_failure',
    'high',
    'critical',
    true,
    'high',
    92,
    $json${
      "matchedSignals": ["demora", "ausencia de resposta", "risco assistencial"],
      "notes": ["Seed demo for the score review screen."]
    }$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
on conflict (case_id) do nothing;

-- Journey timeline used by the score review screen
insert into journey_timelines (
  id,
  case_id,
  source,
  summary,
  risk_level,
  confidence,
  timeline,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222212',
    '22222222-2222-4222-8222-222222222203',
    'whatsapp',
    'Negativa inicial, demora na resposta e agravamento do quadro.',
    'high',
    90,
    $json${
      "events": [
        {
          "order": 1,
          "title": "Contato inicial",
          "description": "Cliente relatou negativa de cobertura.",
          "risk": false,
          "evidenceHints": ["mensagem"]
        },
        {
          "order": 2,
          "title": "Demora relevante",
          "description": "Plano demorou para responder a solicitacao.",
          "risk": true,
          "evidenceHints": ["protocolos"]
        }
      ]
    }$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
on conflict (case_id) do nothing;

-- Clinical analysis used by the score review screen
insert into clinical_analyses (
  id,
  case_id,
  source,
  summary,
  risk_level,
  confidence,
  findings,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222213',
    '22222222-2222-4222-8222-222222222203',
    'site',
    'Atraso, alta precoce e ausencia de intervencao adequada.',
    'critical',
    88,
    $json$[
      {
        "order": 1,
        "findingType": "delay",
        "description": "Houve atraso na conduta assistencial.",
        "risk": true,
        "evidenceHints": ["prontuario"]
      },
      {
        "order": 2,
        "findingType": "protocol_failure",
        "description": "Nao houve resposta tempestiva ao quadro narrado.",
        "risk": true,
        "evidenceHints": ["laudo", "mensagens"]
      }
    ]$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
on conflict (case_id) do nothing;

-- Rights assessment used by the score review screen
insert into rights_assessments (
  id,
  case_id,
  source,
  summary,
  confidence,
  violation_count,
  rights,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222214',
    '22222222-2222-4222-8222-222222222203',
    'form',
    'Foram detectadas possiveis violacoes de direitos do paciente.',
    84,
    2,
    $json$[
      {
        "rightKey": "clear_information",
        "status": "possible_violation",
        "justification": "Relato indica ausencia de informacao clara.",
        "signals": ["sem orientacao", "demora"]
      },
      {
        "rightKey": "informed_consent",
        "status": "ok",
        "justification": "Nao ha sinal claro de ausencia de consentimento.",
        "signals": []
      },
      {
        "rightKey": "records_access",
        "status": "ok",
        "justification": "Nao houve negativa de acesso ao prontuario.",
        "signals": []
      },
      {
        "rightKey": "continuity_of_care",
        "status": "possible_violation",
        "justification": "O caso sugere descontinuidade do cuidado.",
        "signals": ["piora", "alta"]
      },
      {
        "rightKey": "patient_safety",
        "status": "ok",
        "justification": "Nao ha sinal suficiente para afirmar violacao.",
        "signals": []
      }
    ]$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
on conflict (case_id) do nothing;

-- Evidence checklist used by the score review screen
insert into evidence_checklists (
  id,
  case_id,
  source,
  summary,
  confidence,
  missing_count,
  items,
  required_information_requests,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222215',
    '22222222-2222-4222-8222-222222222203',
    'whatsapp',
    'Checklist documental com lacunas simples para complementar.',
    87,
    2,
    $json$[
      {
        "itemKey": "negativa_plano",
        "label": "Negativa do plano",
        "status": "present",
        "importance": "high",
        "notes": "Documento principal localizado.",
        "sourceHints": ["pdf"]
      },
      {
        "itemKey": "exames",
        "label": "Exames e laudos",
        "status": "partial",
        "importance": "high",
        "notes": "Alguns exames ainda precisam ser organizados.",
        "sourceHints": ["pdf", "imagem"]
      },
      {
        "itemKey": "comprovantes",
        "label": "Comprovantes de gastos",
        "status": "missing",
        "importance": "medium",
        "notes": "Enviar recibos e notas particulares.",
        "sourceHints": []
      },
      {
        "itemKey": "receitas",
        "label": "Receitas e prescricao",
        "status": "present",
        "importance": "critical",
        "notes": "Receita principal em anexo.",
        "sourceHints": ["pdf"]
      }
    ]$json$::jsonb,
    $json$[
      {
        "requestKey": "comprovantes",
        "title": "Enviar comprovantes de gastos",
        "justification": "Necessarios para quantificar danos materiais.",
        "urgency": "high",
        "dueInHours": 24,
        "channelSuggestion": "whatsapp"
      },
      {
        "requestKey": "laudos_complementares",
        "title": "Enviar laudos complementares",
        "justification": "Ajudam na confirmacao da linha do tempo clinica.",
        "urgency": "medium",
        "dueInHours": 48,
        "channelSuggestion": "email"
      }
    ]$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
on conflict (case_id) do nothing;

-- Legal scores for the score review screen and dashboard
insert into legal_scores (
  id,
  case_id,
  viability_score,
  complexity,
  estimated_value_cents,
  confidence,
  review_required,
  review_reasons,
  decision,
  review_note,
  reviewed_by,
  reviewed_at,
  rationale,
  created_at,
  updated_at
)
values
  (
    '22222222-2222-4222-8222-222222222216',
    '22222222-2222-4222-8222-222222222203',
    62,
    'medium',
    18000000,
    86,
    true,
    $json$[
      "Documento complementar ainda pode fortalecer a tese.",
      "Score mantem revisao humana ativa."
    ]$json$::jsonb,
    null,
    null,
    null,
    null,
    $json${
      "inputs": ["relato inicial", "documentos anexados"],
      "notes": ["Seed demo for the score review screen"],
      "legalAuthorities": [],
      "jurisprudenceTags": ["plano de saude", "demora assistencial"],
      "claimValueRecommendation": {
        "suggestedClaimValueCents": 25000000,
        "suggestedMinValueCents": 20000000,
        "suggestedMaxValueCents": 30000000,
        "confidenceBand": "balanced",
        "methodology": "Seed demo",
        "benchmarks": [
          {
            "segment": "media_complexidade",
            "minValueCents": 15000000,
            "medianValueCents": 25000000,
            "maxValueCents": 40000000,
            "sourceLabel": "Seed demo",
            "sourceDate": "2026-05-05"
          }
        ],
        "assumptions": ["Caso simulado para demonstracao"]
      },
      "draftingStyleGuide": {
        "voice": "specialist_health_lawyer",
        "tone": ["tecnico", "sobrio"],
        "forbiddenPatterns": [
          "prometer resultado",
          "exagerar fatos",
          "invadir estrategia"
        ],
        "mandatorySections": [
          "fatos",
          "fundamentos",
          "pedidos",
          "provas",
          "valor da causa"
        ],
        "qualityChecklist": [
          "verificar datas",
          "verificar provas",
          "verificar pedidos",
          "ajustar estrategia",
          "validar assinaturas"
        ]
      }
    }$json$::jsonb,
    now() - interval '5 hours',
    now() - interval '5 hours'
  ),
  (
    '33333333-3333-4333-8333-333333333308',
    '33333333-3333-4333-8333-333333333303',
    88,
    'high',
    42000000,
    95,
    false,
    $json$[]$json$::jsonb,
    'approve',
    'Seed demo stage 2 already approved.',
    'seed-reviewer',
    now() - interval '1 hour',
    $json${
      "inputs": ["relato inicial", "documentos anexados", "minuta revisada"],
      "notes": ["Seed demo stage 2 ready"],
      "legalAuthorities": [],
      "jurisprudenceTags": ["tratamento", "plano de saude"],
      "claimValueRecommendation": {
        "suggestedClaimValueCents": 42000000,
        "suggestedMinValueCents": 35000000,
        "suggestedMaxValueCents": 50000000,
        "confidenceBand": "balanced",
        "methodology": "Seed demo",
        "benchmarks": [
          {
            "segment": "alta_complexidade",
            "minValueCents": 30000000,
            "medianValueCents": 42000000,
            "maxValueCents": 60000000,
            "sourceLabel": "Seed demo",
            "sourceDate": "2026-05-05"
          }
        ],
        "assumptions": ["Fluxo demonstrativo com aprovacao humana"]
      },
      "draftingStyleGuide": {
        "voice": "specialist_health_lawyer",
        "tone": ["tecnico", "objetivo", "sobrio"],
        "forbiddenPatterns": [
          "prometer resultado",
          "exagerar fatos",
          "generalizar sem prova"
        ],
        "mandatorySections": [
          "fatos",
          "fundamentos",
          "pedidos",
          "provas",
          "valor da causa"
        ],
        "qualityChecklist": [
          "verificar datas",
          "verificar provas",
          "verificar pedidos",
          "validar documentos",
          "revisar assinatura"
        ]
      }
    }$json$::jsonb,
    now() - interval '1 hour',
    now() - interval '1 hour'
  )
on conflict (case_id) do nothing;

-- Legal brief input for the ready stage 2 case
insert into legal_brief_inputs (
  id,
  case_id,
  source_workflow_job_id,
  draft_scope,
  patient_full_name,
  patient_cpf,
  city,
  contact,
  patient_address,
  patient_whatsapp,
  patient_email,
  patient_rg,
  relation_to_patient,
  contact_full_name,
  contact_address,
  contact_whatsapp,
  contact_email,
  contact_cpf,
  contact_rg,
  problem_type,
  current_urgency,
  key_dates,
  objective_description,
  material_losses,
  moral_impact,
  uploaded_documents,
  documents_attached,
  witnesses,
  main_request,
  subsidiary_request,
  created_at,
  updated_at
)
values
  (
    '33333333-3333-4333-8333-333333333309',
    '33333333-3333-4333-8333-333333333303',
    '33333333-3333-4333-8333-333333333304',
    'civil_health',
    'Patricia Almeida',
    '333.333.333-33',
    'Curitiba',
    '41 97703-3003',
    'Rua das Acacias, 123, Curitiba-PR',
    '(41) 97703-3003',
    'patricia.almeida@example.com',
    '12.345.678-9',
    'Propria paciente',
    'Patricia Almeida',
    'Rua das Acacias, 123, Curitiba-PR',
    '(41) 97703-3003',
    'patricia.almeida@example.com',
    '333.333.333-33',
    '12.345.678-9',
    'plano',
    'high',
    $json$[
      {
        "label": "Negativa do plano",
        "date": "2026-04-28"
      },
      {
        "label": "Pedido administrativo",
        "date": "2026-04-25"
      }
    ]$json$::jsonb,
    'Paciente com negativa de cobertura para tratamento essencial e risco de agravamento do quadro.',
    'Gastos com consultas particulares, exames e deslocamentos.',
    'Angustia, inseguranca e agravamento do quadro clinico.',
    $json$[
      {
        "name": "negativa_plano.pdf",
        "mimeType": "application/pdf",
        "size": 12,
        "dataUrl": "data:application/pdf;base64,JVBERi0xLjQK",
        "uploadedAt": "2026-05-05T09:00:00.000Z"
      },
      {
        "name": "pedido_admin.png",
        "mimeType": "image/png",
        "size": 8,
        "dataUrl": "data:image/png;base64,iVBORw0KGgo=",
        "uploadedAt": "2026-05-05T09:05:00.000Z"
      }
    ]$json$::jsonb,
    $json$["negativa_plano.pdf", "pedido_admin.png"]$json$::jsonb,
    $json$["Joao Teste", "Maria Exemplo"]$json$::jsonb,
    'Custeio integral do tratamento e autorizacao imediata.',
    'Subsidiariamente, reembolso integral dos gastos particulares.',
    now() - interval '1 hour',
    now() - interval '1 hour'
  )
on conflict (case_id) do nothing;

-- Legal artifacts for the ready stage 2 case
insert into legal_artifacts (
  id,
  case_id,
  source_workflow_job_id,
  artifact_type,
  version_number,
  status,
  title,
  subtitle,
  summary,
  content_markdown,
  metadata,
  created_at,
  updated_at
)
values
  (
    '33333333-3333-4333-8333-333333333310',
    '33333333-3333-4333-8333-333333333303',
    '33333333-3333-4333-8333-333333333305',
    'civil_health_draft',
    1,
    'draft',
    'Minuta preliminar',
    'Pea civel de saude baseada nos dados informados',
    'Versao inicial para revisao humana.',
    $markdown$
# Minuta preliminar

## Resumo
Texto inicial para revisao humana do caso de saude.

## Pedidos
- tutela de urgencia
- cobertura do tratamento
- reembolso dos gastos
$markdown$,
    $json${"seeded": true, "template": "demo"}$json$::jsonb,
    now() - interval '1 hour',
    now() - interval '1 hour'
  ),
  (
    '33333333-3333-4333-8333-333333333311',
    '33333333-3333-4333-8333-333333333303',
    '33333333-3333-4333-8333-333333333305',
    'power_of_attorney',
    1,
    'draft',
    'Procuraçao',
    'Mandato civel e extrajudicial',
    'Modelo de procuraçao com poderes gerais e especiais.',
    $markdown$
# Procuraçao

Outorgante: Patricia Almeida

Outorgado: SAFETYCARE

Poderes para atuar em juizo e fora dele, com poderes especiais para os atos necessarios.
$markdown$,
    $json${"seeded": true, "template": "demo"}$json$::jsonb,
    now() - interval '1 hour',
    now() - interval '1 hour'
  ),
  (
    '33333333-3333-4333-8333-333333333312',
    '33333333-3333-4333-8333-333333333303',
    '33333333-3333-4333-8333-333333333305',
    'fee_agreement',
    1,
    'draft',
    'Contrato de prestaçao de serviços e honorarios advocaticios',
    'Modelo parametrizado',
    'Minuta de contrato com campos variaveis para honorarios.',
    $markdown$
# Contrato de prestaçao de serviços e honorarios advocaticios

Clausula primeira: objeto.

Clausula segunda: honorarios.

Clausula terceira: despesas e custas.
$markdown$,
    $json${"seeded": true, "template": "demo"}$json$::jsonb,
    now() - interval '1 hour',
    now() - interval '1 hour'
  )
on conflict (case_id, artifact_type, version_number) do nothing;
