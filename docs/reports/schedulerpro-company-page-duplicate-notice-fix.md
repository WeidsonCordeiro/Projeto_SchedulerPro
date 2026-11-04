# SchedulerPro — Ajuste B.3: aviso duplicado na CompanyPage

**Data:** 31/10/2026

---

## Problema

Com empresa inactiva, OWNER/ADMIN viam o mesmo [`CompanyInactiveNotice`](../../client/src/components/company/CompanyInactiveNotice.tsx) duas vezes:

1. No [`AppLayout`](../../client/src/components/layout/AppLayout.tsx) (`variant="global"`).
2. Na [`CompanyPage`](../../client/src/pages/company/CompanyPage.tsx), dentro do card «Informações da empresa» (`variant="page"` por omissão).

## Causa

Bloco condicional na CompanyPage:

```tsx
{!company.isActive && (
  <CompanyInactiveNotice role={user?.role ?? null} />
)}
```

(removido na B.3)

## Alterações

| Ficheiro | Mudança |
|----------|---------|
| [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | Removidos import e render duplicado de `CompanyInactiveNotice` |
| [`CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx) | `inactive UX`: assert de ausência de `company-inactive-notice` na página isolada; mantidos link público, read-only e reactivação OWNER |

**Inalterado:** componente `CompanyInactiveNotice`, `AppLayout`, nota do link público, perfil read-only, card «Estado operacional» / «Reativar a empresa».

## Comportamento final

| Contexto | Aviso completo suspensão | Detalhes só na página |
|----------|--------------------------|------------------------|
| Navegação autenticada (shell) | Uma vez no topo (`AppLayout`) | Nota do link, perfil consulta, reactivação OWNER |
| Teste unitário só `CompanyPage` | Não renderizado (sem layout) | Mesmos detalhes de página |

Regressão do banner global: [`AppLayout.test.tsx`](../../client/src/components/layout/AppLayout.test.tsx).

## Testes e build

```bash
cd client && npm test -- --run CompanyPage.test AppLayout.test
cd client && npm run build
```

*(40 testes — CompanyPage + AppLayout — OK; `npm run build` OK — 31/10/2026.)*

## Git

Sem commit/push — utilizador gere histórico.
