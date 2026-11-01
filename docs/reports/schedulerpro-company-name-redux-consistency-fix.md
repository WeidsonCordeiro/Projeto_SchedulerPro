# SchedulerPro — Correção: consistência do nome da empresa no Redux (R-01 / R-02 / R-03)

**Data:** 31/10/2026  
**Referências:** [revisão](./schedulerpro-company-name-bootstrap-review.md), [implementação bootstrap](./schedulerpro-company-name-bootstrap-implementation.md)

---

## Resumo

Correções no **frontend** para três achados da revisão técnica: lista vazia de `GET /companies`, sincronização de `auth.user.companyName` após PATCH, e actualização do nome no `companySlice` após refresh sem novo `GET /companies`. **Sem alterações** em `server/`, RBAC ou Navbar.

---

## Causas (review)

| ID | Problema | Causa |
|----|----------|--------|
| **R-01** | Slice stale após login/registo/refresh com tenant diferente ou lista vazia | `setCredentials` não limpa `companySlice`; sucesso HTTP com `data: []` não chamava `clearCompany`. |
| **R-02** | Staff vê nome antigo após OWNER renomear empresa | `CompanyPage` só fazia `setCompany`; `auth.user.companyName` ficava desactualizado. |
| **R-03** | Sidebar OWNER/ADMIN com nome antigo após refresh | `performSessionRefresh` não actualizava `company.name` quando o slice já existia; selector prioriza o slice. |

---

## Decisões de implementação

1. **`reconcileCompanySliceWithSession`** — Se `companySlice.company.id !== session.companyId`, `clearCompany()` (credenciais intactas). Invocado após `setCredentials` em login, registo, bootstrap e refresh; também no início de `loadSessionCompany`. Aceita `getState` opcional (default: store global) para testes isolados.

2. **`loadSessionCompany`** — Após GET OK: `setCompany` se houver registo, senão **`clearCompany()`**. Erro HTTP/rede mantém `clearCompany()` sem `clearCredentials`.

3. **`commitCompanyToStore(company)`** — Thunk em [`companySessionSync.ts`](../../client/src/store/companySessionSync.ts): `setCompany` + **`setUserCompanyName(company.name)`**. Usado na `CompanyPage` (load, save, logo).

4. **`patchCompanyName`** — Reducer no `companySlice` que altera só `name`. No refresh, após `setCredentials` + reconcile: se o slice existe e `session.companyName` (trim) não vazio → `patchCompanyName`; se slice vazio e OWNER/ADMIN → `loadSessionCompany` (comportamento anterior).

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/app/loadSessionCompany.ts`](../../client/src/app/loadSessionCompany.ts) | R-01: empty list, reconcile, `getState` injectável |
| [`client/src/app/loadSessionCompany.test.ts`](../../client/src/app/loadSessionCompany.test.ts) | Testes empty list + reconcile |
| [`client/src/pages/LoginPage.tsx`](../../client/src/pages/LoginPage.tsx) | `reconcileCompanySliceWithSession` antes de `loadSessionCompany` |
| [`client/src/pages/RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx) | Idem |
| [`client/src/app/SessionBootstrap.tsx`](../../client/src/app/SessionBootstrap.tsx) | Idem |
| [`client/src/store/slices/authSlice.ts`](../../client/src/store/slices/authSlice.ts) | R-02: `setUserCompanyName` |
| [`client/src/store/slices/authSlice.test.ts`](../../client/src/store/slices/authSlice.test.ts) | Testes `setUserCompanyName` |
| [`client/src/store/slices/companySlice.ts`](../../client/src/store/slices/companySlice.ts) | R-03: `patchCompanyName` |
| [`client/src/store/slices/companySlice.test.ts`](../../client/src/store/slices/companySlice.test.ts) | Teste `patchCompanyName` |
| [`client/src/store/companySessionSync.ts`](../../client/src/store/companySessionSync.ts) | **Novo:** `commitCompanyToStore` |
| [`client/src/store/companySessionSync.test.ts`](../../client/src/store/companySessionSync.test.ts) | **Novo:** thunk slice + auth |
| [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | R-02: `commitCompanyToStore` |
| [`client/src/api/apiClient.ts`](../../client/src/api/apiClient.ts) | R-01 + R-03 em `performSessionRefresh` |
| [`client/src/api/apiClient.test.ts`](../../client/src/api/apiClient.test.ts) | Refresh sincroniza nome sem GET `/companies` |

---

## Resultados dos comandos (execução real)

### Suite de regressão (plano)

```text
cd client && npm test -- --run loadSessionCompany.test companySlice.test authSlice.test companySessionSync.test apiClient.test CompanyPage.test AppLayout.test SessionBootstrap.test LoginPage.test Sidebar.test

 Test Files  10 passed (10)
      Tests  145 passed (145)
   Duration  93.27s
   Exit code: 0
```

### Client — suite completa

```text
cd client && npm test -- --run

 Test Files  130 passed (130)
      Tests  1429 passed (1429)
   Duration  ~1039s
   Exit code: 0
```

Nota: nessa execução o Vitest reportou **1 unhandled error** (`vitest-pool` timeout ao arrancar worker para `clients.api.test.ts`) sem falhas de asserção; possível limitação de recursos/paralelismo no ambiente local.

### Client — build

```text
cd client && npm run build

src/hooks/useAppointmentsSchedule.test.ts(29,36): error TS2769: ...
Exit code: 2
```

Falha **pré-existente** no `tsc -b` (tipo do `Provider` em teste), **não introduzida** por esta correção. Código de produção alterado neste trabalho compila via testes Vitest dos módulos afectados.

### Server

```text
cd server && npm test -- --run

 Test Files  2 failed | 89 passed (91)
      Tests  2 failed | 1285 passed (1287)
   Duration  487.64s
```

Falhas: timeouts (15s) em testes de integração (`create-user.route.test.ts` e outro ficheiro na mesma corrida). **Sem alterações** em `server/` neste entregável.

```text
cd server && npm run build

> tsc
Exit code: 0
```

---

## Limitações / fora de scope

- **`auth.user.companyTimezone`** não é sincronizado no PATCH da empresa (apenas `companyName` + slice).
- **R-04** (contract tests HTTP auth) permanece como recomendação da revisão.
- **`companyName` vazio** no refresh não chama `patchCompanyName` (trim vazio ignorado).
- Reconcile + refresh assumem o **store singleton** da app; testes passam `getState` local onde aplicável.

---

## Verificação funcional sugerida

1. OWNER: renomear empresa → Sidebar e staff (após próximo login ou refresh) reflectem o novo nome.
2. OWNER com slice carregado: aguardar refresh de token → nome no slice alinha com `companyName` da sessão sem pedido extra a `/companies`.
3. Login como MANAGER após sessão OWNER no mesmo browser (edge): slice de tenant anterior não deve permanecer se `companyId` mudou.
