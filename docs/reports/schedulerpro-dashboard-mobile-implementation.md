# SchedulerPro — Dashboard responsivo (cards mobile + correção tablet)

**Data:** 2026-11-05  
**Referências:** [`schedulerpro-dashboard-reports-mobile-audit.md`](./schedulerpro-dashboard-reports-mobile-audit.md), [`schedulerpro-mobile-entity-listings-step-6-4d-2-implementation.md`](./schedulerpro-mobile-entity-listings-step-6-4d-2-implementation.md)

---

## 1. Data da implementação

2026-11-05 (código, testes automatizados e build; **validação visual manual não executada** nesta etapa).

---

## 2. Branch, HEAD e estado inicial do Working Tree

Inspeção read-only no início (sem commit, push, switch ou outras operações Git):

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `cb6427814205c8006be665d621444a08b11959a1` |
| Working tree (inicial) | Untracked: `docs/reports/schedulerpro-dashboard-reports-mobile-audit.md`; restante código tracked sem alterações staged |

**Operações Git durante a etapa:** nenhuma.

---

## 3. Problema identificado

1. **Mobile (&lt;768px):** as secções «Agenda do dia» e «Próximos agendamentos» renderizavam apenas tabela dentro de `.table-responsive`. A regra global em `@media (max-width: 767.98px)` impõe `min-width: 680px` às tabelas, provocando scroll horizontal na página.
2. **Tablet (768px–1199px):** a tabela ocupava a largura do card, mas colunas com `table-layout: fixed`, `text-nowrap`, `colgroup` rígido e badge com `min-width: 80px` geravam overflow de células; o card `.dashboard-agenda-card { overflow: hidden }` **cortava** conteúdo em vez de o tornar visível ou rolável de forma utilizável.
3. **Desktop (≥1200px):** comportamento desejado — manter tabela de seis colunas e hierarquia actual.

Relatórios, sidebar, calendário e listagens de entidades **não** foram alterados.

---

## 4. Causa técnica confirmada (overflow tablet 768–1199px)

| Factor | Efeito |
|--------|--------|
| `.dashboard-agenda-card { overflow: hidden }` | Clipa overflow horizontal das células |
| `.dashboard-table { table-layout: fixed }` + `colgroup` em % | Distribuição fixa; badge `min-width: 80px` na coluna ~11% força largura mínima interna |
| `text-nowrap` em Dia/Horário | Impede encolhimento nessas colunas |
| Padding de `main` (1rem em ≤991.98px) | Reduz largura útil do card |

A regra `min-width: 680px` **não** se aplica em ≥768px (só no bloco mobile), logo o problema tablet não vinha do 680px global e sim do **clipping + layout fixo**.

---

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/pages/dashboard/DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) | `buildAppointmentDisplay`, superfície dupla (tabela + cards), prop `listTestIdBase` |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | `listTestIdBase` nas duas instâncias |
| [`client/src/index.css`](../../client/src/index.css) | Media query tablet scoped; `table-layout: fixed` apenas ≥1200px; estilo `.dashboard-appointment-mobile-datetime` |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Helpers desktop/mobile, `describe("mobile appointment cards")`, testes de tabela scoped |
| `docs/reports/schedulerpro-dashboard-mobile-implementation.md` | Este relatório |

**Não alterados:** `ReportsPage`, APIs, RBAC, regra global `680px`, `table-compact`, entidades, sidebar.

---

## 6. Solução implementada

### Mobile (&lt;768px)

- Tabela mantida no DOM dentro de `d-none d-md-block` + `data-testid="{base}-desktop"`.
- Cards informativos em `entity-list-mobile d-md-none` + `data-testid="{base}-mobile"`.
- Campos por card: data, horário, cliente (destaque), serviço e profissional (`small text-muted`), badge de status.
- **Sem** botões, links ou navegação; empty state único quando `appointments.length === 0`.
- Formatação centralizada em `buildAppointmentDisplay` (sem duplicar chamadas à API).

### Tablet (768px–1199.98px)

- `.dashboard-agenda-card { overflow: visible }`.
- `.table-responsive` com `overflow-x: auto` e `max-width: 100%`.
- `.dashboard-table { table-layout: auto }`, `min-width: 0` em células, quebra de texto em Cliente/Serviço/Profissional.
- `.status-badge-80` dentro do card: `min-width: 0` e `white-space: normal` nesta faixa.

### Desktop (≥1200px)

- `.dashboard-agenda-card .dashboard-table { table-layout: fixed }` (comportamento alinhado ao anterior).
- `colgroup`, seis colunas e markup de tabela preservados.

**Test IDs:** `dashboard-today-agenda`, `dashboard-upcoming-agenda` (sufixos `-desktop` / `-mobile`).

---

## 7. Comportamento por breakpoint

| Viewport | Comportamento esperado (implementado) |
|----------|----------------------------------------|
| 360–767px | Cards mobile; tabela oculta via Bootstrap; sem scroll por tabela 680px na agenda |
| 768–1199px | Tabela visível; sem clipping pelo card; colunas legíveis ou scroll interno no `.table-responsive` |
| ≥1200px | Tabela fixed + colgroup; KPIs e header inalterados |

**Validação visual manual:** pendente (checklist abaixo).

---

## 8. Testes executados e resultados

Comando a partir de `client/`:

| Execução | Resultado |
|----------|-----------|
| `npm test -- DashboardPage.test.tsx` | **16 passed**, 0 failed (~30s) |
| `npm test` (suite completa) | **132** ficheiros passed, **2** failed; **1523** testes passed, **2** failed (~641s) |

**Falhas da suite completa (não relacionadas com o Dashboard):**

| Teste | Erro |
|-------|------|
| `RegisterPage.test.tsx` — calls register with the selected IANA timezone in the payload | **Timeout 5000ms** (intermitente) |
| `CompanyForm.test.tsx` — submits with trimmed payload and notifies onSaved | **Timeout 5000ms** (intermitente) |

Nenhuma falha em `DashboardPage.test.tsx` ou ficheiros alterados nesta etapa.

Cobertura de testes Dashboard (novo/actualizado):

- Superfícies desktop/mobile e classes `d-md-*`
- Cards: data/hora, cliente, serviço, profissional, status; ambas as secções
- Ausência de botões/links nos cards mobile
- Empty states sem duplicar testids mobile
- KPIs, API `getSummary`, perfis (ex. MANAGER), retry/erro preservados
- Consultas de tabela via `within(...-desktop)`

---

## 9. Resultado do build

```text
cd client && npm run build
→ exit 0 (tsc -b && vite build, ~15s)
```

Aviso Rollup: chunk JS &gt;500 kB (pré-existente).

---

## 10. Limitações conhecidas

- Validação visual em DevTools/dispositivos reais **não** foi feita pelo agente; confirmar especialmente 768px, 992px, 1024px e 1200px.
- Em tablet estreito, scroll horizontal **interno** à tabela pode ainda ocorrer se nomes forem muito longos; não se usa `overflow-x: hidden` na página.
- Cards mobile duplicam texto no DOM (padrão 6.4d.2); testes devem usar `data-testid` + `within()`.
- Dois timeouts intermitentes na suite global (RegisterPage, CompanyForm) — tratar como flakiness, não regressão desta etapa.

---

## 11. Checklist para validação visual manual

- [ ] **360px:** cards nas duas secções; sem scroll horizontal da página; KPIs empilhados
- [ ] **390px / 430px:** hierarquia data/hora/cliente legível
- [ ] **767px:** ainda cards
- [ ] **768px:** tabela; todas as colunas visíveis ou scroll só dentro da tabela
- [ ] **992px / 1024px:** idem; nenhuma coluna cortada pelo card
- [ ] **1199px:** transição antes do layout desktop fixed
- [ ] **1200px+:** tabela com six colunas como antes; botão «Abrir agenda» e KPIs intactos
- [ ] **1366px:** layout desktop estável
- [ ] Confirmar que **Relatórios** não regrediu (fora de escopo, smoke rápido)

---

## 12. Contexto para continuidade (outra IA / QA)

- Branch de trabalho: `develop`; HEAD inicial `cb642781…`; commits pendentes de autorização do responsável.
- Padrão dual surface igual a entidades: [`EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx) (`d-none d-md-block` / `entity-list-mobile`).
- Lógica de dados do Dashboard continua só em [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) (`getSummary` + maps de nomes); componente filho só apresentação.
- Breakpoint desktop preservado: **1200px** (`min-width: 1200px` para `table-layout: fixed`), acordado com o responsável (não 1201px).
- Próximo passo humano: QA visual com checklist §11; depois commit autorizado. Não alterar Relatórios nesta linha de trabalho.

---

## 13. Critérios de conclusão (estado)

| Critério | Estado |
|----------|--------|
| Cards mobile informativos | Implementado |
| Tablet sem colunas escondidas pelo card | CSS scoped implementado; **confirmar visualmente** |
| Desktop ≥1200px preservado | Implementado (fixed ≥1200px) |
| KPIs e duas secções | Preservados |
| Sem APIs extra | OK (mesmo `getSummary`) |
| Testes Dashboard + build | OK |
| Suite completa | 2 timeouts intermitentes (não Dashboard) |
| Git commit | **Não** executado (aguardar QA e autorização) |
