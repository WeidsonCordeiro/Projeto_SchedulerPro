# FE-016 — Testes das subvistas do calendário

**Branch:** `feat/fe-stage37-calendar-tests`

## Entrega

- `data-testid` estável: `calendar-view-month` | `week` | `day`
- `CalendarView.fe016-subviews.test.tsx`: routing mês/semana/dia, lista, erro+retry, slot no dia, mobile week/day
- Reutiliza cobertura existente em `MonthView`, `WeekView`, `DayView`, `AppointmentsViewSwitcher`

## Validação

```bash
cd client && npx vitest run src/components/appointments/CalendarView.fe016-subviews.test.tsx
```