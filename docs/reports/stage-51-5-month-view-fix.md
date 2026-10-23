# Stage 51.5 — Correção da vista Mês (Desktop e Mobile)

Data: 23/10/2026  
Âmbito: corrigir layout da grelha mensal (7×6) sem alterar cores por serviço (51.4), filtros (51.3), API ou backend.

## 1. Objetivo e âmbito

- Restaurar grelha mensal legível em desktop e mobile (7 colunas alinhadas aos weekdays, 6 linhas).
- Preservar: cores de serviço, faixas de estado, muted terminais, filtros, painel diário mobile, overflow «+N mais», navegação e fluxos de criação/edição.
- Fora de âmbito: reforma Semana/Dia/Lista, backend, Stage 51.6+.

## 2. Estado inicial Git

| Item | Valor |
|------|--------|
| Branch de origem | `develop` (`origin/develop`, limpa) |
| Commit de referência (51.4) | `9b50d2d` — Merge PR #105 Stage 51.4 |
| Branch de trabalho criada | `Stage-51.5-Correcao-vista-mes` (a partir de `9b50d2d`) |
| Operações Git do agente | Apenas `checkout -b`; **sem** commit / merge / push / rebase / stash |

## 3. Causa técnica identificada

Em `MonthCalendar.tsx`, as **42 células** devolvidas por `buildMonthGrid` eram renderizadas numa **única** `<div class="row">` com classe Bootstrap **`col`** em cada célula. O flex de `.col` (`flex: 1 0 0%`) mantém todas as células na **mesma fila** (~1/42 da largura), causando:

- Números de dia comprimidos/sobrepostos (observado em 51.4.1).
- Colunas estreitas em qualquer mês (não dependente de Outubro 2026).
- Workaround mobile anterior: `min-width: 40rem` + `overflow-x: auto` na grelha (scroll interno, UX fraca).

O cabeçalho weekday (7 `col` numa row) estava correto; o corpo da grelha não formava 6×7.

## 4. Decisões de implementação

| Decisão | Justificação |
|---------|----------------|
| CSS Grid `repeat(7, minmax(0, 1fr))` em `.month-calendar__weekdays` e `.month-calendar__weeks` | Distribuição estrutural 7 colunas sem larguras fixas arbitrárias nem `position: absolute` |
| Remover `col` das células de dia | Evita conflito flex Bootstrap |
| Remover bloco mobile `min-width: 40rem` + `overflow-x: auto` | Com grid correcto, 390px ÷ 7 ≈ 51px por coluna em modo compact — suficiente para número + contagem |
| Não alterar `MonthView` / lógica compact / `MonthDayAgendaList` | Comportamento mobile e overflow já validados em 51.3/51.4 |

## 5. Ficheiros alterados

| Ficheiro | Resumo |
|----------|--------|
| [`client/src/components/appointments/MonthCalendar.tsx`](../client/src/components/appointments/MonthCalendar.tsx) | Markup: `month-calendar__weekdays` + `month-calendar__weeks`; remoção de `row`/`col` no corpo |
| [`client/src/styles/appointments-calendar.css`](../client/src/styles/appointments-calendar.css) | Grid 7 colunas; estilos weekday; remoção scroll horizontal forçado no mobile |
| [`client/src/components/appointments/MonthCalendar.test.tsx`](../client/src/components/appointments/MonthCalendar.test.tsx) | **Novo** — 42 células, stride semanal, adjacent months, compact, overflow |

## 6. Testes adicionados ou atualizados

- **Novo:** `MonthCalendar.test.tsx` (5 casos): wrappers grid, alinhamento semanal (índices 0/7/14), `bg-light` em dias adjacentes, compact sem pills, «+N mais».
- **Regressão:** `MonthView.test.tsx`, `CalendarView.test.tsx` — passam sem alteração.

## 7. Resultado testes, typecheck e build

| Comando | Resultado |
|---------|-----------|
| `npm run test` (`client/`) | **1373** testes, **126** ficheiros — OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

Baseline pós-51.4: 1368 / 125. **Delta:** +5 testes, +1 ficheiro de teste.

## 8. Validação visual

Ferramenta: MCP browser + CDP; OWNER em `/appointments`; dados existentes (sem submits).

| Cenário | Viewport | Resultado | Evidência |
|---------|----------|-----------|-----------|
| Grelha 7 colunas iguais, 6 linhas | Desktop ~1130px | **Aprovado** | CDP: 42 células; larguras linha 0 = 7×108px; `row1StartsBelow: true`; `month-calendar__weeks` presente |
| Outubro 2026 com marcações | Desktop | **Aprovado** | Screenshot `stage-51-5-desktop-month-october.png`; pills legíveis por coluna |
| Sem overflow horizontal da página | Desktop / 390px | **Aprovado** | CDP `scrollWidth === clientWidth` |
| Mobile compact + contagem (ex. «19 3») | 390×844 | **Aprovado** | CDP: 7×51px; snapshot a11y; screenshot `stage-51-5-mobile-month-october.png` |
| Seleção dia + painel `MonthDayAgendaList` | 390×844 | **Aprovado** | Dia 19/10 → região «Segunda-feira, 19 de outubro» + 3 marcações no painel |
| Vista Semana (regressão) | 390×844 | **Aprovado** | Grelha semanal carrega com eventos |
| Mês começando domingo / 6ª semana / Fev 2026 | — | **Parcialmente validado** | Estrutura 42 células coberta por `buildMonthGrid` + testes; navegação multi-mês no browser limitada a Outubro 2026 nesta sessão |
| Largura ~1024px | — | **Não executado** | Desktop validado ~1130px; comportamento esperado idêntico (grid fluido) |
| Largura ~360px | — | **Não executado** | 390px validado com colunas ~51px |
| Vista Lista / Dia desktop | — | **Parcialmente validado** | Sem alterações nesses componentes; smoke Semana mobile OK |

Screenshots: `%TEMP%\cursor\screenshots\stage-51-5-*`.

## 9. Problemas conhecidos e limitações

| Item | Nota |
|------|------|
| Células desktop com muitos eventos | Continua a mostrar até 4 pills + «+N mais»; densidade alta em dias muito cheios — comportamento pré-existente |
| Pills no mês desktop | Texto pequeno por design (51.1); legível após fix estrutural, sem aumento de altura nesta etapa |
| Validação multi-mês no browser | Recomendado smoke manual em Fev/Mar 2026 antes de merge se a equipa quiser 100% cobertura visual |

## 10. Estado final Git

```
## Stage-51.5-Correcao-vista-mes
 M client/src/components/appointments/MonthCalendar.tsx
 M client/src/styles/appointments-calendar.css
?? client/src/components/appointments/MonthCalendar.test.tsx
?? docs/reports/stage-51-5-month-view-fix.md
```

**Pendente de revisão e commit manual pelo utilizador.** Nenhum commit/merge/push realizado pelo agente.

## 11. Recomendação

**Aceitar a Stage 51.5 para revisão:** a causa raiz (42 `col` numa row) foi corrigida com grid 7×6; desktop e mobile (390px) mostram colunas uniformes sem overflow de página; testes e build passam; funcionalidades 51.3/51.4 preservadas no código tocado.

---

## CONTEXTO PARA A PRÓXIMA IA

- Branch **`Stage-51.5-Correcao-vista-mes`** a partir de `develop` @ `9b50d2d` (51.4 mergeada).
- **Fix principal:** `MonthCalendar` usa `.month-calendar__weekdays` / `.month-calendar__weeks` com CSS Grid 7 colunas; **não** usar uma única Bootstrap `row` com 42 `col`.
- **Removido:** mobile `min-width: 40rem` + `overflow-x` na grelha mensal.
- **Testes:** `MonthCalendar.test.tsx` novo; suite **1373/126**.
- **Relatório:** este ficheiro; screenshots `stage-51-5-*`.
- **Não** iniciar Stage 51.6 automaticamente.
- **Não** alterar `appointmentServiceColor` / filtros salvo pedido explícito.
