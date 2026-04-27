# REST API Spec

```yaml
openapi: 3.0.3
info:
  title: SAFETYCARE Juridico API
  version: 1.0.0
  description: API interna e publica para intake, operacao de casos e dashboard.
servers:
  - url: https://api.safetycarejuridico.com
    description: Production
paths:
  /api/intake/lead:
    post:
      summary: Criar lead e caso inicial
  /api/webhooks/whatsapp:
    post:
      summary: Receber eventos do WhatsApp Cloud API
  /api/cases:
    get:
      summary: Listar casos com filtros operacionais
  /api/cases/{caseId}:
    get:
      summary: Obter caso consolidado
  /api/cases/{caseId}/review:
    post:
      summary: Registrar revisao humana
  /api/cases/{caseId}/documents:
    post:
      summary: Upload de documento do caso
  /api/cases/{caseId}/commercial-actions:
    post:
      summary: Registrar acao comercial
  /api/cases/{caseId}/legal-artifacts:
    post:
      summary: Criar rascunho juridico
  /api/dashboard/overview:
    get:
      summary: Retornar metricas executivas
components:
  schemas:
    LeadCreateRequest:
      type: object
      required: [source, message]
    CaseSummary:
      type: object
    ReviewDecision:
      type: object
```
