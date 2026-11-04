# SchedulerPro — Implementação: UX da empresa inactiva (Etapa B)

**Data:** 31/10/2026  
**Objetivo:** Melhorar a clareza do estado «empresa suspensa» para OWNER e ADMIN, mapear erros `COMPANY_INACTIVE_*` no frontend e exibir aviso persistente em toda a área autenticada, sem alterar RBAC ou lifecycle no backend.

**Referências:** [schedulerpro-companies-management-audit.md](./schedulerpro-companies-management-audit.md) (Etapa B), [schedulerpro-companies-lifecycle-frontend-implementation.md](./schedulerpro-companies-lifecycle-frontend-implementation.md) (Etapa A).

---

## Estado inicial encontrado

| Item | Situação |
|------|----------|
| Etapa A | Presente: lifecycle OWNER, `canEditProfile`, card operacional |
| Aviso inactivo | `alert-warning` genérico só na CompanyPage |
| `getFriendlyErrorMessage` | Devolvia `failure.message`; backend envia texto PT **sem** `code` |
| Banner global | Inexistente |
| Redux `company` | Carregado para OWNER/ADMIN; utilizável no AppLayout |

**Git no início:** branch `develop`, commit `534354d80e6ef4f7c2cf26737949cb490eed15b5`, working tree limpo (pós-merge Etapa A).

---

## Ficheiros analisados

- [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx)
- [`client/src/api/errors.ts`](../../client/src/api/errors.ts)
- [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx)
- [`client/src/store/slices/companySlice.ts`](../../client/src/store/slices/companySlice.ts)
- [`server/src/middlewares/require-operational-company.middleware.ts`](../../server/src/middlewares/require-operational-company.middleware.ts) (leitura — sem alteração)
- [`server/src/modules/auth/utils/assert-company-active-for-auth.ts`](../../server/src/modules/auth/utils/assert-company-active-for-auth.ts) (leitura — sem alteração)

---

## Ficheiros criados

| Ficheiro | Descrição |
|----------|-----------|
| [`client/src/components/company/CompanyInactiveNotice.tsx`](../../client/src/components/company/CompanyInactiveNotice.tsx) | Aviso role-aware (OWNER / ADMIN) |
| [`client/src/components/company/CompanyInactiveNotice.test.tsx`](../../client/src/components/company/CompanyInactiveNotice.test.tsx) | Testes de copy |
| Este relatório | Documentação Etapa B |

---

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/api/errors.ts`](../../client/src/api/errors.ts) | Códigos, mensagens amigáveis, fallback por `message` do backend |
| [`client/src/api/errors.test.ts`](../../client/src/api/errors.test.ts) | Cobertura code + fallback + regressão |
| [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | Notice, nota link público, destaque reactivação |
| [`client/src/pages/company/CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx) | Describe `inactive UX` |
| [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) | Banner global via `selectCompany` |
| [`client/src/components/layout/AppLayout.test.tsx`](../../client/src/components/layout/AppLayout.test.tsx) | Aviso global OWNER/ADMIN |

**Backend:** nenhuma alteração (pendência recomendada abaixo).

---

## Comportamento implementado

### OWNER (empresa inactiva)

- **AppLayout:** aviso global persistente (`variant="global"`).
- **CompanyPage:** mesmo componente (`variant="page"`), nota sob o link público, perfil read-only, card operacional com borda primária, título «Reativar a empresa» e botão de reactivação.
- Copy: suspensão, booking público bloqueado, staff não-OWNER suspenso, só OWNER reactiva, dados só consulta.

### ADMIN (empresa inactiva)

- Aviso global + aviso na CompanyPage com orientação para contactar o OWNER.
- Sem botões de lifecycle; sem formulário de edição (`canEditProfile` false).
- Empresa activa: comportamento Etapa A inalterado (formulário editável).

### Erros mapeados

| Código / origem | Mensagem amigável (resumo) |
|-----------------|----------------------------|
| `COMPANY_INACTIVE_OPERATION` | Operação indisponível — empresa suspensa; reactivar para editar/logo/operações |
| `COMPANY_INACTIVE_ACCESS` | Acesso limitado — contactar OWNER |
| Fallback: `message` igual a [`BACKEND_COMPANY_INACTIVE_*`](../../client/src/api/errors.ts) | Mesmas mensagens amigáveis (backend ainda não envia `code`) |

Demais erros: comportamento anterior preservado (mensagem do backend ou fallback por `kind`).

---

## Decisões técnicas

1. **Componente único** `CompanyInactiveNotice` para evitar copy divergente entre AppLayout e CompanyPage.
2. **Fallback por `message`** espelhando [`http-messages.ts`](../../server/src/constants/http-messages.ts) até o backend expor `ErrorCode` no JSON (como já faz para sessão).
3. **Banner global** só para OWNER/ADMIN com `company.isActive === false` no Redux (decisão de produto confirmada).
4. **Sem botões desactivados** — acções omitidas ou explicadas no texto.

---

## Testes executados

Comando (`client/`):

```bash
npm test -- --run errors.test.ts CompanyInactiveNotice CompanyPage AppLayout
npm run build
```

**Resultados:**

- **60 testes** passaram nos 5 ficheiros acima.
- **`npm run build`:** sucesso (`tsc -b && vite build`).

---

## Limitações e pendências

1. **Backend não envia `response.code`** para erros de empresa inactiva — o frontend mapeia por `code` (testes) e por igualdade exacta da `message` do backend (produção). Recomendação futura: adicionar `ErrorCode.COMPANY_INACTIVE_OPERATION` / `COMPANY_INACTIVE_ACCESS` em [`error-codes.ts`](../../server/src/constants/error-codes.ts) e passar ao `AppError` (sem mudar RBAC).
2. **Duplicação visual:** OWNER/ADMIN na CompanyPage vê o aviso global **e** o aviso no card — intencional (reforço na página de gestão); pode simplificar-se numa Etapa futura.
3. **MANAGER/EMPLOYEE** com sessão antiga: não recebem aviso global (sem `COMPANY_READ` / company no Redux); bloqueio continua no backend.

---

## Continuidade para outra IA

- Etapa A + B concluídas no frontend para lifecycle e UX inactivo.
- Próximo passo opcional: emitir `code` no backend; Etapa C soft-delete só com requisito de produto.
- Não repetir auditoria Companies — usar [schedulerpro-companies-management-audit.md](./schedulerpro-companies-management-audit.md).

---

## Git

Não foram executados commit, push, merge ou PR. O utilizador gere o histórico após revisão.
