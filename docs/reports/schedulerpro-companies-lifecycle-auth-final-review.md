# SchedulerPro — Revisão Final de Código: Companies Lifecycle e Auth

**Data:** 31/10/2026
**Branch:** `feature/companies-lifecycle-auth` (base `develop`)
**Tipo:** Auditoria somente leitura (sem alterações de código durante a revisão)
**Referências:**

- [schedulerpro-companies-module-technical-audit.md](./schedulerpro-companies-module-technical-audit.md)
- [schedulerpro-companies-lifecycle-auth.md](./schedulerpro-companies-lifecycle-auth.md)

---

## Verificação inicial do Git

| Item | Valor |
|------|--------|
| Branch atual | `feature/companies-lifecycle-auth` |
| Commit analisado | `401e18a` — mensagem `teste` |
| Base | `develop` @ `d074294` (merge-base = `d074294`) |
| Commits à frente de `develop` | 1 |
| `git status` (momento da revisão) | Working tree limpo |

**Ficheiros alterados vs `develop`:** 41 ficheiros (+1339 / −19 linhas): relatórios em `docs/reports/`, alterações em `server/src/` e `server/tests/`.

**Alterações inesperadas:** Nenhuma fora do scope lifecycle/auth/companies/tests/docs. A mensagem de commit `teste` é genérica; recomenda-se descrição clara no PR.

---

## A. Resumo executivo

A Etapa 1 está implementada de forma coerente com o audit prévio e o relatório de implementação: desactivação/reactivação com transacção MongoDB, suspensão reversível via `companyDeactivationSuspended`, dupla barreira de auth (empresa inactiva + middleware operacional) e RBAC de activate/deactivate restrito ao OWNER.

**Testes (executados na revisão):** 87 ficheiros, 1261 testes — todos passaram.
**Build:** `npm run build` (`tsc`) — sucesso.
**`git diff --check develop...HEAD`:** trailing whitespace apenas nos relatórios Markdown (não afecta runtime).

Limitações documentadas e não bloqueantes para merge: sem revogação em massa de sessões na desactivação; reconciliação idempotente H1 no `CompanyService.deactivate` inacessível via HTTP quando a empresa já está inactiva; cobertura de testes majoritariamente unitária, com mocks do middleware operacional em vários testes de rota.

---

## B. Problemas críticos

Nenhum identificado que comprometa de forma directa isolamento multi-tenant, integridade transaccional da desactivação inicial, ou bloqueio sistemático de não-OWNER com empresa inactiva em login, refresh e pedidos autenticados.

---

## C. Problemas importantes

### C.1 Reconciliação H1 inalcançável via HTTP (empresa já inactiva)

A rota `PATCH /companies/:id/deactivate` monta `RequireOperationalCompanyMiddleware`, que responde 403 quando `!company.isActive`. O ramo em `CompanyService.deactivate` que apenas executa `suspendActiveNonOwnerStaffForCompanyDeactivation` **não é atingível via API** nesse estado.

Evidência:

- `server/src/middlewares/require-operational-company.middleware.ts` (linhas 29–37)
- `server/src/modules/companies/routes/CompanyRoutes.ts` (linhas 75–82)
- `server/src/modules/companies/services/CompanyService.ts` (linhas 307–317)

### C.2 Sessões não revogadas na desactivação

Utilizadores suspensos mantêm `sessionId` válido até o próximo pedido ou refresh, onde `isActive`, `assertUserMayAuthenticateAgainstCompany` e/ou middleware operacional bloqueiam. Não há revogação proactiva em massa (limitação já documentada na implementação).

### C.3 Corrida login / desactivação

Um não-OWNER pode completar login enquanto a empresa ainda está activa e obter tokens; após commit da transacção, pedidos seguintes falham. Mitigado por leitura da BD em cada pedido autenticado; não eliminado sem revoke em massa.

---

## D. Melhorias recomendadas

- Testes de integração HTTP com middleware operacional real (OWNER, empresa inactiva: GET companies, PATCH activate; 403 em rotas operacionais).
- Testes Mongo reais para `withCompanyLifecycleTransaction` (rollback se suspensão falhar).
- Mecanismo alternativo para reconciliar staff activo com empresa inactiva (ex.: job interno ou extensão de `activate`), se H1 for requisito operacional via HTTP.
- Índice Mongo `{ companyId, companyDeactivationSuspended, deletedAt }` se volume justificar.
- Teste explícito para `Role.EMPLOYEE` em `assert-company-active-for-auth.test.ts`.
- Mensagem de commit/PR descritiva em substituição de `teste`.

---

## E. Matriz de regras de negócio

| # | Regra | Estado | Evidência (ficheiro) |
|---|--------|--------|----------------------|
| 1 | Desactivação empresa + suspensão na mesma transacção (1.ª desactivação) | Aprovada | `CompanyService.ts` ~320–337; `company-lifecycle-transaction.ts` |
| 2 | Falha na suspensão reverte alteração de `Company.isActive` | Aprovada | `company-lifecycle-transaction.ts` (`abortTransaction`) |
| 3 | Reactivação + restore na mesma transacção | Aprovada | `CompanyService.ts` ~268–288 |
| 4 | Retry de erros transitórios / conflitos de escrita | Aprovada | `company-lifecycle-transaction.ts` |
| 5 | Desactivação repetida idempotente | Aprovada com ressalva | Service ~307–317; HTTP não invoca service se já inactiva (C.1) |
| 6 | Reactivação repetida idempotente | Aprovada | `CompanyService.ts` ~270–273; `CompanyService.lifecycle.test.ts` |
| 7 | OWNER permanece activo | Aprovada | `UserRepository.ts` ~201–207 (`role !== OWNER`) |
| 8 | ADMIN, MANAGER, EMPLOYEE, CLIENT suspensos | Aprovada | Mesmo filtro de suspensão |
| 9 | Utilizadores já inactivos antes da desactivação | Aprovada | Filtro `isActive: true` na suspensão |
| 10 | `deletedAt` preenchido nunca restaurado | Aprovada | Restore com `deletedAt: null` |
| 11 | Flag `companyDeactivationSuspended` consistente | Aprovada | `User.model.ts`; `UserRepository.ts` suspend/restore |
| 12 | Suspenso depois soft-delete — reactivação empresa não reactiva | Aprovada | Restore exige `deletedAt: null` |
| 13 | OWNER login (empresa activa / inactiva) | Aprovada | `assert-company-active-for-auth.ts`; `AuthService.ts` login |
| 14 | Não-OWNER login com empresa inactiva | Aprovada | `assert-company-active-for-auth.ts` |
| 15 | Refresh não-OWNER com empresa inactiva | Aprovada | `AuthService.ts` refresh |
| 16 | JWT antigo de não-OWNER após desactivação | Aprovada | `auth.middleware.ts` (user + company da BD) |
| 17 | Sessão revogada | Aprovada | `SessionService.ts` validate |
| 18 | Utilizador individualmente inactivo | Aprovada | `auth.middleware.ts`; `AuthService.validateUserStatus` |
| 19 | Estado empresa/utilizador consultado na BD por pedido autenticado | Aprovada | Não confia só no payload JWT para `isActive` |
| 20 | OWNER consulta/reativa; bloqueio operacional | Aprovada | `CompanyRoutes.ts`; middleware operacional |
| 21 | `GET /auth/me`, `POST /auth/logout`, `PATCH /users/me/password` | Aprovada | `AuthRoutes.ts`; `UserRoutes.ts` |
| 22 | Só OWNER activate/deactivate | Aprovada | `rbac.ts`; `CompanyRoutes.lifecycle-rbac.test.ts` |
| 23 | Isolamento multi-tenant (`ensureTenant`) | Aprovada | `CompanyService.ts` |
| 24 | Público / booking | Não verificada nesta revisão | Fora do diff; audit prévio referencia elegibilidade existente |

---

## F. Testes

### Resultados executados

```text
cd server && npm run test
Test Files  87 passed (87)
Tests       1261 passed (1261)

npm run build  → sucesso (tsc)
git diff --check develop...HEAD  → trailing whitespace em 2 relatórios .md
```

### Ficheiros inspecionados

| Ficheiro | Avaliação |
|----------|-----------|
| `CompanyService.lifecycle.test.ts` | Transacção e idempotência no service; mock de `withCompanyLifecycleTransaction` |
| `UserRepository.company-lifecycle.test.ts` | Filtros `updateMany`; sem Mongo real |
| `assert-company-active-for-auth.test.ts` | OWNER vs staff; EMPLOYEE não explícito |
| `require-operational-company.middleware.test.ts` | 403/200 com mock de repositório |
| `CompanyRoutes.lifecycle-rbac.test.ts` | RBAC activate/deactivate; mock middleware operacional |
| `AuthService.test.ts` / `auth.middleware.test.ts` | Empresa inactiva coberta |

### Lacunas

- Sem E2E HTTP com cadeia completa de middlewares.
- Sem teste de rollback transaccional com Mongo real.
- Vários testes de rota mockam `require-operational-company.middleware`.
- Sem testes de concorrência.

---

## G. Git (resumo)

- **Branch:** `feature/companies-lifecycle-auth`
- **HEAD:** `401e18a`
- **Base:** `develop` (`d074294`)
- **Diff:** 41 ficheiros (implementação lifecycle + testes + relatórios)

---

## Rotas — middleware operacional

**Ordem padrão:** `AuthMiddleware` → `requirePasswordChangeCompleted` (quando aplicável) → `RequireOperationalCompanyMiddleware` → permissões/validators.

### Excepções intencionais (sem middleware operacional)

| Rota | Motivo |
|------|--------|
| `GET /auth/me`, `POST /auth/logout` | Sessão mínima (incl. OWNER com empresa inactiva) |
| `GET /companies`, `GET /companies/:id` | Consulta da própria empresa |
| `PATCH /companies/:id/activate` | Reactivação |
| `PATCH /users/me/password` | Conclusão de `mustChangePassword` antes de outras rotas de empresa |

### Rotas protegidas (middleware presente)

- **Companies:** `PATCH /:id`, `DELETE /:id`, `PATCH /:id/deactivate`, `POST/DELETE /:id/logo`
- **Users:** todas excepto `PATCH /me/password`
- **Clients, Services, Appointments, Availability, Availability-exceptions, Reports, Notifications:** rotas autenticadas nos respectivos routers

### Superfícies públicas

- `/public/*`, `/health`, endpoints de auth públicos (register, login, refresh, etc.)

Nenhuma rota autenticada de negócio encontrada sem middleware, excepto as excepções listadas.

---

## H. Parecer final

### Classificação: **APROVADO COM RESSALVAS**

A implementação cumpre os requisitos essenciais de lifecycle multi-tenant, suspensão selectiva, auth fail-closed para não-OWNER com empresa inactiva, caminho do OWNER para consulta/reativação, e RBAC de activate/deactivate. Transacções e filtros de repositório estão alinhados ao relatório da Etapa 1.

**Ressalvas a incluir no PR:**

1. Reconciliação H1 só na camada de serviço, não via `PATCH .../deactivate` com empresa já inactiva.
2. Ausência de revogação em massa de sessões na desactivação.
3. Cobertura de testes majoritariamente unitária; mocks do middleware operacional em testes de rota.
4. Mensagem de commit genérica (`teste`).

**Autorização:** Pode seguir para commit adicional (se necessário) e Pull Request para `develop`, desde que as ressalvas estejam documentadas no corpo do PR e no [relatório de implementação](./schedulerpro-companies-lifecycle-auth.md).

---

## Instruções de continuidade

1. Abrir PR `feature/companies-lifecycle-auth` → `develop` com test plan e ressalvas acima.
2. Validar localmente: `cd server && npm run test && npm run build`.
3. Etapas futuras opcionais: UI de desactivação; revoke de sessões; testes E2E HTTP; índice Mongo na flag de suspensão.
