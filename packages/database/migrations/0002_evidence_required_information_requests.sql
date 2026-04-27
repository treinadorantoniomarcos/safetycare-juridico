alter table if exists evidence_checklists
  add column if not exists required_information_requests jsonb not null default '[]'::jsonb;

