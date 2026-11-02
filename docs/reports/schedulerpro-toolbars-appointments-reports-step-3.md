# SchedulerPro — Toolbars Agendamentos e Relatórios (Etapa 3)

**Data:** 02/11/2026  
**Tipo:** Implementação frontend (markup mínimo + CSS) — sem alterações de negócio, API ou Redux

---

## 1. Objetivo

Harmonizar toolbars das páginas **Agendamentos** e **Relatórios**: altura e padding dos botões segmentados, espaçamento, alinhamento vertical e comportamento responsivo, continuando os tokens da [Etapa 1](./schedulerpro-button-standardization-step-1.md).

Referência: auditoria global [I6](./schedulerpro-global-button-ui-audit.md) (mistura `btn` / `btn-sm` no mesmo toolbar).

---

## 2. Git

| Item | Valor |
|------|--------|
| Operações Git | **Não executadas** (responsabilidade do utilizador) |

---

## 3. Problemas encontrados

| Problema | Causa técnica | Onde |
|----------|---------------|------|
| **I6** — Hoje / ‹ › (`btn-sm`) mais baixos que Mês–Lista (`btn` só) | [`index.css`](../../client/src/index.css) aplica `min-height: var(--sp-btn-min-height)` (2.5rem) a `.btn`; `.btn-sm` reduz para 2.25rem — botões de vista omitiam `btn-sm` | [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) |
| Filtros de estado vs. «Limpar filtros» | Toggles sem `btn-sm`; limpar com `btn-sm` | [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx) |
| Relatórios — grupo de período | Botões já `btn-sm`; contentor sem `btn-group-sm` | [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) |
| Mobile relatórios | `.filter-bar` só scroll horizontal; sem wrap em ecrãs estreitos | [`index.css`](../../client/src/index.css) `.filter-bar` |
| **Pós-Etapa 3** — cantos quadrados ao wrap | `btn-group` + `flex-wrap`: Bootstrap arredonda só `:first`/`:last` no DOM, não por linha visual | Filtros Estado em [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx); `.filter-bar` @767 |

**Fora de scope (inalterado):** [`PortalHomePage.tsx`](../../client/src/pages/portal/PortalHomePage.tsx), `.week-calendar .btn-group`, empty states de Agendamentos.

---

## 4. Ficheiros analisados

| Ficheiro | Papel |
|----------|--------|
| [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) | Toolbar navegação + vistas |
| [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx) | Filtros estado / funcionário |
| [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | Composição toolbar (sem alteração) |
| [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) | Toolbar período |
| [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Layout `.calendar-toolbar*` |
| [`index.css`](../../client/src/index.css) | `.filter-bar` global |
| Testes: ViewSwitcher, ScheduleFilters, AppointmentsPage, ReportsPage | Regressão |

---

## 5. Ficheiros modificados (estado final na working tree)

### 5.1 Alterações do agente — **mantidas**

| Ficheiro | Alteração |
|----------|-----------|
| [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) | `btn-sm` nos botões Mês / Semana / Dia / Lista |
| [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx) | `btn-sm` nos toggles de estado (além do ajuste manual abaixo) |
| [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) | `btn-group-sm` no grupo de período |
| [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | Tokens sm na toolbar (`min-height`, `padding-inline`); `gap` em `.calendar-toolbar` e filtros; nav flex; `gap` em `.calendar-toolbar-filters-status-group.btn-group`; select funcionário com `min-height` sm |
| [`index.css`](../../client/src/index.css) | `.filter-bar` (flex, gap, min-height sm); @767 wrap do período + `border-radius: 0.6rem` e `margin-left: 0` |

Formatação Prettier em selectors longos de [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) (calendário) — **sem impacto visual**.

### 5.2 Alterações **manuais do utilizador**

| Ficheiro | Alteração | Motivo |
|----------|-----------|--------|
| [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx) | `style={{ borderRadius: "5px" }}` em cada botão do filtro **Estado** | Cantos quadrados ao wrap do `btn-group`; arredondamento desejado após testes visuais |
| [`AppointmentScheduleFilters.tsx`](../../client/src/components/appointments/AppointmentScheduleFilters.tsx) | Import de `APPOINTMENT_STATUS_LABELS` numa linha | Cosmético |

O utilizador **revalidou testes e UI** após estes ajustes — ver §8.6 e §9.

### 5.3 Código do agente **removido** pelo utilizador (não está no repositório final)

Durante iterações pós-Etapa 3, o agente tinha adicionado em [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) blocos que **foram apagados** antes do estado final commitável:

```css
/* Não presente no ficheiro actual */
.calendar-toolbar-filters-status-group.btn-group > .btn {
  border-radius: 0.6rem; /* antes também 0.25rem numa iteração intermédia */
  flex: 0 0 auto;
  margin-left: 0;
}

.calendar-toolbar-views.btn-group {
  gap: var(--sp-btn-action-gap);
}
.calendar-toolbar-views.btn-group > .btn {
  border-radius: 0.6rem;
  margin-left: 0;
}
```

**Efeito no estado final:**

- **Estado:** mantém-se só `gap` no grupo (agente); arredondamento via **inline `5px`** (utilizador), não CSS `0.6rem` nem reset de `margin-left` no CSS.
- **Mês | Semana | Dia | Lista:** permanece `btn-group` Bootstrap + `btn-sm` (agente); **sem** desanexação/`gap`/`margin-left: 0` que o agente tinha proposto para vistas.

Este relatório foi actualizado para reflectir autoria agente vs. utilizador e o **estado final** do código.

---

## 6. Solução implementada

### 6.1 Markup (estado final)

- Vistas do calendário: `` `btn btn-sm ${variant}` `` (agente).
- Filtros de estado: `` `btn btn-sm ${variant}` `` (agente) + `style={{ borderRadius: "5px" }}` (utilizador).
- Relatórios: `className="btn-group btn-group-sm"` no período (agente).

Handlers, ARIA, labels e lógica de filtros/relatórios **inalterados**.

### 6.2 CSS — Agendamentos (`appointments-calendar.css`) — **estado final**

| Selector | Regra | Origem |
|----------|--------|--------|
| `.calendar-toolbar` | `gap: var(--sp-btn-action-gap)` | Agente |
| `.calendar-toolbar-nav` | `display: flex; align-items: center` | Agente |
| `.calendar-toolbar .btn`, `.calendar-toolbar-filters .btn` | `min-height`, `padding-inline` via `--sp-btn-sm-*`; `inline-flex` centrado | Agente |
| `.calendar-toolbar-filters` | `gap: var(--sp-btn-action-gap) 1rem` | Agente |
| `.calendar-toolbar-filters-employee .form-select` | `min-height: var(--sp-btn-sm-min-height)` | Agente |
| `.calendar-toolbar-filters-status-group.btn-group` | `gap: var(--sp-btn-action-gap)` | Agente |
| Filtros Estado — cantos | `border-radius: 5px` via **inline** no TSX | Utilizador |

**Não aplicado no ficheiro final (removido pelo utilizador):** regras `.calendar-toolbar-filters-status-group.btn-group > .btn` e `.calendar-toolbar-views.btn-group` documentadas na §5.3.

**Mês | Semana | Dia | Lista:** grupo `btn-group btn-group-sm` sem CSS extra de desanexação; cantos intermédios continuam sujeitos ao Bootstrap, com `.btn { border-radius: 0.6rem }` global onde não sobrescritos pelo grupo.

Regras mobile existentes (`.calendar-toolbar` coluna, `flex: 1` nos segmentos @767) **preservadas**. Navegação ‹ Hoje › **inalterada**.

### 6.3 CSS — Relatórios (`index.css`)

| Selector | Regra |
|----------|--------|
| `.filter-bar` | `display: flex; flex-wrap: wrap; gap: var(--sp-btn-action-gap)` |
| `.filter-bar .btn-group .btn` | `min-height: var(--sp-btn-sm-min-height)`; `inline-flex` centrado |
| `@media (max-width: 767.98px)` | `.filter-bar .btn-group { flex-wrap: wrap; gap; max-width: 100% }` |
| `@media (max-width: 767.98px)` | `.filter-bar .btn-group > .btn { border-radius: 0.6rem; margin-left: 0 }` — **sem** `flex: 1` por botão |

**Não** aplicado `--sp-btn-action-min-width` (não são acções de tabela).

### 6.4 Tokens reutilizados (Etapa 1)

- `--sp-btn-sm-min-height`
- `--sp-btn-sm-padding-x`
- `--sp-btn-action-gap`

Nenhum token novo.

---

## 7. Comportamento responsivo

| Faixa | Agendamentos | Relatórios |
|-------|--------------|------------|
| ≥768px | Toolbar row `nowrap` (regra existente) | `.filter-bar` scroll ou wrap do contentor |
| ≤767px | Coluna + segmentos `width: 100%` / `flex: 1` (existente) | Grupo de período com `flex-wrap` |
| Desktop ≥992 | Inalterado face à etapa | Inalterado |

---

## 8. Testes executados

### 8.1 Dirigidos (uma execução)

```text
npm test -- --run AppointmentsViewSwitcher.test.tsx AppointmentScheduleFilters.test.tsx AppointmentsPage.test.tsx ReportsPage.test.tsx
→ exit 0 — 4 ficheiros, 55 testes
```

### 8.2 Suite completa

```text
npm test -- --run
→ 1ª execução: 1 timeout flake em AppointmentsPage ("still opens quick details on week after filtering other statuses")
→ reexecução do teste isolado: passou
→ 2ª suite completa: exit 0 — 131 ficheiros, 1439 testes (~567s)
```

### 8.3 Build

```text
npm run build
→ exit 0 — tsc -b && vite build (~16s)
→ aviso chunk > 500 kB (pré-existente)
```

---

### 8.4 Suite completa (correção wrap — 02/11/2026)

```text
npm test -- --run AppointmentScheduleFilters.test.tsx ReportsPage.test.tsx
→ exit 0 — 15 testes

npm test -- --run
→ exit 0 — 131 ficheiros, 1439 testes (~547s)

npm run build
→ exit 0 — tsc -b && vite build (~8.5s)
```

### 8.5 Raio 0.6rem (UX pós-wrap — 02/11/2026)

```text
npm test -- --run AppointmentScheduleFilters.test.tsx AppointmentsViewSwitcher.test.tsx ReportsPage.test.tsx
→ exit 0 — 18 testes

npm test -- --run
→ exit 0 — 131 ficheiros, 1439 testes (~538s)

npm run build
→ exit 0 — tsc -b && vite build (~23s)
```

Feedback (agente): cantos `0.25rem` / proposta `0.6rem` em CSS — **não adoptados** no estado final de Agendamentos; utilizador preferiu `borderRadius: "5px"` inline nos filtros Estado (§5.2).

### 8.6 Validação final (utilizador — pós-ajustes manuais)

O utilizador executou testes e validou a UI **OK** após:

- remoção dos blocos CSS do agente em §5.3;
- `style={{ borderRadius: "5px" }}` nos botões de Estado.

Registo histórico de testes automatizados do agente (§8.1–8.5): suite **1439/1439** e `npm run build` OK antes/depois das iterações CSS; **aceite funcional final** confirmado pelo utilizador após as alterações manuais.

---

## 9. Validação visual

| Item | Estado |
|------|--------|
| Toolbars Etapa 3 + wrap | **OK** — utilizador confirmou testes e aspecto após ajustes manuais (02/11/2026) |
| Filtros **Estado** | **OK** — `borderRadius: "5px"` inline; `gap` no grupo (CSS agente) |
| Relatórios @767 | Mantém CSS agente (`0.6rem` + wrap); validação incluída no OK geral do utilizador |
| Mês–Lista | Layout `btn-group` Bootstrap (sem bloco CSS removido §5.3); OK na validação do utilizador |

Checklist (validado pelo utilizador):

- [x] Agendamentos — filtros **Estado** legíveis ao redimensionar (wrap + cantos `5px`)
- [x] Agendamentos — altura/alinhamento toolbar (Etapa 3 + testes)
- [x] Relatórios — período utilizável em mobile
- [x] Testes frontend — OK após alterações manuais

Referência histórica: cantos quadrados nos filtros Estado (screenshots antes do fix manual) — resolvido com §5.2, não com CSS `0.6rem` do agente.

---

## 10. Limitações e pendências

- **`style` inline** nos filtros Estado (`borderRadius: "5px"`) — desvia da directriz «sem estilos inline» da Etapa 3; melhoria futura opcional: mover para `.calendar-toolbar-filters-status-group.btn-group > .btn { border-radius: 5px; margin-left: 0; }` e retirar o inline.
- Filtros Estado com **espaço** entre botões (`gap`) — mantido do agente; não é pílula contínua.
- Grupo **Mês–Lista** sem CSS de desanexação (bloco agente removido §5.3) — cantos intermédios podem continuar «segmentados» pelo Bootstrap.
- Teste `AppointmentsPage` pode ser flake sob carga da suite completa (não causado por toolbar).
- Portal (I7) não incluído nesta etapa.

---

## 11. Contexto para outra IA

1. **Problema:** `button, .btn { min-height: 2.5rem }` global + botões segmentados sem `btn-sm` = toolbar desalinhada (I6).
2. **Fix:** `btn-sm` explícito + CSS scoped `.calendar-toolbar*` e `.filter-bar` com `--sp-btn-sm-*`.
3. **Não usar** `--sp-btn-action-min-width` em toolbars segmentadas.
4. **Próximas etapas (auditoria):** Company input-group (etapa 6), Portal home (I7) — fora deste relatório.
5. **Regressão:** 1439/1439 e build OK (agente); utilizador confirmou OK após §5.2–5.3.
6. **Wrap Estado:** `gap` no grupo (CSS agente) + `borderRadius: "5px"` inline (utilizador). **Não** usar blocos `.calendar-toolbar-views` / `> .btn { 0.6rem }` — foram removidos.
7. **Relatórios @767:** mantém `border-radius: 0.6rem` + `margin-left: 0` do agente em [`index.css`](../../client/src/index.css).

---

*Fim do relatório — alterações na working tree, sem commit.*
