# Stage 48.2 — UX da agenda mensal (desktop + mobile)

Data: 21/10/2026  
Branch: `feature/stage-48-calendar-dense-mobile-polish`  
HEAD: `4e43c17` (sem commits na branch).  
Sem commit, merge ou push.

## 1. Objetivo

Melhorar a vista **Mês**: no mobile, grelha de orientação + lista completa do dia selecionado; no desktop, cartões e overflow mais legíveis, mantendo `MAX_VISIBLE_ITEMS = 4` e overflow → vista Dia (48.1).

## 2. Diagnóstico (pré-implementação)

| Observação | Causa |
|------------|--------|
| Toque na célula abre criação | `handleCalendarDayClick` → `openCreate` |
| Overflow salta para vista Dia | Stage 48.1 |
| Cartões ilegíveis | CSS compacto + 4 itens em células pequenas |
| Sem dia selecionado no mês | Apenas `currentDateKey` como âncora do mês |

Baseline: **1285** testes (Stage 48.1).

## 3. Estratégia implementada

- `useMatchMedia("(max-width: 767.98px)")` alinhado ao CSS existente.
- **Mobile:** `layoutMode="compact"` — contagem de eventos nas células, sem cartões na grelha; `monthFocusedDateKey` + `MonthDayAgendaList` abaixo; toque na célula seleciona; overflow seleciona dia e faz scroll ao painel (permanece no Mês).
- **Desktop:** cartões na grelha; overflow → vista Dia; tipografia e overflow reforçados em `@media (min-width: 768px)`.
- **Reconciliação ao mudar mês:** `reconcileMonthFocusedDateKey` — mantém dia se ainda na grelha; senão `todayKey` se no mês; senão dia 1 do mês visível.

## 4. Git

| Momento | Estado |
|---------|--------|
| Início 48.2 | Alterações Stages 48 + 48.1 no working tree (7 ficheiros `M`, 2 relatórios `??`) |
| Fim 48.2 | + `MonthDayAgendaList.tsx`, `useMatchMedia.ts`, testes; `??` este relatório |

Diffs Stage 48 (clientes, portal, `.filter-bar`) e 48.1 (overflow botão) **preservados**.

## 5. Ficheiros alterados

| Ficheiro | Motivo |
|----------|--------|
| `client/src/hooks/useMatchMedia.ts` | Breakpoint mobile reativo |
| `client/src/components/appointments/MonthDayAgendaList.tsx` | Lista legível do dia (mobile) |
| `MonthCalendar.tsx` | `layoutMode`, seleção, contagem, overflow 48.1 |
| `CalendarView.tsx` | Lista mobile, overflow ramificado |
| `AppointmentsPage.tsx` | `monthFocusedDateKey`, handlers, reconciliação |
| `index.css` | Desktop legibilidade; mobile compact + painel |
| `CalendarView.test.tsx`, `useMatchMedia.test.ts` | Cobertura mobile/desktop |

## 6. Comportamento

### Desktop

- Grelha com até 4 cartões + `+N mais` → vista **Dia**.
- Clique na célula (dia futuro) → **Novo agendamento** (inalterado).
- CSS: cartões e overflow ligeiramente maiores/contrastados.

### Mobile

- Grelha compacta com contagem por dia; dia selecionado com destaque.
- Lista abaixo com **todas** as marcações do dia (`AppointmentCalendarItem` ampliado via CSS).
- Toque na célula → seleciona (não abre create); **Agendar neste dia** na lista + botão global no header.
- `+N mais` → seleciona dia + scroll ao painel.

## 7. Testes automatizados

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1` | **1291** passaram (114 ficheiros); +6 vs 1285 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

## 8. Validação visual manual

| Contexto | Resultado |
|----------|-----------|
| Desktop 1365×768 checklist §9 | **NV** — sessão browser sem login OWNER |
| Mobile 390×844 checklist §9 | **NV** |
| Screenshots `stage-48-2-*.png` | **NV** |
| Dados temp `Stage48-2-month-ux-test` | Não criados |

API/Vite locais disponíveis; validação manual pendente com credenciais do utilizador.

## 9. Limitações

- Lista mobile não inclui coluna de funcionário (mesmos campos que cartão do calendário).
- `useEffect` de reconciliação ao entrar em vista Mês pode alinhar foco ao mudar `todayKey` à meia-noite (comportamento esperado).

## 10. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Mobile: seleção + lista abaixo | **A** (código + testes) |
| Desktop: grelha + legibilidade | **A** (código + CSS) |
| Overflow excedentes | **A** |
| Create não acidental no mobile | **A** |
| Semana/Dia/Lista | **A** (sem alteração de rotas) |
| Testes / typecheck / build | **A** |
| Validação visual observada | **NV** |

## CONTEXTO PARA A PRÓXIMA IA

- Branch: `feature/stage-48-calendar-dense-mobile-polish`; HEAD `4e43c17`; working tree com Stages **48 + 48.1 + 48.2** sem commit.
- Relatórios: `stage-48-calendar-dense-mobile-polish.md`, `stage-48-1-calendar-overflow-fix.md`, `stage-48-2-month-calendar-ux.md`.
- Vista Mês mobile: `monthFocusedDateKey`, `MonthDayAgendaList`, `layoutMode="compact"`; desktop overflow ainda vai para vista Dia.
- Testes cliente: **1291** pass.
- Próximo passo sugerido: smoke manual OWNER + commit agrupado ou PR; opcional extrair lista mobile para tablet (`768–991px`) se feedback pedir.
