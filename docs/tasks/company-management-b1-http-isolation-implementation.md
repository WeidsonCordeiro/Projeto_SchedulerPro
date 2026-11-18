# Task B1 — Testes HTTP isolamento Company | Implementação

**Data:** 2026-11-18  
**Contexto:** [`company-management-audit.md`](./company-management-audit.md) (bloco B1)  
**Git write desta tarefa:** branch criada; **sem** commit/push/PR

---

## 1. Objetivo e contexto

Implementar cobertura HTTP de integração para `/api/companies`, validando isolamento multi-tenant (sessão empresa A não opera sobre empresa B), RBAC e contrato **404** cross-tenant alinhado com `CompanyService.ensureTenant`.

Complementa `CompanyService.isolation.test.ts` (unitário) sem substituir testes de logo/lifecycle existentes.

---

## 2. Branch e commit base

| Item | Valor |
|------|--------|
| Branch de trabalho | `test/company-multi-tenant-http-coverage` |
| Commit base | `6f35a7716ca14c46188304dbbd59ad8633c1dc6d` |
| Base | `develop` (up to date com `origin/develop` no início) |

---

## 3. Ficheiros criados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`server/tests/integration/routes/multi-tenant-companies.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-companies.routes.test.ts) | 26 testes HTTP (GET list, GET id, PATCH, DELETE, RBAC, sessões A/B) |
| Este relatório | Documentação da entrega |

**Helpers reutilizados:** [`tenant-ids.ts`](../../server/tests/integration/helpers/tenant-ids.ts) / `tenant-ids.cjs` (sem novos helpers).

**Fora de escopo (inalterados):** `server/src/**`, testes unitários existentes, `company-logo.routes.test.ts`.

---

## 4. Cenários implementados

| Grupo | Rotas / casos |
|-------|----------------|
| A | GET `/api/companies` — tenant A, tenant B, listagem vazia |
| B | GET `/api/companies/:id` — própria, cross-tenant 404, id inválido 400 |
| C | PATCH — sucesso OWNER, cross 404, body `companyId` ignorado, `isActive` não persistido, timezone/nome inválidos 400 |
| D | DELETE — soft delete próprio, cross 404 sem `softDelete` |
| E | RBAC — GET/PATCH/DELETE para OWNER, ADMIN, MANAGER, EMPLOYEE |
| F | Duas sessões OWNER A/B alternadas (GET por id + GET list) |

**Total:** **26** testes (`it` / `it.each` expandidos).

---

## 5. Rotas e middlewares reais

Montagem via `import app from "../../../src/app"` — prefixo `/api/companies` de [`routes/index.ts`](../../server/src/routes/index.ts).

**Reais (não mockados):**

- [`CompanyRoutes`](../../server/src/modules/companies/routes/CompanyRoutes.ts)
- [`CompanyController`](../../server/src/modules/companies/controllers/CompanyController.ts)
- [`CompanyService`](../../server/src/modules/companies/services/CompanyService.ts)
- `hasPermission` / matriz [`rbac.ts`](../../server/src/constants/rbac.ts)
- [`updateCompanyValidator`](../../server/src/modules/companies/validators/update-company.validator.ts) + `validateRequest`
- [`validateObjectId`](../../server/src/middlewares/object-id.middleware.ts)
- [`RequireOperationalCompanyMiddleware`](../../server/src/middlewares/require-operational-company.middleware.ts) (usa `CompanyRepository.findById` real no código — mock no teste)

**Fora de escopo neste ficheiro:** `activate`, `deactivate`, logo (cobertos em unit).

---

## 6. Mocks e limitações

| Mock | Motivo |
|------|--------|
| `AuthMiddleware` | Injeta `authUser.value` em `req.user` — **não valida JWT, cookie nem assinatura** |
| `CompanyRepository` | Isolar persistência; assertions em `findAll`, `findById`, `update`, `softDelete` |
| `UserRepository.findByIdForAccessControl` | `PasswordChangeMiddleware` real chama o repositório — sem mock ocorria timeout Mongo (`users.findOne()` buffering) |

**Não mockado:** `CompanyService` (isolamento `ensureTenant` é exercido de ponta a ponta até ao repositório).

**Limitação:** com repositório mockado, não se prova queries Mongo reais no módulo Company (padrão Task 4 Bloco A). Não há `mongodb-memory-server` neste ficheiro.

---

## 7. Validação do isolamento

| Verificação | Mecanismo |
|-------------|-----------|
| Cross-tenant read/update/delete | HTTP **404** + `findById` / `update` / `softDelete` **não** chamados quando `ensureTenant` falha antes do repo (GET `:id` cross) |
| Listagem | `findAll` sempre com `companyId` da sessão; payload sem `id` de outro tenant |
| PATCH body | `companyId` no body não altera argumento de `update` (só `ids.companyA`) |
| DTO | `isActive` / `deletedAt` no body não passam para `update` |
| DELETE | `softDelete` só no id da sessão |

---

## 8. Validação RBAC

| Role | GET list | PATCH | DELETE |
|------|----------|-------|--------|
| OWNER | 200 | 200 | 200 |
| ADMIN | 200 | 200 | 403, sem `softDelete` |
| MANAGER | 403, sem `findAll` | 403 | 403 |
| EMPLOYEE | 403 | 403 | 403 |

Evidência: `HttpStatus.FORBIDDEN` antes de chamadas ao repositório nos papéis sem permissão `COMPANY_*`.

---

## 9. Resultados — novo ficheiro

```bash
cd server && npm run test -- tests/integration/routes/multi-tenant-companies.routes.test.ts
```

| Métrica | Resultado |
|---------|-----------|
| Data | 2026-11-18 |
| Ficheiros | 1 passed |
| Testes | **26/26** passed |
| Duração | ~19s (pós-correcção mock UserRepository) |

**Nota:** 1.ª corrida falhou (25/26) por ausência de mock `UserRepository` — timeouts 10s em `PasswordChangeMiddleware`. Corrigido no mesmo ficheiro de teste (sem alterar produção).

---

## 10. Resultados — suite Company existente

```bash
cd server && npm run test -- tests/unit/companies
```

| Métrica | Resultado |
|---------|-----------|
| Ficheiros | 8 passed |
| Testes | **78/78** passed |
| Duração | ~35s |

---

## 11. Typecheck e build

```bash
cd server && npm run typecheck && npm run build
```

| Comando | Resultado |
|---------|-----------|
| `tsc --noEmit` | Exit **0** |
| `tsc` (build) | Exit **0** |

---

## 12. Problemas encontrados

| ID | Descrição | Resolução |
|----|-----------|-----------|
| B1-T1 | Password change middleware acedia Mongo real | Mock mínimo `findByIdForAccessControl` (padrão outros testes integration) |
| B1-T2 | — | Nenhuma falha de segurança em produção detectada |

Nenhuma alteração em `server/src`.

---

## 13. Limitações conhecidas

- Auth mockado — não é teste JWT E2E.
- Repositório Company mockado — não valida índices/filtros Mongo.
- Activate/deactivate/logo cross-tenant não cobertos neste ficheiro.
- Política de bloqueio de DELETE com dados associados (B2) **não** testada.

---

## 14. Estado final do Git

| Item | Valor |
|------|--------|
| Branch | `test/company-multi-tenant-http-coverage` |
| HEAD | `6f35a7716ca14c46188304dbbd59ad8633c1dc6d` (sem commit local) |
| Untracked | `server/tests/integration/routes/multi-tenant-companies.routes.test.ts`, `docs/tasks/company-management-b1-http-isolation-implementation.md` |
| Untracked pré-existente | `docs/tasks/company-management-audit.md` |
| `git diff --check` | Exit **0** |
| Ficheiros tracked modificados | **0** |

---

## 15. Confirmação — sem alterações em produção

`git diff --stat` em `server/src/**`: **vazio**.  
Apenas ficheiros de teste e documentação novos.

---

## 16. Próximos passos recomendados

1. **B2** — política de soft delete (agendamentos/dados) + testes quando implementado.
2. HTTP cross-tenant para `POST/DELETE .../logo` (opcional, padrão `company-logo.routes.test.ts` + `ensureTenant`).
3. Integração Mongo `CompanyRepository` (opcional, se suite estabilizar).
4. Commit humano desta branch + PR.
5. Estabilizar testes FE company (auditoria — timeouts) em tarefa separada.