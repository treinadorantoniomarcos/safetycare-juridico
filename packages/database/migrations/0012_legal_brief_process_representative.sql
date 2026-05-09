ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "contact_is_process_representative" boolean NOT NULL DEFAULT true;

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_full_name" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_cpf" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_rg" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_address" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_whatsapp" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_email" text NOT NULL DEFAULT '';

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_additional_emails" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "legal_brief_inputs"
  ADD COLUMN IF NOT EXISTS "process_representative_additional_whatsapps" jsonb NOT NULL DEFAULT '[]'::jsonb;
