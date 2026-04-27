# Epic 1 Foundation and Intake Orchestration

Objetivo: Construir a espinha dorsal do produto com intake confiavel, persistencia segura, consentimento e fluxo inicial do orquestrador. Ao final deste epic, a operacao deve conseguir receber um lead real, registrar os dados essenciais e encaminhar o caso para processamento com rastreabilidade.

## Story 1.1 Lead Intake Channels and Case Creation

As a potencial cliente,
I want enviar meu relato por WhatsApp, formulario ou site,
so that meu caso entre rapidamente em analise.

### Acceptance Criteria

1. O sistema recebe leads de pelo menos dois canais no MVP, incluindo WhatsApp.
2. Cada lead cria um registro de caso com identificador unico, origem e timestamp.
3. O relato original e preservado integralmente para auditoria.
4. Existe mensagem automatica inicial de confirmacao de recebimento.

## Story 1.2 Consent and Sensitive Data Guardrails

As a operacao SAFETYCARE,
I want registrar consentimentos e limites de uso de dados,
so that o tratamento de informacoes sensiveis ocorra com seguranca juridica.

### Acceptance Criteria

1. O fluxo coleta consentimento para tratamento de dados pessoais e sensiveis antes de analises profundas.
2. O status de consentimento fica visivel no caso.
3. Casos sem consentimento adequado ficam bloqueados para etapas sensiveis.
4. O texto de consentimento e versionado e auditavel.

## Story 1.3 SafetyCare Orchestrator Skeleton and Audit Trail

As a operador interno,
I want que o orquestrador controle o fluxo do caso e registre cada etapa,
so that a operacao seja previsivel e auditavel.

### Acceptance Criteria

1. O orquestrador executa o fluxo inicial definido para intake e encaminhamento.
2. Cada transicao de estado gera log estruturado.
3. Falhas de processamento ficam visiveis para reprocessamento humano.
4. Existe health check tecnico demonstrando operacao do fluxo base.
