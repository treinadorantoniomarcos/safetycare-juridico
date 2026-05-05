alter table legal_brief_inputs
  add column if not exists patient_address text not null default '',
  add column if not exists patient_whatsapp text not null default '',
  add column if not exists patient_email text not null default '',
  add column if not exists patient_rg text not null default '';
