# Stage 51.8 — Unificação visual completa (Mês, Semana, Dia)

Data: 23/10/2026  
Âmbito: corrigir lacunas da 51.7 — identidade visual única com **Mês como referência**, sem alterar posicionamento temporal (`computeDayLayout`, `topPx`, `heightPercent`) nem alturas 51.6 (48/60 px/hora).

## 1. Diagnóstico inicial (Fase A — pré-51.8)

Comparação estrutural e de código na base `develop` (51.7 integrada), alinhada ao feedback visual (cartões “grudados” na Semana/Dia).

| Medida / aspecto | Mês (referência) | Semana/Dia (antes 51.8) | Regra / componente responsável |
|------------------|------------------|-------------------------|--------------------------------|
| Componente cartão | `AppointmentCalendarItem` (`button`) | `CalendarTimeGridEvent` (`div` + tiers) | Dois sistemas de markup |
| Tier visual | Sempre `calendar-week-event--comfortable` | minimal / compact / comfortable / expanded | `resolveTimeGridEventDisplay` |
| Hora exibida | Só início | Intervalo `start – end` (tiers ≥ compact) | `CalendarTimeGridEvent` |
| Linhas visíveis | Hora + cliente + **serviço** | Serviço omitido &lt; ~52px | Tiers por `heightPx` |
| Stack gap | `margin-bottom` 0.15rem / 0.22rem (≥768px) | `--calendar-event-stack-gap` no anchor (mesmo rem, cartão mais baixo) | `.month-calendar .calendar-item` vs anchor |
| Inset lateral | Célula `padding: 0.35rem` | Anchor `padding-inline: 0.1rem` | CSS grelha vs `.calendar-day-cell` |
| Altura do cartão colorido | Conteúdo (não limitada por duração) | ~30px para 30 min @ 60px/h | Layout absoluto por duração |

**Conclusão:** A 51.7 unificou cores e removeu faixa de estado, mas mantinha **tipografia, conteúdo e inset** diferentes na grelha horária.

## 2. Diferenças visuais corrigidas (51.8)

1. Corpo de cartão partilhado (`AppointmentCalendarEventBody`).
2. Superfície comfortable única (`APPOINTMENT_CALENDAR_EVENT_SURFACE_CLASS`).
3. Grelha horária: hora **só início**; sempre cliente + serviço (como mês).
4. Tokens CSS em `.calendar-surface` reutilizados pelo mês (valores computados preservados) e pela grelha.
5. Anchor com `padding-inline` = `--calendar-event-cell-inset` (0.35rem) e `padding-bottom` = `--calendar-event-stack-gap`.
6. `focus-visible` no anchor da grelha; hover no `.calendar-week-event` interno.

**Limitação estrutural (documentada):** pills do mês são mais altas porque não representam duração; blocos de 30 min continuam fisicamente mais baixos, mas com **mesmo padding, classes, tipografia e linhas de conteúdo** (recorte por `overflow-hidden`).

## 3. Decisões de design

| Decisão | Detalhe |
|---------|---------|
| Referência | Mês intocado em comportamento de grelha 7×6; apenas refatoração para variáveis CSS com mesmos valores |
| Hora na grelha | Só início (escolha do utilizador) |
| Status na grelha | Texto visível só se `heightPx >= 72` (`shouldShowTimeGridStatusText`); caso contrário `visually-hidden` (como mês na grelha) |
| Altura horária | 51.6: 48/60; … 51.8.3: 88/110; **51.8.4:** **96/120 px** |
| Layout temporal | Sem mudanças em `computeDayLayout` / estilos inline `top`/`height` |

### 51.8.1 — Visibilidade hora + nome + serviço (follow-up)

| Problema | Correção |
|----------|----------|
| Nome do cliente invisível na grelha | `.calendar-event-client` com `flex: 1 1 auto` encolhia a 0 em slots baixos → regras escopadas `flex: 0 0 auto` em time/client/service no anchor Semana/Dia |
| Pouca altura por 30 min | `TIME_GRID_HOUR_HEIGHT_DESKTOP_PX` **80**, `MOBILE_PX` **64** (proporção 4/3 vs 48/60) em `calendarTimeGridLayout.ts` |
| Recorte | `overflow-hidden` corta por baixo (serviço antes), ordem igual ao mês |

### 51.8.2 — Altura horária para paridade com pills do mês (Semana/Dia)

| Contexto | Detalhe |
|----------|---------|
| Feedback | 80px/hora ainda deixava cartões de 30 min visivelmente mais baixos que as pills do mês |
| Alteração | `TIME_GRID_HOUR_HEIGHT_DESKTOP_PX` **100**, `MOBILE_PX` **80** (proporção 5:4 mantida) em `calendarTimeGridLayout.ts` |
| Mês | **Sem alterações** de CSS ou layout — apenas referência na validação manual |
| Próximo passo se insuficiente | Subir para ~110–120px/hora desktop (documentar antes de implementar) |
| Trade-off | Mais scroll vertical na Semana/Dia |

**Checklist QA:** mesma semana, agendamentos 10:00 + 10:30 — comparar altura/separação com mês; repetir em ~390px largura.

### 51.8.3 — 110px/hora e inset superior na grelha

| Contexto | Detalhe |
|----------|---------|
| Feedback | Quase 100%; subir para **110px** desktop; primeiro agendamento colado à linha horária superior |
| Altura | `TIME_GRID_HOUR_HEIGHT_DESKTOP_PX` **110**, `MOBILE_PX` **88** (5:4) |
| Anchor | `padding-top: var(--calendar-event-stack-gap)`; `padding-bottom: 0` — separação da linha sem duplicar gap entre 10:00 e 10:30 (gap = top do slot seguinte, como `margin-bottom` no mês) |
| Mês | Sem alterações |

### 51.8.4 — 120px/hora, inset inferior e hover unificado

| Contexto | Detalhe |
|----------|---------|
| Feedback | Cartão colado na linha **inferior** após 51.8.3 (`padding-bottom: 0`); subir para **120px**; hover Semana/Dia igual ao Mês |
| Altura | `TIME_GRID_HOUR_HEIGHT_DESKTOP_PX` **120**, `MOBILE_PX` **96** (5:4) |
| Anchor | `padding: stack-gap cell-inset` nos quatro lados (topo e base do slot) |
| Hover | Regra partilhada em `.month-calendar .calendar-item.calendar-week-event:hover` e anchor:hover `.calendar-item` na grelha — `filter: brightness(1.08)` + inset ligeiramente mais forte; remove `brightness(1.1)` só no `.calendar-week-event` interno |
| Mês | Apenas CSS de **hover** alinhado (sem mudar grelha 7×6 nem tamanho das pills) |

## 4. Tokens partilhados (`.calendar-surface`)

| Token | Valor base | ≥ 768px |
|-------|------------|---------|
| `--calendar-event-padding-block` | 0.15rem | (inalterado; mês usa override 0.2rem em ≥768 apenas na pill) |
| `--calendar-event-padding-inline` | 0.25rem | idem |
| `--calendar-event-stack-gap` | 0.15rem | 0.22rem |
| `--calendar-event-cell-inset` | 0.35rem | idem |
| `--calendar-event-radius` | 0.35rem | idem |

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/appointments/AppointmentCalendarEventBody.tsx` | **Novo** — markup partilhado |
| `client/src/components/appointments/AppointmentCalendarItem.tsx` | Delega ao EventBody + constante de superfície |
| `client/src/components/appointments/CalendarTimeGridEvent.tsx` | Unificado comfortable; hora início; remove tiers de estilo |
| `client/src/styles/appointments-calendar.css` | Tokens; anchor inset + padding-top (51.8.3); flex (51.8.1) |
| `client/src/config/calendarTimeGridLayout.ts` | 96/120 px por hora (51.8.4) |
| `client/src/components/appointments/CalendarTimeGridEvent.test.tsx` | Testes alinhados à unificação |
| `docs/reports/stage-51-8-calendar-visual-unification.md` | Este relatório |

## 6. Testes executados

| Comando | Resultado |
|---------|-----------|
| `vitest run` (CalendarTimeGridEvent, AppointmentCalendarItem, CalendarView) | **38** testes — **OK** |
| `vitest run` (suite completa) | 1ª execução: worker timeout (ambiente); reexecução `--pool=forks --maxWorkers=2`: **128** ficheiros, **1376** testes — **OK** |
| `npm run typecheck` | **OK** |
| `npm run build` | **OK** |

## 7. Validação visual (browser)

| Resolução | Mês | Semana | Dia | Notas |
|-----------|-----|--------|-----|-------|
| 1440×900 | Não capturado | Não capturado | Não capturado | Sessão MCP redirecionada para `/login` — sem credenciais no agente |
| 1024×768 | — | — | — | Pendente validação manual |
| 390×844 | — | — | — | Pendente validação manual |
| 360×800 | — | — | — | Pendente validação manual |

**Validação manual recomendada:** mesma semana (ex. 19–25/10); comparar pill do mês com coluna da semana (10:00 / 10:30 / 11:00): mesmas classes `calendar-item` + `calendar-week-event--comfortable`, serviço visível no DOM, gap 0.22rem @ desktop entre cartões consecutivos, inset 0.35rem nas laterais.

## 8. Limitações e pendentes

- Slots muito curtos (&lt;30 min) ou grelha muito densa podem ainda truncar a linha de serviço; nome deve permanecer visível após 51.8.1.
- Mais scroll vertical na Semana/Dia (trade-off 120/96 px).
- Suite completa vitest: confirmar reexecução sem timeouts no CI/local do utilizador.
- Screenshots lado a lado: utilizador OWNER após login.

## 9. Git

- Branch: `Stage-51.8-Unificacao-visual-calendario` (a partir de `develop` @ 51.7 mergeada).
- **Sem** commit, merge ou push pelo agente.

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** 51.8 + **51.8.1–51.8.4** — grelha **96/120 px/hora**; anchor com padding stack-gap vertical; hover pills unificado; grelha do mês inalterada.

**Não reintroduzir:** `resolveTimeGridEventDisplay` para classes CSS; faixa `calendar-status-stripe`.

**Ficheiros-chave:** `AppointmentCalendarEventBody.tsx`, `CalendarTimeGridEvent.tsx`, `appointments-calendar.css` (tokens + `.calendar-time-grid-event-anchor`).

**QA pendente:** login manual + matriz 4×3 de screenshots; opcional CDP `getComputedStyle` em `.month-calendar .calendar-item` vs `.week-calendar .calendar-time-grid-event-anchor .calendar-item` para confirmar padding/gap iguais.

**Relatório 51.7:** superseded por esta stage para unificação visual; manter 51.7 como histórico de remoção de faixa.
