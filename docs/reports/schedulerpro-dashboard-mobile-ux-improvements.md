# SchedulerPro — Dashboard: melhorias UX tablet e mobile (rodada 2)

**Data:** 2026-11-05  
**Referências:** [`schedulerpro-dashboard-mobile-implementation.md`](./schedulerpro-dashboard-mobile-implementation.md), [`schedulerpro-dashboard-reports-mobile-audit.md`](./schedulerpro-dashboard-reports-mobile-audit.md)

---

## 1. Problemas identificados (validação visual)

1. **Tablet (768px–1200px):** o botão «Abrir agenda» no cabeçalho ficava comprimido — layout `.page-header` em linha com `min-width: 0` nos filhos de `.page-actions`, sem regras de quebra entre 768px e 1199px (só mobile ≤767px empilha o header).
2. **Mobile:** listagem em cards completos por agendamento aumentava demasiado o scroll vertical com muitos itens (ex.: 20 agendamentos no dia).

---

## 2. Causa técnica

| Problema | Causa |
|----------|--------|
| Botão comprimido | [`PageHeader`](../../client/src/components/common/PageHeader.tsx) + [`.page-header`](../../client/src/index.css) global: flex row 768–1199px; `.page-actions > * { min-width: 0 }` permite encolher o `Link` botão |
| Lista mobile longa | [`AppointmentMobileCards`](../../client/src/pages/dashboard/DashboardAppointments.tsx) (rodada 1) renderizava card-body completo (data, cliente, serviço, profissional, badge) por item, sem limite de altura |

Regras de tabela tablet da rodada 1 (`.dashboard-agenda-card` 768–1199.98px) **mantidas**.

---

## 3. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | `className="dashboard-page"` nos `<section>`; `data-testid="dashboard-open-agenda"` no link |
| [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) | `AppointmentMobileList` — linha compacta + accordion (estado local); scroll container |
| [`index.css`](../../client/src/index.css) | Tablet: `.dashboard-page .page-header` / `.page-actions`; mobile: `.dashboard-appointment-mobile-*` |
| [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Testes lista expansível, scroll, tablet/desktop |
| `docs/reports/schedulerpro-dashboard-mobile-ux-improvements.md` | Este relatório |

**Não alterados:** APIs, RBAC, Relatórios, `PageHeader.tsx` global, dependências.

---

## 4. Solução tablet (768–1199.98px)

Dentro da media query existente do dashboard agenda, acrescentou-se (scoped):

- `.dashboard-page .page-header` — `flex-wrap`, `align-items: flex-start`, gap
- `.dashboard-page .page-actions` — `flex: 1 1 100%`, `flex-wrap`, alinhamento à esquerda
- `.dashboard-page .page-actions .btn` — `min-width: var(--sp-btn-action-min-width)`, `white-space: nowrap`, `width: auto`

Efeito: o botão passa para a linha seguinte quando necessário, sem esconder funcionalidades e sem alterar outras páginas.

---

## 5. Solução mobile (&lt;768px)

Substituição dos cards por **lista compacta**:

**Linha (sempre visível):** horário · cliente (truncate) · serviço (truncate) · badge · chevron.

**Painel expandido:** dia + profissional (`<dl>`).

**Accordion:** `useState<string | null>` por secção (`AppointmentMobileList`); um item expandido de cada vez; recolher ao tocar de novo.

**Acessibilidade:** `<button type="button">` na linha; `aria-expanded`, `aria-controls`, painel com `id` estável; `hidden` quando fechado; `:focus-visible` no CSS.

**Listas longas:** contentor `data-testid="{base}-mobile-scroll"` com `max-height: min(50vh, 28rem)` e `overflow-y: auto`. Cabeçalho do card (título + contagem) fica fora da área rolável.

---

## 6. Expansão — comportamento

1. Toque/clique na linha alterna `expandedId`.
2. Abrir item B fecha A (mesma secção).
3. Chevron `bi-chevron-down` / `bi-chevron-up` indica estado.
4. Sem links ou acções de negócio na lista mobile (apenas botões de expansão).

---

## 7. Estratégia para muitos registros

- Scroll **interno** na lista, não na página inteira.
- `max-height` relativo ao viewport (`min(50vh, 28rem)`) — listas curtas não ficam com altura fixa artificial.
- Linhas compactas (~uma linha + painel opcional).

---

## 8. Desktop (≥1200px)

- Tabela com seis colunas e `table-layout: fixed` (regra ≥1200px) inalterada.
- KPIs e markup de header preservados.

---

## 9. Git no início da implementação

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `cb6427814205c8006be665d621444a08b11959a1` |
| Working tree | Alterações da rodada 1 dashboard + docs untracked |

**Operações Git:** nenhuma.

---

## 10. Testes executados e resultados

| Comando | Resultado |
|---------|-----------|
| `npm test -- DashboardPage.test.tsx` | **21 passed**, 0 failed (~10s) |
| `npm run build` | **exit 0** (~11s) |
| Suite completa | **Não executada nesta etapa** |

Cobertura nova/actualizada:

- Linha compacta; painel `hidden` quando fechado
- Expandir/recolher e accordion (um aberto)
- 20 itens + `dashboard-today-agenda-mobile-scroll`
- Empty state; superfícies desktop/mobile
- `dashboard-page`, link `dashboard-open-agenda`, 6 columnheaders desktop

---

## 11. Limitações conhecidas

- **Validação visual manual não executada** pelo agente (tablet wrap do botão, scroll com 20 itens reais, chevron, focus).
- Conteúdo em painéis `hidden` permanece no DOM (acessível a leitores quando expandido; RTL ainda encontra texto no DOM).
- Suite global não reexecutada; falhas anteriores noutros ficheiros não foram reavaliadas.

---

## 12. Checklist — validação visual manual

- [ ] **768 / 992 / 1024 / 1199px:** «Abrir agenda» legível, área de clique confortável, sem texto cortado
- [ ] **1200px+:** header e tabela como antes
- [ ] **360 / 390 / 430 / 767px:** linha compacta legível; expandir mostra dia e profissional
- [ ] **20 agendamentos:** scroll só na lista; cabeçalho «Agenda do dia» fixo no card
- [ ] **Poucos agendamentos:** lista não ocupa altura vazia excessiva
- [ ] Teclado: Tab + Enter/Space na linha
- [ ] Tabela tablet: colunas ainda acessíveis (rodada 1)

---

## 13. Continuidade

- Padrão accordion isolado em `DashboardAppointments`; extrair componente partilhado só se outra página precisar.
- Ajuste fino de `max-height` ou grid da linha mobile após QA.
- Após QA visual, commit autorizado pelo responsável (fora do âmbito do agente).
