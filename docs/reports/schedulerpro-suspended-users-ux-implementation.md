# SchedulerPro — Implementação: UX para MANAGER/EMPLOYEE suspensos (Etapa B.1)

**Data:** 31/10/2026  
**Objetivo:** Quando a empresa é desactivada, staff não-OWNER fica com `isActive: false` e sessão ainda válida no browser; distinguir suspensão automática vs desactivação individual no backend, reagir uma vez no frontend (Redux + interceptor) e mostrar ecrã dedicado sem erros repetidos nem retry inútil.

**Referências:** [schedulerpro-companies-lifecycle-ux-implementation.md](./schedulerpro-companies-lifecycle-ux-implementation.md) (Etapa B — OWNER/ADMIN), plano Etapa B.1.

---

## Problema observado

1. **Mesmo 403 para todos os inactivos** — `auth.middleware` e `AuthService.validateUserStatus` usavam `HttpMessages.USER_DISABLED` sem `code` distinto quando `companyDeactivationSuspended === true`.
2. **403 não faz logout** — Só 401 dispara refresh/logout em [`apiClient.ts`](../../client/src/api/apiClient.ts); MANAGER/EMPLOYEE mantinham shell autenticado enquanto APIs falhavam.
3. **Erros repetidos** — `DashboardPage.loadRelated` e `useAppointmentsSchedule` concatenavam a mesma mensagem várias vezes.
4. **Etapa B não cobre staff** — Banner `CompanyInactiveNotice` depende de `company` no Redux (OWNER/ADMIN com `COMPANY_READ`).

**Git no início da implementação:** branch `develop`, commit `534354d80e6ef4f7c2cf26737949cb490eed15b5` (working tree incluía alterações não commitadas da Etapa B).

---

## Fluxo auth — antes / depois

| Momento | Antes | Depois |
|---------|-------|--------|
| API com cookie válido, user suspenso pela empresa | 403 + «Usuário desativado.» | 403 + `code: USER_SUSPENDED_BY_COMPANY_DEACTIVATION` |
| Desactivação individual | 403 + mesma mensagem | 403 + `code: USER_INACTIVE` |
| Frontend após 403 suspensão | Páginas com ErrorState/retry | `staffCompanyAccessSuspended` + `StaffCompanySuspendedView` (substitui `<Outlet />`) |
| Logout automático em 403 suspensão | Não | Continua **sem** logout (requisito); «Terminar sessão» explícito |

---

## Backend — ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/constants/error-codes.ts`](../../server/src/constants/error-codes.ts) | `USER_SUSPENDED_BY_COMPANY_DEACTIVATION`, `USER_INACTIVE` |
| [`server/src/constants/http-messages.ts`](../../server/src/constants/http-messages.ts) | Mensagem dedicada à suspensão por empresa |
| [`server/src/modules/auth/utils/assert-user-access-active.ts`](../../server/src/modules/auth/utils/assert-user-access-active.ts) | Helper partilhado |
| [`server/src/middlewares/auth.middleware.ts`](../../server/src/middlewares/auth.middleware.ts) | Usa helper em vez de bloco genérico |
| [`server/src/modules/auth/services/AuthService.ts`](../../server/src/modules/auth/services/AuthService.ts) | `validateUserStatus` usa helper |
| Testes | [`auth.middleware.test.ts`](../../server/tests/unit/middlewares/auth.middleware.test.ts), [`AuthService.test.ts`](../../server/tests/unit/auth/AuthService.test.ts), [`assert-user-access-active.test.ts`](../../server/tests/unit/auth/assert-user-access-active.test.ts) |

**Inalterado:** RBAC, lifecycle `CompanyService`, regras OWNER com empresa inactiva, `assertUserMayAuthenticateAgainstCompany`.

---

## Frontend — ficheiros alterados / criados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/api/errors.ts`](../../client/src/api/errors.ts) | Mapeamento suspensão/inactivo, `collapseDuplicateMessages`, `isStaffCompanySuspensionCode` |
| [`client/src/store/slices/authSlice.ts`](../../client/src/store/slices/authSlice.ts) | `staffCompanyAccessSuspended`, `setStaffCompanyAccessSuspended`; limpeza em login/logout |
| [`client/src/api/apiClient.ts`](../../client/src/api/apiClient.ts) | Interceptor 403 + código de suspensão (antes do ramo 401) |
| [`client/src/components/company/StaffCompanySuspendedView.tsx`](../../client/src/components/company/StaffCompanySuspendedView.tsx) | Ecrã único + «Terminar sessão» |
| [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) | Gate MANAGER/EMPLOYEE substitui outlet |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | Early-return + dedupe |
| [`client/src/hooks/useAppointmentsSchedule.ts`](../../client/src/hooks/useAppointmentsSchedule.ts) | Early-return + dedupe |
| Testes | `errors.test.ts`, `apiClient.test.ts`, `AppLayout.test.tsx`, `DashboardPage.test.tsx` |

---

## Códigos de erro (contrato API)

| Code | Público | Uso |
|------|---------|-----|
| `USER_SUSPENDED_BY_COMPANY_DEACTIVATION` | Staff com `companyDeactivationSuspended` | Interceptor → flag Redux; mensagem «Empresa temporariamente suspensa…» |
| `USER_INACTIVE` | Conta desactivada sem flag de empresa | Mensagem de conta desactivada (sem afirmar suspensão da empresa) |

---

## Comportamento por role

| Role | Empresa desactivada, sessão antiga |
|------|-------------------------------------|
| **MANAGER / EMPLOYEE** | Primeiro 403 com código de suspensão → ecrã global; navbar/sidebar mantidos; sem retry nas páginas |
| **OWNER** | Sem código de suspensão (continua activo); Etapa B (`CompanyInactiveNotice`) |
| **ADMIN** | Bloqueado no auth de empresa inactiva (comportamento existente); Etapa B se empresa carregada |
| **CLIENT** | Fora de scope B.1 (pendência: mesma flag se aplicável) |

---

## Testes e builds

Comandos usados na validação:

```bash
cd server && npm test -- --run auth.middleware AuthService assert-user-access-active
cd client && npm test -- --run errors.test apiClient AppLayout DashboardPage
cd client && npm run build
cd server && npm run build
```

*(Resultados: server 48 testes (auth.middleware, AuthService, assert-user-access-active) OK; client 77 testes (errors, apiClient, AppLayout, DashboardPage) OK; builds client+server OK — 31/10/2026.)*

---

## Pendências recomendadas

- Emitir `COMPANY_INACTIVE_*` no JSON do backend (Etapa B — hoje fallback por `message` no client).
- CLIENT suspenso pela empresa: reutilizar mesma UX se o produto exigir.
- Backoffice SaaS / reactivação por staff: fora de scope.

---

## Git

Sem commit/push nesta etapa — histórico gerido pelo utilizador.
