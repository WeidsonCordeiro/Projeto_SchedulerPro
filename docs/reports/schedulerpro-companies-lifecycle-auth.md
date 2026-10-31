# SchedulerPro — Companies Etapa 1: Lifecycle da Empresa e Autenticação

**Data:** 31/10/2026  
**Branch:** `feature/companies-lifecycle-auth` (base `develop`)  
**Contexto prévio:** [schedulerpro-companies-module-technical-audit.md](./schedulerpro-companies-module-technical-audit.md)

---

## 1. Objetivo da tarefa

Implementar o ciclo de vida de desactivação e reactivação de empresas multi-tenant, com suspensão reversível de utilizadores (excepto OWNER), bloqueio de sessões JWT/refresh para não-OWNER, e acesso limitado do OWNER enquanto a empresa estiver desactivada — sem reestruturação geral do projecto.

---

## 2. Regras de negócio implementadas

| Regra | Implementação |
|-------|----------------|
| Empresa activa | Comportamento existente preservado |
| Desactivação (`Company.isActive = false`) | `CompanyService.deactivate` + transacção MongoDB |
| OWNER permanece activo | Excluído do filtro de suspensão (`role !== OWNER`) |
| Staff + CLIENT suspensos | `isActive: false` + `companyDeactivationSuspended: true` |
| Sem soft-delete automático | Filtro `deletedAt: null`; não altera `deletedAt` |
| Utilizadores já inactivos | Filtro `isActive: true` na suspensão |
| Reactivação idempotente | `activate` restaura suspensos mesmo se empresa já activa |
| Restauração selectiva | Só `companyDeactivationSuspended === true` |
| OWNER login empresa inactiva | `assertUserMayAuthenticateAgainstCompany` + excepção OWNER |
| Não-OWNER bloqueados (login, refresh, JWT) | Mesmo helper em `AuthService` e `auth.middleware` |
| OWNER sem módulos operacionais | `RequireOperationalCompanyMiddleware` após auth nas rotas |
| OWNER consulta/reativa empresa | GET companies + PATCH `/:id/activate` sem middleware operacional |
| Público / agendamento | `PublicBookingEligibility` existente (sem alteração) |
| RBAC deactivate/activate | Apenas OWNER (`COMPANY_DEACTIVATE` / `COMPANY_ACTIVATE`) |

---

## 3. Decisões técnicas

1. **Flag `companyDeactivationSuspended`** — distingue suspensão por desactivação da empresa de inactivação individual (`isActive` sem flag).
2. **Transacção** — `withCompanyLifecycleTransaction` (padrão GW-3 / `withBookingTransaction`).
3. **Dupla camada de auth** — (a) empresa inactiva bloqueia não-OWNER em login, refresh e cada pedido autenticado; (b) middleware operacional bloqueia **todos** os roles (incl. OWNER) em rotas de negócio.
4. **Ordem dos middlewares** — O middleware operacional **não** fica em `routes/index.ts` antes dos routers (isso corria antes do JWT e gerava 401). Fica **depois** de `AuthMiddleware` + `requirePasswordChangeCompleted` em cada rota operacional.
5. **Revogação em massa de sessões** — Não implementada; confiança em `isActive`, check de empresa em auth, e middleware operacional. Documentado como limitação.
6. **Mensagens HTTP** — `COMPANY_INACTIVE_ACCESS` (auth), `COMPANY_INACTIVE_OPERATION` (módulos operacionais).

---

## 4. Arquitetura aproveitada

- Módulo Companies: `CompanyService` → `CompanyRepository` + `UserRepository` + transacção.
- Auth: `AuthService`, `auth.middleware`, `SessionService` (validação de sessão existente).
- RBAC: `hasPermission` / `RolePermissions` inalterados para MANAGER/EMPLOYEE.
- Multi-tenant: `ensureTenant` em `CompanyService` preservado.

---

## 5. Ficheiros criados

| Ficheiro | Função |
|----------|--------|
| `server/src/modules/companies/services/company-lifecycle-transaction.ts` | Transacção com retry |
| `server/src/middlewares/require-operational-company.middleware.ts` | Bloqueio operacional se `!company.isActive` |
| `server/src/modules/auth/utils/assert-company-active-for-auth.ts` | Helper auth (OWNER exempto) |
| `server/tests/unit/companies/CompanyService.lifecycle.test.ts` | Unit lifecycle |
| `server/tests/unit/auth/assert-company-active-for-auth.test.ts` | Unit helper |
| `server/tests/unit/middlewares/require-operational-company.middleware.test.ts` | Unit middleware |
| `server/tests/unit/users/UserRepository.company-lifecycle.test.ts` | Unit suspend/restore |

---

## 6. Ficheiros alterados (principais)

| Ficheiro | Alteração |
|----------|-----------|
| `User.model.ts` | Campo `companyDeactivationSuspended` |
| `UserRepository.ts` | `suspendActiveNonOwnerStaffForCompanyDeactivation`, `restoreUsersSuspendedByCompanyDeactivation` |
| `CompanyRepository.ts` | `activate`/`deactivate` com `session?` opcional |
| `CompanyService.ts` | `activate`/`deactivate` transaccionais e idempotentes |
| `CompanyRoutes.ts` | Middleware operacional em update/delete/deactivate/logo |
| `AuthService.ts` | `assertCompanyAllowsAuthentication` em login/refresh |
| `auth.middleware.ts` | Check empresa após validar utilizador |
| `http-messages.ts` | `COMPANY_INACTIVE_ACCESS`, `COMPANY_INACTIVE_OPERATION` |
| Rotas operacionais | `UserRoutes`, `ServiceRoutes`, `ClientRoutes`, `AppointmentRoutes`, `Availability*`, `ReportRoutes`, `NotificationRoutes` — middleware após password-change |
| Testes | Mocks/ fixtures `isActive: true`; mocks operacional em testes de rota isolados |

---

## 7. Estratégia de suspensão e restauração

**Suspender (desactivação):**

```text
updateMany({
  companyId,
  role: { $ne: OWNER },
  isActive: true,
  deletedAt: null,
}, { isActive: false, companyDeactivationSuspended: true })
```

**Restaurar (reactivação):**

```text
updateMany({
  companyId,
  companyDeactivationSuspended: true,
  deletedAt: null,
}, { isActive: true, companyDeactivationSuspended: false })
```

**Desactivação idempotente:** se `Company.isActive` já é `false`, não altera a empresa de novo; executa na mesma transacção apenas a suspensão/reconciliação do staff elegível.

Utilizadores com `isActive: false` antes da desactivação não recebem a flag e permanecem inactivos após reactivação.

---

## 8. Estratégia de autenticação do OWNER

- **Login / refresh:** OWNER passa `assertUserMayAuthenticateAgainstCompany` mesmo com `company.isActive === false`.
- **Pedidos autenticados:** Mesma regra no `auth.middleware`.
- **Operações permitidas:** `GET /api/companies`, `GET /api/companies/:id`, `PATCH /api/companies/:id/activate` (sem middleware operacional).
- **Operações bloqueadas:** Todas as rotas com `RequireOperationalCompanyMiddleware` (users, services, clients, appointments, availability, reports, notifications, update/delete/deactivate/logo da empresa).

---

## 9. Proteção das sessões existentes

1. Staff suspenso: `!user.isActive` → login, refresh e `auth.middleware` rejeitam.
2. JWT emitido antes da desactivação (utilizador ainda `isActive` ou race): `auth.middleware` carrega empresa e bloqueia não-OWNER se `!company.isActive`.
3. Refresh: mesma validação após `validateUserStatus`.
4. Sessão MongoDB (`SessionService.validate`) continua obrigatória; não houve revogação em massa na desactivação.

---

## 10. Testes criados e executados

- Unit: lifecycle service, helper auth, middleware operacional, UserRepository suspend/restore.
- Extensões: `AuthService.test`, `auth.middleware.test`, `CompanyService.isolation/behavior`, integração (fixtures `isActive`), rotas foto/logo (mock operacional).

**Comandos:**

```bash
cd server
npm run test -- tests/unit/companies tests/unit/auth
npm run test
npm run build
```

**Resultados (31/10/2026):**

- `npm run test`: **86** ficheiros, **1256** testes — **todos passaram**
- `npm run build` (`tsc`): **sucesso**
- `git diff --check`: **sem erros** (aviso CRLF em ficheiro de teste)

---

## 11. Problemas encontrados

1. Middleware operacional montado em `routes/index.ts` **antes** das rotas autenticadas → 401 em integração; corrigido movendo middleware para **depois** de auth em cada router.
2. Mocks de empresa em testes de integração sem `isActive: true` → 403; corrigido nos fixtures.
3. Testes de rota que mockam auth precisam mockar ou bypass do middleware operacional.

---

## 12. Limitações / pendentes

- `CompanyService.create()` continua vazio (fora de scope).
- Frontend não alterado nesta etapa.
- Revogação global de sessões na desactivação não implementada.
- Testes de integração HTTP end-to-end com Mongo real para transacção lifecycle (unitários mockam a transacção).

### Excepções de rota (empresa desactivada)

- **`PATCH /users/me/password`** — não usa `RequireOperationalCompanyMiddleware` de propósito: utilizadores com `mustChangePassword` precisam concluir a alteração **antes** de `requirePasswordChangeCompleted` permitir `GET /companies` e `PATCH /companies/:id/activate`. Bloquear esta rota com o middleware operacional impediria o OWNER de sair do estado de password obrigatória enquanto reactiva a empresa.
- **`GET /auth/me`** e **`POST /auth/logout`** — sem middleware operacional; o OWNER mantém sessão mínima (perfil e logout).

---

## 15. Correções pós-revisão técnica (Etapa 1 review)

| Item | Acção |
|------|--------|
| H1 | `CompanyService.deactivate`: se a empresa já está inactiva, corre transacção só com `suspendActiveNonOwnerStaffForCompanyDeactivation` (reconciliação idempotente). |
| H2 | `restoreUsersSuspendedByCompanyDeactivation`: filtro adicional `deletedAt: null`. |
| M1 | Documentado acima (excepção `/users/me/password`); sem middleware operacional nessa rota. |
| Testes | `CompanyService.lifecycle.test.ts`, `UserRepository.company-lifecycle.test.ts`, `CompanyRoutes.lifecycle-rbac.test.ts` (OWNER vs ADMIN activate/deactivate). |

---

## 13. Instruções de continuidade para outra IA

1. Ler este relatório e o audit técnico de Companies.
2. Branch: `feature/companies-lifecycle-auth`; **não** commit/push unless pedido.
3. Para validar: `cd server && npm run test && npm run build`.
4. Próximas etapas possíveis: UI de desactivação/reativação; revogação de sessões; testes E2E HTTP deactivate/activate; índice Mongo em `companyDeactivationSuspended` se volume justificar.
5. Ao adicionar novas rotas autenticadas operacionais, incluir `RequireOperationalCompanyMiddleware` **após** `AuthMiddleware` e `requirePasswordChangeCompleted`.

---

## 14. Comandos sugeridos ao utilizador (revisão e PR)

```bash
cd "c:/Users/Weidson Cordeiro/Desktop/Front-End/Projetos/Projeto_SchedulerPro"
git status
git diff develop...HEAD
cd server && npm run test && npm run build
# Após revisão:
# git add ...
# git commit -m "..."
# git push -u origin feature/companies-lifecycle-auth
# gh pr create --base develop ...
```
