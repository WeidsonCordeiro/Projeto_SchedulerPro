# SchedulerPro — Padronização global de botões (Etapa 1)

**Data:** 02/11/2026  
**Tipo:** Implementação frontend (CSS) — sem alterações de negócio, API ou Redux

---

## 1. Objetivo

Implementar a **etapa 1** definida em [`schedulerpro-global-button-ui-audit.md`](./schedulerpro-global-button-ui-audit.md):

1. Tokens CSS para dimensões de botões.
2. Padronização visual dos botões de **gestão** em `.table-actions` (Editar, Ativar, Desativar, Excluir, Convidar).
3. Largura uniforme dos botões **«Salvar {dia}»** na Disponibilidade.

Fora de scope nesta etapa: Nova exceção mobile, timeline de exceções, Portal, toolbars de Agendamentos/Relatórios, CompanyPage, componente React `Button`.

---

## 2. Git

| Item | Valor |
|------|--------|
| Branch base | `develop` (tracking `origin/develop`) |
| Branch criada | `feature/ui-button-standardization-step-1` |
| Commit / push / merge / PR | **Não executados** (manual pelo utilizador) |

**Nota:** Na criação da branch existia o ficheiro não rastreado `docs/reports/schedulerpro-global-button-ui-audit.md`; o utilizador autorizou prosseguir. Esse relatório não faz parte desta alteração de código.

---

## 3. Análise realizada

- Auditoria global de botões (I1 largura Salvar, I4 coluna Ações).
- Correcção anterior de altura/alinhamento: [`schedulerpro-header-availability-layout-fix.md`](./schedulerpro-header-availability-layout-fix.md) — regras `.availability-day-save` e navbar **preservadas**; apenas a largura do botão Salvar foi ajustada.
- Consumidores de `.table-actions` confirmados:
  - [`ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx)
  - [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx)
  - [`EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx)
  - [`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx)
- Labels «Salvar {dia}» via [`DAY_LABELS`](../../client/src/config/dayOfWeek.ts); maior comprimento: **Segunda-feira** / **Quarta-feira** → texto `Salvar Segunda-feira`.

---

## 4. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Tokens `:root`, referências em `.btn`/`.btn-sm`, `.table-actions .btn`, `.availability-day-save .btn` |
| `docs/reports/schedulerpro-button-standardization-step-1.md` | Este relatório |

**Nenhum** ficheiro TSX alterado.

---

## 5. Tokens CSS criados ou reutilizados

Adicionados em `:root` (valores alinhados às métricas já usadas literalmente em L44–55):

| Token | Valor | Uso |
|-------|-------|-----|
| `--sp-btn-min-height` | `2.5rem` | `button`, `.btn` |
| `--sp-btn-sm-min-height` | `2.25rem` | `.btn-sm` |
| `--sp-btn-padding-x` | `1rem` | `.btn` |
| `--sp-btn-sm-padding-x` | `0.75rem` | `.btn-sm` |
| `--sp-btn-action-min-width` | `6.75rem` | `.table-actions .btn` |
| `--sp-btn-action-gap` | `0.5rem` | `.table-actions` `gap` |
| `--sp-btn-save-min-width` | `11.75rem` | `.availability-day-save .btn` |

Regras `.btn-primary`, estados `disabled`, spinners e variantes Bootstrap **inalteradas**.

---

## 6. Classes e selectors alterados

### 6.1 Base `.btn` / `.btn-sm`

Literais `2.5rem`, `2.25rem`, `1rem`, `0.75rem` substituídos por `var(--sp-btn-*)` — comportamento visual equivalente, fonte única de verdade.

### 6.2 `.table-actions`

```css
.table-actions {
  gap: var(--sp-btn-action-gap);
}
.table-actions .btn {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  min-width: var(--sp-btn-action-min-width);
  text-align: center;
  white-space: nowrap;
}
```

**Decisão:** `min-width` uniforme + `inline-flex` centralizado em vez de grid fixo de colunas, para não forçar largura de tabela quando linhas têm conjuntos diferentes de acções (ex.: Employees com/sem reactivação). Com a mesma largura mínima, botões na mesma posição relativa (1.º, 2.º, 3.º) tendem a alinhar verticalmente entre linhas.

**Escopo:** selector limitado a `.table-actions` — **não** afecta `.calendar-day` nem outros `.btn` fora de tabelas.

### 6.3 `.availability-day-column .availability-day-save .btn`

Substituído `width: auto` por:

- `min-width: var(--sp-btn-save-min-width)`
- `display: inline-flex`, `justify-content: center`, `text-align: center`
- Mantidos: `height: auto`, `align-self: center`, contentor `.availability-day-save` (grid row 3, `align-self: end`, etc.)

**Decisão:** `min-width` (não `width` fixo) para «Salvando...» + spinner poder expandir ligeiramente sem quebrar layout.

---

## 7. Dimensões finais por categoria

| Categoria | Altura | Largura |
|-----------|--------|---------|
| Botão default (`.btn`) | `min-height: 2.5rem` | conteúdo + padding `1rem` inline |
| Botão pequeno (`.btn-sm`) | `min-height: 2.25rem` | conteúdo + padding `0.75rem` inline |
| Gestão em tabela (`.table-actions .btn`) | herda `.btn-sm` onde aplicável | **mín.** `6.75rem`, texto centrado, nowrap |
| Salvar dia (disponibilidade) | herda `.btn-sm` + `height: auto` (correcção anterior) | **mín.** `11.75rem`, texto centrado |

---

## 8. Componentes afetados (via CSS)

- Tabelas: Serviços, Clientes, Funcionários, lista de Agendamentos.
- Disponibilidade: sete editores de dia (`AvailabilityDayEditor` × `DAY_DISPLAY_ORDER`).

Componentes **não** alterados nesta etapa: excepções, Navbar, PageHeader, Portal, calendário toolbar, CompanyPage.

---

## 9. Testes executados

Direccionados (exit **0**):

```text
ServicesPage.test.tsx, ClientsPage.test.tsx, EmployeesPage.test.tsx,
AvailabilityDayEditor.test.tsx, AvailabilityPage.test.tsx
→ 5 ficheiros, 98 testes passed

AppointmentsListView.test.tsx
→ 1 ficheiro, 9 testes passed
```

Suite completa:

```text
npm test -- --run
→ 131 ficheiros, 1439 testes passed
→ duração ~357s
```

**Testes TSX:** não foi necessário alterar asserts; testes usam roles/nomes e `.table-actions` estruturalmente, não larguras CSS.

---

## 10. Build

```text
npm run build
→ exit 0
→ tsc -b && vite build (~6.5s)
→ aviso Rollup: chunk JS > 500 kB (pré-existente)
```

---

## 11. Validação visual

| Item | Estado |
|------|--------|
| Browser manual (Serviços, Clientes, Funcionários, Disponibilidade) | **Pendente** — não executada pelo agente |
| Header / altura Salvar (tarefa anterior) | Preservada em CSS; revalidar visualmente recomendado |

Checklist sugerida para o utilizador:

- [ ] Serviços — coluna Ações alinhada entre linhas (Editar / Desativar|Ativar / Excluir).
- [ ] Clientes — Editar / Convidar / Excluir com mesma largura mínima.
- [ ] Funcionários — acções outline consistentes.
- [ ] Disponibilidade — sete botões «Salvar …» com mesma largura visual.
- [ ] Toggle «Aguarde...» em Serviços — texto legível dentro de `6.75rem`.

---

## 12. Riscos e limitações

- **`--sp-btn-action-min-width`:** pode aumentar ligeiramente a largura mínima da coluna Ações e o scroll horizontal em `.table-responsive` (min-width 680px já existente). Valor calibrado para «Desativar»/«Convidar»; «Aguarde...» pode precisar de ~7.25rem se visualmente apertado.
- **`--sp-btn-save-min-width`:** fixo para PT; traduções futuras podem exigir ajuste.
- **Alinhamento perfeito entre linhas** com número diferente de botões visíveis continua limitado pelo flex wrap (melhoria parcial vs. estado anterior, não grid rígido).
- Ficheiro de auditoria global ainda **untracked** na working tree se não commitado pelo utilizador.

---

## 13. Contexto para outra IA

1. **Problema:** botões de gestão com largura = texto; Salvar dia com largura variável por nome do dia.
2. **Solução:** tokens em `:root` + regras scoped `.table-actions .btn` e `.availability-day-save .btn` em [`index.css`](../../client/src/index.css).
3. **Próximas etapas (audit):** `.section-actions` / Nova exceção mobile, CSS `.exception-item` @575px, harmonizar `btn` vs `btn-sm` em toolbars — **não implementadas aqui**.
4. **Regressão funcional:** nenhuma alteração TSX; testes 1439/1439 verdes; build OK.

---

*Fim do relatório — alterações na working tree, sem commit.*
