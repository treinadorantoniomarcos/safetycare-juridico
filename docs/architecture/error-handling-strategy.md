# Error Handling Strategy

## General Approach

- **Error Model:** erros tipados por camada (validation, integration, business, orchestration, security)
- **Exception Hierarchy:** domain errors separados de infra/integration errors
- **Error Propagation:** falhas previsiveis retornam resposta controlada; falhas assicronas geram retry ou dead-letter

## Logging Standards

- **Library:** logger interno + Sentry + OpenTelemetry
- **Format:** JSON estruturado
- **Levels:** debug, info, warn, error, fatal
- **Required Context:**
- Correlation ID: obrigatorio por request e job
- Service Context: app, component, agent, workflow
- User Context: apenas IDs internos; nunca PII bruta

## Error Handling Patterns

### External API Errors

- **Retry Policy:** exponential backoff com jitter para falhas temporarias
- **Circuit Breaker:** aplicado a WhatsApp e automacoes externas
- **Timeout Configuration:** timeouts curtos na API publica e moderados no worker
- **Error Translation:** erros externos convertidos para categorias internas auditaveis

### Business Logic Errors

- **Custom Exceptions:** invalid_case_state, missing_consent, insufficient_evidence, review_required
- **User-Facing Errors:** mensagens seguras e sem detalhes sensiveis
- **Error Codes:** namespace por modulo, ex. `CASE_REVIEW_REQUIRED`

### Data Consistency

- **Transaction Strategy:** transacoes por agregado principal quando houver multiplos writes sincronicos
- **Compensation Logic:** jobs de compensacao para falhas em integracoes externas
- **Idempotency:** intake e webhooks externos com chaves idempotentes
