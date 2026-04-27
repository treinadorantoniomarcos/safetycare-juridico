# Technical Assumptions

## Repository Structure: Monorepo

Assumir monorepo para concentrar orquestracao, servicos de backend, automacoes, dashboard operacional e ativos compartilhados de dominio.

## Service Architecture

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

## Testing Requirements

Adotar piramide minima com testes unitarios e de integracao desde o MVP. Fluxos criticos de intake, triagem, score, persistencia e alertas devem possuir cobertura automatizada. Fluxos juridicos externos podem iniciar com validacao manual assistida, desde que haja checklist e trilha de auditoria.

## Additional Technical Assumptions and Requests

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
