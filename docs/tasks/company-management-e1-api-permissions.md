# Company Management — E1: API e permissões para Soft Delete (Frontend)

**Data:** 11/11/2026  
**Branch de trabalho:** `develop` @ `8fd5f0a108515abd8a81ddcfbace18c44fd0a9d1`  
**Âmbito:** Cliente HTTP + abilities UX. Sem UI, modal, logout ou alterações no backend.

---

## Estado Git (início)

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `8fd5f0a108515abd8a81ddcfbace18c44fd0a9d1` |
| Alterações tracked | Nenhuma antes desta etapa |
| Untracked | `docs/audits/company-management-*-audit.md` |

**Git write:** não executado.

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/api/endpoints/company.api.ts`](../../client/src/api/endpoints/company.api.ts) | Novo método `deleteCompany` |
| [`client/src/api/endpoints/company.api.test.ts`](../../client/src/api/endpoints/company.api.test.ts) | Testes DELETE sucesso e erro 403 |
| [`client/src/config/companyPermissions.ts`](../../client/src/config/companyPermissions.ts) | `canDelete` em `CompanyAbilities` + `CAN_DELETE_ROLES` |
| [`client/src/config/companyPermissions.test.ts`](../../client/src/config/companyPermissions.test.ts) | Expectativas actualizadas por role |

**Não alterado:** `CompanyPage.tsx`, Redux, backend, vitest config.

---

## Método API — `deleteCompany`

```typescript
async deleteCompany(id: string): Promise<ApiResponse<null>>
```

- **HTTP:** `DELETE /companies/${id}` via `apiClient` (cookies de sessão, como os restantes endpoints).
- **Resposta:** `ApiResponse<null>` — alinhado a [`CompanyController.delete`](../../server/src/modules/companies/controllers/CompanyController.ts) (`data: null`, mensagem `COMPANY_REMOVED`).
- **ID:** deve ser o id da empresa autenticada (`company.id` === `auth.user.companyId`); E2 obterá o valor do estado carregado, nunca de input livre.

**Fora de E1:** limpar sessão, interceptors, tratamento pós-delete.

---

## Matriz de permissões (`getCompanyAbilities`)

| Role | canView | canUpdate | canActivate | canDeactivate | **canDelete** |
|------|---------|-----------|-------------|---------------|---------------|
| null | false | false | false | false | **false** |
| OWNER | true | true | true | true | **true** |
| ADMIN | true | true | false | false | **false** |
| MANAGER | false | false | false | false | **false** |
| EMPLOYEE | false | false | false | false | **false** |
| CLIENT | false | false | false | false | **false** |

Espelha backend: `COMPANY_DELETE` apenas em `Role.OWNER` ([`server/src/constants/rbac.ts`](../../server/src/constants/rbac.ts)).

Comentário em `companyPermissions.ts` actualizado com a linha `COMPANY_DELETE`.

---

## Testes adicionados

### `company.api.test.ts`

1. **deletes /companies/:id (soft delete)** — verifica URL, retorno `success` + `data: null`.
2. **propagates API errors during delete** — rejeição 403 propagada ao caller (sem swallow).

### `companyPermissions.test.ts`

Todos os casos existentes passam a incluir `canDelete` conforme a matriz acima.

---

## Validação executada

### `npm test -- company.api.test companyPermissions.test`

**Resultado:** falha de suíte (0 testes corridos), ambiente local.

```
TypeError: Cannot read properties of undefined (reading 'config')
  at company.api.test.ts / companyPermissions.test.ts (describe)
```

Sem alteração de configuração Vitest (conforme enunciado). Repetir na CI ou noutro ambiente onde a suíte do client já corra.

### `npm run build`

**Resultado:** exit code **0** (`tsc -b && vite build`).

---

## Decisões e limitações

1. **Contrato null:** não tipar retorno como `Company`; o backend não devolve entidade após soft delete.
2. **`CAN_DELETE_ROLES` separado** de `CAN_LIFECYCLE_ROLES` — mesmos valores hoje, documenta `COMPANY_DELETE` de forma explícita.
3. **Backend com empresa inactiva:** rota `DELETE` monta `requireOperationalCompany` → **403** se `isActive === false`. E2 deve:
   - mostrar zona perigosa só quando `company.isActive === true`, **ou**
   - orientar OWNER a reactivar antes de eliminar.
4. **Segurança:** `canDelete` é só UX; 403 do servidor se ADMIN tentar chamar a API directamente.

---

## Handoff para E2 (UI + pós-delete)

1. `const { canDelete } = getCompanyAbilities(user?.role ?? null)`.
2. Secção “Zona perigosa” em `CompanyPage` — visível se `canDelete && company.isActive`.
3. `await companyApi.deleteCompany(company.id)` após confirmação (`DestructiveConfirmModal`).
4. Sucesso: `clearCompany`, limpar credenciais / logout, redirect `/login` + mensagem (não feito em E1).
5. Erros: `getApiError` + `getFriendlyErrorMessage` (403 permissão ou empresa inactiva).

Referências: [`company-management-frontend-audit.md`](../audits/company-management-frontend-audit.md) secções 10–11.

---

## Resumo

E1 entrega o contrato HTTP e a capability `canDelete` para OWNER, com testes escritos e build OK. A página Empresa permanece sem botão de eliminar até E2.
