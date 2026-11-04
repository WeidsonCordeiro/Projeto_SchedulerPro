# SchedulerPro — Etapa 6.4a: Unificação do modal de agendamento (implementação)

**Data:** 2026-11-04  
**Branch:** `feature/appointments-unified-modal-step-6-4a`  
**Base:** `a15ece68ee5c9e1da58b2a78ebdf9cfc953ea40d` (merge PR #124 — Etapa 6.2)  
**Auditoria:** [`schedulerpro-mobile-ux-step-6-4-audit.md`](./schedulerpro-mobile-ux-step-6-4-audit.md)  
**Branch doc:** [`schedulerpro-unified-appointment-modal-branch.md`](./schedulerpro-unified-appointment-modal-branch.md)

---

## 1. Objetivo

Unificar o fluxo de consulta/edição de agendamentos nas vistas **Mês, Semana e Dia**: qualquer clique num evento do calendário abre o mesmo **`AppointmentForm`** já usado na vista Mês, via `handleCalendarAppointmentClick` (`isInstantInPast` → só leitura ou edição).

**Fora de âmbito:** timezone picker, sidebar, listagens em cards (6.4b–e).

---

## 2. Estado inicial (inspeção)

| Item | Valor |
|------|--------|
| Branch | `feature/appointments-unified-modal-step-6-4a` |
| HEAD | `a15ece68…` |
| Working Tree (pré-implementação) | Sem alterações rastreadas; relatórios 6.4 untracked |

---

## 3. Diagnóstico do fluxo anterior

| Vista | Viewport | Comportamento **antes** |
|-------|----------|-------------------------|
| Mês | todas | `onAppointmentClick` → `handleCalendarAppointmentClick` → `AppointmentForm` |
| Semana / Dia | mobile (≤767.98px) | Idem (Etapa 6.2) |
| Semana / Dia | grelha (≥768px) | `onTimeGridAppointmentClick` → `openQuickDetails` → **`AppointmentQuickDetails`** (só leitura, sem acções de gestão) |

A bifurcação vivia em [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) (prop `onTimeGridAppointmentClick`) e em [`WeekView.tsx`](../../client/src/components/appointments/WeekView.tsx) / [`DayView.tsx`](../../client/src/components/appointments/DayView.tsx) (prioridade ao handler com âncora).

---

## 4. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | Removidos `quickDetails`, `openQuickDetails`, `closeQuickDetails`, `useEffect` de fecho por filtro, render `AppointmentQuickDetails`, prop `onTimeGridAppointmentClick`. Mantidos `handleCalendarAppointmentClick`, `AppointmentForm`, permissões. |
| [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) | Removida prop `onTimeGridAppointmentClick` e repasse a Week/Day. |
| [`WeekView.tsx`](../../client/src/components/appointments/WeekView.tsx) | Grelha: sempre `onAppointmentClick(appointment)` (ignora âncora interna). |
| [`DayView.tsx`](../../client/src/components/appointments/DayView.tsx) | Idem. |
| [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Removidos estilos `.appointment-quick-details-*`. |

### Ficheiros removidos (sem outros consumidores em runtime)

| Ficheiro |
|----------|
| [`AppointmentQuickDetails.tsx`](../../client/src/components/appointments/AppointmentQuickDetails.tsx) |
| [`AppointmentQuickDetails.test.tsx`](../../client/src/components/appointments/AppointmentQuickDetails.test.tsx) |
| [`computePopoverPosition.ts`](../../client/src/components/appointments/computePopoverPosition.ts) |
| [`computePopoverPosition.test.ts`](../../client/src/components/appointments/computePopoverPosition.test.ts) |

**Não alterados:** `WeekCalendar.tsx`, `DayCalendar.tsx` (continuam a passar `(appointment, anchor)`; o view wrapper descarta a âncora).

---

## 5. Fluxo unificado (depois)

```text
MonthCalendar / MonthDayAgendaList / WeekMobileAgenda / DayMobileAgenda
  → onAppointmentClick
WeekCalendar / DayCalendar (via WeekView / DayView desktop)
  → onAppointmentClick(appointment)   // mesma prop
AppointmentsPage.handleCalendarAppointmentClick
  → isInstantInPast ? openDetails (readOnly) : openEdit
AppointmentForm (modal-lg)
```

Todas as vistas partilham **um** componente e as **mesmas** regras de negócio da página; API, Redux e `getAppointmentAbilities` inalterados.

---

## 6. Destino de `AppointmentQuickDetails`

- **Runtime:** removido; único consumidor era `AppointmentsPage`.
- **CSS:** removido de `appointments-calendar.css`.
- **Documentação histórica** (stage-51-2, auditorias): mantida; descreve o comportamento anterior.
- **Popover Stage 51.2:** substituído pelo modal de formulário em desktop/tablet Semana/Dia (trade-off de produto documentado na auditoria 6.4).

---

## 7. Testes

### Actualizados / novos

| Ficheiro | Cobertura |
|----------|-----------|
| [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx) | Semana desktop → `onAppointmentClick` (não time-grid handler separado) |
| [`WeekView.test.tsx`](../../client/src/components/appointments/WeekView.test.tsx) | Clique na grelha → `onAppointmentClick` |
| [`DayView.test.tsx`](../../client/src/components/appointments/DayView.test.tsx) | Idem |
| [`AppointmentsPage.test.tsx`](../../client/src/pages/appointments/AppointmentsPage.test.tsx) | Form em mês, semana/dia desktop, mobile semana/dia, passado (`Detalhes`), fecho modal, filtro + semana |

**Nota:** testes de edição usam `startAt: 2026-09-10T14:00:00Z` porque o relógio fixo é `2026-09-10T12:00:00Z` e `isInstantInPast` usa timezone da empresa (`Europe/Lisbon`).

### Resultados

| Comando | Resultado |
|---------|-----------|
| `npm test -- --run AppointmentsPage CalendarView WeekView DayView` | **89/89** pass |
| `npm test -- --run` (suite completa) | **133** ficheiros, **1459/1459** pass (~521s) |

---

## 8. Build

```text
npm run build  →  tsc -b && vite build  →  OK (2026-11-04)
```

---

## 9. Limitações / observações

- Desktop Semana/Dia deixa de ter popover leve; abre modal completo (alinhado ao Mês).
- Título «Detalhes do agendamento» no **form** read-only (passado) mantém-se; deixou de existir painel quick details separado.
- Relatórios em `docs/reports/` da auditoria/branch continuam **untracked** até commit manual do utilizador.

---

## 10. Git (pós-implementação)

| Item | Valor |
|------|--------|
| Branch | `feature/appointments-unified-modal-step-6-4a` |
| Commit / push | **Não executados** (gestão manual) |
| Alterações rastreadas | 10 ficheiros M/D em `client/` |
| Untracked | `schedulerpro-mobile-ux-step-6-4-audit.md`, `schedulerpro-unified-appointment-modal-branch.md`, **este relatório** |

---

## 11. Contexto para continuidade (IA / developer)

1. Próximas etapas UX mobile: **6.4b** timezone, **6.4c** sidebar, **6.4d–e** listagens — ver auditoria 6.4 §8.
2. Se regressão visual Semana/Dia desktop: validar manualmente clique → `AppointmentForm` e fecho; testes de integração em `AppointmentsPage.test.tsx`.
3. Não reintroduzir `onTimeGridAppointmentClick` sem decisão de produto explícita.

---

*Fim do relatório — Etapa 6.4a implementação.*
