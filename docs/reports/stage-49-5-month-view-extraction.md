# Stage 49.5 — Extrair `MonthView`

Data: 21/10/2026  
Âmbito: composição da vista mensal (`MonthCalendar` + `MonthDayAgendaList`) fora de `CalendarView`.  
Sem commit, merge ou push.

## 1. Objetivo

Reduzir a complexidade de [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) extraindo o ramo mensal para [`MonthView.tsx`](../../client/src/components/appointments/MonthView.tsx), preservando UX 48.1/48.2 (overflow, mobile, scroll do painel de agenda).

**Baseline pré-49.5:** **1327** testes / **118** ficheiros (Stage 49.4).

## 2. Responsabilidades após a extração

| Componente | Responsabilidade |
|------------|------------------|
| **`MonthView`** | Compõe `MonthCalendar` e `MonthDayAgendaList`; `layoutMode` compacto em mobile; `handleMonthOverflowClick` (desktop → `onOverflowDayClick` ou `onDayClick`; mobile → `onMonthDaySelect` + scroll `#month-day-agenda-panel`); `year`/`month` via Luxon + timezone Redux |
| **`CalendarView`** | Shell `calendar-surface`, loading/erro, switch `viewType` → `MonthView` / `WeekCalendar` / `DayCalendar`; `viewType === "list"` → `null` |
| **`AppointmentsPage`** | Orquestração inalterada em termos de negócio; passa configuração mensal agrupada em `month` |

## 3. Decisão de API

- Tipo exportado **`MonthViewProps`** — contrato completo da vista mensal.
- Tipo exportado **`CalendarViewMonthConfig`** — props só-mês no pai:
  - `monthFocusedDateKey`, `onMonthDaySelect`, `onOverflowDayClick`, `canCreate`, `onCreateForDay`, `isMobileViewport`
- Removidas do topo de `CalendarViewProps`: as seis props acima + `isMobileViewport` solto.
- `onDayClick` permanece em `CalendarView` (partilhado com semana) e é repassado a `MonthView`.

## 4. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `MonthView.tsx` | **Novo** |
| `MonthView.test.tsx` | **Novo** — 6 casos |
| `CalendarView.tsx` | Delega mês a `MonthView`; `CalendarViewMonthConfig` |
| `AppointmentsPage.tsx` | `month={{ ... }}` em vez de props soltas |
| `CalendarView.test.tsx` | `month` nos renders; smoke mês; removidos describes mobile/overflow (migrados) |

Não alterados: `useAppointmentsNavigation`, `useAppointmentsSchedule`, `appointmentCalendar.ts`, `MonthCalendar.test.tsx`.

## 5. Comportamentos preservados

1. Desktop: dia futuro → criação via `onDayClick` (lógica em `MonthCalendar`).
2. Desktop: overflow → `onOverflowDayClick` (ou fallback `onDayClick`).
3. Mobile: toque no dia → `onMonthDaySelect`; lista com `monthFocusedDateKey`.
4. Mobile: overflow → `onMonthDaySelect` + scroll suave do painel de agenda.
5. Datas passadas: células `aria-disabled`; sem `onDayClick` (teste em `MonthView`).
6. Toolbar única (49.4) inalterada na página.
7. Semana e dia inalterados em `CalendarView`.
8. Lista API sem filtro temporal.
9. `MAX_VISIBLE_ITEMS` inalterado.
10. Loading, erro, timezone, RBAC na página/hooks como antes.

Nenhuma diferença funcional intencional identificada na implementação.

## 6. Testes

### `MonthView.test.tsx` (novo)

- Composição desktop (grelha sem lista) e mobile (grelha + agenda do dia focado).
- Seleção mobile: `onMonthDaySelect` vs `onDayClick`.
- Overflow desktop → `onOverflowDayClick`.
- Overflow mobile → `onMonthDaySelect` + `scrollIntoView` após microtask.
- Data passada sem `onDayClick`.

### `CalendarView.test.tsx`

- Loading e smoke «mês renderiza Seg» com `month={{ isMobileViewport: false }}`.
- Describes «lista mobile» e «overflow no mês» removidos (cobertura em `MonthView`).
- Testes diretos de `MonthCalendar` / semana / dia mantidos no mesmo ficheiro.

## 7. Validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1` | **1331** passaram (**119** ficheiros); +4 testes, +1 ficheiro vs 1327/118 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

Cobertura: sem métrica de cobertura registada neste relatório.

## 8. Limitações e validação manual

- Validação visual desktop/tablet/mobile não executada nesta etapa.
- Scroll real do painel `#month-day-agenda-panel` depende do DOM no browser.

## 9. Git

**Confirmado:** nenhum `git commit`, `merge` ou `push` foi executado nesta etapa.

## CONTEXTO PARA A PRÓXIMA IA

- Stage **49.6:** reorganização CSS do calendário/agendamentos (audit [`stage-49-appointments-refactor-audit.md`](stage-49-appointments-refactor-audit.md) §8) — **fora do âmbito de 49.5**.
- Arquitetura atual: `AppointmentsPage` → `AppointmentsViewSwitcher` + `useAppointmentsNavigation` + `useAppointmentsSchedule` + `CalendarView` (`MonthView` | week | day) + `AppointmentsListView` + modais.
- `CalendarView` já não contém lógica mensal; próximos passos estruturais opcionais: `AppointmentsCalendarPanel` (audit), cartões lista mobile (49.7).
- Testes cliente após 49.5: **1331** pass / **119** ficheiros; typecheck e build OK.
