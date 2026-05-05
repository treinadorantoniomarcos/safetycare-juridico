-- Protege registros simulados/teste contra exclusao acidental.
-- DELETE eh bloqueado para as tabelas demo/protect.
-- A flag is_protected nao pode ser removida por update casual.

create or replace function prevent_protected_record_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(old.is_protected, false) then
    raise exception 'protected_record_delete_blocked';
  end if;

  return old;
end;
$$;

create or replace function prevent_protected_record_unlock()
returns trigger
language plpgsql
as $$
begin
  if coalesce(old.is_protected, false) and coalesce(new.is_protected, false) is false then
    raise exception 'protected_record_unlock_blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_protected_delete_patients on patients;
create trigger trg_prevent_protected_delete_patients
before delete on patients
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_delete_hospital_cases on hospital_cases;
create trigger trg_prevent_protected_delete_hospital_cases
before delete on hospital_cases
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_delete_patient_journey on patient_journey;
create trigger trg_prevent_protected_delete_patient_journey
before delete on patient_journey
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_delete_evidence_docs on evidence_docs;
create trigger trg_prevent_protected_delete_evidence_docs
before delete on evidence_docs
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_delete_agent_intelligence on agent_intelligence;
create trigger trg_prevent_protected_delete_agent_intelligence
before delete on agent_intelligence
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_delete_legal_alerts on legal_alerts;
create trigger trg_prevent_protected_delete_legal_alerts
before delete on legal_alerts
for each row
execute function prevent_protected_record_delete();

drop trigger if exists trg_prevent_protected_unlock_patients on patients;
create trigger trg_prevent_protected_unlock_patients
before update of is_protected on patients
for each row
execute function prevent_protected_record_unlock();

drop trigger if exists trg_prevent_protected_unlock_hospital_cases on hospital_cases;
create trigger trg_prevent_protected_unlock_hospital_cases
before update of is_protected on hospital_cases
for each row
execute function prevent_protected_record_unlock();

drop trigger if exists trg_prevent_protected_unlock_patient_journey on patient_journey;
create trigger trg_prevent_protected_unlock_patient_journey
before update of is_protected on patient_journey
for each row
execute function prevent_protected_record_unlock();

drop trigger if exists trg_prevent_protected_unlock_evidence_docs on evidence_docs;
create trigger trg_prevent_protected_unlock_evidence_docs
before update of is_protected on evidence_docs
for each row
execute function prevent_protected_record_unlock();

drop trigger if exists trg_prevent_protected_unlock_agent_intelligence on agent_intelligence;
create trigger trg_prevent_protected_unlock_agent_intelligence
before update of is_protected on agent_intelligence
for each row
execute function prevent_protected_record_unlock();

drop trigger if exists trg_prevent_protected_unlock_legal_alerts on legal_alerts;
create trigger trg_prevent_protected_unlock_legal_alerts
before update of is_protected on legal_alerts
for each row
execute function prevent_protected_record_unlock();
