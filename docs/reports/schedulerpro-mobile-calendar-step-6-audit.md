# SchedulerPro — Etapa 6.1: Auditoria calendário mobile responsivo (Semana e Dia)

**Data da auditoria:** 03/11/2026  
**Tipo:** Análise READ-ONLY (sem alterações de código, dependências, Git ou configuração)  
**Branch de referência:** `feature/appointments-week-day-alignment` (estado do código após Etapa 5 / 5.1 — grelha semana/dia desktop validada)

**Objetivo:** Planear a adaptação das vistas **semanal** e **diária** para telemóvel (agenda vertical, sem scroll horizontal), preservando grelhas em desktop/tablet e a vista **mês** intacta.

Legenda: **Confirmado (código)** = dedutível do repositório; **Hipótese** = requer validação visual ou E2E.

---

## 1. Data e âmbito

| Item | Valor |
|------|--------|
| Data | 03/11/2026 |
| Etapa | 6.1 — só auditoria e proposta |
| Implementação | **Não autorizada** nesta etapa |
| Vista mês | Fora de âmbito de alteração; usada como **referência de padrão** |

---

## 2. Estrutura actual dos componentes

### 2.1 Árvore de composição (Agendamentos)

```text
AppointmentsPage
├── AppointmentsViewSwitcher          ← Mês | Semana | Dia | Lista; prev / Hoje / next
├── AppointmentScheduleFilters
└── CalendarView (calendar-surface[+ --time-grid])
    ├── viewType === "month"  → MonthView
    │       ├── MonthCalendar
    │       └── MonthDayAgendaList (só se isMobileViewport)
    ├── viewType === "week"   → WeekCalendar (sempre grelha)
    └── viewType === "day"    → DayCalendar (sempre grelha)
```

| Ficheiro | Papel |
|----------|--------|
| [`client/src/pages/appointments/AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | Orquestra dados, toolbar, `CalendarView`, modais, quick details |
| [`client/src/hooks/useAppointmentsSchedule.ts`](../../client/src/hooks/useAppointmentsSchedule.ts) | Carrega `appointments` conforme `viewType` + `getWeekRange` / `getDayRange` / mês |
| [`client/src/hooks/useAppointmentsNavigation.ts`](../../client/src/hooks/useAppointmentsNavigation.ts) | `viewType`, `currentDateKey`, navegação, handlers de clique, **`isMobileCalendar`** |
| [`client/src/components/appointments/CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) | Switch de vista; `isMobileViewport` **apenas** em `month.*` |
| [`client/src/components/appointments/WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx) | Grelha 7 colunas + eixo horas (Etapa 5.1: CSS Grid partilhado header/corpo) |
| [`client/src/components/appointments/DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx) | Grelha 1 coluna + eixo horas |
| [`client/src/components/appointments/MonthView.tsx`](../../client/src/components/appointments/MonthView.tsx) | Grelha + lista mobile |
| [`client/src/components/appointments/MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx) | Grelha mensal |
| [`client/src/components/appointments/MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx) | Lista vertical de um dia (cards) |
| [`client/src/components/appointments/AppointmentCalendarItem.tsx`](../../client/src/components/appointments/AppointmentCalendarItem.tsx) | Card/botão de agendamento (mês mobile) |
| [`client/src/components/appointments/CalendarTimeGridEvent.tsx`](../../client/src/components/appointments/CalendarTimeGridEvent.tsx) | Blocos posicionados na grelha semana/dia |
| [`client/src/config/appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts) | `getWeekDayKeys`, `appointmentsForDay`, `computeDayHourRange`, `computeDayLayout`, `isSlotHourInPast`, navegação |
| [`client/src/config/calendarTimeGridLayout.ts`](../../client/src/config/calendarTimeGridLayout.ts) | Altura de linha horária (96px &lt;992px, 120px ≥992px) |
| [`client/src/hooks/useMatchMedia.ts`](../../client/src/hooks/useMatchMedia.ts) | `MOBILE_CALENDAR_MEDIA_QUERY` = `(max-width: 767.98px)` |
| [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Estilos mês, semana, dia, media queries |
| [`client/src/index.css`](../../client/src/index.css) | Sem regras específicas do calendário de agendamentos (**Confirmado** grep) |

### 2.2 DOM relevante — semana (estado pós–Etapa 5.1)

```text
.week-calendar
└── .week-calendar-time-scroll
    └── .week-calendar-time-grid
        ├── .week-calendar-day-headers     ← grid: 56px + 7×fr; sticky
        └── .week-calendar-time-body       ← mesma grid-template-columns
            ├── .calendar-time-gutter
            └── ×7 .calendar-week-day-column
                └── .week-slot + eventos absolutos
```

### 2.3 DOM relevante — dia

```text
.day-calendar
├── .calendar-day-header-row
└── .day-calendar-time-body.d-flex.overflow-auto
    ├── .calendar-time-gutter
    └── .calendar-day-column
        └── .day-slot + eventos absolutos
```

### 2.4 Breakpoints em uso

| Media query | Onde | Efeito |
|-------------|------|--------|
| `(max-width: 767.98px)` | `MOBILE_CALENDAR_MEDIA_QUERY` | Mês: compact + `MonthDayAgendaList`; cliques célula → seleção dia (não create directo) |
| `(max-width: 991.98px)` | `appointments-calendar.css` | `.week-calendar`, `.day-calendar`: `overflow-x: auto`; `.week-calendar-time-grid`, corpo dia: **`min-width: 620px`** |
| `(min-width: 992px)` | `TIME_GRID_DESKTOP_MEDIA_QUERY` | Altura hora 120px; `.calendar-surface--time-grid` flex column + min-height viewport |

**Implicação:** telemóvel (≤767px) e tablet (768–991px) **ambos** renderizam hoje a **mesma grelha** semana/dia; tablet ainda pode fazer scroll horizontal por `min-width: 620px`. O requisito de produto distingue **mobile** (agenda vertical) vs **tablet+** (grelha) — recomenda-se alinhar o switch mobile ao **767.98px**, igual ao mês.

---

## 3. Comportamento actual do calendário mobile

| Vista | ≤767.98px (mobile) | 768–991px (tablet) | ≥992px (desktop) |
|-------|-------------------|----------------------|------------------|
| **Mês** | Grelha compacta + dia seleccionado + lista `MonthDayAgendaList` com cards | Grelha default; overflow desktop | Grelha default |
| **Semana** | Grelha time-grid com scroll horizontal (**620px** mín.) + scroll vertical | Idem | Grelha; Etapa 5.1 alinhamento colunas |
| **Dia** | Idem semana | Idem | Grelha |
| **Toolbar** | Igual em todas as larguras | Igual | Igual |

**Confirmado:** `isMobileCalendar` de [`useAppointmentsNavigation`](../../client/src/hooks/useAppointmentsNavigation.ts) é passado só a `CalendarView` → `month.isMobileViewport`. **Semana e dia ignoram** este flag.

**Interacções actuais (todas as larguras, grelha):**

- Slot hora futura → `onSlotClick` → `handleCalendarSlotClick` → `onOpenCreate(dateKey, "HH:00")`.
- Bloco na grelha → `onTimeGridAppointmentClick` → popover `AppointmentQuickDetails` com `anchorRect` (**Confirmado** `AppointmentsPage.tsx`).
- Card na lista mês → `onAppointmentClick` → `handleCalendarAppointmentClick` (edit/details conforme passado).
- Cabeçalho dia na semana → `onDayClick` → create se `dateKey >= todayKey` (excepto mês mobile).

---

## 4. Análise do padrão existente no MonthView

O [`MonthView`](../../client/src/components/appointments/MonthView.tsx) implementa o padrão desejado para mobile:

1. **Detecção:** prop `isMobileViewport` (fonte: `isMobileCalendar` na página).
2. **Grelha reduzida:** `MonthCalendar` com `layoutMode="compact"` e `selectedDateKey` no mobile.
3. **Agenda vertical:** `MonthDayAgendaList` para **um** dia focado (`monthFocusedDateKey`).
4. **Cards:** `AppointmentCalendarItem` com `showStatusText`, hora/cliente/serviço/estado.
5. **Dia vazio:** `EmptyState` + CTA «Agendar neste dia» se `canCreate && dateKey >= todayKey`.
6. **Dados:** `appointmentsForDay(appointments, dateKey, timezone)` — sem Redux extra.
7. **CSS:** `.month-day-agenda-list`, `.month-day-agenda-list-items` em [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) L399–428.

**Reutilização directa para semana mobile:** iterar **7 dias** com a mesma lista por dia (não só um dia focado). **Reutilização para dia mobile:** equivalente a um único `MonthDayAgendaList` + extensão para **criação por hora**.

---

## 5. Análise obrigatória (10 questões)

### 5.1 Como o MonthView se comporta actualmente em mobile?

Ver §3 e §4. Resumo: grelha mensal compacta + painel `#month-day-agenda-panel` abaixo; overflow «+N mais» no mobile chama `onMonthDaySelect` e scroll suave ao painel (`scrollMonthDayPanel`).

### 5.2 Existe componente ou padrão de lista vertical reutilizável?

| Reutilizável | Notas |
|--------------|--------|
| `MonthDayAgendaList` | Modelo completo para **1 dia** |
| `AppointmentCalendarItem` | Cards com cores de serviço |
| `EmptyState` | Dias sem marcações |
| `appointmentsForDay`, `formatWeekdayDate`, `getWeekDayKeys` | Agrupamento e rótulos |
| `isSlotHourInPast` | Bloquear criação no passado |

**Não reutilizar** para mobile semana/dia: `CalendarTimeGridEvent`, `computeDayLayout` (posicionamento absoluto na grelha), `CalendarNowLine` (opcional em lista — **Hipótese** mostrar indicador textual «agora» no card do slot actual).

### 5.3 Quais dados já estão disponíveis para agrupar por dia?

- Array `appointments` já filtrado pelo intervalo da vista (`getWeekRange` / `getDayRange` em `useAppointmentsSchedule`).
- Por dia: `appointmentsForDay(appointments, dateKey, timezone)` — ordenado por `startAt`.
- Semana: `getWeekDayKeys(currentDateKey, timezone)` → 7 ISO date keys (segunda–domingo, Luxon `weekStart`).

### 5.4 Como a semana identifica os sete dias?

[`WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx): `const dayKeys = useMemo(() => getWeekDayKeys(currentDateKey, timezone), ...)`. Mesma função deve alimentar a agenda mobile.

### 5.5 Como o dia representa horários e agendamentos?

[`DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx):

- `dayAppts` = `appointmentsForDay`.
- `hourRange` = `computeDayHourRange(dayAppts, timezone)` (fallback global se vazio).
- `hours`: array de horas inteiras; cada `.day-slot` com `height: hourHeight` (`useTimeGridHourHeightPx`).
- `layout` = `computeDayLayout` → blocos `%` top/height/left/width com `CalendarTimeGridEvent`.
- Slots passados: `isSlotHourInPast` desactiva clique e `role="button"`.

### 5.6 Quais interacções preservar na mudança para mobile?

| Interacção | Handler actual | Mobile recomendado |
|------------|----------------|-------------------|
| Anterior / Próximo / Hoje | `handleToolbarPrev/Next/Today` | **Inalterado** (toolbar) |
| Criar por slot | `handleCalendarSlotClick` | Manter `onSlotClick(dateKey, hour)` |
| Criar por dia | `onDayClick` / `onCreateForDay` | Botão por secção de dia (semana) ou equivalente |
| Ver/editar agendamento | Grelha: quick details + anchor; lista mês: `onAppointmentClick` | Cards → **`onAppointmentClick`** (alinhar ao mês; modal mobile já suportado via `isMobilePanel` no quick details) |
| Cabeçalho dia semana (desktop) | `onDayClick` → create | Opcional: mesmo botão «Agendar neste dia» na secção mobile |
| Passado | `isSlotHourInPast`, `dateKey >= todayKey` | Reutilizar helpers — **não duplicar** |

### 5.7 Adaptar apresentação sem duplicar regras de negócio?

**Sim.** Toda a filtragem, semana ISO, slots passados e intervalos API permanecem em [`appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts) e hooks existentes. Novos componentes são **só UI** + composição.

### 5.8 Componentes a alterar vs reutilizar (implementação futura)

| Alterar / criar | Reutilizar intacto |
|-----------------|-------------------|
| `CalendarView` — prop mobile global ou `timeGrid.isMobileViewport` | `WeekCalendar`, `DayCalendar` quando **!mobile** |
| `WeekView` / `WeekMobileAgenda` (novo, espelho `MonthView`) | `MonthCalendar`, `MonthView` |
| `DayView` / `DayMobileAgenda` (novo) | `appointmentCalendar.ts` |
| `AppointmentsPage` — passar `isMobileCalendar` a week/day | `AppointmentsViewSwitcher`, filtros |
| CSS: classes `.week-mobile-agenda`, `.day-mobile-agenda` (ou generalizar `.day-agenda-list`) | Regras `.month-calendar__*`, grelha Etapa 5.1 |
| Opcional: extrair `DayAgendaList` de `MonthDayAgendaList` | `AppointmentCalendarItem`, `EmptyState` |

### 5.9 Regras CSS que podem conflitar

| Regra | Risco |
|-------|--------|
| `@media (max-width: 991.98px)` `min-width: 620px` em `.week-calendar-time-grid`, `.day-calendar-time-body` | Mobile agenda **não deve** montar estes elementos |
| `overflow-x: auto` em `.week-calendar`, `.day-calendar` | Desaparece se grelha não renderizada |
| `.calendar-surface--time-grid` @992 flex/min-height | Aplicar só quando grelha visível; lista mobile pode usar superfície simples |
| Estilos `.month-day-agenda-list` scoped ao mês | Renomear/generalizar se partilhar — evitar afectar mês |
| Zebra `.week-calendar .border-bottom:nth-child(even)` | Irrelevante fora da grelha |

### 5.10 Testes actuais a actualizar ou complementar

| Ficheiro | Cobertura actual | Lacuna |
|----------|------------------|--------|
| [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx) | Mês, semana/dia **grelha**, `mockViewportMobile` usado sobretudo no mês | Sem asserts week/day mobile |
| [`MonthView.test.tsx`](../../client/src/components/appointments/MonthView.test.tsx) | Lista mobile, seleção | — |
| [`MonthCalendar.test.tsx`](../../client/src/components/appointments/MonthCalendar.test.tsx) | Grelha mês | Regressão mês |
| [`CalendarTimeGridEvent.test.tsx`](../../client/src/components/appointments/CalendarTimeGridEvent.test.tsx) | Blocos grelha | Desktop |
| [`calendarTimeGridLayout.test.ts`](../../client/src/config/calendarTimeGridLayout.test.ts) | Altura hora | Desktop/tablet grelha |
| [`useAppointmentsNavigation.test.ts`](../../client/src/hooks/useAppointmentsNavigation.test.ts) | Navegação, mês mobile cliques | Pode estender smoke week/day |
| [`AppointmentsPage.test.tsx`](../../client/src/pages/appointments/AppointmentsPage.test.tsx) | Integração página | Mobile panel quick details |

**Nota jsdom:** «ausência de scroll horizontal» é melhor assertir **não presença** de `.week-calendar-time-grid` / `min-width: 620px` no contentor mobile do que `overflow-x` computado.

---

## 6. Problemas identificados

1. **Paridade mobile:** mês oferece agenda vertical; semana/dia forçam grelha larga → UX inconsistente e scroll horizontal em telemóvel (**Confirmado** CSS L647–661).
2. **`isMobileCalendar` não wired** a week/day (**Confirmado** `CalendarView.tsx`).
3. **Dois breakpoints** (767 vs 991) sem documentação para o utilizador: tablet mantém scroll horizontal até implementação — alinhado ao requisito «tablet = grelha».
4. **Quick details com âncora** na grelha; mobile deve usar fluxo sem `getBoundingClientRect` obrigatório (cards → `onAppointmentClick`).
5. **Sem testes** week/day mobile — risco de regressão na Etapa 6.
6. **Semana mobile desejada = 7 dias visíveis** vs mês mobile = 1 dia focado + grelha — produto diferente; implementação não pode copiar `MonthView` literalmente, só **componentes** de lista.

---

## 7. Proposta técnica — semana mobile (A)

### Comportamento

- Agenda **vertical contínua**: 7 secções (seg–dom), **incluindo dias sem agendamentos**.
- Cada secção: título (`formatWeekdayDate` ou weekday + data), destaque visual se `dateKey === todayKey`, lista de `AppointmentCalendarItem`, `EmptyState` se vazio, botão «Agendar neste dia» (`canCreate`, `dateKey >= todayKey`).
- **Navegação semanal:** inalterada na toolbar (`navigateWeek`, `currentDateKey`).
- **Sem scroll horizontal:** render condicional — **não** montar `.week-calendar` abaixo de 768px.

### Arquitectura recomendada

```text
CalendarView (week)
└── WeekView (novo)                    ← espelha MonthView
    ├── isMobileViewport === false → WeekCalendar
    └── isMobileViewport === true  → WeekMobileAgenda
            └── ×7 DayAgendaSection   ← reutiliza DayAgendaList generalizado
```

**Justificação:** manter `WeekCalendar.tsx` focado na grelha (Etapa 5.1); testes desktop isolados; evita `if (mobile)` massivo dentro do time-grid.

### Generalização opcional (recomendada)

Extrair **`DayAgendaList`** de [`MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx):

- Props: `dateKey`, `appointments`, maps, `todayKey`, `canCreate`, `onAppointmentClick`, `onCreateForDay`, `headingLevel`, classes CSS partilhadas (`.day-agenda-list` + modifier `.day-agenda-list--month`).
- `MonthDayAgendaList` passa a wrapper fino com `id="month-day-agenda-panel"`.
- `WeekMobileAgenda` mapeia `getWeekDayKeys` → 7× `DayAgendaList`.

---

## 8. Proposta técnica — dia mobile (B)

### Comportamento

- **Uma coluna vertical** para `currentDateKey`.
- **Agendamentos:** lista cronológica via `appointmentsForDay` + `AppointmentCalendarItem` (mesmo padrão mês).
- **Criação por hora:** secção adicional «Horários» ou lista de linhas horárias clicáveis:
  - Gerar `hours` com `computeDayHourRange` (usar appointments do dia ou fallback global — **mesma lógica** que `DayCalendar`).
  - Por hora: rótulo `HH:00`; se `!isSlotHourInPast` → `onClick` → `onSlotClick(currentDateKey, hour)`; se passado → disabled (sem `role="button"`).
- **Alternativa mais rica (maior esforço):** timeline com cards posicionados por duração — **não recomendado** na primeira entrega (duplica `computeDayLayout` visualmente).

### Arquitectura

```text
CalendarView (day)
└── DayView (novo)
    ├── !mobile → DayCalendar
    └── mobile  → DayMobileAgenda
            ├── DayAgendaList (marcações)
            └── DayMobileHourSlots (opcional componente pequeno)
```

**Consulta:** `onAppointmentClick(appointment)` nos cards; evitar depender de popover ancorado.

---

## 9. Proposta técnica — desktop e tablet (C)

| Viewport | Semana | Dia |
|----------|--------|-----|
| **≥768px** | `WeekCalendar` (grelha Etapa 5.1) | `DayCalendar` |
| **≤767.98px** | `WeekMobileAgenda` | `DayMobileAgenda` |

- **Não alterar** `MonthCalendar`, `MonthView`, destaque circular «hoje», seleção mobile do mês.
- **Não alterar** toolbar/filtros (Etapa 3).
- Flag: reutilizar **`MOBILE_CALENDAR_MEDIA_QUERY`** e o mesmo `isMobileCalendar` da página (single source of truth).

---

## 10. Ficheiros que provavelmente precisarão de alteração (Etapa 6 implementação)

| Ficheiro | Tipo de mudança |
|----------|-----------------|
| [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) | Props mobile; delegar a `WeekView` / `DayView` |
| [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | Passar `isMobileCalendar` + `canCreate` handlers |
| **Novos:** `WeekView.tsx`, `WeekMobileAgenda.tsx`, `DayView.tsx`, `DayMobileAgenda.tsx` | Composição |
| **Opcional:** `DayAgendaList.tsx` | Refactor de `MonthDayAgendaList` |
| [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Estilos agenda mobile; **não** alterar `.week-calendar` grid existente excepto se wrapper condicional |
| [`MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx) | Refactor para `DayAgendaList` (opcional) |
| **Testes:** `CalendarView.test.tsx`, novos `WeekMobileAgenda.test.tsx`, `DayMobileAgenda.test.tsx`, possivelmente `MonthView.test.tsx` se refactor |

**Sem alteração esperada:** `appointmentCalendar.ts` (negócio), APIs, Redux, `WeekCalendar.tsx` / `DayCalendar.tsx` **internos** (apenas chamados condicionalmente).

---

## 11. Plano de testes (validação Etapa 6)

| Cenário | Assert principal |
|---------|------------------|
| Semana mobile — 7 dias com mix vazio/preenchido | 7 cabeçalhos de dia; `EmptyState` onde aplicável; cards com hora |
| Semana mobile — navegação | `navigateWeek` + re-render com novos `dayKeys` (`useAppointmentsNavigation.test.ts`) |
| Dia mobile — sem agendamentos | `EmptyState` + slots/CTA create |
| Dia mobile — com agendamentos | Ordem cronológica; click → `onAppointmentClick` |
| Criação slot | Click hora futura → `onSlotClick(date, hour)`; passado não chama |
| Horários nos cards | Texto de `formatAppointmentTime` visível |
| Sem scroll horizontal mobile | DOM sem `.week-calendar-time-grid` / `.day-calendar-time-body` com grelha; wrapper `width: 100%` |
| Desktop preservado | `matchMedia` false → `.week-calendar` e `.day-calendar` presentes; testes Etapa 5 existentes verdes |
| Mês preservado | `MonthView.test.tsx`, `MonthCalendar.test.tsx` sem regressão |
| Quick details | Mobile: abrir modal/painel sem anchor (**Hipótese** teste em `AppointmentQuickDetails.test.tsx` já cobre layout mobile) |

Ferramentas: Vitest + RTL; reutilizar `mockViewportMobile` de [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx) L57+.

---

## 12. Riscos e cuidados (desktop / tablet / mês)

| Risco | Mitigação |
|-------|-----------|
| Regressão Etapa 5.1 na grelha | Render condicional; não editar grid CSS global |
| Duplicar regras passado/futuro | Sempre `isSlotHourInPast`, `dateKey >= todayKey` |
| CSS partilhado mês/lista | Namespaces BEM; testes mês após refactor `DayAgendaList` |
| Intervalo API semana | Já `getWeekRange` — 7 dias mobile usam mesmos `appointments` |
| Popover vs modal | Unificar caminho mobile em `onAppointmentClick` ou branch `isMobilePanel` em quick details |
| Tablet 768–991 | Mantém grelha + scroll horizontal **por desenho** até product pedir agenda também em tablet |

---

## 13. Critérios objectivos de aceitação (Etapa 6)

1. Em viewport **≤767.98px**, vistas semana e dia **sem** necessidade de scroll horizontal no painel do calendário.
2. Semana mobile: **7 secções** de dia visíveis em sequência vertical, dias vazios incluídos.
3. Dia mobile: marcações em **cards** com hora; criação por slot em hora **futura** equivalente à grelha actual.
4. Toolbar: navegação semana/dia/mês **funcional**; rótulo de período correcto.
5. Viewport **≥768px**: DOM e comportamento da grelha semana/dia **equivalentes** ao pós–Etapa 5.1 (testes automatizados existentes passam).
6. Vista mês: **zero** regressão visual/funcional documentada nos testes `Month*`.
7. Nenhuma alteração a contratos API, Redux ou regras de agendamento no servidor.

---

## 14. Contexto para outra IA (implementação Etapa 6)

1. **Copiar o padrão MonthView**, não o layout exacto: semana mobile = **7×** lista tipo `MonthDayAgendaList`, não grelha + um painel.
2. **Breakpoint:** `(max-width: 767.98px)` via `isMobileCalendar` já existente em [`useAppointmentsNavigation.ts`](../../client/src/hooks/useAppointmentsNavigation.ts).
3. **Não montar** `WeekCalendar` / `DayCalendar` no mobile — evita `min-width: 620px` ([`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) L647–661).
4. **Handlers prontos** em `CalendarView`: `onDayClick`, `onSlotClick`, `onAppointmentClick`, `onTimeGridAppointmentClick` — mobile cards devem preferir `onAppointmentClick` como o mês.
5. **`canCreate`:** hoje só passa explicitamente ao mês via `month.canCreate`; week/day mobile precisarão do mesmo na composição.
6. **Ordem de trabalho sugerida:** (1) `DayAgendaList` refactor opcional, (2) `DayView` + `DayMobileAgenda`, (3) `WeekView` + `WeekMobileAgenda`, (4) wire `CalendarView` + page, (5) CSS, (6) testes, (7) validação manual.
7. **Não implementar** na Etapa 6.1 — esta auditoria é READ-ONLY.

---

## 15. Ficheiros analisados (checklist)

- [`WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx)
- [`DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx)
- [`MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx)
- [`MonthView.tsx`](../../client/src/components/appointments/MonthView.tsx)
- [`MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx)
- [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx)
- [`AppointmentCalendarItem.tsx`](../../client/src/components/appointments/AppointmentCalendarItem.tsx)
- [`CalendarTimeGridEvent.tsx`](../../client/src/components/appointments/CalendarTimeGridEvent.tsx)
- [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx)
- [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx)
- [`appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts)
- [`calendarTimeGridLayout.ts`](../../client/src/config/calendarTimeGridLayout.ts)
- [`useAppointmentsNavigation.ts`](../../client/src/hooks/useAppointmentsNavigation.ts)
- [`useAppointmentsSchedule.ts`](../../client/src/hooks/useAppointmentsSchedule.ts)
- [`useMatchMedia.ts`](../../client/src/hooks/useMatchMedia.ts)
- [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css)
- [`index.css`](../../client/src/index.css)
- Testes: `CalendarView.test.tsx`, `MonthView.test.tsx`, `MonthCalendar.test.tsx`, `CalendarTimeGridEvent.test.tsx`, `calendarTimeGridLayout.test.ts`, `useAppointmentsNavigation.test.ts`, `AppointmentsPage.test.tsx`

---

**Fim da auditoria Etapa 6.1.** Aguardar avaliação e autorização antes de implementação.
