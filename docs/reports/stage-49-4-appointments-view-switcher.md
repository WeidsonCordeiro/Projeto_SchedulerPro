# Stage 49.4 — Extrair `AppointmentsViewSwitcher`

Data: 21/10/2026  
Âmbito: toolbar unificada (vistas + navegação temporal + período) na página de agendamentos.  
Sem commit, merge ou push.

## 1. Objetivo

Eliminar a duplicação entre [`CalendarToolbar`](../../client/src/components/appointments/CalendarToolbar.tsx) (dentro de `CalendarView`) e o `btn-group` da vista Lista em [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx), centralizando Mês | Semana | Dia | Lista e Anterior / Hoje / Próximo num único componente.

**Baseline pré-49.4:** **1326** testes / **117** ficheiros (Stage 49.3).

## 2. Decisões

| Decisão | Detalhe |
|---------|---------|
| Componente | [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) — markup e classes `calendar-toolbar*` iguais ao toolbar anterior |
| `CalendarToolbar` | Re-export de `AppointmentsViewSwitcher` (compatibilidade de imports em testes legados) |
| Montagem | Uma instância em `AppointmentsPage`, acima do painel calendário e da lista |
| Label e nav | [`useAppointmentsNavigation`](../../client/src/hooks/useAppointmentsNavigation.ts): `periodLabel`, `handleToolbarPrev` / `Next` / `Today`, `formatAppointmentsViewPeriodLabel` |
| Lista + nav temporal | `calendarNavigatePrev/Next` com `case "list"` → `navigateDay` (atualiza **âncora** `currentDateKey` apenas; fetch da lista continua **sem** `startAt`/`endAt`) |
| `CalendarView` | Sem toolbar; removidas props `onViewTypeChange` e `onDateChange` |

## 3. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `AppointmentsViewSwitcher.tsx` | **Novo** |
| `AppointmentsViewSwitcher.test.tsx` | **Novo** — 3 casos |
| `CalendarToolbar.tsx` | Re-export |
| `useAppointmentsNavigation.ts` | Label, handlers toolbar, nav lista |
| `useAppointmentsNavigation.test.ts` | +4 casos (label, lista, toolbar) |
| `AppointmentsPage.tsx` | Switcher único; removido bloco toolbar lista |
| `CalendarView.tsx` | Só grelhas/loading/erro |
| `CalendarView.test.tsx` | Testes de toolbar movidos; props simplificadas |
| `AppointmentsPage.test.tsx` | +1 integração nav na lista |

## 4. Comportamentos preservados

- Quatro vistas e `aria-pressed` na vista ativa.
- Navegação temporal em mês/semana/dia (via hook + helpers existentes).
- Vista Lista: todos os agendamentos na API; toolbar com nav e título «Lista de agendamentos».
- RBAC, formulários, hooks 49.2/49.3, calendário mobile (scroll no `CalendarView`).

## 5. Validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1` | **1327** passaram (**118** ficheiros); +1 vs 1326 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

Cobertura: sem métrica de cobertura registada neste relatório.

## 6. Limitações

- Fetch da lista inalterado (sem filtro por `currentDateKey` na API).
- Validação visual manual (desktop/tablet) não executada nesta etapa.
- **Confirmado:** nenhum `git commit`, `merge` ou `push` foi executado.

## CONTEXTO PARA A PRÓXIMA IA

- Stage **49.5:** extrair **`MonthView`** (composite `MonthCalendar` + `MonthDayAgendaList`, reduzir props de `CalendarView`) — ver [`stage-49-appointments-refactor-audit.md`](stage-49-appointments-refactor-audit.md) §8.
- Página fina: `AppointmentsViewSwitcher` + `useAppointmentsNavigation` + `useAppointmentsSchedule` + `AppointmentsListView` + modais.
- Testes cliente após 49.4: **1327** pass; typecheck e build OK.
