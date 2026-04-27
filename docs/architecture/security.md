# Security

## Input Validation

- **Validation Library:** Zod
- **Validation Location:** boundary da API, consumers de webhook e IO de agentes
- **Required Rules:**
- todo input externo deve ser validado;
- validacao antes de qualquer persistencia ou execucao de agente;
- whitelisting por schema.

## Authentication & Authorization

- **Auth Method:** Supabase Auth para equipe interna
- **Session Management:** cookies seguros e JWT interno do Supabase
- **Required Patterns:**
- RLS para dados operacionais sensiveis;
- uso de service role apenas no worker e jobs confiaveis.

## Secrets Management

- **Development:** `.env.local` fora de versionamento
- **Production:** secrets do provedor de deploy + Supabase
- **Code Requirements:**
- nunca hardcode de secrets;
- acesso via camada de configuracao;
- nenhum secret em logs ou erros.

## API Security

- **Rate Limiting:** rate limiting por IP/origem no intake e nos webhooks publicos
- **CORS Policy:** restritiva para apps internos e origens conhecidas
- **Security Headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **HTTPS Enforcement:** obrigatorio em todos os ambientes remotos

## Data Protection

- **Encryption at Rest:** storage e banco gerenciados com criptografia habilitada
- **Encryption in Transit:** TLS fim a fim
- **PII Handling:** mascaramento em interfaces secundarias e hash de identificadores sensiveis quando possivel
- **Logging Restrictions:** nao logar relato clinico bruto, documentos, CPF, prontuario ou tokens

## Dependency Security

- **Scanning Tool:** Dependabot + npm audit + SAST
- **Update Policy:** revisao semanal de vulnerabilidades
- **Approval Process:** nova dependencia passa por justificativa e impacto de seguranca

## Security Testing

- **SAST Tool:** CodeQL ou equivalente no GitHub Actions
- **DAST Tool:** scanner leve em staging para endpoints publicos
- **Penetration Testing:** antes de go-live e a cada mudanca sensivel relevante
