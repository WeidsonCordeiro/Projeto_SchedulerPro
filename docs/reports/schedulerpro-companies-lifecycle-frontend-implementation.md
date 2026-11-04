# SchedulerPro — Implementação: ciclo de vida da empresa no frontend (Etapa A)

**Data:** 31/10/2026  
**Objetivo:** Expor na página Empresa as acções de desactivar e reactivar a empresa, consumindo `PATCH /companies/:id/activate` e `PATCH /companies/:id/deactivate` já existentes no backend, com permissões OWNER-only na UX e testes automatizados.

**Referência:** [schedulerpro-companies-management-audit.md](./schedulerpro-companies-management-audit.md) (Etapa A).

---

## Git no início da implementação

| Item | Valor |
|------|--------|
| Branch | `develop` |
| Commit base | `7b57b7448088d15702cc564bc154e158f0d713d1` (merge PR #116 — dashboard v1) |
| Nota | Branch de feature não criada automaticamente; alterações locais apenas no client + docs |

Não foram executados commit, push, pull ou merge.

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/api/endpoints/company.api.ts`](../../client/src/api/endpoints/company.api.ts) | `activateCompany`, `deactivateCompany` |
| [`client/src/api/endpoints/company.api.test.ts`](../../client/src/api/endpoints/company.api.test.ts) | Testes PATCH activate/deactivate e erro 403 |
| [`client/src/config/companyPermissions.ts`](../../client/src/config/companyPermissions.ts) | `canActivate`, `canDeactivate` (OWNER) |
| [`client/src/config/companyPermissions.test.ts`](../../client/src/config/companyPermissions.test.ts) | Expects actualizados |
| [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | Secção estado operacional, modal desactivar, reactivar, gating do form |
| [`client/src/pages/company/CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx) | Describe `lifecycle` + mock API alargado |
| [`client/src/pages/company/CompanyPage.logo.test.tsx`](../../client/src/pages/company/CompanyPage.logo.test.tsx) | Mock com activate/deactivate |

**Backend:** nenhuma alteração.

---

## Implementação

### API client

- `activateCompany(id)` → `PATCH /companies/${id}/activate`
- `deactivateCompany(id)` → `PATCH /companies/${id}/deactivate`
- Resposta tratada como `ApiResponse<Company>`; actualização de estado só após `response.data` válido (sem optimistic update).

### Permissões UX

- `getCompanyAbilities` inclui `canActivate` e `canDeactivate` apenas para **OWNER**.
- **ADMIN** mantém `canView` / `canUpdate`; lifecycle negado (espelha [`server/src/constants/rbac.ts`](../../server/src/constants/rbac.ts)).

### CompanyPage

1. **Dois cards:** «Informações da empresa» (link público + perfil) e «Estado operacional» (badge + acções).
2. **OWNER, empresa activa:** botão «Desativar empresa» → [`DestructiveConfirmModal`](../../client/src/components/common/DestructiveConfirmModal.tsx) com texto sobre suspensão de não-OWNER e bloqueio do booking público.
3. **OWNER, empresa inactiva:** `alert-warning` sobre operações bloqueadas; perfil em modo read-only (`CompanyReadOnlyProfile`); botão «Reactivar empresa».
4. **`canEditProfile = canUpdate && company.isActive`:** `CompanyForm` só quando activa; evita PATCH/logo com 403 do middleware operacional.
5. **Sucesso:** `applyCompanyUpdate` → estado local, `dispatch(setCompany)`, mensagens distintas (desactivada / reactivada).
6. **Erros:** modal (desactivar) ou `lifecycleError` (reactivar) via `getFriendlyErrorMessage`.

### Comportamento por papel

| Papel | Ver página | Editar nome/timezone/logo | Desactivar | Reactivar |
|-------|:----------:|:-------------------------:|:----------:|:---------:|
| OWNER | Sim | Sim se activa; read-only se inactiva | Sim | Sim se inactiva |
| ADMIN | Sim | Sim se activa; read-only se inactiva | Não | Não |
| MANAGER / EMPLOYEE / CLIENT | Não (sem COMPANY_READ) | — | — | — |

---

## Decisões técnicas

- **Modal de confirmação** reutiliza `DestructiveConfirmModal` (padrão de exclusão de serviços), em vez de `window.confirm`, para acessibilidade e testes.
- **Badge «Ativa/Inativa»** movido para o card «Estado operacional» (evita duplicação com a secção de acções).
- **Componente local `CompanyReadOnlyProfile`** para DRY entre ADMIN sem update futuro e perfil bloqueado por inactivação.

---

## Testes executados

Comando (directório `client/`):

```bash
npm test -- --run company.api.test.ts companyPermissions.test.ts CompanyPage
npm run build
```

**Resultado:**

- **41 testes** passaram (4 ficheiros: `company.api.test.ts`, `companyPermissions.test.ts`, `CompanyPage.test.tsx`, `CompanyPage.logo.test.tsx`).
- **`npm run build`** (`tsc -b && vite build`) concluiu com sucesso.

---

## Problemas encontrados

- Testes iniciais: `getByText` ambíguo para nome da empresa no perfil read-only; corrigido a assertar `Europe/Lisbon`.
- Teste de erro na reactivação: múltiplos `role="alert"` (banner warning + erro); corrigido a usar `findByText` da mensagem de erro.

---

## Limitações conhecidas

- Mensagens HTTP genéricas; **Etapa B** pode mapear explicitamente `COMPANY_INACTIVE_OPERATION` / `COMPANY_INACTIVE_ACCESS` em [`client/src/api/errors`](../../client/src/api/errors).
- **Soft-delete** não exposto (fora de scope).
- **ADMIN** com empresa inactiva ainda vê o formulário desactivado via gating; não pode reactivar (correcto).
- Sessões JWT na desactivação: comportamento backend inalterado (ver audit lifecycle).

---

## Continuidade para outra IA

- Próximo passo recomendado: **Etapa B** — polish UX empresa inactiva (mensagens de erro dedicadas, copy ADMIN).
- Backend lifecycle completo; frontend Etapa A alinhado com PR #115.
- Não repetir auditoria; usar este relatório + [schedulerpro-companies-management-audit.md](./schedulerpro-companies-management-audit.md).

---

## Estado Git após implementação

Executar `git status` localmente: alterações esperadas em `client/src/...` e este ficheiro em `docs/reports/`. Commit e push ficam a cargo do utilizador.
