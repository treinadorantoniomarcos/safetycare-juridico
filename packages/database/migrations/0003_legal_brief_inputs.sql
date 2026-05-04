create table if not exists legal_brief_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  source_workflow_job_id uuid references workflow_jobs(id),
  draft_scope text not null default 'civil_health',
  patient_full_name text not null,
  patient_cpf text not null,
  city text not null,
  contact text not null,
  relation_to_patient text not null,
  problem_type text not null,
  current_urgency text not null,
  key_dates jsonb not null default '[]'::jsonb,
  objective_description text not null,
  material_losses text not null,
  moral_impact text not null,
  documents_attached jsonb not null default '[]'::jsonb,
  witnesses jsonb not null default '[]'::jsonb,
  main_request text not null,
  subsidiary_request text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_legal_brief_inputs_case_id
  on legal_brief_inputs (case_id);
