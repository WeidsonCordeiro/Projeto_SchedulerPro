# SchedulerPro — Etapa 5 — Alinhamento vistas Semanal e Diária (implementação)

**Data:** 02/11/2026  
**Branch:** `feature/appointments-week-day-alignment`  
**Commit de origem:** `d41529f` — *Merge pull request #122 from WeidsonCordeiro/feature/ui-company-page-step-4*  
**Auditoria de referência:** [`schedulerpro-appointments-week-day-alignment-audit.md`](./schedulerpro-appointments-week-day-alignment-audit.md)

---

## 1. Branch e estado Git

| Item | Valor |
|------|--------|
| Branch anterior | `develop` (alinhada com `origin/develop`) |
| Working tree antes da branch | Sem ficheiros **modificados** rastreados; ficheiro **untracked** `schedulerpro-appointments-week-day-alignment-audit.md` |
| Operação Git | `git switch -c feature/appointments-week-day-alignment` |
| Commit base | `d41529f` (Etapa 4 CompanyPage já integrada) |
| Commit / push | **Não executados** (manual pelo utilizador) |

---

## 2. Causas dos problemas (resumo)

| Vista | Causa (audit W1–W2 / D1–D3) |
|-------|-----------------------------|
| **Semana** | Cabeçalho e corpo em contentores flex separados; scroll vertical só no corpo → gutter da scrollbar desalinhava colunas. |
| **Dia** | Cabeçalho da data full-width com `bg-primary-subtle`; coluna de slots com o mesmo fundo → grelha toda azul; eixo 56px não reservado no header. |

---

## 3. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/appointments/WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx) | Scroll único + cabeçalho sticky; gutter `.calendar-time-gutter` |
| [`client/src/components/appointments/DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx) | Header row 56px + slot; remoção `bg-primary-subtle` da coluna de slots |
| [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Token `--calendar-time-gutter-width`, scroll/sticky, media queries @992/@991 |
| `docs/reports/schedulerpro-appointments-week-day-alignment-implementation.md` | Este relatório |

**Não alterados:** `MonthCalendar.tsx`, `MonthView.tsx`, toolbar/filtros Etapa 3, CompanyPage.

---

## 4. Solução — vista semanal

### Estrutura

```text
.week-calendar
└── .week-calendar-time-scroll          ← overflow-y + scrollbar-gutter: stable
    └── .week-calendar-time-grid
        ├── .week-calendar-day-headers  ← position: sticky; top: 0
        │   ├── .calendar-time-gutter
        │   └── ×7 .calendar-week-day-header
        └── .week-calendar-time-body
            ├── .calendar-time-gutter (rótulos HH:00)
            └── ×7 .calendar-week-day-column
```

- Cabeçalho e corpo partilham o **mesmo** contentor de scroll → a scrollbar afecta ambos igualmente.
- Gutter fixo via `--calendar-time-gutter-width: 56px` (classe `.calendar-time-gutter`), substituindo `style={{ width: 56 }}` inline.
- Destaque «hoje» na semana: `bg-primary-subtle` no header da coluna (**Etapa 5.1** remove o fundo azul da coluna de slots — ver §5.1).

### CSS principal (Etapa 5; colunas alinhadas na §5.1)

- `.week-calendar-time-scroll`: `overflow: auto`, `scrollbar-gutter: stable`, `min-height: 0`
- `.week-calendar-day-headers`: `sticky`, fundo branco (`--sp-surface`)
- @991: `min-width: 620px` em `.week-calendar-time-grid` (substitui `.week-calendar > *`)

---

## 5.1 — Correção final vista semanal (Etapa 5.1)

**Data:** 03/11/2026  
**Branch:** `feature/appointments-week-day-alignment` (sem operações Git nesta sub-etapa)

### 5.1.1 Causa exacta do desalinhamento

Mesmo com scroll único (§4), o cabeçalho e o corpo continuavam como **duas filas Flexbox independentes** (`d-flex` + `flex-fill` em [`WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx)). Cada fila calcula larguras dos sete dias **separadamente**; o `min-width: auto` implícito (texto/badge no header vs. slots vazios no corpo) produz **larguras de coluna diferentes** entre header e grelha.

Adicionalmente, regras `display: grid` adicionadas em CSS **não surtiam efeito** enquanto o markup mantinha `d-flex` (Bootstrap: `display: flex !important`), anulando a grelha partilhada.

### 5.1.2 Por que a implementação da Etapa 5 não resolveu

O scroll único alinha a **largura total** das duas filas ao mesmo contentor rolável (incl. `scrollbar-gutter: stable`), mas **não** impõe a mesma largura **por coluna** entre duas filas flex distintas — problema análogo ao que o mês evita com `grid-template-columns` idêntico em weekdays e weeks (audit §3.3).

### 5.1.3 Correção aplicada

| Área | Alteração |
|------|-----------|
| **Markup** | Removidos `d-flex` e `flex-fill` de `.week-calendar-day-headers` e `.week-calendar-time-body`; removido `bg-primary-subtle` de `.calendar-week-day-column` (dia actual mantém hook `calendar-week-day-column-today` sem fundo azul). |
| **CSS** | `.week-calendar-day-headers` e `.week-calendar-time-body`: `display: grid; grid-template-columns: var(--calendar-time-gutter-width) repeat(7, minmax(0, 1fr)); width: 100%; box-sizing: border-box`. Gutter na semana: `.week-calendar .calendar-time-gutter { flex: unset; width: auto; }`. `min-width: 0` em `.calendar-week-day-header` e `.calendar-week-day-column` (selector do header corrigido de `.week-calendar-day-header` → `.calendar-week-day-header`). |

Sem margens ou pixels de compensação arbitrários.

### 5.1.4 Fundo azul semanal

- **Mantido:** `bg-primary-subtle` + `calendar-week-day-header-today` no cabeçalho do dia actual.
- **Removido:** `bg-primary-subtle` da coluna de slots (`calendar-week-day-column-today`).
- Zebra horária (`.week-calendar .border-bottom:nth-child(even)`) e blocos de agendamento **inalterados**.

### 5.1.5 Ficheiros alterados (5.1)

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/appointments/WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx) | Grid-friendly markup; azul só no header |
| [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Grelha partilhada header/corpo; selector header |
| `docs/reports/schedulerpro-appointments-week-day-alignment-implementation.md` | Secção 5.1 |

**Não alterados:** `DayCalendar.tsx`, `MonthCalendar.tsx`, toolbar, CompanyPage.

### 5.1.6 Testes e build (5.1)

| Comando | Resultado |
|---------|-----------|
| `CalendarView.test.tsx`, `MonthCalendar.test.tsx`, `MonthView.test.tsx`, `CalendarTimeGridEvent.test.tsx`, `calendarTimeGridLayout.test.ts` | **50/50** OK |
| `npm test -- --run` | **1439/1439** OK (~710s) |
| `npm run build` | **exit 0** OK (`tsc -b` + Vite ~15s) |

### 5.1.7 Critérios para nova validação manual (utilizador)

### Semana

- [ ] Cada `border-start` do cabeçalho alinha verticalmente com a coluna de slots por baixo, com **scroll vertical longo**
- [ ] Gutter 56px alinhado entre célula vazia do header e rótulos `HH:00`
- [ ] Dia actual: faixa azul **só** no cabeçalho; coluna de slots com fundo neutro e zebra como os outros dias
- [ ] Scroll horizontal @≤991, clique slot / evento / header dia

### Dia e mês (regressão)

- [ ] Vista **dia** como validada anteriormente (sem alterações nesta sub-etapa)
- [ ] Vista **mês** intacta (grelha, «hoje», eventos)

**Validação visual no browser:** não executada pelo agente na Etapa 5.1.

---

## 5. Solução — vista diária

### Markup

- `.calendar-day-header-row`: `d-flex` com `.calendar-time-gutter` (vazio) + `.calendar-day-header-slot` com data e `bg-primary-subtle` **só** quando `isToday`.
- `.day-calendar-time-body`: corpo horário inalterado em comportamento; coluna `.calendar-day-column-today` **sem** `bg-primary-subtle` (grelha neutra + zebra existente).
- Gutter 56px alinhado ao corpo.

### CSS

- `.calendar-day-header-row` / `.calendar-day-header-slot`: fundo e `min-width: 0`
- @991: `min-width: 620px` em `.calendar-day-header-row` e `.day-calendar-time-body` para scroll horizontal

---

## 6. Preservação da vista mensal

- Nenhuma alteração em [`MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx) nem selectors `.month-calendar__weekdays` / `.month-calendar__weeks`.
- Novas regras scoped a `.week-calendar-*`, `.day-calendar-*`, `.calendar-surface--time-grid`, `.calendar-time-gutter` — **não** aplicadas a `.month-calendar`.
- Testes `MonthCalendar.test.tsx` e `MonthView.test.tsx`: **OK**.

---

## 7. Personalizações anteriores

- Etapa 3 (filtros Estado `borderRadius: 5px`, toolbars): **não tocadas**.
- CompanyPage / Etapa 4: **não tocadas**.

---

## 8. Testes executados

| Comando | Resultado |
|---------|-----------|
| `CalendarView.test.tsx`, `MonthCalendar.test.tsx`, `MonthView.test.tsx`, `CalendarTimeGridEvent.test.tsx`, `calendarTimeGridLayout.test.ts` | **50/50** OK |
| `npm test -- --run` | **1439/1439** OK |

---

## 9. Build

```text
npm run build  (tsc -b && vite build)
→ exit 0 OK
```

---

## 10. Limitações e riscos

| Risco | Nota |
|-------|------|
| `scrollbar-gutter: stable` | Suporte variável em browsers antigos; fallback = pequeno desvio residual **Hipótese** |
| Sticky header semana | Sobrepor eventos ao scrollar para cima — z-index 4; validar visualmente |
| Indentação TSX WeekCalendar | Funcional; pode formatar num commit futuro sem mudar lógica |
| Semana «hoje» coluna de slots | **Corrigido na Etapa 5.1** — azul só no cabeçalho |

---

## 11. Validação manual (utilizador)

### Semana

- [ ] Colunas do cabeçalho alinhadas com colunas horárias com scroll vertical longo (**revalidar após §5.1**)
- [ ] Gutter 56px alinhado
- [ ] Scroll horizontal @tablet/mobile preservado
- [ ] Clique slot / evento / header dia
- [ ] Dia actual: azul só no cabeçalho; coluna de slots neutra (**§5.1**)

### Dia

- [ ] Faixa azul do cabeçalho **não** cobre coluna das horas
- [ ] Grelha de slots fundo neutro (zebra); «hoje» legível no cabeçalho
- [ ] Scroll e interacções OK

### Mês (regressão)

- [ ] Grelha e destaque circular «hoje» intactos

**Validação visual no browser:** não executada pelo agente nesta etapa.

---

## 12. Contexto para outra IA

- Problema raiz semana (colunas): **filas flex independentes** (audit W1); fix Etapa 5 = **um** scrollport; fix **5.1** = **grid** `56px repeat(7, minmax(0, 1fr))` em header e corpo + remover `d-flex`/`flex-fill`.
- Problema raiz dia: **markup full-width** + `bg-primary-subtle` na coluna (audit D1–D3); fix = **split header 56px + slot** e remover bg da coluna.
- Próximo passo sugerido: validação manual §11; depois commit na branch `feature/appointments-week-day-alignment`.
