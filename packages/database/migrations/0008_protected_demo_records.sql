alter table patients
  add column if not exists is_protected boolean not null default false;

alter table hospital_cases
  add column if not exists is_protected boolean not null default false;

alter table patient_journey
  add column if not exists is_protected boolean not null default false;

alter table evidence_docs
  add column if not exists is_protected boolean not null default false;

alter table agent_intelligence
  add column if not exists is_protected boolean not null default false;

alter table legal_alerts
  add column if not exists is_protected boolean not null default false;

update patients
set is_protected = true
where id = '550e8400-e29b-41d4-a716-446655440000';

update hospital_cases
set is_protected = true
where id = '770e8400-e29b-41d4-a716-446655440001';

update patient_journey
set is_protected = true
where case_id = '770e8400-e29b-41d4-a716-446655440001';

update evidence_docs
set is_protected = true
where case_id = '770e8400-e29b-41d4-a716-446655440001';

update agent_intelligence
set is_protected = true
where case_id = '770e8400-e29b-41d4-a716-446655440001';

update legal_alerts
set is_protected = true
where case_id = '770e8400-e29b-41d4-a716-446655440001';
