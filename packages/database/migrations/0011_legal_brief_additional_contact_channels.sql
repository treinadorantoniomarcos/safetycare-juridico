alter table legal_brief_inputs
  add column if not exists patient_additional_emails jsonb not null default '[]'::jsonb,
  add column if not exists patient_additional_whatsapps jsonb not null default '[]'::jsonb,
  add column if not exists contact_additional_emails jsonb not null default '[]'::jsonb,
  add column if not exists contact_additional_whatsapps jsonb not null default '[]'::jsonb;
