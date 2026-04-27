-- 0002_seed_protect_data.sql
-- Seed data to demonstrate SafetyCare Protect capabilities

-- 1. Inserir Paciente
INSERT INTO patients (id, name, document_id, birth_date)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'João Silva', '123.456.789-00', '1985-05-20');

-- 2. Inserir Caso Hospitalar (Meningite)
INSERT INTO hospital_cases (id, patient_id, department, admission_date, current_risk_score, status)
VALUES ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Neurologia/Emergência', NOW() - INTERVAL '6 hours', 82, 'critical');

-- 3. Inserir Jornada (Timeline)
INSERT INTO patient_journey (case_id, event_date, event_type, description, risk_level)
VALUES 
('770e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '6 hours', 'Admissão', 'Paciente admitido com cefaleia intensa e febre.', 'low'),
('770e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 hours', 'Protocolo Ativado', 'Protocolo de Meningite iniciado pela triagem.', 'low'),
('770e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '4 hours', 'Exame Solicitado', 'Solicitação de Punção Lombar (LCR) e Tomografia.', 'medium'),
('770e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 hours', 'Atraso Detectado', 'Exame de LCR não realizado após 2h da solicitação.', 'high'),
('770e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 hour', 'Procedimento', 'Coleta de LCR realizada.', 'medium');

-- 4. Inserir Documentos e Evidências (Com Lacunas)
INSERT INTO evidence_docs (case_id, doc_type, validation_status, gap_details)
VALUES 
('770e8400-e29b-41d4-a716-446655440001', 'Prontuário Admissional', 'valid', 'Completo e assinado.'),
('770e8400-e29b-41d4-a716-446655440001', 'Termo de Consentimento', 'missing_info', 'Ausência de assinatura específica para Punção Lombar.'),
('770e8400-e29b-41d4-a716-446655440001', 'Evolução de Enfermagem', 'pending', 'Lacuna de registro entre 12:00 e 15:00.');

-- 5. Inserir Inteligência dos Agentes (Dossiê de Defesa)
INSERT INTO agent_intelligence (case_id, squad_name, agent_id, findings, recommendation)
VALUES 
('770e8400-e29b-41d4-a716-446655440001', 'Legal_Risk_Squad', 'defense_strategy_agent', 
'{
  "legal_thesis": "A conduta clínica seguiu o protocolo de meningite, porém o atraso operacional no exame deve ser justificado pela sobrecarga da unidade no período.",
  "defense_strength": "Média-Alta",
  "causal_nexus": "O atraso de 2h não comprometeu o desfecho clínico imediato conforme evolução posterior."
}', 
'Obter relatório de escala da enfermagem para justificar o atraso operacional e coletar assinatura do consentimento retroativo com ressalva.');

-- 6. Inserir Alerta Crítico
INSERT INTO legal_alerts (case_id, severity, message)
VALUES ('770e8400-e29b-41d4-a716-446655440001', 'Critical', 'RISCO JURÍDICO ALTO: Atraso em diagnóstico crítico detectado no Caso SC-4920.');
