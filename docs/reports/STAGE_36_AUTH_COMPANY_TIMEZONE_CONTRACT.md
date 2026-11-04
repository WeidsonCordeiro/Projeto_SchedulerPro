# Stage 36 — Parte 1: `companyTimezone` no contrato de autenticação

Data: 2026-10-13. Âmbito: expor o timezone efetivo da empresa na sessão autenticada (contrato aditivo), sem alterar RBAC nem comportamento de calendários/formulários.

## 1. Resumo

- O backend resolve o timezone da empresa via `CompanyRepository.findById` e valida com `resolveCompanyTimezone` (fallback `Europe/Lisbon`).
- O campo `companyTimezone` passa a existir em `AuthUser` e em todas as respostas que devolvem o utilizador da sessão: **register**, **login**, **refresh** e **GET /auth/me**.
- O frontend atualiza tipos e fixtures; **não** altera `selectCompanyTimezone`, `SessionBootstrap` nem componentes de calendário (Parte 3).
- Documentação em `docs/api-contract.md`.

## 2. Ficheiros alterados

| Ficheiro | Responsabilidade |
|----------|------------------|
| `server/src/utils/timezone.ts` | Novo `resolveCompanyTimezone` (IANA válido ou `DEFAULT_TIMEZONE`). |
| `server/tests/unit/timezone.test.ts` | Testes do helper. |
| `server/src/modules/auth/types.ts` | `companyTimezone: string` em `AuthUser`. |
| `server/src/modules/auth/mapper/AuthMapper.ts` | `toAuthUser(user, companyTimezone)`. |
| `server/src/modules/auth/services/AuthService.ts` | `resolveCompanyTimezoneForUser`, uso em `authenticateWithSession` e `me`. |
| `server/tests/unit/auth/AuthService.test.ts` | Cobertura de `me`, login/refresh, roles, fallback, sem leak de empresa. |
| `client/src/types/auth.ts` | `companyTimezone?: string` (compatível com respostas antigas). |
| `client/src/test/fixtures.ts` | Fixture de sessão com `companyTimezone`. |
| `client/src/store/slices/authSlice.test.ts` | Expectativa do user no Redux. |
| `docs/api-contract.md` | Campo documentado em Auth. |

## 3. Contrato

### Antes

Objeto de utilizador autenticado (login/register/refresh/me):

`id`, `name`, `email`, `avatar?`, `role`, `companyId`, `isActive`, `clientId?`, e em respostas HTTP também `mustChangePassword`.

### Depois (aditivo)

Mesmos campos, mais:

- **`companyTimezone`** (string, IANA): timezone efetivo da empresa do utilizador.
- **Fallback:** `Europe/Lisbon` se a empresa não existir, se `timezone` estiver ausente ou se não for IANA válido.
- **Roles:** OWNER, ADMIN, MANAGER, EMPLOYEE, CLIENT — todas recebem o campo quando autenticadas.
- **Não expõe:** nome da empresa, morada, logo, configurações ou outros campos de `Company`.
- **RBAC:** inalterado; `GET /companies*` continua a exigir `COMPANY_READ`.

## 4. Testes executados e resultados

### Backend

```text
npx vitest run tests/unit/timezone.test.ts tests/unit/auth/AuthService.test.ts --pool=forks --maxWorkers=1
→ 2 ficheiros, 27 testes, todos passaram
```

### Frontend (focados)

```text
npx vitest run src/store/slices/authSlice.test.ts src/app/SessionBootstrap.test.tsx src/pages/LoginPage.test.tsx --pool=forks --maxWorkers=1
→ 3 ficheiros, 35 testes, todos passaram
```

### Não executados nesta etapa

- Suites completas do server/client.
- `DashboardPage.test.tsx` (2) e `ReportsPage.test.tsx` (2) — falhas pré-existentes documentadas no Stage 35, não relacionadas com timezone.

## 5. Typecheck e build

| Pacote | Comando | Resultado |
|--------|---------|-----------|
| server | `npm run typecheck` | OK |
| server | `npm run build` | OK |
| client | `npm run typecheck` | OK |
| client | `npm run build` | OK |

## 6. Limitações e riscos

- **+1 leitura** `CompanyRepository.findById` por login, refresh e `me` (aceitável na Parte 1; cache ou projeção só de `timezone` pode ser considerado depois).
- O documento completo da empresa continua indisponível para roles sem `COMPANY_READ`; apenas o timezone efetivo está na sessão.
- `PublicBookingService.resolveTimezone` local **não** foi unificado com o helper global (Parte 2).
- Clientes com backend antigo podem omitir `companyTimezone`; o tipo frontend é opcional até rollout completo.

## 7. Confirmação de âmbito

- Sem migrações, backfills, commits ou pushes.
- Sem alteração de permissões RBAC, instantes de agendamentos, calendários, formulários, portal ou relatórios no frontend.
- Sem implementação das Partes 2–6 do Stage 35/36.

## CONTEXTO PARA A PRÓXIMA IA

**Parte 3 (frontend):** consumir `companyTimezone` da sessão para que `selectCompanyTimezone` devolva o timezone correto mesmo quando `state.company.company` é `null` (MANAGER, EMPLOYEE, CLIENT, ou OWNER/ADMIN logo após login sem reload).

Sugestão de cadeia no selector (`client/src/store/slices/companySlice.ts`):

```ts
state.company.company?.timezone
  ?? state.auth.user?.companyTimezone
  ?? APPOINTMENT_TIMEZONE // ou Europe/Lisbon
```

**Ficheiros relevantes:**

- `client/src/store/slices/companySlice.ts` — `selectCompanyTimezone`
- `client/src/types/auth.ts` — `AuthUser.companyTimezone`
- `client/src/store/slices/authSlice.ts` — `setCredentials` já persiste todo o user (inclui o novo campo quando a API envia)
- `client/src/app/SessionBootstrap.tsx` — hoje só carrega empresa para OWNER/ADMIN; na Parte 3 o timezone pode vir só de `getMe` sem depender de `GET /companies`
- `client/src/pages/LoginPage.tsx`, `client/src/api/apiClient.ts` (refresh) — `setCredentials` após login/refresh

**Backend já pronto:** `GET /auth/me`, login, refresh e register devolvem `companyTimezone` conforme `docs/api-contract.md`.

**Parte 2 (backend):** alinhar fallbacks dispersos nos módulos com `resolveCompanyTimezone` em `server/src/utils/timezone.ts`.
