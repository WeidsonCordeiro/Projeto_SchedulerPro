# Onda FE — Wave 2 (pós FE-FU)

**Atualizado:** 28/11/2026 · **`develop`**

## Concluído em `develop`

| Branch | ID | Entrega |
|--------|-----|---------|
| `feat/fe-perf-004-client-cache` | FE-PERF-004 + O5 | Cache 45s; dashboard + clientes; O5 unificado |
| `feat/fe-wave-2-copy-pt-pt` | FE-UX-002 | Cópia PT-PT (auth, admin, portal, erros) |
| `feat/fe-fu-001-css-phase-2` | CSS | Calendário fora do critical path |
| `feat/fe-fu-001-css-phase-3` | CSS | Público, relatórios, employee-picker |
| `feat/fe-a11y-wave-2` (em fase 3) | A11y piloto | `main`, landmarks CRUD, headings pontuais |
| `feat/fe-stage37-calendar-tests` | FE-016 | Subvistas mês/semana/dia + switcher |

Docs: `docs/tasks/fe-*-implementation.md` e `docs/audits/frontend-audit-quick-2026-11-28.md`.

---

## Pendente (futuro — **sem branch aberta**)

| ID sugerido | Tema | Prioridade | Notas |
|-------------|------|------------|--------|
| `feat/fe-perf-004-cache-extend` | Estender `queryCache` a serviços, funcionários, restantes listagens + invalidação em mutações | P3 | Hoje só **clientes** + **dashboard** |
| `feat/fe-a11y-headings` | FE-A11Y-05 | P2 | Auditoria manual páginas longas; piloto já em dashboard/serviços |
| `feat/fe-a11y-mobile-landmarks` | FE-A11Y-06 | P3 | Availability, relatórios, portal — fora do piloto CRUD |
| `feat/fe-fu-001-css-phase-4` | Bootstrap full + subset ícones; purge `index.css` | P2 | `index-*.css` ainda ~338 kB |
| `feat/fe-a11y-axe-pass` | FE-A11Y-07 | P3 | axe / leitores de ecrã (não automatizado no CI) |
| `feat/fe-ux-002-copy-backend` | Mensagens API expostas na UI ainda em BR ocasional | P3 | [`frontend-copy-pt.md`](../guides/frontend-copy-pt.md) «Pendente» |
| Stage 37 vários | FE-008 notificações prefs, FE-009 multi-tenant, FE-012 responsivo visual | P3 / N/A | Fora MVP |

**Política O5:** não alterar refresh por visibilidade sem branch dedicada.

---

## Histórico (tabela original)

| Branch | Estado |
|--------|--------|
| Todas as linhas acima na secção «Concluído» | ✅ merge em `develop` |
| `feat/fe-a11y-headings` / `feat/fe-a11y-mobile-landmarks` (linhas antigas) | **Parcial** — absorvido no piloto; auditoria completa = pendente |