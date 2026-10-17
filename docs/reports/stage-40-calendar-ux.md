# Stage 40 — Modernização da Agenda (UX)

Data: 16/10/2026  
Branch: `feature/stage-40-calendar-ux` (base: `develop`)  
Sem commit, merge ou push.

## 1. Objetivo e âmbito

Melhorar a experiência do calendário administrativo em `/appointments`: toolbar (nav | período | vistas), estados de carregamento/erro sem grelha vazia enganadora, cartões de agendamento com rótulo de estado (a11y), polish semana/dia e linha visual da hora atual. Sem alterações a API, RBAC, timezone, `appointmentCalendar.ts` (layout/overlap) ou novos filtros.

## 2. Achados da auditoria analisados

| Tema | Ação nesta stage |
|------|------------------|
| Grelha vazia durante fetch | `CalendarView` só renderiza Month/Week/Day quando `!isLoading && !loadError` |
| Estado só por cor | Texto `APPOINTMENT_STATUS_LABELS` + `aria-label` nos blocos |
| Toolbar comprimida em desktop | Grupos `.calendar-toolbar-nav` / `.calendar-toolbar-period` / `.calendar-toolbar-views` |
| Semana/dia sem serviço/estado | `CalendarTimeGridEvent` partilhado |
| Sem indicador “agora” | `.calendar-now-line` em coluna do dia atual (cálculo puro) |

Stage 37 PDF (`docs/SchedulerPro - Imagens.pdf`) — referência manual; não validado pixel-a-pixel nesta sessão.

## 3. Problemas confirmados e causas

- **AppointmentsPage:** `CalendarView` era montado antes de `LoadingState`, mostrando células sem dados.
- **A11y:** cores `.status-*` sem texto associado nos itens do mês e blocos semana/dia.
- **Toolbar:** label com `flex: 1 1 100%` forçava quebra de linha em desktop.
- **Week:** `serviceNames` não era passado aos blocos.

## 4. Decisões técnicas

1. **Toolbar sempre visível** no modo calendário; corpo com `LoadingState` compact ou `ErrorState` com retry.
2. **Lista:** loading/erro permanecem fora do painel calendário (comportamento Stage 39).
3. **Now line:** `computeNowLineTopPx` em `calendarNowLine.ts`; sem intervalo de atualização (evita timers em testes).
4. **CSS:** apenas secção calendário em `index.css`; shell Stage 38 intocado.
5. **Componentes novos:** `CalendarTimeGridEvent`, `CalendarNowLine` (apresentação).

## 5. Ficheiros alterados

| Ficheiro | Motivo |
|----------|--------|
| `client/src/pages/appointments/AppointmentsPage.tsx` | `.appointments-calendar-panel`; estados loading/erro no calendário |
| `client/src/components/appointments/CalendarView.tsx` | Props `isLoading` / `loadError` / `onLoadRetry`; gate das vistas |
| `client/src/components/appointments/CalendarToolbar.tsx` | Markup nav / período / vistas; `aria-live`, `aria-pressed` |
| `client/src/components/appointments/AppointmentCalendarItem.tsx` | Status visível + `aria-label` |
| `client/src/components/appointments/WeekCalendar.tsx` | `serviceNames`, now line, `CalendarTimeGridEvent` |
| `client/src/components/appointments/DayCalendar.tsx` | Now line, `CalendarTimeGridEvent` |
| `client/src/components/appointments/CalendarTimeGridEvent.tsx` | **Novo** — hierarquia hora/cliente/serviço/estado |
| `client/src/components/appointments/CalendarNowLine.tsx` | **Novo** — marcador visual |
| `client/src/config/calendarNowLine.ts` | **Novo** — cálculo da posição |
| `client/src/index.css` | Toolbar desktop, now line, status, painel |
| `client/src/components/appointments/CalendarView.test.tsx` | Toolbar, loading, status, now line |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` | Sem grelha durante loading |
| `client/src/config/calendarNowLine.test.ts` | **Novo** — unidade do cálculo |

## 6. Correções por área (spec §2)

### §2.1 Toolbar

- Três grupos semânticos + layout desktop em linha (nav | período centrado | vistas).
- Mobile: regras `@media` atualizadas para `.calendar-toolbar-nav` / `.calendar-toolbar-views`.

### §2.3 Cartões e a11y

- Mês: `.calendar-item-status` + `aria-label` completo.
- Semana/dia: `.calendar-event-status` + `aria-label` no conteúdo do bloco.

### §2.4 Now line

- Renderizada só quando `dateKey === todayKey` e hora dentro do intervalo visível.

### §2.5 Estados

- `LoadingState` compact e `ErrorState` dentro de `CalendarView`; retry `loadAppointments`.

## 7. Testes executados

**Baseline (pré-implementação):** 50 testes (CalendarView + AppointmentsPage).

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/components/appointments/CalendarView.test.tsx \
  src/pages/appointments/AppointmentsPage.test.tsx \
  src/config/calendarNowLine.test.ts
# → 55 testes passados

npm run test -- --pool=forks --maxWorkers=1
# → 109 ficheiros, 1245 testes passados (~549s)
```

Novos/ajustados: loading sem grelha (page + view), wrappers toolbar, status no mês, now line na semana, `calendarNowLine` unitário.

## 8. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 9. Validação visual

**Não realizada** com browser MCP nesta sessão. Recomendado: `npm run dev` → `/appointments` em month/week/day (~1280px e ~390px); comparar com PDF; smoke layout Stage 38 (scroll único, notificações).

## 10. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Toolbar nav/período/vistas | Cumprido |
| Loading sem grelha enganadora | Cumprido |
| Estado legível (não só cor) | Cumprido |
| Now line visual em hoje | Cumprido |
| Sem API/RBAC/layout math/filtros novos | Cumprido |
| Testes + typecheck + build | Cumprido |
| Relatório + CONTEXTO | Cumprido |

## 11. Problemas conhecidos / adiado

- Mês com 4 linhas por item (incl. status) pode exigir ajuste fino de altura em dias muito cheios — `MAX_VISIBLE_ITEMS=4` mantido.
- Now line não atualiza a cada minuto (só no mount/re-render).
- Portal, modais FE-005, validação PDF — fora de âmbito.

## 12. Próxima etapa recomendada

- **Portal FE-001** — alinhar estados visuais do cliente.
- **Modais FE-005** — unificar confirmações de agendamento.
- Validação visual cruzada PDF + browser após merge.

---

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 40 na branch `feature/stage-40-calendar-ux`. Calendário admin:

```tsx
<div className="appointments-calendar-panel">
  <CalendarView
    ...
    isLoading={isLoading}
    loadError={loadError}
    onLoadRetry={() => void loadAppointments()}
  />
</div>
```

- **Lista (`viewType === "list"`):** `LoadingState` / `ErrorState` continuam no fluxo da página, não no `CalendarView`.
- **Blocos semana/dia:** usar `CalendarTimeGridEvent`; passar `serviceNames` ao `WeekCalendar`.
- **Now line:** `computeNowLineTopPx` + `CalendarNowLine`; não alterar `computeDayLayout`.
- **Estilos:** novas classes só na secção calendário de `index.css`; preservar Stage 38 (`body:has(.app-shell)`, notificações, `.table-responsive`).

**Testes:** 1245 testes no client (+5 face à referência 1240 pós-Stage 39).

**Não abrangido:** backend, `appointmentCalendar.ts`, disponibilidade, público, outras páginas.

**Merge:** integrar após Stage 39 se ainda em branch separada; resolver conflitos mínimos em `AppointmentsPage` (loading já Stage 39).
