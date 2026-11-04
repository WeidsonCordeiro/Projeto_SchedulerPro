# SchedulerPro — Etapa 6.4c.3 — Toggle da Sidebar e Acessibilidade (implementação)

**Data:** 2026-11-04  
**Branch:** `develop`  
**HEAD (início):** `0ee6a2dbfb3f727c099c7d65b918995a34281f15`  
**Working tree inicial:** limpo (CSS sidebar já integrado em commits anteriores)

**Relacionado:** [`schedulerpro-sidebar-mobile-step-6-4c-1-audit.md`](./schedulerpro-sidebar-mobile-step-6-4c-1-audit.md), [`schedulerpro-sidebar-mobile-step-6-4c-2-implementation.md`](./schedulerpro-sidebar-mobile-step-6-4c-2-implementation.md), [`schedulerpro-sidebar-mobile-height-fix.md`](./schedulerpro-sidebar-mobile-height-fix.md)

---

## 1. Diagnóstico do comportamento anterior

| Aspecto | Antes |
|---------|--------|
| Botão ☰ | Só `openSidebar()` — não fechava com segundo clique |
| `aria-controls` | Ausente |
| Foco ao abrir | Sem movimento de foco |
| Foco ao fechar | Perdido no documento |
| Focus trap | Ausente — Tab podia atingir `main` |
| Conteúdo principal | Sem `inert` com drawer aberto |
| Mudança de rota | Só fechava via `onNavigate` nos links |
| Escape / backdrop / btn-close / links | Já implementados |

CSS mobile (6.4c.2 + height fix) **não alterado** nesta etapa.

---

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) | Toggle, foco, trap, `inert`, fecho por `pathname` |
| [`client/src/components/layout/Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) | `aria-controls`, `menuToggleRef`, label dinâmico |
| [`client/src/components/layout/AppLayout.test.tsx`](../../client/src/components/layout/AppLayout.test.tsx) | Novos testes a11y/toggle |
| Este relatório | Criado |

`Sidebar.tsx`, `index.css`, Redux e backend: **inalterados**.

---

## 3. Toggle hambúrguer

- `toggleSidebar`: alterna `sidebarOpen`; ao fechar via toggle, restaura foco no ☰.
- `closeSidebar`: usado por backdrop, Escape, botão interno, links (`onNavigate`) — centraliza fecho + foco no ☰.
- `aria-expanded` e label **Abrir menu** / **Fechar menu** sincronizados com o estado.

---

## 4. `aria-controls`

No botão ☰ (navbar):

```tsx
aria-controls="app-sidebar"
```

O `<aside>` mantém `id="app-sidebar"` (já existia).

---

## 5. Gestão de foco e focus trap

| Momento | Comportamento |
|---------|----------------|
| Abrir | `inert` em `<main data-testid="app-main">`; foco no botão `.btn-close` do cabeçalho do drawer (`queueMicrotask`) |
| Fechar | Foco reposto no ☰ via `queueMicrotask` |
| Tab / Shift+Tab | Listener em `window`: dentro de `#app-sidebar`, último → primeiro e primeiro → último |
| Escape | `preventDefault` + `closeSidebar()` |

Selector de focáveis alinhado ao padrão do `TimezonePicker` (botões, links, inputs).

**Nota:** Navbar e backdrop permanecem fora do trap (backdrop fecha ao clique; ☰ pode fechar quando acessível acima do backdrop).

---

## 6. Fechamento por navegação

```tsx
useEffect(() => {
  setSidebarOpen(false);
}, [location.pathname]);
```

Fecha em navegação programática (ex.: `navigate('/clients')`) sem substituir o fecho nos cliques de link (`onNavigate`).

---

## 7. Testes executados

### AppLayout

```bash
cd client && npm test -- src/components/layout/AppLayout.test.tsx
```

| Resultado | **24 testes — passou** (~7,9 s) |

Novos cenários (describe `mobile sidebar a11y and toggle`):

- Segundo clique no ☰ fecha
- Botão fechar interno
- Link «Clientes»
- `navigate` programático
- `aria-controls` + `id`
- `inert` em `app-main`
- Foco inicial no fechar + restauração no ☰
- Tab no último focável permanece no drawer

Cenários anteriores (backdrop, Escape, `aria-expanded`) mantidos com `getMenuToggle()` scoped à `.app-navbar`.

### Navbar

```bash
cd client && npm test -- src/components/layout/Navbar.test.tsx
```

| Resultado | **6 testes — passou** |

### Suite completa

```bash
cd client && npm test
```

| Resultado (2026-11-04) | **1504 passaram**, **4 falharam**, **1508 total** |
|--------------------------|-----------------------------------------------------|
| Ficheiros | 132 passaram, **2 falharam** |
| Duração | ~507 s |

**Nota:** `AppLayout.test.tsx` isolado — **24/24 OK**. As 4 falhas ocorreram noutros ficheiros na suite completa (identificar com `npm test` local; possível flakiness pré-existente, ex. `RegisterPage`). Recomenda-se re-execução antes do merge.

*(Secção 8 anterior renumerada — build abaixo.)*

```bash
cd client && npm run build
```

| Resultado | **Sucesso** (~7,5 s) |
|-----------|----------------------|
| JS bundle | `index-C8TyLtT2.js` |

---

## 9. Build

| Item | Estado |
|------|--------|
| Leitor de ecrã (NVDA/VoiceOver) | **Não testado** |
| Viewports 390×844, desktop 992+ | **Pendente utilizador** |
| Shift+Tab explícito em dispositivo real | Coberto parcialmente por teste Tab; validar manualmente |

Checklist sugerida:

- ☰ abre/fecha; backdrop e Escape
- Tab não entra no conteúdo principal com drawer aberto
- Nome longo empresa + CSS 6.4c.2 inalterados visualmente

---

## 11. Problemas / limitações

| ID | Nota |
|----|------|
| L1 | Focus trap limitado ao `#app-sidebar` — navbar ainda focusável (permite fechar pelo ☰ quando visível) |
| L2 | `inert` em `main` — suporte moderno; React 19 prop/attribute |
| L3 | Teste Shift+Tab wrap inverso não isolado — adicionar se CI exigir |

---

## 12. Contexto para próxima etapa

- **6.4d / 6.4e:** listagens mobile em cards — fora de escopo.
- Possível follow-up sidebar: fechar drawer ao abrir notificações; `aria-modal` no drawer — só se QA manual o exigir.
- Commit manual recomendado: `AppLayout`, `Navbar`, `AppLayout.test.tsx`, relatórios 6.4c.*

---

## 13. Conclusão

Comportamento de toggle, `aria-controls`, foco, `inert`, trap Tab básico e fecho por rota implementados com testes automatizados e build OK. **Validação manual e AT permanecem obrigatórias** antes de considerar a UX fechada.
