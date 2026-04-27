# @safetycare/database

Pacote responsavel pelo schema inicial, conexao e repositories do SAFETYCARE Juridico.

## Estrutura inicial

- `src/schema.ts`: definicao das tabelas de intake e auditoria
- `src/client.ts`: fabrica do client de banco
- `src/repositories/`: camada de acesso a dados
- `migrations/0001_initial_intake.sql`: migration inicial
- `drizzle.config.ts`: configuracao de generate/migrate

## Variaveis esperadas

- `DATABASE_URL`: string de conexao Postgres

## Scripts

- `npm run db:generate --workspace @safetycare/database`
- `npm run db:migrate --workspace @safetycare/database`
