# SchedulerPro — Ranking de Serviços (mobile) em Relatórios

## Estado inicial do repositório (antes desta implementação)

Registado imediatamente antes de consolidar a documentação (read-only):

| Item | Valor |
|------|--------|
| Branch | `develop` (tracking `origin/develop`) |
| HEAD | `0fc6ea9424b9691ac493239ad7f0c9e01a420365` |
| Working tree | `M client/src/index.css`, `M client/src/pages/reports/ReportsPage.tsx`, `M client/src/pages/reports/ReportsPage.test.tsx`; `?? docs/reports/schedulerpro-reports-mobile-ux-audit.md` |

**Nenhuma operação Git** (commit, push, pull, merge, rebase, etc.) foi executada como parte desta tarefa.

### Estado após a implementação (referência)

Após gravar os ficheiros desta etapa, `git status -sb` reportou:

- Alterados: `client/src/index.css`, `client/src/pages/reports/ReportsPage.tsx`, `client/src/pages/reports/ReportsPage.test.tsx`
- Não rastreados: `docs/reports/schedulerpro-reports-mobile-ux-audit.md` (pré-existente), `docs/reports/schedulerpro-reports-services-mobile-implementation.md` (este documento)

## Ficheiros alterados

- [`client/src/pages/reports/ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) — classe raiz `reports-page`; superfície dupla só no card «Serviços mais realizados».
- [`client/src/index.css`](../../client/src/index.css) — estilos scoped sob `.reports-page` para os cards mobile do ranking de serviços.
- [`client/src/pages/reports/ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) — asserts com `within()` + `data-testid`; novos casos para mobile/desktop e lista vazia.

## Estrutura implementada

- **Desktop/tablet (≥768px):** contentor `d-none d-md-block table-responsive table-compact` com `data-testid="reports-top-services-desktop"`. Mantém `RankingTable` com as mesmas colunas e dados (`name`, `count`, `completedCount`, `estimatedRevenue`).
- **Mobile (&lt;768px):** contentor `d-md-none` com `data-testid="reports-top-services-mobile"`. Lista de cards: posição `#` (ordem do array `topServices`, sem reordenar), nome, «Agendamentos» como métrica principal, detalhes «Concluídos» e «Valor estimado».
- **Sem accordion:** as métricas cabem de forma compacta num único card.

## Decisões de UX

- Reutilizar o padrão dual do Dashboard (`d-none d-md-block` / `d-md-none` + `data-testid`).
- Visual alinhado ao painel mobile do Dashboard (tipografia, grelha de pares rótulo/valor, `overflow-wrap` no nome).
- Não introduzir interação extra; só conteúdo estático legível em ecrãs estreitos.

## Comportamento

| Viewport | Superfície |
|----------|------------|
| &lt;768px | Lista de cards (`reports-top-services-mobile`) |
| ≥768px | Tabela original (`reports-top-services-desktop`) |

Funcionários, clientes recorrentes, KPIs, filtros e restantes blocos de Relatórios ficaram inalterados.

## Testes executados

```bash
cd client
npm run test -- src/pages/reports/ReportsPage.test.tsx
```

**Resultado:** 1 ficheiro, 15 testes passaram (Vitest v4.1.11).

## Build de produção

```bash
cd client
npm run build
```

**Resultado:** `tsc -b && vite build` concluído com exit code 0 (aviso Rollup sobre chunk &gt;500 kB, já habitual no projeto).

## Limitações conhecidas

- Vitest/jsdom não simula media queries do browser: as classes Bootstrap são testadas no DOM; o *breakpoint* real depende do CSS em runtime.
- Validação visual manual nos viewports indicados abaixo ainda não foi feita nesta tarefa.

## Validação visual pendente

Confirmar em navegador real ou devtools nos seguintes comprimentos: **360px, 390px, 430px, 768px, 992px, 1199px, 1200px, 1366px**:

- Sem scroll horizontal indevido na página.
- Nomes longos com quebra adequada; valores monetários legíveis.
- Posição `#` e métrica principal visíveis; espaçamento entre cards.
- Em ≥768px, tabela idêntica à anterior (cabeçalhos e formatação).

## Continuidade (actualizações posteriores)

O padrão dual foi alargado a **Funcionários** e **Clientes recorrentes**; as classes dos cards mobile foram generalizadas para `.reports-ranking-mobile-*` (substituindo as antigas `reports-top-service-mobile-*`). Ver [`schedulerpro-reports-employees-clients-mobile-implementation.md`](./schedulerpro-reports-employees-clients-mobile-implementation.md).
