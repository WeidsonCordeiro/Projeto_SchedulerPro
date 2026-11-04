# Stage 51.1 — Legibilidade dos blocos Semana/Dia

Data: 21/10/2026  
Âmbito: Fase A (Stage 50) — melhorar hierarquia visual nos blocos das vistas **Semana** e **Dia** apenas.

## 1. Objetivo e âmbito

- Tornar legíveis **hora**, **cliente** e **serviço** (quando a altura do bloco permitir) sem alterar a duração visual (`HOUR_HEIGHT` 48px, mínimo 24px) nem `computeDayLayout`.
- Preservar cores por **estado** (`APPOINTMENT_STATUS_CALENDAR_CLASS`), RBAC, timezone, navegação e vistas Mês/Lista.
- **Fora de âmbito:** filtros, popovers, KPIs, vista staff, cores por serviço, backend, shell mobile, vista Mês (`AppointmentCalendarItem`).

## 2. Referências visuais consultadas

| Ficheiro | Uso |
|----------|-----|
| `image/Sistema_Origem_desktop_semana.png` | Baseline: blocos curtos mostravam sobretudo intervalo horário |
| `image/Sistema_Origem_desktop_dia.png` | Mesmo padrão na faixa diária |
| `image/Sistema_Destino_Exemplo_mes.jfif` | Referência staff: cliente + serviço em blocos mais altos |
| `image/Sistema_Destino_Mobile.png` / `Sistema_Destino_Mobile_Exemplo.jfif` | Densidade mobile (grelha com scroll horizontal mantida) |

Relatórios: [stage-50-visual-reference-audit.md](./stage-50-visual-reference-audit.md), [stage-49-appointments-refactor-audit.md](./stage-49-appointments-refactor-audit.md), [stage-49-8-overflow-and-list-validation.md](./stage-49-8-overflow-and-list-validation.md).

## 3. Diagnóstico (comportamento anterior)

[`CalendarTimeGridEvent.tsx`](../client/src/components/appointments/CalendarTimeGridEvent.tsx) renderizava sempre intervalo completo, cliente, serviço (só se `heightPx >= 56`) e texto de status.

Com blocos de **30 min** ≈ **24px** de altura (`Math.max(..., 24)` em `WeekCalendar` / `DayCalendar`), `overflow-hidden` cortava cliente/serviço/status — na prática só o horário era visível (alinhado às capturas Origem).

## 4. Alterações e justificação

### 4.1 Tiers por altura (`resolveTimeGridEventDisplay`)

| Tier | `heightPx` | Horário | Cliente | Serviço | Status (texto) |
|------|------------|---------|---------|---------|----------------|
| `minimal` | &lt; 36 | só início | sim | não | cor do bloco + `visually-hidden` |
| `compact` | 36–51 | início–fim | sim | não | idem |
| `comfortable` | 52–71 | início–fim | sim | sim | idem |
| `expanded` | ≥ 72 | início–fim | sim | sim | texto visível |

- **Hora única** em `minimal` libera linha para o cliente em slots de 30 min.
- **Status:** cor do bloco mantém significado; texto omitido em tiers baixos para não competir com cliente/serviço; `aria-label` e `title` completos; `visually-hidden` com rótulo de status quando o texto não é mostrado.

### 4.2 CSS ([`appointments-calendar.css`](../client/src/styles/appointments-calendar.css))

- Flex column em `.calendar-week-event` com `min-width: 0`, gaps e tipografia por modificador `--minimal|compact|comfortable|expanded`.
- Sem alteração às regras `.month-calendar` / overflow mensal.

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/appointments/CalendarTimeGridEvent.tsx` | Tiers, markup condicional, `title` |
| `client/src/styles/appointments-calendar.css` | Layout e tipografia week/day event |
| `client/src/components/appointments/CalendarTimeGridEvent.test.tsx` | **Novo** — tiers + render por altura |
| `docs/reports/stage-51-1-calendar-event-readability.md` | Este relatório |

**Não alterados:** `WeekCalendar.tsx`, `DayCalendar.tsx`, hooks, API, Mês, Lista, toolbar.

## 6. Testes executados

| Comando | Resultado |
|---------|-----------|
| `npx vitest run src/components/appointments/` | **119** testes, **10** ficheiros — OK |
| `npm run test` (suite completa) | **1341** testes, **120** ficheiros — OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

**Baseline referida no pedido:** 1331 testes em 119 ficheiros.  
**Delta:** +10 testes, +1 ficheiro (`CalendarTimeGridEvent.test.tsx`). Nenhuma falha nova na suite completa.

Testes de overlap e cor por status em [`CalendarView.test.tsx`](../client/src/components/appointments/CalendarView.test.tsx) mantidos sem alteração de código.

## 7. Validação visual

| Viewport | Resultado |
|----------|-----------|
| 1280×900 | Tentativa via MCP browser em `/appointments` → **sessão expirou** durante o smoke; screenshot capturou página de login. |
| 390×844 | Não concluído (mesmo bloqueio de sessão). |

Evidência parcial: `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-51-1-desktop-week.png` (login após expiração).

**Recomendação manual:** reautenticar OWNER, abrir Semana/Dia e confirmar cliente visível em blocos ~30 min e serviço em blocos ≥ ~1h.

## 8. Riscos e trabalho de fora

| Risco | Nota |
|-------|------|
| Slots &lt; 36px ainda densos | Cliente pode truncar; `title`/`aria-label` mitigam |
| Colunas overlap muito estreitas | `text-truncate` + `min-width: 0` |
| Regressão mês/lista | Componente isolado; testes de appointments OK |

**Fora desta etapa (Stage 50 Fase A restante):** popover read-only, filtros client-side, cores por serviço, painel lateral mês, KPIs.

## 9. Git

Nenhum commit, merge ou push. Working tree com alterações locais listadas em `git status` (componente, CSS, teste, relatório).

---

## CONTEXTO PARA A PRÓXIMA IA

- **Feito:** `CalendarTimeGridEvent` usa `resolveTimeGridEventDisplay(heightPx)` com quatro tiers; Semana/Dia inalterados no layout temporal.
- **Constantes:** limiares 36 / 52 / 72 px em `CalendarTimeGridEvent.tsx`.
- **Estado visual:** cores ainda por `appointment.status`; serviço só aparece a partir do tier `comfortable` (≥ 52px).
- **Testes:** suite 1341/120; novo ficheiro `CalendarTimeGridEvent.test.tsx`.
- **Smoke visual:** repetir com sessão válida após login.
- **Não implementar** na sequência automática: filtros toolbar, popover mês, cores por serviço (51.2+) — aguardar avaliação do utilizador.
