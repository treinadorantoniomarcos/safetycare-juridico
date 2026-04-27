# Test Strategy and Standards

## Testing Philosophy

- **Approach:** test-first para dominio e fluxos criticos; test-after assistido para telas nao criticas
- **Coverage Goals:** alto valor em dominio, intake, score e seguranca; cobertura moderada em UI administrativa
- **Test Pyramid:** predominio de unitarios, integracao forte em banco e workflows, E2E seletivo

## Test Types and Organization

### Unit Tests

- **Framework:** Vitest 3.x
- **File Convention:** `*.test.ts` e `*.test.tsx`
- **Location:** junto ao modulo ou em `tests/unit`
- **Mocking Library:** Vitest mocks + MSW quando aplicavel
- **Coverage Requirement:** 80% em dominio, orquestracao e contratos

**AI Agent Requirements:**
- gerar testes para metodos publicos do dominio e orquestrador;
- cobrir edge cases, retries e gates de revisao;
- seguir AAA;
- mockar dependencias externas.

### Integration Tests

- **Scope:** banco, queue, integracoes internas e route handlers
- **Location:** `tests/integration`
- **Test Infrastructure:**
- **Database:** Postgres de teste / Testcontainers
- **Queue:** pg-boss em banco de teste
- **External APIs:** stubs HTTP e fixtures de webhook

### End-to-End Tests

- **Framework:** Playwright 1.5x
- **Scope:** intake publico, painel interno e revisao humana
- **Environment:** staging ou preview environment
- **Test Data:** fixtures anonimizadas e builders deterministicas

## Test Data Management

- **Strategy:** builders e seeds anonimizados por dominio
- **Fixtures:** `tests/fixtures`
- **Factories:** builders de Lead, Case, Score e Document
- **Cleanup:** rollback por transacao ou truncate controlado

## Continuous Testing

- **CI Integration:** lint -> typecheck -> unit -> integration -> smoke preview
- **Performance Tests:** basicos em endpoints de intake e dashboard
- **Security Tests:** scans de dependencia, SAST e testes de autorizacao
