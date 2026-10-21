# Stage 49.6 — Reorganização CSS calendário e agendamentos

Data: 21/10/2026  
Âmbito: extrair e agrupar estilos do módulo de agenda admin sem alteração intencional de UX.  
Sem commit, merge ou push.

## 1. Objetivo

Tornar mais fácil localizar e manter o CSS do calendário (`AppointmentsViewSwitcher`, `MonthView`, vistas semana/dia, lista na página, grelha do formulário), conforme audit [stage-49-appointments-refactor-audit.md](stage-49-appointments-refactor-audit.md) §8 (etapa 49.6).

**Baseline pré-49.6:** **1331** testes / **119** ficheiros (Stage 49.5).

## 2. Inventário pré-alteração (`index.css`)

| Zona | Linhas (aprox.) | Conteúdo movido |
|------|-----------------|-----------------|
| A | 567–876 | Superfície, painel, toolbar, itens, status, semana/dia, mês, agenda mobile, MQ `min-width: 768px` (toolbar + mês) |
| B | 1311–1355 | `.calendar-grid`, `.calendar-legend` (`AppointmentCalendar.tsx`) |
| C | 1395–1409 | MQ `max-width: 991.98px` — scroll `.week-calendar` / `.day-calendar` |
| D | 1430–1666 | Transição/hover mês, `min-height` week/day, MQ `767.98px` (só regras calendário), scroll mês, MQ `575.98px` (surface + font-size), zebra/hover |

**Permanecem em `index.css`:** `.table-card`, `.table-responsive` (MQ mobile L1475+), modais globais no MQ `767.98px`, sidebar, navbar, dashboard, layout público.

## 3. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [client/src/styles/appointments-calendar.css](client/src/styles/appointments-calendar.css) | **Novo** — estilos do módulo, secções comentadas + media queries agrupadas |
| [client/src/index.css](client/src/index.css) | Removidos blocos A–D (e linhas calendário em MQ mistos) |
| [client/src/main.tsx](client/src/main.tsx) | `import "./styles/appointments-calendar.css"` após `./index.css` |

**Decisão de carregamento:** o plano previa `@import` no meio de `index.css` (posição do bloco A). O PostCSS/Vite exige que `@import` preceda outras regras (`@import must precede all other statements`). O parcial passa a ser importado em `main.tsx` **depois** de `index.css`, para CSS válido e bundle sem aviso. Efeito: regras do calendário ficam no final da cascata global (após regras genéricas de `index.css`); não há seletores `calendar-*` restantes em `index.css` que conflitem.

## 4. Organização do parcial

1. Shell e painel  
2. Toolbar  
3. Tokens partilhados (`.calendar-item*`, `.status-*`, eventos grelha horária, now-line)  
4. Vista mensal + `month-day-agenda-list`  
5. Base semana/dia (`min-height`)  
6. Grelha do formulário  
7. Media queries: `768px` → transição/hover células mês → `991.98px` → `767.98px` (toolbar + mês mobile, scroll) → `575.98px`  
8. Zebra e hover week/day (posição final, como no `index.css` original)

## 5. Duplicações eliminadas

| Antes | Depois |
|-------|--------|
| `.month-calendar .calendar-item` em bloco A e secção «Agenda» (L749 + L1442) | Um bloco com `font-size: 0.75rem` + `line-height: 1.2` |
| `.month-calendar .calendar-day-cell` base + bloco só com `transition` | Dois seletores consecutivos na secção mês; `transition`/`hover` **após** MQ `min-width: 768px` (ordem de cascata preservada) |
| Dois `@media (max-width: 767.98px)` só para calendário | Um único bloco no parcial |

Comentário órfão «ver .calendar-overflow» removido com a secção D.

## 6. Cascata, especificidade e breakpoints

- Breakpoints inalterados: `575.98px`, `767.98px`, `768px`, `991.98px`.  
- Regras de página (header, tabela, modais) nos MQ `767`/`575` **não** foram movidas.  
- Lista de agendamentos continua a depender de `.table-card` e `.table-responsive` em `index.css`.

## 7. Comportamentos preservados (intenção)

Toolbar única, mês desktop/mobile, overflow, `#month-day-agenda-panel`, `MAX_VISIBLE_ITEMS` (TSX), semana/dia, lista, loading/erro, modais Bootstrap — sem alterações de TSX nem de lógica.

## 8. Validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| Testes focados (ViewSwitcher, MonthView, CalendarView, ListView) | **44** passaram |
| `npm run test -- --pool=forks --maxWorkers=1` | **1331** passaram (**119** ficheiros) |
| `npm run typecheck` | OK (na corrida focada) |
| `npm run build` | OK, sem aviso PostCSS após import em `main.tsx` |

Cobertura: sem métrica registada.

## 9. Validação visual

**Não executada** nesta etapa (sem inspeção browser autenticada em `/appointments` com dados reais). Recomendado: desktop, ~390px mobile (mês + agenda + scroll), overflow, semana, dia, lista.

## 10. Fora do âmbito / notas

- Cartões móveis para lista (audit 49.7) — não implementado.  
- `AppointmentsCalendarPanel` — não extraído.  
- Possível diferença teórica de cascata vs. posição L567 do monólito (import no fim via `main.tsx`); risco baixo dado isolamento de seletores.

## 11. Git

**Confirmado:** nenhum `git commit`, `merge` ou `push` nesta etapa.

## CONTEXTO PARA A PRÓXIMA IA

- Módulo admin: `AppointmentsPage` + hooks 49.2/49.3 + `AppointmentsViewSwitcher` + `CalendarView`/`MonthView` + `AppointmentsListView`; estilos de agenda em **`client/src/styles/appointments-calendar.css`**.
- Testes: **1331** / **119**; typecheck e build OK.
- Validação visual manual **pendente**.
- Próximo passo **opcional** (produto/audit): cartões mobile na lista ou melhorias cosméticas pontuais — **não** obrigatório após 49.6; evitar refatoração estrutural adicional sem pedido explícito.
