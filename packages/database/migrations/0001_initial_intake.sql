create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  name text,
  phone text,
  raw_message text not null,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create table if not exists clients (
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

create table if not exists cases (
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

create table if not exists workflow_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id),
  job_type text not null,
  status text not null,
  attempt_count integer not null default 0,
  run_after timestamptz,
  correlation_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists triage_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  case_type text not null,
  priority text not null,
  urgency text not null,
  has_damage boolean not null,
  legal_potential text not null,
  confidence integer not null,
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists journey_timelines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source text not null,
  summary text not null,
  risk_level text not null,
  confidence integer not null,
  timeline jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clinical_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source text not null,
  summary text not null,
  risk_level text not null,
  confidence integer not null,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rights_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source text not null,
  summary text not null,
  confidence integer not null,
  violation_count integer not null,
  rights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evidence_checklists (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source text not null,
  summary text not null,
  confidence integer not null,
  missing_count integer not null,
  items jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists legal_scores (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  viability_score integer not null,
  complexity text not null,
  estimated_value_cents bigint not null,
  confidence integer not null,
  review_required boolean not null,
  review_reasons jsonb not null default '{}'::jsonb,
  decision text,
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id),
  actor_type text not null,
  actor_id text not null,
  action text not null,
  before_payload jsonb,
  after_payload jsonb,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_status
  on cases (commercial_status, legal_status);

create index if not exists idx_workflow_jobs_status
  on workflow_jobs (status, run_after);

create unique index if not exists uq_workflow_jobs_correlation_type
  on workflow_jobs (correlation_id, job_type);

create unique index if not exists uq_triage_analyses_case_id
  on triage_analyses (case_id);

create unique index if not exists uq_journey_timelines_case_id
  on journey_timelines (case_id);

create unique index if not exists uq_clinical_analyses_case_id
  on clinical_analyses (case_id);

create unique index if not exists uq_rights_assessments_case_id
  on rights_assessments (case_id);

create unique index if not exists uq_evidence_checklists_case_id
  on evidence_checklists (case_id);

create unique index if not exists uq_legal_scores_case_id
  on legal_scores (case_id);

create index if not exists idx_audit_logs_case_id
  on audit_logs (case_id, created_at desc);
