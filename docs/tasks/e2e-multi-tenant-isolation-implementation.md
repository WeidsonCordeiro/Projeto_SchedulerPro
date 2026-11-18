# Implementação — Testes de isolamento multi-tenant (Task 4)

**Data:** 2026-11-18  
**Auditoria:** [`e2e-multi-tenant-isolation-audit.md`](./e2e-multi-tenant-isolation-audit.md)  
**Branch de implementação:** `test/multi-tenant-isolation-coverage`  
**Commit base:** `98e4f9b80f1dc8cfd77ce3be67501fb6f012b56a`  

**Git write pelo agente:** criação de branch e ficheiros de teste; **sem** commit, push ou PR.

---

## 1. Objetivo

Reforçar a cobertura de testes de isolamento entre empresas, sessão e RBAC (Blocos A, B e C da auditoria Task 4), **sem alterar código de produção**.

---

## 2. Contexto e referência à auditoria

| Item | Detalhe |
|------|---------|
| Relatório | [`e2e-multi-tenant-isolation-audit.md`](./e2e-multi-tenant-isolation-audit.md) |
| Branch de auditoria | `audit/e2e-multi-tenant-isolation` |
| Lacunas endereçadas | HTTP cross-tenant (Clients, Users, Services, Dashboard, Reports, Notifications); Mongo Clients/Users; sessões A/B; RBAC MANAGER/EMPLOYEE fora de appointments |

**Correcção de contagem (auditoria):** **9 módulos funcionais** auditados (appointments, clients, users, companies, services, availability, dashboard, reports, notifications) mais **uploads** e **canais públicos** como superfícies relacionadas — não “10 áreas com 12 linhas na tabela”.

---

## 3. Branch e commit base

| Campo | Valor |
|-------|--------|
| Branch | `test/multi-tenant-isolation-coverage` |
| Base | `develop` @ `98e4f9b80f1dc8cfd77ce3be67501fb6f012b56a` |
| Estado inicial | `develop` sincronizado; working tree sem alterações de produção |

---

## 4. Ficheiros criados e modificados

| Ficheiro | Tipo |
|----------|------|
| [`server/tests/integration/helpers/tenant-ids.ts`](../../server/tests/integration/helpers/tenant-ids.ts) | helper (ESM) |
| [`server/tests/integration/helpers/tenant-ids.cjs`](../../server/tests/integration/helpers/tenant-ids.cjs) | helper (`vi.hoisted`) |
| [`server/tests/integration/routes/multi-tenant-clients.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-clients.routes.test.ts) | HTTP — Bloco A |
| [`server/tests/integration/routes/multi-tenant-users.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-users.routes.test.ts) | HTTP — Bloco A |
| [`server/tests/integration/routes/multi-tenant-services.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-services.routes.test.ts) | HTTP — Bloco A |
| [`server/tests/integration/routes/multi-tenant-dashboard-reports.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-dashboard-reports.routes.test.ts) | HTTP — Bloco A |
| [`server/tests/integration/routes/multi-tenant-notifications.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-notifications.routes.test.ts) | HTTP — Bloco A |
| [`server/tests/integration/routes/multi-tenant-dual-session.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-dual-session.routes.test.ts) | HTTP — Bloco C |
| [`server/tests/integration/routes/multi-tenant-rbac-staff.routes.test.ts`](../../server/tests/integration/routes/multi-tenant-rbac-staff.routes.test.ts) | HTTP — Bloco C |
| [`server/tests/integration/clients/client-tenant-isolation.mongo.test.ts`](../../server/tests/integration/clients/client-tenant-isolation.mongo.test.ts) | Mongo — Bloco B |
| [`server/tests/integration/users/user-tenant-isolation.mongo.test.ts`](../../server/tests/integration/users/user-tenant-isolation.mongo.test.ts) | Mongo — Bloco B |
| Este relatório | documentação |

**Código de produção alterado:** **nenhum**.

---

## 5. Cenários por bloco

### Bloco A — HTTP (6 módulos)

| Módulo | Cenários principais |
|--------|---------------------|
| Clients | list tenant; GET/PATCH/DELETE cross-tenant; `companyId` no body ignorado; query spoof |
| Users | list; GET/PUT/DELETE cross-tenant → **403** (contrato `UserService`) |
| Services | list; GET/PATCH/DELETE cross-tenant → **403** |
| Dashboard | summary usa sessão; ignora `companyId` na query |
| Reports | overview usa sessão; EMPLOYEE → 403 |
| Notifications | scope companyId/userId; sessão B não lê notificação A (404) |

### Bloco B — Mongo

| Módulo | Cenários |
|--------|----------|
| Clients | `findByCompanyId` isolado; `findByIdAndCompany` com tenant errado; `update`/`softDelete` não afectam B |
| Users | `findByCompanyId` isolado; documenta `softDelete(id)` global (isolamento HTTP via `UserService`) |

### Bloco C — JWT / RBAC

| Item | Implementação |
|------|----------------|
| Sessões A/B | `multi-tenant-dual-session.routes.test.ts` — alternância sem contaminação |
| JWT `companyId` desatualizado | **Regressão existente:** [`auth.middleware.test.ts`](../../server/tests/unit/middlewares/auth.middleware.test.ts) L43-51 (`req.user.companyId` da BD, não do JWT) — não duplicado em HTTP |
| MANAGER/EMPLOYEE | `multi-tenant-rbac-staff.routes.test.ts` — create/list clients; deny user/service create; role inválido 400 |

---

## 6. Endpoints testados (resumo)

`/api/clients`, `/api/users`, `/api/services`, `/api/dashboard/summary`, `/api/reports/overview`, `/api/notifications` (+ `/:id/read`).

---

## 7. Real vs mockado

| Camada | Estado |
|--------|--------|
| Rotas Express reais (`app`) | Sim |
| Middlewares `hasPermission`, validators, `PasswordChange` / operational company | Reais (onde registados nas rotas) |
| `AuthMiddleware.authenticate` | **Mock** — injecta `req.user` (padrão do projecto) |
| Repositórios (HTTP) | **Mock** — valida encadeamento controller→service e argumentos `companyId` |
| Mongo (Bloco B) | **Real** — `mongodb-memory-server` + repositórios reais |

---

## 8. Separação por tipo

| Tipo | Ficheiros | Testes (aprox.) |
|------|-----------|------------------|
| HTTP integration | 7× `multi-tenant-*.routes.test.ts` | 28 |
| Mongo integration | 2× `*-tenant-isolation.mongo.test.ts` | 7 |
| JWT unit (pré-existente, Bloco C.2) | `auth.middleware.test.ts` | 1 cenário relevante |

**Total novos testes na suite:** **35** (1446 − 1411).

---

## 9. Resultados — testes alvo

```bash
npm run test -- tests/integration/routes/multi-tenant- \
  tests/integration/clients/client-tenant-isolation.mongo.test.ts \
  tests/integration/users/user-tenant-isolation.mongo.test.ts
```

| Resultado | Valor |
|-----------|--------|
| Ficheiros | 9 passed |
| Testes | **35/35** |

---

## 10. Suite completa backend

| Execução | Resultado |
|----------|-----------|
| 1.ª corrida completa | **1 falha** intermitente em ficheiro Mongo (conexão/`beforeEach`) |
| 2.ª corrida completa | **111** ficheiros, **1446/1446** passed (~287 s) |

---

## 11. Typecheck e build

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | exit **0** |
| `npm run build` | exit **0** |

---

## 12. Limitações e não implementado

- Sem Playwright/Cypress (fora de âmbito).
- HTTP com repositórios mockados — não prova queries Mongo nas rotas (Bloco B complementa para Clients/Users).
- Não foram adicionados testes HTTP dedicados a **Companies** (já existia `CompanyService.isolation.test.ts`).
- `UserRepository.softDelete(id)` sem filtro `companyId` — documentado; risco mitigado em `UserService` (não elevado a vulnerabilidade confirmada).

---

## 13. Vulnerabilidades / comportamentos suspeitos

| ID | Evidência | Acção nesta task |
|----|-----------|------------------|
| — | Nenhuma falha de isolamento reproduzida nos novos testes | Nenhuma alteração de produção |
| Doc | `UserRepository.softDelete` global | Teste Mongo documenta limitação do repo |

---

## 14. Estatísticas do diff

```
Novos ficheiros de teste: 11
Linhas (aprox.): ~1.2k testes + helpers
Produção: 0 linhas alteradas
```

---

## 15. Estado final Git

```
Branch: test/multi-tenant-isolation-coverage
HEAD:   98e4f9b80f1dc8cfd77ce3be67501fb6f012b56a

Untracked (testes + docs):
  docs/tasks/e2e-multi-tenant-isolation-audit.md (da auditoria prévia)
  docs/tasks/e2e-multi-tenant-isolation-implementation.md
  server/tests/integration/helpers/*
  server/tests/integration/clients/client-tenant-isolation.mongo.test.ts
  server/tests/integration/users/user-tenant-isolation.mongo.test.ts
  server/tests/integration/routes/multi-tenant-*.routes.test.ts (7)
```

`git diff --check`: exit **0** (sem alterações staged em produção).

**Commit / push / PR:** não executados — aguardar revisão do utilizador.

---

## Conclusão

Blocos A, B e C implementados dentro dos limites: **35 novos testes**, suite backend **1446/1446** na validação final, **zero** alterações de produção. Próximo passo recomendado: revisão humana, commit na branch `test/multi-tenant-isolation-coverage`, e PR quando aprovado.