# SchedulerPro — Rankings Funcionários e Clientes recorrentes (mobile) em Relatórios

## 1. Estado inicial do repositório

Capturado antes de concluir esta etapa (read-only):

| Item | Valor |
|------|--------|
| Branch | `develop` (tracking `origin/develop`) |
| HEAD | `0fc6ea9424b9691ac493239ad7f0c9e01a420365` |
| Working tree | `M client/src/index.css`, `M client/src/pages/reports/ReportsPage.tsx`, `M client/src/pages/reports/ReportsPage.test.tsx`; `?? docs/reports/schedulerpro-reports-mobile-ux-audit.md`, `?? docs/reports/schedulerpro-reports-services-mobile-implementation.md` |

**Nenhuma operação Git** (commit, push, pull, merge, rebase, cherry-pick, stash, reset, clean, branch) foi executada nesta tarefa.

### Estado após a implementação (referência)

- Alterados: `client/src/index.css`, `client/src/pages/reports/ReportsPage.tsx`, `client/src/pages/reports/ReportsPage.test.tsx`
- Não rastreado novo: `docs/reports/schedulerpro-reports-employees-clients-mobile-implementation.md` (este ficheiro)
- Outros não rastreados pré-existentes mantêm-se conforme o estado inicial acima

## 2. Arquivos alterados

- [`client/src/pages/reports/ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx)
- [`client/src/index.css`](../../client/src/index.css)
- [`client/src/pages/reports/ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx)
- [`docs/reports/schedulerpro-reports-services-mobile-implementation.md`](./schedulerpro-reports-services-mobile-implementation.md) — secção «Continuidade» actualizada (classes CSS generalizadas)

## 3. Implementação — Funcionários

- **Desktop/tablet (≥768px):** `d-none d-md-block table-responsive table-compact` + `data-testid="reports-top-employees-desktop"`. Mantém `RankingTable` com colunas e dados existentes (`name`, `count`, `completedCount`, `cancelledCount`, `estimatedRevenue`).
- **Mobile (&lt;768px):** `d-md-none` + `data-testid="reports-top-employees-mobile"`. Cards com a mesma hierarquia que Serviços: `#`, nome, «Agendamentos», depois `dl` com Concluídos, **Cancel.** (rótulo alinhado ao cabeçalho da tabela), Valor estimado. **Sem accordion.**

## 4. Implementação — Clientes recorrentes

- **Desktop/tablet:** `data-testid="reports-top-clients-desktop"`; tabela inalterada.
- **Mobile:** `data-testid="reports-top-clients-mobile"`; cards com #, nome, Agendamentos, Concluídos, Valor estimado. **Sem accordion.**

## 5. Cabeçalho do card «Clientes recorrentes»

- Valores e frases preservados (`totalClients`, `recurringCount`).
- **≥768px:** resumo num único `span` com `d-none d-md-inline ms-md-2` (equivalente ao inline original).
- **&lt;768px:** bloco `reports-clients-recurring-summary` com `data-testid="reports-top-clients-header-summary-mobile"`, duas linhas (`d-block`) para «X clientes ativos no período» e «Y recorrentes», evitando compressão horizontal.
- Contentor: `card-header` com classes `reports-clients-recurring-card-header d-flex flex-column flex-md-row …` + `data-testid="reports-top-clients-card-header"`.
- Regra scoped em [`client/src/index.css`](../../client/src/index.css): dentro de `@media (max-width: 767.98px)`, `.reports-page .reports-clients-recurring-card-header` usa coluna e alinhamento ao topo (não é `overflow-x: hidden` global).

## 6. Reutilização do padrão de Serviços

- As classes CSS específicas de serviços (`reports-top-service-mobile-*`) foram **generalizadas** para `.reports-ranking-mobile-*` (lista, card, cabeçalho, rank, nome, métrica principal, detalhes). O ranking de **Serviços** passou a usar estas classes; os três rankings partilham o mesmo bloco visual.
- `data-testid` de itens móveis mantém prefixos por domínio (`reports-top-service-mobile-item-*`, `reports-top-employee-mobile-item-*`, `reports-top-client-mobile-item-*`) para testes estáveis.

## 7. Comportamento mobile vs tablet/desktop

| Viewport | Serviços | Funcionários | Clientes |
|----------|----------|--------------|----------|
| &lt;768px | Cards | Cards | Cards + resumo do cabeçalho em stack |
| ≥768px | Tabela | Tabela | Tabela + resumo inline no cabeçalho |

## 8. Testes executados e resultados

```bash
cd client
npm run test -- src/pages/reports/ReportsPage.test.tsx
```

**Resultado:** 1 ficheiro, **24** testes passaram (Vitest v4.1.11). Inclui regressão do ranking de Serviços, novos `describe` para Funcionários e Clientes (superfícies, métricas, tabelas, estados vazios, cabeçalho de clientes).

## 9. Build de produção

```bash
cd client
npm run build
```

**Resultado:** `tsc -b && vite build` concluído com exit code 0 (aviso Rollup sobre chunk &gt;500 kB, já habitual).

## 10. Limitações e validação visual pendente

- jsdom não aplica media queries: o DOM contém sempre mobile + desktop; asserts usam `within` + `data-testid` e classes `d-none` / `d-md-none`.
- Verificar manualmente nos viewports: **360, 390, 430, 768, 992, 1199, 1200, 1366** — alinhamento dos três rankings, cabeçalho de clientes, ausência de scroll horizontal indevido na página, nomes longos e valores monetários.

## 11. Contexto para continuidade

- Os três rankings em [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) seguem o mesmo padrão de marcação e CSS partilhado (`.reports-page .reports-ranking-mobile-*`).
- Tipos em [`client/src/types/report.ts`](../../client/src/types/report.ts): `ReportEmployee`, `ReportClients`, `ReportClientRank`.
- Documentos relacionados: [`schedulerpro-reports-services-mobile-implementation.md`](./schedulerpro-reports-services-mobile-implementation.md), [`schedulerpro-reports-mobile-ux-audit.md`](./schedulerpro-reports-mobile-ux-audit.md).
