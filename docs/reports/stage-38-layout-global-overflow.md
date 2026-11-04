# Stage 38 — Layout global e overflow

Data: 16/10/2026  
Branch: `feature/stage-38-layout-global-overflow` (a partir de `develop` atualizado)  
Referências: [`stage-37-frontend-audit-setmore-comparison.md`](stage-37-frontend-audit-setmore-comparison.md), [`docs/SchedulerPro - Imagens.pdf`](../SchedulerPro%20-%20Imagens.pdf) (18 páginas, capturas)

## 1. Objetivo e âmbito

Corrigir a estrutura global do frontend (cabeçalho, sidebar, conteúdo principal, painel de notificações e cadeia de scroll) sem redesign visual, sem alterações de negócio/API/RBAC, e sem uniformização global de componentes (reservada à Stage 39).

## 2. Problemas identificados e causas

| Área | Sintoma (spec + PDF) | Causa raiz confirmada no código |
|------|----------------------|--------------------------------|
| Scroll | Scroll vertical no documento **e** em `main` | `body` com `min-height: 100vh` sem limitar altura quando existe `.app-shell`; `#root` sem altura; shell sem `overflow: hidden` explícito na cadeia flex |
| Tabelas | Colunas/ações cortadas ou página a alargar | `.table-responsive { overflow-x: hidden }` impedia scroll horizontal local apesar de `min-width` em tabelas mobile |
| Notificações | Painel largo/cortado; scroll da página | Dropdown em `position: absolute` relativo à navbar; limites de altura só bem definidos em breakpoint `<992px` |
| Navbar | Desalinhamento / texto competindo com logout | Bloco de ações sem agrupamento flex; cargo visível em larguras médias com pouco espaço |
| Sidebar mobile | Drawer sobreposta ao cabeçalho | `.app-sidebar` com `top: 0` em mobile |

### Matriz PDF (págs. 1–18)

O PDF contém **18 capturas** sem texto OCR. Durante a implementação não foi possível rasterizar o PDF no ambiente do agente; a correção seguiu o cruzamento **spec Stage 38 + código + testes de layout**. Recomenda-se validação manual página a página com o PDF aberto (mesmas rotas: dashboard, clientes, agenda, relatórios, notificações abertas, viewport estreita).

## 3. Decisões técnicas

1. **`body:has(.app-shell)`** — `height: 100dvh; overflow: hidden` apenas quando o shell autenticado está montado; login/registo público mantêm scroll do documento.
2. **Scroll único** — `.app-shell` flex column + `.app-body` `min-height: 0` + `main` com `overflow-auto` (já existente).
3. **Notificações** — painel `position: fixed` em todos os breakpoints, coluna flex, lista com `overflow-y: auto` e `overscroll-behavior: contain`.
4. **Tabelas** — `overflow-x: auto` em `.table-responsive` (removido `hidden`); sem `overflow-x: hidden` global no `body`.
5. **Sidebar mobile** — `top: var(--sp-navbar-height)` e altura `calc(100dvh - var(--sp-navbar-height))`.

## 4. Ficheiros alterados

| Ficheiro | Motivo |
|----------|--------|
| [`client/src/index.css`](../../client/src/index.css) | Cadeia viewport, shell, navbar, notificações, sidebar mobile, `.table-responsive` |
| [`client/src/components/layout/Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) | Classes `navbar-actions` / `navbar-user-cluster` |
| [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) | Shell/body delegam layout ao CSS `.app-shell` / `.app-body` |
| [`client/src/components/layout/NotificationBell.tsx`](../../client/src/components/layout/NotificationBell.tsx) | Classe `notification-bell-anchor` (sem `position-relative` no dropdown) |

## 5. Correções por área

- **Cabeçalho:** flex no `container-fluid`, agrupamento utilizador, cargo oculto em `768px–991px`, nome com `max-width` reduzido nesse intervalo.
- **Sidebar + main:** flex child `min-height: 0`; drawer mobile abaixo da navbar.
- **Notificações:** painel fixo à viewport, largura `min(22rem, 100vw - 1rem)`, scroll interno na lista.
- **Overflow:** tabelas com scroll horizontal local; calendários mobile inalterados (já com scroll contido).

## 6. Testes executados

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/components/layout/Navbar.test.tsx \
  src/components/layout/AppLayout.test.tsx \
  src/components/layout/NotificationBell.test.tsx \
  src/components/layout/Sidebar.test.tsx
# → 4 ficheiros, 38 testes passados

npm run test -- --pool=forks --maxWorkers=1
# → 108 ficheiros, 1239 testes passados (~522s)
```

## 7. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 8. Validação visual

**Não concluída** nesta sessão com browser automatizado (dev server não verificado). Validar manualmente com o PDF e `npm run dev` em **≥1280px** e **~390px**: navbar, notificações abertas, listas com tabelas, agenda, portal.

## 9. Problemas conhecidos / adiado

- Stage 37 **FE-001** (unificar `LoadingState`/`ErrorState` no admin) — Stage 39.
- Redesign calendário/blocos — fora de âmbito.
- Painel de notificações alinhado ao sino no desktop (usa `right: 0.5rem` fixo — aceitável para evitar clipping).

## 10. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Cabeçalho alinhado, sem corte indevido | Cumprido (código + testes layout); confirmar visualmente |
| Sidebar e main dimensionados | Cumprido |
| Painel de notificações dentro da viewport | Cumprido (CSS fixed + max-height) |
| Scroll interno nos painéis | Cumprido |
| Sem `overflow-x: hidden` global para mascarar | Cumprido (`body:has` só bloqueia overflow quando shell; tabelas com `auto`) |
| Tabelas com scroll quando necessário | Cumprido |
| Rotas/funcionalidades operacionais | Cumprido (1239 testes) |
| Relatório criado | Cumprido |
| CONTEXTO PRÓXIMA IA | Cumprido (abaixo) |

## 11. Próxima etapa recomendada

**Stage 39 — Sistema visual e consistência** (`PageHeader`, botões, estados vazio/erro, modais) conforme onda 1 do relatório Stage 37; **não** reabrir shell/scroll salvo regressão.

## 12. Git

Sem `commit`, `merge` ou `push` (conforme instruções).

---

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Layout global estabilizado na branch `feature/stage-38-layout-global-overflow`. Alterações concentradas em `index.css` e três componentes de layout.

**Preservar:** `body:has(.app-shell)` (não remover sem substituir); painel `.notification-menu` fixed; `.table-responsive` com `overflow-x: auto`; sidebar mobile com `top: var(--sp-navbar-height)`.

**Limitações:** Validação visual com PDF ainda recomendada; notificações no desktop ancoradas à margem direita da viewport, não ao botão do sino.

**Stage 39:** Focar FE-001/FE-002/FE-013 e consistência visual — evitar refatorar `AppLayout`/`Navbar` exceto se necessário para tokens ou espaçamento do design system.
