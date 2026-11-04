# Stage 49.3 — Extrair `useAppointmentsNavigation`

Data: 21/10/2026  
Âmbito: extrair estado e handlers de navegação da agenda de `AppointmentsPage` para um hook dedicado, centralizar navegação temporal do toolbar e unificar viewport mobile na página → `CalendarView`.  
Sem commit, merge ou push.

## 1. Objetivo

Reduzir complexidade de [`AppointmentsPage.tsx`](../client/src/pages/appointments/AppointmentsPage.tsx) após 49.1 (lista) e 49.2 (`useAppointmentsSchedule`), movendo `viewType`, datas, reconciliação do mês e política de clique dia/overflow/slot para [`useAppointmentsNavigation.ts`](../client/src/hooks/useAppointmentsNavigation.ts).

**Fora de âmbito:** toolbar unificada Lista (49.4), CSS, `appointmentCalendar.ts` (apenas imports), RBAC, `handleCalendarAppointmentClick` (formulário na página).

**Baseline pré-49.3:** **1312** testes / **116** ficheiros (Stage 49.2).

## 2. Responsabilidades

| `useAppointmentsNavigation` | `AppointmentsPage` | `CalendarView` |
|-----------------------------|--------------------|----------------|
| `viewType`, `setViewType`, `currentDateKey`, `monthFocusedDateKey`, `todayKey` | Formulário, delete, status, `openEdit` / `openDetails` | Título do período, render Mês/Semana/Dia |
| `isMobileCalendar` (`useMatchMedia` único na página) | `useAppointmentsSchedule` | `isMobileViewport` prop; scroll `month-day-agenda-panel` |
| Handlers: data change, day click, overflow, createForDay, slot | `CalendarView` + lista toolbar `setViewType` | `calendarNavigatePrev/Next/Today` (helpers do hook) |
| `reconcileMonthFocusedDateKey`, efeitos today rollover + reconciliação | | Overflow mobile: `onMonthDaySelect` + scroll |

Exports puros (testáveis): `reconcileMonthFocusedDateKey`, `calendarNavigatePrev`, `calendarNavigateNext`, `calendarNavigateToday`.

## 3. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/hooks/useAppointmentsNavigation.ts` | **Novo** — hook + helpers de período |
| `client/src/hooks/useAppointmentsNavigation.test.ts` | **Novo** — 14 casos |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Integração; `openCreate` antes do hook; schedule após nav |
| `client/src/components/appointments/CalendarView.tsx` | Prop `isMobileViewport`; navegação via helpers partilhados |
| `client/src/components/appointments/CalendarView.test.tsx` | `isMobileViewport` em `<CalendarView />` (mobile `true`) |

## 4. Comportamentos preservados

- **Desktop mês:** célula futura → criação; overflow → vista Dia na data.
- **Mobile mês:** toque na célula → seleção (`monthFocusedDateKey`); overflow no `CalendarView` → seleção + scroll ao painel.
- **Semana / Dia / Lista:** inalterados (navegação temporal via toolbar → `onDateChange` / helpers).
- **Datas passadas:** sem criação em day click / createForDay / slots passados.
- **Fetch:** `useAppointmentsSchedule` continua a receber `viewType` e `currentDateKey` do hook.

## 5. Testes e validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1 src/hooks/useAppointmentsNavigation.test.ts` | 14 passaram |
| `npm run test -- --pool=forks --maxWorkers=1` | **1326** passaram (**117** ficheiros); +14 vs 1312 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

`AppointmentsPage.test.tsx` — sem alterações de ficheiro; integração mantida.

## 6. Limitações

- Toolbar da vista Lista continua duplicada face ao `CalendarToolbar` (Stage **49.4**).
- Scroll do painel mobile permanece em `CalendarView` (DOM).
- Reconciliação do mês: quando `todayKey` não está na grelha visível, o foco alinha ao `currentDateKey` do mês (comportamento existente em `reconcileMonthFocusedDateKey`).

## CONTEXTO PARA A PRÓXIMA IA

- Stage **49.4:** **`AppointmentsViewSwitcher`** — toolbar única Mês | Semana | Dia | Lista (incluir navegação temporal contextual na lista, conforme auditoria).
- Navegação e dados já em `useAppointmentsNavigation` + `useAppointmentsSchedule`; página orquestra RBAC, formulários e alertas.
- Testes cliente após 49.3: **1326** pass; typecheck e build OK.
- Não fazer commit/merge/push salvo pedido explícito do utilizador.
