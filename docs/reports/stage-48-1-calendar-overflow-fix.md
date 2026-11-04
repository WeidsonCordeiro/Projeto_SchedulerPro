# Stage 48.1 — Correção do overflow da agenda mensal

Data: 20/10/2026  
Branch: `feature/stage-48-calendar-dense-mobile-polish` (base: `develop` @ `4e43c17`)  
HEAD: `4e43c17` (sem commits na branch; working tree com Stage 48 + 48.1).  
Sem commit, merge ou push.

## 1. Problema (herdado da Stage 48)

Na vista **Mês**, dias com mais de quatro marcações mostravam `+N mais`, mas o indicador era um `<div>` sem handler: o clique propagava para a célula e abria **Novo agendamento** (`handleCalendarDayClick` → `openCreate`), em vez de expor todas as marcações do dia. O comentário CSS sugeria “abrir o dia”, alinhado com o comportamento desejado, não com o código.

## 2. Solução

Reutilizar a vista **Dia** existente (`DayCalendar` via `CalendarView`):

| Camada | Alteração |
|--------|-----------|
| [`MonthCalendar.tsx`](../client/src/components/appointments/MonthCalendar.tsx) | Prop `onOverflowClick`; overflow como `<button type="button">` com `stopPropagation`, teclado (Enter/Espaço), `aria-label` via `formatWeekdayDate`; ativo também em dias passados |
| [`CalendarView.tsx`](../client/src/components/appointments/CalendarView.tsx) | Prop opcional `onOverflowDayClick` repassada a `MonthCalendar` |
| [`AppointmentsPage.tsx`](../client/src/pages/appointments/AppointmentsPage.tsx) | `handleCalendarOverflowDayClick`: `setCurrentDateKey` + `setViewType("day")`; `handleCalendarDayClick` inalterado |
| [`index.css`](../client/src/index.css) | Regras scoped `.month-calendar .calendar-overflow` (legibilidade, área de toque ~2.75rem, mobile centrado); comentário atualizado |

**Não alterado:** `MAX_VISIBLE_ITEMS = 4`, `appointmentCalendar.ts`, correções Stage 48 (clientes, portal, `.filter-bar`).

## 3. Git (início / fim)

| Momento | Estado |
|---------|--------|
| Início 48.1 | `M` — `index.css`, `ClientsPage.tsx`, `PortalAppointmentsPage.tsx`; `??` — `stage-48-calendar-dense-mobile-polish.md` |
| Fim 48.1 | Acima + `M` — `MonthCalendar.tsx`, `CalendarView.tsx`, `CalendarView.test.tsx`, `AppointmentsPage.tsx`; `??` — este relatório |

Diff Stage 48 (clientes/portal/filter-bar) **preservado** no mesmo working tree.

## 4. Testes automatizados

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1` | **1285** testes passaram (113 ficheiros); baseline Stage 48: 1278 (+7 casos overflow) |
| `npm run typecheck` | OK |
| `npm run build` | OK |

Cobertura principal em [`CalendarView.test.tsx`](../client/src/components/appointments/CalendarView.test.tsx): sem overflow com ≤4 eventos; `+1` / `+2 mais`; clique e teclado no overflow; célula futura ainda chama `onDayClick`; overflow em dia passado; encaminhamento `CalendarView` → `onOverflowDayClick`.

## 5. Validação manual (browser)

| Item | Resultado | Notas |
|------|-----------|--------|
| 5 marcações `Stage48-1-overflow-test` + screenshots desktop/mobile | **NV** | `/appointments` redireciona para `/login`; credenciais OWNER não disponíveis nesta sessão do agente |
| Tap `+N mais` → vista Dia com 5 marcações | **NV** | Coberto por testes de componente; smoke manual pendente com login local |
| Limpeza dados de teste | **NV** | Nenhum dado criado |

API `http://localhost:3000/api/health` e Vite `http://localhost:5173/` → **200** no momento da execução.

## 6. Critérios de conclusão

| Critério | Estado |
|----------|--------|
| Overflow legível e acionável → vista Dia | **A** (código + testes) |
| Testes + typecheck + build | **A** |
| Stage 48 intacta | **A** |
| Commit / PR | Não solicitado |

## CONTEXTO PARA A PRÓXIMA IA

- Branch: `feature/stage-48-calendar-dense-mobile-polish`; HEAD ainda `4e43c17`; **dois** relatórios untracked (`stage-48-*`, `stage-48-1-*`).
- Overflow mensal: botão `.calendar-overflow` → `onOverflowDayClick` na página → vista **Dia**; clique na célula (fora do botão) em dia futuro continua a abrir criação.
- Testes cliente: **1285** pass; ao commitar, agrupar Stage 48 + 48.1 ou separar PRs conforme preferência do utilizador.
- Validação manual M4 overflow (tap → Dia): repetir com OWNER logado, 5 appts num dia futuro, `notes: Stage48-1-overflow-test`, screenshots `stage-48-1-*.png`, apagar só esses IDs.
- Plano `.cursor/plans/stage_48.1_overflow_fix_*.plan.md` não foi editado durante a implementação.
