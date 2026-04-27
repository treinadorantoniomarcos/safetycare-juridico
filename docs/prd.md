# SAFETYCARE Juridico Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Construir uma operacao B2C de judicializacao em saude orientada por IA, focada em pacientes e familiares.
- Reduzir o tempo entre o primeiro contato e a triagem tecnica inicial para menos de 30 minutos nos casos prioritarios.
- Aumentar a qualidade probatoria dos casos antes da decisao comercial e juridica.
- Elevar a taxa de conversao comercial por meio de narrativa estruturada, rapidez de resposta e confianca.
- Priorizar casos com maior chance de exito, maior valor potencial e melhor robustez documental.
- Padronizar a operacao juridica para permitir escala sem perda de qualidade.
- Criar uma camada de inteligencia operacional para identificar canais, tipos de caso e modulos mais lucrativos.

### Background Context

A judicializacao em saude no Brasil cresce em um contexto de desorganizacao operacional, falhas sistemicas de atendimento, dificuldade de acesso a informacao e baixa qualidade documental. Na pratica, muitos pacientes e familiares sofrem danos relevantes, mas nao conseguem transformar a propria experiencia em uma narrativa objetiva, tecnicamente estruturada e juridicamente acionavel.

O posicionamento do SAFETYCARE Juridico e atuar como infraestrutura de transformacao de dor em prova juridica. O produto nao se apresenta como um escritorio tradicional, mas como uma maquina de aquisicao, analise, qualificacao, conversao e execucao juridica, apoiada por agentes autonomos e supervisao humana. O valor central nao esta apenas em captar casos, mas em reconstruir a verdade da jornada do paciente com disciplina operacional.

### Business Model and Unit Economics

- Modelo de negocio: 100% B2C.
- Publico comprador: pacientes e familiares.
- Receita principal: honorarios de exito.
- Faixa de monetizacao: 20% a 40% sobre o exito.
- Ticket medio esperado:
- Baixa complexidade: R$ 5 mil a R$ 20 mil.
- Media complexidade: R$ 20 mil a R$ 80 mil.
- Alta complexidade: R$ 80 mil a R$ 500 mil ou mais.

### MVP Scope

- Captacao multicanal via WhatsApp, formulario e site.
- Triagem automatizada de casos nas categorias: erro medico, falha hospitalar, plano de saude e estetica.
- Estruturacao da jornada do paciente em linha do tempo tecnica.
- Analise clinica orientada a sinais de falha, sem emitir diagnostico medico.
- Analise de direitos do paciente e lacunas probatorias.
- Score juridico inicial com apoio a decisao comercial.
- Suporte a conversao comercial e handoff para execucao juridica.
- Dashboard operacional com funil, conversao, carteira e indicadores de growth.

### Out of Scope for MVP

- Protocolo judicial totalmente autonomo sem revisao humana.
- Emissao de diagnostico medico, parecer medico formal ou decisao juridica definitiva por IA.
- Operacao B2B com hospitais, clinicas, operadoras ou parceiros corporativos.
- Integracao direta inicial com tribunais, PJe ou sistemas externos de ajuizamento.
- Cobertura irrestrita de todas as especialidades medicas antes da validacao dos modulos prioritarios.

### Success Metrics

- Tempo medio de primeira resposta ao lead.
- Percentual de leads qualificados.
- Taxa de conversao de caso qualificado para caso fechado.
- Custo por caso fechado.
- Ticket medio por caso fechado.
- Valor potencial da carteira ativa.
- Taxa de exito juridico por modulo e por tipo de caso.
- Tempo medio entre captacao, fechamento e inicio de execucao.
- ROI por canal de aquisicao.

### Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-04-25 | 4.0 | Primeira consolidacao do PRD do SAFETYCARE Juridico a partir do material estrategico e operacional fornecido pelo usuario | Codex + usuario |

## Requirements

### Functional

1. FR1: O sistema deve captar leads por WhatsApp, formulario web e site, registrando origem, dados basicos e relato inicial do caso.
2. FR2: O sistema deve solicitar e registrar consentimentos necessarios para tratamento de dados pessoais e dados sensiveis de saude antes de avancar para analises aprofundadas.
3. FR3: O agente de captacao deve resumir o relato inicial do usuario e identificar o tipo de problema informado.
4. FR4: O agente de triagem deve classificar o caso por categoria juridica, prioridade, urgencia, existencia de dano e potencial juridico.
5. FR5: O agente de jornada do paciente deve converter o relato em uma linha do tempo tecnica com eventos, datas aproximadas, decisoes medicas, intervencoes e pontos de risco.
6. FR6: O agente de analise clinica deve identificar sinais de atraso, falha de protocolo, ausencia de intervencao e outros indutores de risco, sem emitir diagnostico medico.
7. FR7: O agente de direitos do paciente deve avaliar possiveis violacoes relativas a informacao clara, consentimento informado, acesso a prontuario, continuidade do cuidado e seguranca do paciente.
8. FR8: O agente de prova deve identificar documentos existentes, documentos faltantes, pontos frageis e oportunidades de reforco probatorio.
9. FR9: O sistema deve gerar checklist documental por caso e classificar o nivel de robustez probatoria.
10. FR10: O agente de score juridico deve estimar chance de exito, valor potencial do caso e nivel de complexidade com base em dano, documentacao, falhas detectadas e parametros juridicos definidos pela operacao.
11. FR11: O sistema deve encaminhar casos de maior risco, alto valor ou baixa confianca para revisao humana obrigatoria antes de qualquer proposta comercial ou juridica.
12. FR12: O agente de conversao deve sugerir narrativa de fechamento, abordagem emocional e tecnica, e proximo passo comercial recomendado.
13. FR13: O sistema deve registrar cada caso em uma base operacional contendo cliente, jornada, documentos, analises, score, status comercial e status juridico.
14. FR14: O modulo de execucao deve apoiar a producao de pecas juridicas, notificacoes e liminares a partir de modelos e dados estruturados do caso, sempre com revisao humana antes do uso externo.
15. FR15: O sistema deve controlar prazos, pendencias documentais, andamento do caso e alertas operacionais.
16. FR16: O agente de cliente deve suportar atualizacoes de status, solicitacoes documentais e comunicacao recorrente com clientes ativos.
17. FR17: O agente de growth deve consolidar metricas de funil, conversao, tipo de caso, ticket medio e ROI por canal.
18. FR18: O dashboard operacional deve exibir em tempo real indicadores de captacao, qualificacao, conversao, financeiro, execucao e inteligencia.
19. FR19: O sistema deve manter trilha de auditoria das entradas recebidas, classificacoes feitas por agentes, intervencoes humanas e artefatos gerados.
20. FR20: O sistema deve permitir override humano em qualquer etapa critica do fluxo, com justificativa registrada.

### Non Functional

1. NFR1: O sistema deve operar em conformidade com a LGPD, com controles de acesso, base legal, consentimento e minimizacao de dados.
2. NFR2: Nenhum agente pode emitir diagnostico medico ou decisao juridica definitiva; o produto deve se posicionar como apoio tecnico-operacional com validacao humana.
3. NFR3: O sistema deve enviar resposta inicial automatica ao lead em ate 2 minutos e concluir triagem preliminar em ate 30 minutos para casos prioritarios.
4. NFR4: O sistema deve garantir rastreabilidade de ponta a ponta, incluindo prompts, entradas, saidas, versoes de modelos e acao humana relevante.
5. NFR5: O sistema deve suportar no minimo 800 leads por mes no horizonte de escala descrito, sem degradacao critica do tempo de resposta.
6. NFR6: O armazenamento de documentos deve usar criptografia em repouso e em transito.
7. NFR7: O produto deve adotar arquitetura observavel, com logs, metricas e alertas suficientes para diagnosticar gargalos operacionais e falhas de automacao.
8. NFR8: O sistema deve registrar niveis de confianca ou criterios de escalonamento quando a analise automatica for inconclusiva.
9. NFR9: A interface operacional deve ser responsiva e utilizavel em desktop e mobile web.
10. NFR10: O sistema deve permitir configuracao evolutiva de novos modulos de caso sem exigir redesenho completo da arquitetura.
11. NFR11: O produto deve seguir modelo de human-in-the-loop para etapas de decisao comercial sensivel, producao juridica externa e acao processual.
12. NFR12: O custo operacional por lead processado deve ser monitoravel para permitir otimizacao de ROI por canal e por modulo.

## User Interface Design Goals

### Overall UX Vision

A experiencia deve transmitir acolhimento, clareza e autoridade. Para o cliente final, a interface precisa reduzir ansiedade e facilitar o envio de informacoes. Para a equipe interna, a experiencia deve funcionar como uma central de controle, com visao imediata do funil, risco, urgencia e proximos passos.

### Key Interaction Paradigms

- Conversa guiada para intake inicial.
- Formularios curtos e progressivos para completar dados faltantes.
- Cards operacionais com score, risco, urgencia e pendencias.
- Timeline visual da jornada do paciente.
- Checklists documentais e status por caso.
- Alertas acionaveis para pendencias, revisoes e prazos.

### Core Screens and Views

- Tela de captura de lead e relato inicial.
- Caixa de entrada operacional de novos casos.
- Tela de triagem com classificacao, urgencia e score inicial.
- Visao de jornada do paciente em timeline.
- Tela de prova com checklist documental e lacunas.
- Workspace de conversao comercial para o responsavel pelo fechamento.
- Workspace juridico com pecas, prazos e andamento.
- Dashboard executivo com aquisicao, conversao, carteira e ROI.

### Accessibility: WCAG AA

O MVP deve perseguir WCAG AA na interface web principal, com contraste adequado, navegacao consistente, labels claros e foco visivel nos principais fluxos internos e externos.

### Branding

A marca deve se posicionar como precisa, seria, tecnica e empatica. O discurso visual deve evitar estetica de escritorio tradicional e reforcar a proposta de infraestrutura que transforma jornadas mal explicadas em prova bem estruturada.

### Target Device and Platforms: Web Responsive

- Web responsivo para operacao interna.
- Experiencia mobile-first nos fluxos de lead, especialmente quando originados do WhatsApp.
- Integracao com canais externos de mensagem como ponto de entrada, nao como unico ambiente de operacao.

## Technical Assumptions

### Repository Structure: Monorepo

Assumir monorepo para concentrar orquestracao, servicos de backend, automacoes, dashboard operacional e ativos compartilhados de dominio.

### Service Architecture

Arquitetura inicial recomendada: monolito modular com orquestracao orientada a eventos e filas leves. O produto deve centralizar o fluxo no SafetyCare Orchestrator, com agentes especializados por etapa e integracoes externas via webhooks e jobs assincronos.

Fluxo de referencia do orquestrador:

```json
{
  "flow": [
    "capture",
    "triage",
    "journey",
    "clinical_analysis",
    "rights_check",
    "evidence_builder",
    "risk_score",
    "conversion",
    "legal_execution"
  ]
}
```

### Testing Requirements

Adotar piramide minima com testes unitarios e de integracao desde o MVP. Fluxos criticos de intake, triagem, score, persistencia e alertas devem possuir cobertura automatizada. Fluxos juridicos externos podem iniciar com validacao manual assistida, desde que haja checklist e trilha de auditoria.

### Additional Technical Assumptions and Requests

- Banco principal e autenticacao: Supabase.
- Armazenamento documental: Supabase Storage ou equivalente com controle de acesso.
- Automacao e integracao: Make e/ou n8n, com preferencia por n8n quando houver necessidade de maior controle interno.
- Canal conversacional prioritario: WhatsApp Cloud API.
- Dashboard inicial: Metabase ou frontend web conectado ao banco operacional.
- O produto deve prever segregacao clara entre ambiente interno, fluxo de cliente e automacoes.
- O sistema deve permitir configuracao de modulos verticais prioritarios: neuro, estetica e plano de saude.
- Todo artefato juridico externo deve ser marcado como rascunho ate revisao humana.
- O motor de score deve ser parametrizavel e auditavel.
- Toda automacao de captura, triagem e conversao deve registrar origem do canal para analise de ROI.

## Epic List

1. Epic 1: Foundation and Intake Orchestration: Estabelecer a base tecnica do produto, pipeline de intake, consentimento e orquestracao inicial do caso.
2. Epic 2: Triage, Journey and Clinical Signal Analysis: Transformar o relato bruto em classificacao estruturada e linha do tempo com sinais clinicos relevantes.
3. Epic 3: Rights, Evidence and Legal Scoring: Converter o caso em avaliacao probatoria e juridica inicial com suporte a decisao.
4. Epic 4: Conversion and Commercial Operations: Aumentar taxa de fechamento com narrativa orientada por dados, SLA de resposta e rotina comercial estruturada.
5. Epic 5: Legal Execution, Client Ops and Deadlines: Sustentar a execucao juridica e o relacionamento com o cliente apos a conversao.
6. Epic 6: Growth Intelligence and Executive Dashboard: Fechar o ciclo com visibilidade de funil, lucratividade, carteira e escala.

## Epic 1 Foundation and Intake Orchestration

Objetivo: Construir a espinha dorsal do produto com intake confiavel, persistencia segura, consentimento e fluxo inicial do orquestrador. Ao final deste epic, a operacao deve conseguir receber um lead real, registrar os dados essenciais e encaminhar o caso para processamento com rastreabilidade.

### Story 1.1 Lead Intake Channels and Case Creation

As a potencial cliente,
I want enviar meu relato por WhatsApp, formulario ou site,
so that meu caso entre rapidamente em analise.

#### Acceptance Criteria

1. O sistema recebe leads de pelo menos dois canais no MVP, incluindo WhatsApp.
2. Cada lead cria um registro de caso com identificador unico, origem e timestamp.
3. O relato original e preservado integralmente para auditoria.
4. Existe mensagem automatica inicial de confirmacao de recebimento.

### Story 1.2 Consent and Sensitive Data Guardrails

As a operacao SAFETYCARE,
I want registrar consentimentos e limites de uso de dados,
so that o tratamento de informacoes sensiveis ocorra com seguranca juridica.

#### Acceptance Criteria

1. O fluxo coleta consentimento para tratamento de dados pessoais e sensiveis antes de analises profundas.
2. O status de consentimento fica visivel no caso.
3. Casos sem consentimento adequado ficam bloqueados para etapas sensiveis.
4. O texto de consentimento e versionado e auditavel.

### Story 1.3 SafetyCare Orchestrator Skeleton and Audit Trail

As a operador interno,
I want que o orquestrador controle o fluxo do caso e registre cada etapa,
so that a operacao seja previsivel e auditavel.

#### Acceptance Criteria

1. O orquestrador executa o fluxo inicial definido para intake e encaminhamento.
2. Cada transicao de estado gera log estruturado.
3. Falhas de processamento ficam visiveis para reprocessamento humano.
4. Existe health check tecnico demonstrando operacao do fluxo base.

## Epic 2 Triage, Journey and Clinical Signal Analysis

Objetivo: Transformar relatos desorganizados em informacao operacionalmente util. Ao final deste epic, a operacao deve conseguir classificar o tipo de caso, montar a jornada do paciente e destacar sinais clinicos relevantes sem extrapolar para diagnostico medico.

### Story 2.1 Automated Case Triage

As a analista de triagem,
I want receber classificacao inicial de tipo de caso, urgencia e prioridade,
so that eu consiga focar primeiro nos casos mais promissores ou criticos.

#### Acceptance Criteria

1. O agente de triagem retorna categoria, urgencia, dano e potencial juridico em formato estruturado.
2. Casos criticos ou de alta prioridade sao destacados para resposta acelerada.
3. O resultado da triagem pode ser revisado manualmente.
4. O sistema registra confianca ou justificativa da classificacao.

### Story 2.2 Patient Journey Timeline Builder

As a advogado ou analista,
I want ver a jornada do paciente em timeline tecnica,
so that eu entenda rapidamente a narrativa e os pontos de risco.

#### Acceptance Criteria

1. O agente de jornada extrai eventos, datas aproximadas, decisoes medicas e intervencoes.
2. Eventos criticos podem ser marcados com risco.
3. A timeline fica persistida e editavel por humano.
4. O sistema preserva referencia ao relato original usado para montar a timeline.

### Story 2.3 Clinical Signal Analysis Without Diagnosis

As a equipe juridica,
I want identificar sinais de falha clinica sem emitir diagnostico,
so that a analise avance com seguranca e foco juridico-operacional.

#### Acceptance Criteria

1. O agente aponta possiveis atrasos, falhas de protocolo e ausencias de intervencao.
2. A saida deixa explicito que nao se trata de diagnostico medico.
3. Casos inconclusivos sao marcados para revisao humana.
4. Os sinais detectados ficam vinculados a eventos especificos da jornada.

## Epic 3 Rights, Evidence and Legal Scoring

Objetivo: Converter a narrativa estruturada em capacidade de decisao. Ao final deste epic, a operacao deve conseguir avaliar direitos do paciente, robustez probatoria e viabilidade juridica inicial, separando melhor os bons casos dos casos ruins.

### Story 3.1 Patient Rights Assessment

As a operador juridico,
I want receber uma avaliacao estruturada dos direitos do paciente possivelmente violados,
so that eu consiga orientar a tese inicial do caso.

#### Acceptance Criteria

1. O agente analisa os cinco eixos prioritarios de direitos definidos no PRD.
2. Cada eixo retorna status e justificativa tecnica.
3. O resultado pode ser ajustado manualmente antes do score final.
4. A avaliacao integra a visao consolidada do caso.

### Story 3.2 Evidence Builder and Documentary Gap Mapping

As a equipe de prova,
I want uma checklist documental e mapa de lacunas,
so that eu saiba o que falta para fortalecer o caso.

#### Acceptance Criteria

1. O sistema lista documentos existentes e faltantes por caso.
2. O agente identifica pontos frageis e oportunidades de reforco probatorio.
3. O caso recebe um nivel de robustez probatoria.
4. A checklist pode ser enviada ao cliente para coleta complementar.

### Story 3.3 Legal Viability Score and Human Review Gate

As a responsavel comercial ou juridico,
I want um score inicial de viabilidade, valor e complexidade,
so that eu saiba se vale avancar, revisar ou descartar.

#### Acceptance Criteria

1. O score retorna chance de exito, valor estimado e complexidade.
2. O motor considera dano, documentacao e sinais de falha.
3. Casos acima de limiares definidos ou de baixa confianca exigem revisao humana.
4. O racional minimo do score fica disponivel para auditoria.

## Epic 4 Conversion and Commercial Operations

Objetivo: Transformar analise em fechamento com previsibilidade. Ao final deste epic, a operacao deve conseguir abordar o lead com narrativa consistente, acompanhar follow-ups e medir conversao por etapa e por canal.

### Story 4.1 Conversion Narrative Assistant

As a responsavel pelo fechamento,
I want receber uma narrativa recomendada de abordagem,
so that eu consiga conduzir a conversa com mais seguranca e consistencia.

#### Acceptance Criteria

1. O agente de conversao gera resumo de dor, oportunidade e proximo passo sugerido.
2. A narrativa diferencia abordagem emocional e tecnica.
3. O operador pode editar e aprovar a narrativa antes de uso.
4. O resultado se baseia apenas nos dados e analises do caso.

### Story 4.2 Commercial Follow-Up Workflow

As a equipe comercial,
I want controlar retorno, follow-up e status de fechamento,
so that nenhum caso qualificado seja perdido por falta de processo.

#### Acceptance Criteria

1. O sistema registra status comercial por caso.
2. Existem lembretes de follow-up e tempo desde o ultimo contato.
3. Motivos de perda podem ser classificados.
4. A taxa de conversao pode ser segmentada por canal e tipo de caso.

### Story 4.3 Flavio Closing Workspace

As a fechador principal,
I want um workspace unico com score, narrativa, risco e pendencias,
so that eu consiga decidir e conduzir a conversa final com clareza.

#### Acceptance Criteria

1. A tela de fechamento consolida score, jornada, prova e narrativa.
2. Casos com pendencias criticas ficam sinalizados.
3. O sistema registra se houve aceite, perda ou necessidade de coleta adicional.
4. O handoff para execucao ocorre sem reentrada manual de dados essenciais.

## Epic 5 Legal Execution, Client Ops and Deadlines

Objetivo: Suportar a execucao apos a conversao e manter o cliente informado. Ao final deste epic, a operacao deve conseguir organizar rascunhos juridicos, controlar prazos, pendencias e relacionamento em uma unica esteira.

### Story 5.1 Draft Legal Documents Workspace

As a advogado,
I want gerar rascunhos de pecas a partir do caso estruturado,
so that eu reduza retrabalho e acelere a preparacao inicial.

#### Acceptance Criteria

1. O sistema gera rascunhos de pecas e notificacoes a partir de templates aprovados.
2. Todo artefato externo fica marcado como rascunho ate revisao humana.
3. As fontes usadas no rascunho ficam rastreaveis ao caso.
4. O advogado pode editar e versionar o documento.

### Story 5.2 Deadlines, Alerts and Case Monitoring

As a operacao juridica,
I want controlar prazos e alertas por caso,
so that eu nao perca marcos relevantes nem documentos pendentes.

#### Acceptance Criteria

1. O sistema registra prazos e tipos de alerta.
2. Alertas podem ser filtrados por urgencia e responsavel.
3. Pendencias documentais ficam visiveis no caso.
4. O historico de andamentos e alertas fica preservado.

### Story 5.3 Client Communication and Retention Flow

As a cliente ativo,
I want receber atualizacoes e pedidos de documentos de forma clara,
so that eu saiba o que esta acontecendo e o que preciso enviar.

#### Acceptance Criteria

1. O sistema suporta mensagens padronizadas de atualizacao e coleta documental.
2. O status do caso pode ser comunicado em linguagem acessivel.
3. Existe historico de comunicacoes relevantes.
4. O fluxo permite capturar indicacoes e sinais de satisfacao no momento oportuno.

## Epic 6 Growth Intelligence and Executive Dashboard

Objetivo: Dar previsibilidade de crescimento e disciplina de gestao. Ao final deste epic, a lideranca deve enxergar claramente o desempenho da maquina de aquisicao, conversao, carteira e resultado.

### Story 6.1 Funnel and Channel Metrics Pipeline

As a lider da operacao,
I want consolidar metricas de leads, qualificacao e fechamento por canal,
so that eu consiga investir melhor e eliminar gargalos.

#### Acceptance Criteria

1. O sistema consolida leads, qualificados, prioritarios e fechados por canal.
2. O dashboard exibe custo por caso fechado e ROI por canal quando houver dados.
3. Os dados aceitam segmentacao por periodo e tipo de caso.
4. A origem do lead e preservada ao longo de todo o funil.

### Story 6.2 Executive Operational Dashboard

As a lider executiva,
I want um painel unico da operacao,
so that eu enxergue aquisicao, conversao, financeiro e execucao em tempo real.

#### Acceptance Criteria

1. O dashboard exibe metricas de captacao, qualificacao, conversao, financeiro e juridico.
2. Ha visao de carteira ativa, ticket medio e receita projetada.
3. Casos em risco e pendencias criticas ficam destacados.
4. O painel e responsivo e adequado para acompanhamento diario.

### Story 6.3 Portfolio and Module Intelligence

As a lider de growth,
I want comparar lucratividade e performance entre tipos de caso e modulos,
so that eu priorize o que escala melhor.

#### Acceptance Criteria

1. O sistema compara modulo neuro, estetica e plano de saude no minimo por volume, conversao e valor potencial.
2. Tipos de caso mais lucrativos ficam identificados.
3. O sistema permite descobrir perfis de cliente ideal por canal e modulo.
4. A operacao consegue revisar estrategicamente a prioridade dos modulos com base em dados.

## Checklist Results Report

Checklist do PM ainda nao executado nesta versao inicial. Antes de avancar para arquitetura e stories detalhadas, este PRD deve passar por:

- revisao de stakeholders de negocio;
- validacao juridica e de compliance;
- confirmacao das premissas tecnicas;
- refinamento dos thresholds do score juridico;
- revisao do escopo MVP versus fases futuras.

## Next Steps

### UX Expert Prompt

Use este PRD para desenhar a experiencia do cliente e da operacao interna do SAFETYCARE Juridico, priorizando intake mobile-first, timeline do paciente, checklist de prova e dashboard operacional.

### Architect Prompt

Use este PRD para propor a arquitetura do SAFETYCARE Juridico com foco em monolito modular orientado a eventos, Supabase, integracoes com WhatsApp/Make/n8n, trilha de auditoria, human-in-the-loop e escalabilidade do orquestrador de agentes.
