# Infrastructure and Deployment

## Infrastructure as Code

- **Tool:** Terraform 1.x + SQL migrations
- **Location:** `infra/`
- **Approach:** provisionamento declarativo para ambientes gerenciados e migracoes versionadas para banco

## Deployment Strategy

- **Strategy:** web app com deploy continuo e worker com rolling deploy
- **CI/CD Platform:** GitHub Actions
- **Pipeline Configuration:** `.github/workflows/`

## Environments

- **local:** desenvolvimento com banco remoto ou stack local simulada - foco em produtividade
- **staging:** homologacao integrada com webhooks de teste e dados anonimizados
- **production:** operacao real com secrets gerenciados, monitoramento e alertas ativos

## Environment Promotion Flow

```text
feature branch
  -> pull request
  -> lint + typecheck + unit tests + integration tests
  -> deploy preview (web)
  -> merge main
  -> staging deploy
  -> smoke checks
  -> production approval
  -> production deploy
```

## Rollback Strategy

- **Primary Method:** rollback por release da web + rollback por imagem do worker + reversao controlada de feature flags
- **Trigger Conditions:** aumento de erro, falha de ingestao, regressao de score, incidente de seguranca
- **Recovery Time Objective:** ate 30 minutos para restaurar operacao central
