# Stage 51.7 — Padronização visual dos agendamentos (Mês, Semana, Dia)

Data: 23/10/2026  
Âmbito: identidade visual coerente nas três vistas do calendário — fundo por serviço, sem faixa lateral de estado; preservar posicionamento temporal e interações.

> **Nota:** Unificação completa (corpo de cartão partilhado, tokens, inset/grelha) — ver [stage-51-8-calendar-visual-unification.md](./stage-51-8-calendar-visual-unification.md).

## 1. Objetivo e âmbito

- Utilizar a vista **Mês** como referência: pills com `getServiceCalendarStyle`, tier `calendar-week-event--comfortable`, tipografia `calendar-event-*`.
- **Remover** a faixa esquerda de estado (`calendar-status-stripe`) em **Mês, Semana e Dia**.
- Manter estado em filtros, `aria-label`, texto oculto/visível, quick details e `calendar-event--muted` para terminais.
- Sem alterações de API, filtros, paleta 51.4, grid mês 51.5 ou alturas 51.6 (48/60 px).

## 2. Estado inicial do Git e branch de base

| Item | Valor |
|------|--------|
| Diretório | `Projeto_SchedulerPro` |
| Branch inicial | `develop` (limpa, `origin/develop`) |
| Commit base | `bf676a4` — merge PR #107 (Stage 51.6) |

## 3. Branch de trabalho

`Stage-51.7-Padrao-visual-agendamentos` (criada a partir de `develop`).

## 4. Problemas visuais encontrados

| Problema | Causa |
|----------|--------|
| Semana/Dia com faixa de estado; Mês também com faixa após 51.6 | Classes `calendar-status-stripe` + `APPOINTMENT_STATUS_STRIPE_CLASS` em `AppointmentCalendarItem` e `CalendarTimeGridEvent` (herança 51.4) |
| Wrapper Semana/Dia com `border` Bootstrap genérico | Diferente das pills do mês (`border-0` + fundo serviço) |
| Risco de blocos consecutivos “fundidos” sem faixa de 4px | Separação dependia parcialmente da borda lateral de estado |
| Cartões consecutivos na Semana/Dia encostados vs Mês | Grelha absoluta sem gap equivalente ao `margin-bottom` das pills do mês |

## 5. Decisões de implementação

1. **Serviço = fundo inline; estado ≠ cor lateral** — alinhado à decisão de design da Stage 51.7.
2. **Remover** `APPOINTMENT_STATUS_STRIPE_CLASS` e regras CSS `.calendar-status-stripe--*` (export e CSS morto).
3. **`.calendar-week-event`**: `border-radius: 0.35rem` + `box-shadow: inset 0 0 0 1px rgba(15,23,42,0.1)` para contorno suave igual em todas as vistas.
4. **Grelha horária — gap entre cartões (follow-up visual):** variável `--calendar-event-stack-gap` em `.week-calendar` / `.day-calendar`: **0.15rem** (base) e **0.22rem** em `@media (min-width: 768px)` — mesmos valores que `.month-calendar .calendar-item.calendar-week-event` (`margin-bottom`). O anchor `.calendar-time-grid-event-anchor` usa `padding-bottom: var(--calendar-event-stack-gap)` com `box-sizing: border-box`; o filho `.calendar-week-event` mantém `height: 100%` na área de conteúdo. **Mês intocado** (sem alterações em `.month-calendar` nem componentes do mês).
5. **Não** alterar `topPx` / `heightPercent` / `computeDayLayout` — o gap é só visual dentro do retângulo temporal.
6. **Hover** na grelha: `.calendar-time-grid-event-anchor:hover > .calendar-week-event`.
7. **Alturas 51.6** mantidas sem alteração.

## 6. Ficheiros criados e alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/appointments/AppointmentCalendarItem.tsx` | Remoção de stripe; comentário `showStatusText` |
| `client/src/components/appointments/CalendarTimeGridEvent.tsx` | Remoção de stripe; `border-0` no bloco colorido |
| `client/src/components/appointments/WeekCalendar.tsx` | Wrapper `calendar-time-grid-event-anchor` |
| `client/src/components/appointments/DayCalendar.tsx` | Idem |
| `client/src/styles/appointments-calendar.css` | Remoção stripe; regras partilhadas `.calendar-week-event`; anchor time-grid |
| `client/src/config/appointmentServiceColor.ts` | Remoção `APPOINTMENT_STATUS_STRIPE_CLASS`; comentário atualizado |
| `client/src/components/appointments/CalendarTimeGridEvent.test.tsx` | Asserts sem stripe + muted terminal |
| `client/src/components/appointments/CalendarView.test.tsx` | Dia: fundo serviço, sem stripe |
| `client/src/components/appointments/AppointmentCalendarItem.test.tsx` | **Novo** — serviço inline, status oculto/visível |
| `docs/reports/stage-51-7-calendar-visual-standardization.md` | Este relatório |

## 7. Alterações de estilos e componentes (resumo)

- **Mês**: pills sem `border-left` de estado; mantêm `mb-1`, padding comfortable, cores de serviço.
- **Semana/Dia**: blocos internos idênticos ao modelo de tipografia/tiers; contorno inset; terminais com opacidade reduzida.
- **Lista / quick details / filtros**: inalterados (badges e swatches preservados).

## 8. Testes executados e resultados

| Comando | Resultado |
|---------|-----------|
| `vitest run` (foco: `CalendarTimeGridEvent`, `AppointmentCalendarItem`, `CalendarView`) | 41 testes — **OK** |
| `vitest run` (suite completa) | **128** ficheiros, **1379** testes — **OK** (incl. após gap stack) |
| Falhas preexistentes | Nenhuma nesta execução |

## 9. Typecheck e build

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | **OK** |
| `npm run build` | **OK** (vite 7.3.6) |

## 10. Validação visual (browser)

Ambiente: `http://localhost:5173/appointments`, conta OWNER autenticada, workspace «barbearia teste», MCP browser + CDP `Emulation.setDeviceMetricsOverride`.

| Dimensão | Vista | Verificado |
|----------|-------|------------|
| 1440×900 (desktop) | Mês | 0 elementos `calendar-status-stripe`; fundos serviço; `borderLeft` 0px em pills |
| 1440×900 | Semana | 6 blocos; fundos `rgb(219,234,254)` / variantes; inset shadow; muted em cancelados |
| 1024×768 | Dia | Sem stripe; `scrollWidth === clientWidth` (sem overflow horizontal) |
| 1024×768 | Semana | Quick details abre ao clicar bloco («Detalhes do agendamento») |
| 390×844 (mobile) | Semana | 6 eventos; 0 stripe; sem overflow horizontal |
| 360×800 (mobile) | Semana | 6 anchors / 6 eventos; 0 stripe; sem overflow horizontal |

**Gap stack (correção pós-feedback):** validação manual recomendada — Semana/Dia com agendamentos consecutivos (ex. 10:00, 10:30, 11:00) devem mostrar vão vertical igual ao Mês (`0.15rem` &lt;768px, `0.22rem` ≥768px). Automatizado: apenas regressão de testes/typecheck após alteração CSS.

**Não validado nesta sessão (dados/espaço):**

- Dia em **1024** e **mobile (390/360)** com vários blocos sobrepostos no mesmo dia (dia corrente sem agendamentos visíveis na grelha; semana 19–25/10 usada como proxy para densidade).
- Hover sistemático em todas as larguras (quick details validado por clique em 1024 semana).
- Comparação lado a lado screenshot Mês/Semana/Dia em 1440 (validação por CDP de estilos computados).

## 11. Limitações e trabalho pendente

- Validação manual do utilizador nas vistas/dimensões marcadas como não testadas.
- Mensagem «Nenhum agendamento encontrado para este período» pode aparecer em paralelo com slots na grelha (comportamento pré-existente; fora do âmbito 51.7).
- `APPOINTMENT_STATUS_STRIPE_CLASS` removido do código; relatórios 51.4/51.6 ainda mencionam faixas apenas como histórico.

## 12. Git — confirmação

- **Sem** `commit`, `merge` ou `push` pelo agente.
- Estado final (`git status -sb`):

```
## Stage-51.7-Padrao-visual-agendamentos
 M client/src/components/appointments/AppointmentCalendarItem.tsx
 M client/src/components/appointments/CalendarTimeGridEvent.test.tsx
 M client/src/components/appointments/CalendarTimeGridEvent.tsx
 M client/src/components/appointments/CalendarView.test.tsx
 M client/src/components/appointments/DayCalendar.tsx
 M client/src/components/appointments/WeekCalendar.tsx
 M client/src/config/appointmentServiceColor.ts
 M client/src/styles/appointments-calendar.css
?? client/src/components/appointments/AppointmentCalendarItem.test.tsx
?? docs/reports/stage-51-7-calendar-visual-standardization.md
```

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 51.7 implementada localmente na branch `Stage-51.7-Padrao-visual-agendamentos` (base `bf676a4` / 51.6 em `develop`). Identidade visual unificada: **só cor de serviço no bloco**, sem faixa de estado.

**Ficheiros-chave:**

- Render: `AppointmentCalendarItem.tsx` (mês + lista diária), `CalendarTimeGridEvent.tsx` (semana/dia).
- Layout temporal inalterado: `WeekCalendar.tsx`, `DayCalendar.tsx` (só classe do wrapper `calendar-time-grid-event-anchor`).
- Estilos: `appointments-calendar.css` — `.calendar-week-event` com radius 0.35rem e inset shadow; regras stripe removidas; **`--calendar-event-stack-gap`** (0.15/0.22rem) só em `.week-calendar` / `.day-calendar` + padding no anchor.
- Cores: `appointmentServiceColor.ts` — `getServiceCalendarStyle`, `isTerminalAppointmentStatus`; **sem** `APPOINTMENT_STATUS_STRIPE_CLASS`.

**Testes:** suite completa 1379 OK; novos/ajustados `AppointmentCalendarItem.test.tsx`, `CalendarTimeGridEvent.test.tsx`, `CalendarView.test.tsx`.

**QA browser:** Mês/Semana 1440, Semana 1024 + quick details, Semana mobile 390 e 360 — zero `calendar-status-stripe`. Completar QA de **Dia** em desktop/mobile com dia com agendamentos sobrepostos se o utilizador pedir.

**Próximos passos sugeridos:** revisão manual → commit na branch → PR para `develop`. Não reintroduzir `calendar-status-stripe` nos blocos do calendário; estado continua em filtros, badges (lista), quick details e `aria-label`.
