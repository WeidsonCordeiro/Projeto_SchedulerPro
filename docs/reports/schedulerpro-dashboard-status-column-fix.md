# SchedulerPro — Dashboard: reversão cabeçalho + correcção coluna Status

**Data:** 2026-11-05  
**Referências:** [`schedulerpro-dashboard-tablet-header-fix.md`](./schedulerpro-dashboard-tablet-header-fix.md) (correcção revertida), [`schedulerpro-dashboard-mobile-ux-improvements.md`](./schedulerpro-dashboard-mobile-ux-improvements.md), [`schedulerpro-dashboard-mobile-implementation.md`](./schedulerpro-dashboard-mobile-implementation.md)

---

## 1. Interpretação incorrecta anterior

A etapa [`schedulerpro-dashboard-tablet-header-fix.md`](./schedulerpro-dashboard-tablet-header-fix.md) tratou a compressão do botão **Abrir agenda** no cabeçalho como problema principal. A validação visual indicou que o sintoma real era o badge **Agendado** na **coluna Status** da tabela de agendamentos (768–1199px).

**Validação visual desta correcção:** não executada pelo agente.

---

## 2. Reversão pontual no cabeçalho

**Removido** (introduzido em tablet-header-fix) dentro de `@media (min-width: 768px) and (max-width: 1199.98px)`:

- `.dashboard-page .page-header` — `flex-direction: column`, `flex-wrap: nowrap`, `justify-content: flex-start`
- `.dashboard-page .page-actions` — `align-self`, `flex: 0 0 auto`, `max-width`, etc.
- `.dashboard-page .page-actions > *` — `min-width: max-content`, `flex-shrink: 0`
- `.dashboard-page .page-actions .btn` — `flex: 0 0 auto` sem `min-width` de acção

**Restaurado** (estado pós-UX, pré-tablet-header-fix):

- `.dashboard-page .page-header` — `flex-wrap: wrap`, `gap: 0.75rem 1rem`
- `.dashboard-page .page-actions` — `flex: 1 1 100%`, `justify-content: flex-start`
- `.dashboard-page .page-actions .btn` — `min-width: var(--sp-btn-action-min-width)`, `flex: 0 1 auto`

**Preservado:** `section.dashboard-page`, `data-testid="dashboard-open-agenda"`, lista mobile accordion, regras `.dashboard-agenda-card` (excepto Status, abaixo).

---

## 3. Causa real — compressão do badge Status

Na mesma media query, regras da **rodada 1** (tabela tablet):

| Regra anterior | Efeito |
|----------------|--------|
| `.dashboard-agenda-card .status-badge-80 { min-width: 0; white-space: normal; }` | Anulava o global `min-width: 80px` e permitia compressão do texto «Agendado» |
| `th, td { min-width: 0 }` + `table-layout: auto` | Coluna Status (~11% no `colgroup`) encolhia demais |

---

## 4. Correcção da coluna Status (768–1199.98px)

**Substituído** o bloco `status-badge-80` comprimido por:

```css
.dashboard-agenda-card .dashboard-table th:last-child,
.dashboard-agenda-card .dashboard-table td:last-child {
  min-width: 5.75rem;
  white-space: nowrap;
  width: 1%;
}

.dashboard-agenda-card .status-badge-80 {
  display: inline-block;
  min-width: 80px;
  white-space: nowrap;
}
```

**Reforço de scroll interno** (tabela, não a página):

```css
.dashboard-agenda-card .dashboard-table {
  min-width: max(100%, 40rem);
}
```

(junto a `table-layout: auto` e `.table-responsive { overflow-x: auto }` já existentes)

---

## 5. Comportamento por breakpoint

| Faixa | Comportamento |
|-------|----------------|
| **768–1199px** | Badge Status com largura mínima; coluna com `min-width`; scroll horizontal só em `.table-responsive` se necessário |
| **≥1200px** | `table-layout: fixed`, seis colunas — inalterado |
| **&lt;768px** | Lista compacta expansível — inalterada |

---

## 6. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Revert header + fix Status + `min-width` tabela (tablet) |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Teste badge «Agendado» + `status-badge-80` no desktop surface |
| `docs/reports/schedulerpro-dashboard-status-column-fix.md` | Este relatório |

**Não alterados:** `DashboardAppointments.tsx` (markup), APIs, Relatórios, `PageHeader.tsx`.

---

## 7. Git (read-only no início)

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `cb6427814205c8006be665d621444a08b11959a1` |

**Sem commit.**

---

## 8. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm test -- DashboardPage.test.tsx` | **22 passed**, 0 failed (~8s) |
| `npm run build` | **exit 0** (~9s) |

Novo teste: `renders the scheduled status badge on the desktop appointment table` — texto «Agendado», classes `badge` e `status-badge-80` em `dashboard-today-agenda-desktop`.

---

## 9. Checklist — validação visual manual

- [ ] **768 / 992 / 1024 / 1199px:** badge «Agendado» legível, sem corte horizontal; scroll só dentro da tabela se o viewport for estreito
- [ ] **1200px+:** tabela desktop igual à anterior
- [ ] **&lt;768px:** accordion mobile intacto
- [ ] Cabeçalho **sem** column layout forçado (comportamento flex-wrap UX)
- [ ] Outros estados (ex. «Confirmado», «Não compareceu») legíveis na coluna Status

---

## 10. Pendências

- Confirmar em dispositivo real se «Não compareceu» precisa de `min-width` maior na última coluna (~9rem).
- [`schedulerpro-dashboard-tablet-header-fix.md`](./schedulerpro-dashboard-tablet-header-fix.md) fica **obsoleto** quanto ao cabeçalho; manter como histórico.
