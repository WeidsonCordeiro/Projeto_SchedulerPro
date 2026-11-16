# CompanyPage — Correção Router nos testes de logótipo

**Data:** 13/11/2026  
**Branch:** `develop` @ `438de5ec3a457b5635d6443d53557a8d95627c40`  
**Git write:** não executado.

**Contexto:** [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md) · [frontend-quality-validation.md](frontend-quality-validation.md)

---

## Problema identificado

Dois testes em `CompanyPage.logo.test.tsx` falhavam com:

```
useNavigate() may be used only in the context of a <Router> component.
```

(`CompanyPage.tsx` L48.)

---

## Causa raiz

O helper `renderPage()` montava apenas `Provider` + `<CompanyPage />`, sem contexto React Router, enquanto o componente de produção usa `useNavigate()`.

**Não** é defeito de implementação em `CompanyPage.tsx` — é setup de teste incompleto face a testes adicionados após introdução de navegação na página.

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/pages/company/CompanyPage.logo.test.tsx`](../../client/src/pages/company/CompanyPage.logo.test.tsx) | `MemoryRouter` + `Routes` em `renderPage()` |
| `docs/tasks/company-page-logo-router-test-fix.md` | Este relatório |

**Não alterados:** `CompanyPage.tsx`, `CompanyPage.test.tsx`, configs, outros testes.

---

## Correção aplicada

Alinhar `renderPage()` ao padrão de [`CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx):

- Import: `MemoryRouter`, `Route`, `Routes` de `react-router-dom`.
- Wrapper: `initialEntries={["/company"]}`, rotas `/company` e `/login`.
- Mocks Redux, `companyApi` e asserções dos dois testes **inalterados**.

---

## Testes executados

| Comando | Resultado |
|---------|-----------|
| `npx vitest run src/pages/company/CompanyPage.logo.test.tsx` | **2 passed** (1 ficheiro) |
| `npx vitest run src/pages/company/CompanyPage.test.tsx` | **34 passed** (1 ficheiro) |

**Não executado:** `npm test` (suite completa do client).

---

## Estado Git

### Inicial

- HEAD: `438de5ec3a457b5635d6443d53557a8d95627c40`
- Working tree: alterações documentais pendentes em `docs/` (preservadas)

### Final

- HEAD: inalterado
- Novo/modificado nesta tarefa: `client/.../CompanyPage.logo.test.tsx`, este ficheiro em `docs/tasks/`
- Docs anteriores preservados

---

## Pendências conhecidas (outras falhas da validação frontend)

Conforme [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md):

1. **Dashboard O5** — `waits for the full 45 second throttle` — falha possível em suite completa; passa isolado.
2. **RegisterPage** — `validates password minimum length` — timeout marginal (5 s) em suite completa; passa isolado.

A suite integral do frontend **não** está declarada como aprovada até validação completa futura.

**Revalidação integral (13/11/2026):** [frontend-quality-revalidation.md](frontend-quality-revalidation.md) — logo OK; 2 falhas timeout (outros testes).
