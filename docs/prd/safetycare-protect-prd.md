# PRD 1.0 — SAFETYCARE PROTECT
## Plataforma de Inteligência Jurídica Hospitalar com Agentes Autônomos (AIOX)

### 1. Goals and Background Context
#### Goals
- Reduzir a judicialização hospitalar através de monitoramento preventivo.
- Estruturar a defesa técnica antecipada baseada em evidências auditáveis.
- Aumentar a previsibilidade operacional e segurança jurídica para B2B.
- Transformar a jornada do paciente em uma trilha de prova jurídica estruturada.

#### Background Context
O mercado hospitalar brasileiro enfrenta um crescimento exponencial de processos judiciais, muitas vezes perdidos não por erro médico de fato, mas pela incapacidade da instituição de provar a correção de sua conduta devido a falhas documentais e de processo. O **SafetyCare Protect** inverte a lógica do B2C (Estatuto do Paciente) para o B2B, criando uma "máquina de defesa" que monitora, valida e protege a operação hospitalar em tempo real usando a tecnologia de agentes autônomos AIOX.

#### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-04-27 | 1.0 | Initial PRD for SafetyCare Protect | Morgan (PM) |

---

### 2. Requirements
#### Functional
- **FR1: Orquestração Central (AIOX):** O sistema deve possuir um Orquestrador Central para coordenar 15 agentes especializados divididos em 6 Squads.
- **FR2: Reconstrução de Jornada:** O Squad 1 deve mapear cronologicamente todos os eventos da jornada do paciente (Timeline).
- **FR3: Validação Documental:** O Squad 2 deve identificar lacunas em prontuários e termos de consentimento informado.
- **FR4: Monitoramento de Protocolos:** O Squad 3 deve validar a aderência a protocolos clínicos críticos (Ex: Meningite, Neuro, UTI).
- **FR5: Verificação de Direitos:** O Squad 4 deve garantir a conformidade com o Estatuto do Paciente (Direito à informação, privacidade, etc).
- **FR6: Score de Risco Jurídico:** O Squad 5 deve calcular a probabilidade de litígio e força da defesa em tempo real.
- **FR7: Geração de Alertas:** O sistema deve disparar alertas automáticos para riscos críticos detectados.
- **FR8: Relatório de Defesa Preventiva:** Geração automática de dossiê com linha de defesa e justificativas clínicas.
- **FR9: Dashboard Executivo:** Painel para gestão com indicadores de ROI, economia gerada e áreas de alto risco.

#### Non Functional
- **NFR1: Segurança de Dados (LGPD):** Todos os dados de saúde devem ser criptografados e seguir rigorosamente a LGPD.
- **NFR2: Escalabilidade:** A arquitetura deve suportar o monitoramento de milhares de pacientes simultâneos via Supabase.
- **NFR3: Tempo de Resposta:** Alertas críticos devem ser processados e notificados em menos de 30 segundos após a detecção do evento.
- **NFR4: Disponibilidade:** O sistema deve garantir 99.9% de uptime para operações críticas hospitalares.

---

### 3. User Interface Design Goals
#### Overall UX Vision
Uma interface limpa, corporativa e de "comando e controle", focada em dashboards executivos para gestores e painéis de alerta para o corpo jurídico/administrativo.

#### Key Interaction Paradigms
- Dashboards com Dril-down (do hospital até o paciente específico).
- Linha do tempo visual (Timeline) com flags de risco (Verde/Amarelo/Vermelho).
- Notificações "Push" para alertas de criticidade alta.

#### Core Screens and Views
- **Executive Dashboard:** Visão macro de riscos, ROI e economia.
- **Case Management:** Lista de pacientes monitorados com score de risco.
- **Patient Journey Timeline:** Detalhamento cronológico com evidências.
- **Evidence Builder:** Central de documentos e lacunas identificadas.
- **Alert Center:** Gestão de notificações e ações corretivas.

---

### 4. Technical Assumptions
- **Repository Structure:** Monorepo (seguindo o padrão atual do projeto).
- **Service Architecture:** Serverless com Supabase (Edge Functions, Auth, DB, Storage).
- **Agent Framework:** AIOX (Agent Intelligence Orchestration) com squads especializados.
- **Integrations:** API-First para futura integração com ERPs hospitalares (MV, Tasy, etc).

---

### 5. Epic List
- **Epic 1: Foundation & Protection Core:** Setup do Orquestrador, Supabase Schema e Squad 1 (Jornada).
- **Epic 2: Documentation & Evidence Squad:** Implementação do Squad 2 e validação de documentos/prontuários.
- **Epic 3: Protocol & Patient Rights:** Implementação dos Squads 3 e 4 (Conformidade e Segurança).
- **Epic 4: Legal Risk & Defense Engine:** Motor de cálculo de Score e geração de relatórios de defesa (Squad 5).
- **Epic 5: Executive Dashboard & ROI:** Painel de indicadores, alertas e métricas financeiras (Squad 6).

---

### 6. Epic Details
#### Epic 1: Foundation & Protection Core
Estabelecer a infraestrutura básica do SafetyCare Protect, incluindo o banco de dados no Supabase e a reconstrução da jornada do paciente.

- **Story 1.1: Supabase Database Schema:** Como sistema, quero uma estrutura de tabelas (patients, cases, journey, agent_outputs) para armazenar dados de inteligência hospitalar.
- **Story 1.2: AIOX Orchestrator Setup:** Como sistema, quero configurar o Orquestrador Central para gerenciar a comunicação entre Squads.
- **Story 1.3: Journey Reconstruction (Squad 1):** Como gestor, quero que o Agente de Linha do Tempo organize os eventos clínicos cronologicamente.

#### Epic 2: Documentation & Evidence Squad
Focar na detecção de lacunas probatórias que são a maior causa de perda de processos.

- **Story 2.1: Medical Record Analysis:** Como jurídico, quero que o Agente de Prontuário identifique campos não preenchidos ou inconsistentes.
- **Story 2.2: Informed Consent Validation:** Como gestor de risco, quero validar se o termo de consentimento está assinado e coerente com o procedimento.

*(Próximas histórias serão detalhadas conforme a execução do backlog)*

---

### 7. Next Steps
- **UX Expert Prompt:** "Com base no PRD do SafetyCare Protect, projete o Dashboard Executivo e a visualização da Linha do Tempo de Jornada do Paciente, focando em clareza de risco e ação rápida."
- **Architect Prompt:** "Projete a infraestrutura de SQUADS no AIOX para o SafetyCare Protect, definindo os fluxos de JSON entre os 15 agentes e a integração com as tabelas do Supabase."
