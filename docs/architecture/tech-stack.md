# Tech Stack

## Cloud Infrastructure

- **Provider:** Supabase + Vercel + Railway
- **Key Services:** Supabase Postgres/Auth/Storage, Vercel para web app, Railway para worker e servicos auxiliares
- **Deployment Regions:** Brasil ou US-East para app/worker; regiao do projeto Supabase alinhada com latencia e compliance operacional

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
| --- | --- | --- | --- | --- |
| Monorepo | npm workspaces | 10.x | Gestao do monorepo | Alinha com o projeto atual e reduz friccao operacional |
| Runtime | Node.js | 22.x LTS | Runtime principal | Ecossistema maduro, suporte a Next.js e worker |
| Language | TypeScript | 5.x | Linguagem principal | Contratos fortes entre agentes, APIs e dominio |
| Web Framework | Next.js | 16.x | Aplicacao web fullstack | Preset ativo do framework AIOX, SSR, Route Handlers e dashboard |
| UI | React | 19.x | Base da interface | Compatibilidade com Next.js moderno |
| Styling | Tailwind CSS | 3.4.x | Estilizacao | Rapidez na construcao do painel operacional |
| UI Components | shadcn/ui | current scaffold | Componentes acessiveis | Boa ergonomia para backoffice operacional |
| Forms | React Hook Form | 7.x | Formularios internos e intake | Performance e boa integracao com Zod |
| Validation | Zod | 3.x | Validacao de contratos | Mesma linguagem para front, API e agentes |
| Server State | TanStack Query | 5.x | Cache e sincronizacao de dados | Ideal para dashboard e telas de operacao |
| Database | PostgreSQL | 16 | Banco principal | Consistencia transacional e relacional forte |
| BaaS | Supabase | managed | Auth, DB, Storage, RLS | Reduz tempo de setup e oferece primitives uteis |
| ORM / Query Layer | Drizzle ORM | 0.4x | Acesso tipado ao Postgres | SQL-first, leve e adequado para contratos claros |
| Queue | pg-boss | 10.x | Jobs assicronos | Evita Redis no MVP e usa o Postgres existente |
| Worker Framework | Node worker service | custom | Orquestracao e retries | Controle fino do pipeline de agentes |
| Automation | n8n | 1.x | Integracoes e automacoes | Maior controle interno; Make pode coexistir |
| Messaging | WhatsApp Cloud API | v20+ | Canal principal de entrada e resposta | Fit direto com intake conversacional |
| Observability | Sentry + OpenTelemetry | 9.x / 1.x | Erros, traces e monitoramento | Visibilidade de fluxo e falhas |
| Analytics / BI | Metabase | 0.5x | Dashboard executivo e analitico | Rapido para operacao e leitura de funil |
| Unit Testing | Vitest | 3.x | Testes unitarios | Rapido e integrado ao stack TS |
| Integration Testing | Vitest + Testcontainers | 3.x / 10.x | Testes de integracao | Valida banco, jobs e integracoes locais |
| E2E Testing | Playwright | 1.5x | Testes de fluxos criticos | Garante intake, triagem e backoffice |
| CI/CD | GitHub Actions | managed | Pipeline de build/test/deploy | O projeto ja possui estrutura `.github/` |
