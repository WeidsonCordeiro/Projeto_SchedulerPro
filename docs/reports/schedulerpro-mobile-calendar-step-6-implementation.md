# SchedulerPro — Etapa 6.2: Calendário mobile responsivo (implementação)

**Data:** 03/11/2026  
**Branch:** `feature/appointments-mobile-calendar-step-6`  
**Base:** `develop` @ `40b1259` (PR #123 — Etapa 5 / 5.1)  
**Auditoria:** [`schedulerpro-mobile-calendar-step-6-audit.md`](./schedulerpro-mobile-calendar-step-6-audit.md)

---

## 1. Resumo da solução

Em viewport **≤767.98px** (`isMobileCalendar` / `timeGrid.isMobileViewport`), as vistas **Semana** e **Dia** deixam de montar a grelha time-grid (620px) e passam a agendas **verticais** com cards `AppointmentCalendarItem`. A partir de **768px**, `WeekCalendar` e `DayCalendar` mantêm-se inalterados (Etapa 5.1). A vista **Mês** não foi tocada.

---

## 2. Componentes criados

| Componente | Função |
|------------|--------|
| [`WeekMobileAgenda.tsx`](../../client/src/components/appointments/WeekMobileAgenda.tsx) | 7 secções (seg–dom), cards, empty, criar por dia |
| [`DayMobileAgenda.tsx`](../../client/src/components/appointments/DayMobileAgenda.tsx) | Cards cronológicos + linhas horárias clicáveis |
| [`WeekView.tsx`](../../client/src/components/appointments/WeekView.tsx) | Switch mobile/desktop → agenda ou `WeekCalendar` |
| [`DayView.tsx`](../../client/src/components/appointments/DayView.tsx) | Switch mobile/desktop → agenda ou `DayCalendar` |

Testes: `WeekMobileAgenda.test.tsx`, `DayMobileAgenda.test.tsx`, `WeekView.test.tsx`, `DayView.test.tsx`.

---

## 3. Componentes alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) | `CalendarViewTimeGridConfig`; ramos `WeekView` / `DayView`; `calendar-surface--time-grid` só em desktop/tablet grelha |
| [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | `timeGrid={{ isMobileViewport: isMobileCalendar, canCreate, onCreateForDay: handleCreateForMonthDay }}` |
| [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Estilos `.week-mobile-agenda*`, `.day-mobile-agenda*`, `.day-mobile-hour-slot` |
| [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx) | Secção «CalendarView - mobile week and day» |

**Não alterados:** `MonthCalendar`, `MonthView`, `MonthDayAgendaList`, `WeekCalendar`, `DayCalendar` (internos).

---

## 4. Semana mobile

- `getWeekDayKeys` → **7** secções `.week-mobile-agenda-day`, sempre visíveis (incl. vazias).
- Cabeçalho: `formatWeekdayDate`; modifier `--today` com fundo subtil.
- Agendamentos: `appointmentsForDay` + ordenação por `startAt`; `AppointmentCalendarItem` + `showStatusText`.
- Vazio: `EmptyState`.
- Criar: botão «Agendar neste dia» se `canCreate && dateKey >= todayKey` → `onCreateForDay`.
- Consulta: `onAppointmentClick` (sem popover/âncora).

---

## 5. Dia mobile

- Cabeçalho com data; lista de agendamentos do dia (ou `EmptyState` com referência aos horários).
- Secção **Horários** (se `canCreate && currentDateKey >= todayKey`): horas de `computeDayHourRange(dayAppts, timezone)` — mesmo fallback 8–20 que `DayCalendar` quando sem marcações.
- Slot futuro: botão → `onSlotClick(currentDateKey, hour)`.
- Slot passado: `div` com `aria-disabled="true"` (sem `onSlotClick`).
- Cards: `onAppointmentClick`.

---

## 6. Desktop e tablet (≥768px)

- `WeekView` / `DayView` renderizam `WeekCalendar` / `DayCalendar` com handlers existentes, incl. `onTimeGridAppointmentClick` + âncora para popover.
- Classe `calendar-surface--time-grid` aplicada quando semana/dia **não** mobile.
- Testes directos de `WeekCalendar` / `DayCalendar` em `CalendarView.test.tsx` **mantidos**; regressão grelha Etapa 5.1 coberta.

---

## 7. Vista mensal

Sem alterações de código em componentes mensais. Regressão:

- `MonthView.test.tsx` — OK  
- `MonthCalendar.test.tsx` — OK  

---

## 8. Handlers e helpers reutilizados

| Helper / handler | Uso |
|------------------|-----|
| `getWeekDayKeys`, `appointmentsForDay` | Semana mobile |
| `computeDayHourRange`, `isSlotHourInPast` | Dia mobile — horários |
| `formatWeekdayDate` | Rótulos |
| `handleCreateForMonthDay` / `onCreateForDay` | Criar por dia |
| `handleCalendarSlotClick` → `onSlotClick` | Criar por hora |
| `handleCalendarAppointmentClick` → `onAppointmentClick` | Cards mobile |
| `isMobileCalendar` (`MOBILE_CALENDAR_MEDIA_QUERY`) | Única fonte via página → `timeGrid` + `month` |

---

## 9. Regras de criação preservadas

- Dia passado: sem botão «Agendar neste dia» (`dateKey >= todayKey`).
- Hora passada: `isSlotHourInPast` — sem acção de criação.
- Sem novas validações de negócio; sem alterações API/Redux.

---

## 10. Testes executados

| Comando | Resultado |
|---------|-----------|
| Novos + `CalendarView`, `MonthView`, `MonthCalendar`, `useAppointmentsNavigation` (8 ficheiros) | **75/75** OK |
| `npm test -- --run` (suite completa) | **135** ficheiros, **1457/1457** OK (~504s) |
| Testes ignorados | 0 |

---

## 11. Build

```text
npm run build  (tsc -b && vite build)
→ exit 0 OK (~10s)
```

Aviso Rollup chunk >500 kB — pré-existente.

---

## 12. Riscos e limitações

| Item | Nota |
|------|------|
| Duplicação markup vs `MonthDayAgendaList` | Aceite nesta etapa (auditoria); refactor opcional futuro |
| Validação scroll horizontal real | Testes assertem **ausência** de `.week-calendar-time-grid` / `.day-calendar-time-body`; não `scrollWidth` em jsdom |
| Tablet 768–991px | Mantém grelha + scroll horizontal por desenho (auditoria) |
| `WeekView` exige `todayKey` da página | `AppointmentsPage` já fornece |

---

## 13. Validação manual pendente (utilizador)

### Semana mobile (≤767px)

- [ ] Sete dias visíveis em scroll vertical, sem scroll horizontal
- [ ] Dias vazios com empty state
- [ ] Cards abrem consulta/edição
- [ ] «Agendar neste dia» só em hoje/futuro
- [ ] Toolbar prev/next/hoje

### Dia mobile

- [ ] Cards + secção horários
- [ ] Hora futura abre criação com prefill
- [ ] Hora passada inactiva

### Regressão

- [ ] Semana/dia desktop/tablet — grelha Etapa 5.1
- [ ] Mês mobile/desktop inalterado

**Validação visual no browser:** não executada pelo agente.

---

## 14. Contexto para outra IA

- Entry: `CalendarView` → `timeGrid.isMobileViewport` from `isMobileCalendar`.
- Mobile **não** monta `.week-calendar` / `.day-calendar-time-body`.
- Desktop popover: só via `WeekCalendar`/`DayCalendar` + `onTimeGridAppointmentClick`.
- CSS mobile isolado no final de `appointments-calendar.css`.
- Git/commits: utilizador.

---

**Fim da Etapa 6.2 (implementação técnica).** Aguardar validação manual do utilizador.
