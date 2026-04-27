# Coding Standards

## Core Standards

- **Languages & Runtimes:** TypeScript 5.x e Node.js 22.x
- **Style & Linting:** ESLint + Prettier com `strict` no TypeScript
- **Test Organization:** testes ao lado dos modulos ou em `tests/` por tipo

## Naming Conventions

| Element | Convention | Example |
| --- | --- | --- |
| Components | PascalCase | `CaseTimeline.tsx` |
| Route handlers | kebab-case path | `/api/cases/[caseId]/review` |
| Services | camelCase + Service | `caseScoringService.ts` |
| Repositories | camelCase + Repository | `caseRepository.ts` |
| Contracts | kebab-case + `.schema.ts` | `legal-score-output.schema.ts` |
| Jobs | snake_case | `case_scoring_requested` |
| Database tables | snake_case plural | `legal_scores` |

## Critical Rules

- **No direct LLM output persistence without validation:** toda saida de agente deve passar por schema Zod.
- **No PII in logs:** dados sensiveis nunca podem ir para logs ou traces.
- **No agent bypass of review gates:** flows de revisao nao podem ser pulados em codigo.
- **Repository boundary:** acesso ao banco apenas via `packages/database`.
- **Integration boundary:** chamadas externas apenas via `packages/integrations`.
