alter table legal_brief_inputs
  add column if not exists uploaded_documents jsonb not null default '[]'::jsonb;
