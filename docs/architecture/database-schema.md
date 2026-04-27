# Database Schema

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  name text,
  phone text,
  raw_message text not null,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  full_name text not null,
  cpf_hash text,
  email text,
  phone text,
  consent_status text not null default 'pending',
  consent_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  case_type text,
  priority text not null default 'medium',
  urgency text not null default 'medium',
  commercial_status text not null default 'screening',
  legal_status text not null default 'intake',
  estimated_value_cents bigint,
  current_owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patient_journey_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  event_type text not null,
  occurred_at_estimate timestamptz,
  description text not null,
  risk_flag boolean not null default false,
  source_excerpt text,
  metadata jsonb not null default '{}'::jsonb
);

create table clinical_findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  journey_event_id uuid references patient_journey_events(id),
  finding_type text not null,
  confidence_level text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create table rights_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  right_key text not null,
  status text not null,
  justification text not null,
  unique (case_id, right_key)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  client_id uuid references clients(id),
  document_type text not null,
  storage_path text not null,
  verification_status text not null default 'pending',
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table evidence_checklist_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  item_key text not null,
  status text not null,
  importance text not null,
  notes text,
  unique (case_id, item_key)
);

create table legal_scores (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  viability_score integer not null,
  complexity_level text not null,
  estimated_case_value_cents bigint,
  confidence_level text not null,
  review_required boolean not null default false,
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  agent_name text not null,
  input_payload jsonb not null,
  output_payload jsonb,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text
);

create table workflow_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  job_type text not null,
  status text not null,
  attempt_count integer not null default 0,
  run_after timestamptz,
  correlation_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table commercial_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  action_type text not null,
  owner_user_id uuid,
  notes text,
  scheduled_for timestamptz,
  completed_at timestamptz
);

create table legal_artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  artifact_type text not null,
  version_number integer not null default 1,
  status text not null default 'draft',
  content_markdown text not null,
  approved_by uuid,
  approved_at timestamptz
);

create table deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  deadline_type text not null,
  due_at timestamptz not null,
  status text not null default 'open',
  alert_level text not null default 'info'
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  actor_type text not null,
  actor_id text not null,
  action text not null,
  before_payload jsonb,
  after_payload jsonb,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index idx_cases_status on cases (commercial_status, legal_status);
create index idx_workflow_jobs_status on workflow_jobs (status, run_after);
create index idx_audit_logs_case_id on audit_logs (case_id, created_at desc);
create index idx_documents_case_id on documents (case_id);
```
