# Data Models

## Lead

**Purpose:** representa a entrada bruta de um potencial caso.

**Key Attributes:**
- `id`: uuid - identificador do lead
- `source`: enum - whatsapp, form, site, referral
- `name`: text - nome informado
- `phone`: text - telefone normalizado
- `raw_message`: text - relato original
- `status`: enum - new, acknowledged, qualified, discarded
- `received_at`: timestamptz - data de entrada

**Relationships:**
- um Lead pode originar um Caso
- um Lead possui muitos eventos de comunicacao

## Client

**Purpose:** representa a pessoa atendida ou responsavel pelo caso.

**Key Attributes:**
- `id`: uuid - identificador do cliente
- `lead_id`: uuid - lead de origem
- `full_name`: text - nome completo
- `cpf_hash`: text - hash do CPF quando coletado
- `email`: text - email de contato
- `phone`: text - telefone principal
- `consent_status`: enum - pending, granted, revoked

**Relationships:**
- um Client pode possuir varios Casos ao longo do tempo
- um Client possui Documentos, Comunicacoes e Consentimentos

## Case

**Purpose:** agregado principal de negocio.

**Key Attributes:**
- `id`: uuid - identificador do caso
- `client_id`: uuid - cliente associado
- `case_type`: enum - medical_error, hospital_failure, health_plan, aesthetics
- `priority`: enum - low, medium, high
- `urgency`: enum - low, medium, high, critical
- `commercial_status`: enum - screening, negotiating, closed_won, closed_lost
- `legal_status`: enum - intake, evidence, scored, approved, drafting, active, closed
- `estimated_value_cents`: bigint - valor potencial

**Relationships:**
- um Case possui muitos eventos de jornada, documentos, scores, analises e prazos
- um Case e a ancora da trilha de auditoria

## PatientJourneyEvent

**Purpose:** representa a timeline tecnica do caso.

**Key Attributes:**
- `id`: uuid - identificador do evento
- `case_id`: uuid - caso associado
- `event_type`: text - classificacao do evento
- `occurred_at_estimate`: date or timestamptz - data real ou estimada
- `description`: text - descricao do evento
- `risk_flag`: boolean - indica risco
- `source_excerpt`: text - trecho de origem

**Relationships:**
- pertence a um Case
- pode originar findings clinicos e violacoes de direitos

## ClinicalFinding

**Purpose:** armazena sinais tecnicos detectados na analise clinica.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `journey_event_id`: uuid nullable
- `finding_type`: text - atraso, falha_protocolo, omissao etc.
- `confidence_level`: enum - low, medium, high
- `explanation`: text

**Relationships:**
- pertence a um Case
- pode estar associado a um evento de jornada

## RightsAssessment

**Purpose:** registra a avaliacao de direitos do paciente.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `right_key`: enum - clear_information, informed_consent, records_access, continuity_of_care, patient_safety
- `status`: enum - ok, possible_violation
- `justification`: text

**Relationships:**
- pertence a um Case

## Document

**Purpose:** metadados dos arquivos do caso.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `client_id`: uuid
- `document_type`: enum - exam, report, discharge, prescription, message, photo, contract, other
- `storage_path`: text
- `uploaded_by`: uuid nullable
- `verification_status`: enum - pending, accepted, rejected

**Relationships:**
- pertence a um Case e opcionalmente a um Client
- suporta checklist de prova e artefatos juridicos

## EvidenceChecklistItem

**Purpose:** controla robustez probatoria e lacunas.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `item_key`: text
- `status`: enum - present, missing, partial, waived
- `importance`: enum - low, medium, high, critical
- `notes`: text

**Relationships:**
- pertence a um Case

## LegalScore

**Purpose:** consolidado de viabilidade juridica.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `viability_score`: integer
- `complexity_level`: enum - low, medium, high
- `estimated_case_value_cents`: bigint
- `confidence_level`: enum - low, medium, high
- `review_required`: boolean

**Relationships:**
- pertence a um Case
- deriva de findings, checklist e assessments

## AgentRun

**Purpose:** execucao individual de um agente no pipeline.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `agent_name`: text
- `input_payload`: jsonb
- `output_payload`: jsonb
- `status`: enum - queued, running, completed, failed, escalated
- `started_at`: timestamptz
- `finished_at`: timestamptz

**Relationships:**
- pertence a um Case
- pode originar AuditLogs e WorkflowJobs

## WorkflowJob

**Purpose:** unidade de processamento assicrono.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid nullable
- `job_type`: text
- `status`: enum - created, active, retrying, completed, failed, dead_letter
- `attempt_count`: integer
- `run_after`: timestamptz
- `correlation_id`: text

**Relationships:**
- pode estar vinculado a um Case
- e consumido pelo worker

## CommercialAction

**Purpose:** registra operacao comercial e de fechamento.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `action_type`: enum - contact, follow_up, proposal, objection, close_won, close_lost
- `owner_user_id`: uuid
- `notes`: text
- `scheduled_for`: timestamptz nullable

**Relationships:**
- pertence a um Case
- alimenta metricas de conversao

## LegalArtifact

**Purpose:** rascunhos e versoes de pecas juridicas.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `artifact_type`: enum - petition, injunction, notification, memo
- `version_number`: integer
- `status`: enum - draft, under_review, approved, exported
- `content_markdown`: text

**Relationships:**
- pertence a um Case
- depende de revisao humana

## Deadline

**Purpose:** controle de marcos temporais e alertas.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid
- `deadline_type`: text
- `due_at`: timestamptz
- `status`: enum - open, done, missed, canceled
- `alert_level`: enum - info, warning, critical

**Relationships:**
- pertence a um Case

## AuditLog

**Purpose:** trilha de auditoria transversal.

**Key Attributes:**
- `id`: uuid
- `case_id`: uuid nullable
- `actor_type`: enum - system, agent, user, integration
- `actor_id`: text
- `action`: text
- `before_payload`: jsonb nullable
- `after_payload`: jsonb nullable
- `created_at`: timestamptz

**Relationships:**
- pode estar associado a qualquer entidade chave
