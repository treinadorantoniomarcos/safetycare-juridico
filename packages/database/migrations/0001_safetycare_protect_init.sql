-- 0001_safetycare_protect_init.sql
-- Migration to initialize the SafetyCare Protect Database Schema

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Pacientes (Core)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document_id TEXT UNIQUE NOT NULL, 
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Casos Hospitalares (Monitoramento)
CREATE TABLE IF NOT EXISTS hospital_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    department TEXT NOT NULL, 
    current_risk_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jornada do Paciente (Linha do Tempo)
CREATE TABLE IF NOT EXISTS patient_journey (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES hospital_cases(id),
    event_date TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL, 
    description TEXT,
    risk_level TEXT DEFAULT 'low', 
    source_system TEXT, 
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Central de Documentos e Evidências
CREATE TABLE IF NOT EXISTS evidence_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES hospital_cases(id),
    doc_type TEXT NOT NULL, 
    file_url TEXT,
    validation_status TEXT DEFAULT 'pending', 
    gap_details TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inteligência dos Agentes (Output dos Squads)
CREATE TABLE IF NOT EXISTS agent_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES hospital_cases(id),
    squad_name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    findings JSONB NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Alertas Jurídicos
CREATE TABLE IF NOT EXISTS legal_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES hospital_cases(id),
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
