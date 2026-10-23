# Stage 51.6 — Polimento visual Mês, Semana e Dia

Data: 23/10/2026  
Âmbito: três ajustes visuais (mês alinhado à semana, mobile compact sem «+N mais», grelha horária desktop mais alta) — sem backend, sem alterar paleta 51.4 nem grid 7×6 da 51.5.

## 1. Objetivo e âmbito

1. Uniformizar pills da vista **Mês** com o modelo **Semana** (fundo serviço + faixa estado).
2. Remover «+N mais» apenas na grelha **compact** mobile; painel diário mantém lista completa.
3. Aumentar aproveitamento vertical das grelhas **Semana** e **Dia** em desktop (≥992px).

## 2. Branch de origem e commit de referência

| Item | Valor |
|------|--------|
| Origem | `develop` (51.5 mergeada) |
| Commit base | `c899470` — Merge PR #106 Stage 51.5 |
| Branch de trabalho | `Stage-51.6-Polimento-mes-semana-dia` |

## 3. Estado Git

**Inicial:** `develop` limpa, `c899470`.

**Final (pendente commit manual):**

```
## Stage-51.6-Polimento-mes-semana-dia
 M client/src/components/appointments/AppointmentCalendarItem.tsx
 M client/src/components/appointments/CalendarView.tsx
 M client/src/components/appointments/DayCalendar.tsx
 M client/src/components/appointments/MonthCalendar.tsx
 M client/src/components/appointments/MonthCalendar.test.tsx
 M client/src/components/appointments/MonthDayAgendaList.tsx
 M client/src/components/appointments/MonthView.test.tsx
 M client/src/components/appointments/WeekCalendar.tsx
 M client/src/styles/appointments-calendar.css
?? client/src/config/calendarTimeGridLayout.ts
?? client/src/config/calendarTimeGridLayout.test.ts
?? docs/reports/stage-51-6-calendar-visual-polish.md
```

Sem commit, merge, push ou rebase pelo agente.

## 4. Causas identificadas

| Problema | Causa |
|----------|--------|
| Mês “tudo azul” / baixo contraste | `.calendar-item { color: #fff !important }` (legado pré-51.4) anulava `getServiceCalendarStyle().color`; markup `calendar-item-*` diferente da semana |
| «+N mais» no mobile compact | `MonthCalendar` mostrava overflow mesmo com `layoutMode === "compact"` e contagem no dia |
| Semana/Dia baixas no desktop | `HOUR_HEIGHT = 48` fixo; `calendar-surface` sem flex para preencher altura útil |

## 5. Ficheiros alterados e justificação

| Ficheiro | Alteração |
|----------|-----------|
| `AppointmentCalendarItem.tsx` | Tier `calendar-week-event--comfortable`, spans `calendar-event-*`, estado em `visually-hidden` na grelha; `showStatusText` no painel diário |
| `appointments-calendar.css` | Remover `color: #fff` em pills com faixa; CSS mês alinhado ao tier comfortable; `calendar-surface--time-grid` desktop; lista diária com `calendar-event-status` |
| `MonthCalendar.tsx` | `overflow > 0 && !isCompact` |
| `MonthDayAgendaList.tsx` | `showStatusText` nos itens |
| `calendarTimeGridLayout.ts` | Constantes 48/60px + hook `useTimeGridHourHeightPx` |
| `WeekCalendar.tsx` / `DayCalendar.tsx` | Hook no lugar de constante; Dia com `flex-column` + corpo `flex-grow-1` |
| `CalendarView.tsx` | Classe `calendar-surface--time-grid` em semana/dia |
| Testes | `MonthCalendar`, `MonthView`, `calendarTimeGridLayout` |

## 6. Alterações por vista

### Mês (desktop)

- Pills partilham classes/tipografia da semana (comfortable); texto escuro sobre fundo de serviço (ex. `rgb(30, 41, 59)` sobre `rgb(226, 232, 240)`).
- Faixa `calendar-status-stripe--*` e `calendar-event--muted` preservados.
- «+N mais» mantido quando `layoutMode === "default"`.

### Mês (mobile compact)

- Contagem no dia (ex. «19 3»); **sem** botão «+N mais».
- Seleção de dia → `MonthDayAgendaList` com todas as marcações e rótulo de estado visível.

### Semana / Dia (desktop)

- Altura por hora: **60px** (`TIME_GRID_HOUR_HEIGHT_DESKTOP_PX`); mobile permanece **48px**.
- Superfície: `min-height: calc(100vh - 15rem)` + filhos flex para área de scroll interna.
- CDP: `.week-slot` height **60**; `.calendar-surface--time-grid` presente.

### Semana / Dia (mobile)

- Hook devolve 48px; regras `max-width: 991.98px` inalteradas.

## 7. Testes executados

| Suite | Resultado |
|-------|-----------|
| `npm run test` | **1375–1376** testes, **127** ficheiros — 1 falha intermitente em `AvailabilityPage.test.tsx` («loads and renders the exceptions…»), **pré-existente** (reexecução isolada passa); **não** causada por 51.6 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

**Novos/atualizados:** `calendarTimeGridLayout.test.ts`; `MonthCalendar` compact overflow; `MonthView` mobile seleção por célula.

Baseline pós-51.5: 1373 / 126. **Delta:** +3 testes, +1 ficheiro de teste.

## 8. Validação visual

| Cenário | Viewport | Resultado |
|---------|----------|-----------|
| Mês — contraste serviço + comfortable tier | Desktop | **Aprovado** — CDP `itemColor` escuro, `calendar-week-event--comfortable` |
| Mês — «+N mais» desktop | Desktop | **Aprovado** (comportamento existente) |
| Mês compact — sem «+N mais», contagem | 390×844 | **Aprovado** — snapshot «19 3», sem botão «mais» |
| Semana — hora 60px, surface time-grid | Desktop ~1130px | **Aprovado** — CDP `slotH: 60` |
| Overflow página | Desktop/mobile | **Aprovado** — `scrollWidth === clientWidth` |
| 1024×768 / 360px | — | **Não executado** (desktop/mobile principais cobertos) |

Screenshots: `%TEMP%\cursor\screenshots\stage-51-6-desktop-week.png`.

## 9. Problemas conhecidos e limitações

- Grelha semanal desktop: área útil depende de `calc(100vh - 15rem)` — pode variar com altura do toolbar/filtros; scroll interno mantido.
- Dias muito cheios no mês desktop: limite de 4 pills + overflow inalterado.
- Teste flaky `AvailabilityPage` fora do âmbito 51.6.

## 10. Recomendação

**Aceitar a Stage 51.6 para revisão:** objetivos 3.1–3.4 cumpridos com diff localizado; 51.4/51.5 preservados; build OK; validação browser coerente.

---

## CONTEXTO PARA A PRÓXIMA IA

- Branch **`Stage-51.6-Polimento-mes-semana-dia`** a partir de `develop` @ `c899470`.
- **Mês:** `AppointmentCalendarItem` usa markup da semana; não reintroduzir `color: #fff !important` em `.calendar-item.calendar-status-stripe`.
- **Mobile mês:** overflow UI só quando `!isCompact` em `MonthCalendar`.
- **Semana/Dia:** `useTimeGridHourHeightPx()` em [`calendarTimeGridLayout.ts`](../client/src/config/calendarTimeGridLayout.ts) — 48 mobile / 60 desktop; jsdom sem `matchMedia` → 48.
- **Não** iniciar etapas posteriores automaticamente.
- Relatório 51.5 grid: [`stage-51-5-month-view-fix.md`](./stage-51-5-month-view-fix.md).
