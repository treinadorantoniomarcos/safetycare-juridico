alter table legal_brief_inputs
  add column if not exists contact_full_name text not null default '',
  add column if not exists contact_address text not null default '',
  add column if not exists contact_whatsapp text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_cpf text not null default '',
  add column if not exists contact_rg text not null default '';
