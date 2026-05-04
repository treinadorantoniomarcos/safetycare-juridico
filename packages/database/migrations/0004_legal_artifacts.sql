create table if not exists legal_artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source_workflow_job_id uuid references workflow_jobs(id),
  artifact_type text not null,
  version_number integer not null,
  status text not null default 'draft',
  title text not null,
  subtitle text not null,
  summary text not null,
  content_markdown text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_legal_artifacts_case_type_version
  on legal_artifacts (case_id, artifact_type, version_number);

create index if not exists idx_legal_artifacts_case_type
  on legal_artifacts (case_id, artifact_type, version_number desc);
