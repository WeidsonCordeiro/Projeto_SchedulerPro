# SchedulerPro — Auditoria UX responsiva: separador Relatórios (`/reports`)

**Data:** 2026-11-06  
**Tipo:** auditoria read-only (sem alterações de código, CSS, testes ou dependências)

**Referências cruzadas:** [`schedulerpro-dashboard-reports-mobile-audit.md`](./schedulerpro-dashboard-reports-mobile-audit.md) (auditoria anterior Dashboard/Relatórios), [`schedulerpro-dashboard-final-ux-adjustments.md`](./schedulerpro-dashboard-final-ux-adjustments.md) (padrões recentes Dashboard)

---

## 1. Estado inicial do repositório

Inspeção read-only:

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `0fc6ea9424b9691ac493239ad7f0c9e01a420365` |
| Working tree | **Limpo** (sem ficheiros modified/untracked no momento da auditoria) |

**Operações Git:** nenhuma executada para esta etapa.

---

## 2. Ficheiros e componentes analisados

| Área | Caminho |
|------|---------|
| Página | [`client/src/pages/reports/ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) |
| Testes | [`client/src/pages/reports/ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) |
| API | [`client/src/api/endpoints/reports.api.ts`](../../client/src/api/endpoints/reports.api.ts) |
| Tipos | [`client/src/types/report.ts`](../../client/src/types/report.ts) (referido por imports) |
| Período / range | [`client/src/config/reportPeriod.ts`](../../client/src/config/reportPeriod.ts) |
| Permissões (UX) | [`client/src/config/reportPermissions.ts`](../../client/src/config/reportPermissions.ts) |
| Partilhados | [`PageHeader`](../../client/src/components/common/PageHeader.tsx), [`DashboardCard`](../../client/src/components/common/DashboardCard.tsx), [`LoadingState`](../../client/src/components/common/LoadingState.tsx), [`ErrorState`](../../client/src/components/common/ErrorState.tsx), [`EmptyState`](../../client/src/components/common/EmptyState.tsx) |
| CSS global relevante | [`client/src/index.css`](../../client/src/index.css) — `.page-header`, `.page-actions`, `.filter-bar`, `@media (max-width: 767.98px)` (tabelas, `table-compact`) |

**Componente interno:** `RankingTable` (função no próprio `ReportsPage.tsx`, não exportado).

---

## 3. Estrutura actual do separador Relatórios

### 3.1 Permissões e estados de carregamento

- `getReportAbilities`: apenas **OWNER**, **ADMIN**, **MANAGER** (`canView`). Caso contrário: `PageHeader` + alerta de permissão.
- Carregamento: `LoadingState`; erro: `ErrorState` + retry condicional; sem dados (`overview.total === 0`): `EmptyState`.
- Parciais: `relatedError` em alerta quando falham endpoints secundários após overview OK.

### 3.2 Cabeçalho e acções

- [`PageHeader`](../../client/src/pages/reports/ReportsPage.tsx) com `title="Relatórios"`, descrição, e `actions={ <span className="text-muted small">Período: {periodDescription}</span> }` — **texto** do período aplicado (não é o mesmo padrão do Dashboard com botão primário).

### 3.3 Filtros de período

- Contentor [`.filter-bar`](../../client/src/index.css) com `btn-group btn-group-sm`: chaves de `REPORT_PERIOD_LABELS` (Hoje, Semana, Mês, **e** Personalizado conforme `reportPeriod`).
- Modo `custom`: `row` com inputs `type="date"` (Início, Fim), botão **Aplicar**, mensagem de erro de validação.

### 3.4 Indicadores — Visão geral

- Secção **«Visão geral»** com `row g-3 dashboard-kpis`:
  - Um [`DashboardCard`](../../client/src/components/common/DashboardCard.tsx) **Total** (`col-12 col-md-2`).
  - Cinco cards por status (`scheduled` … `no-show`), cada um `col-12 col-md-2`.
- **Total visual:** 6 cards de KPI no mesmo grid (reutiliza classe `dashboard-kpis` do Dashboard).

### 3.5 Receita

- Dois `DashboardCard` em `col-12 col-md-6` (receita estimada vs prevista).
- Nota opcional `missing-price-note` quando há agendamentos sem preço.

### 3.6 Rankings (tabelas)

Três blocos em cards com [`.table-responsive.table-compact`](../../client/src/pages/reports/ReportsPage.tsx):

| Card | Conteúdo | Colunas em `RankingTable` (# + dados) |
|------|-----------|--------------------------------------|
| Serviços mais realizados | `topServices` (limit 5) | Serviço, Agend., Concl., Valor estimado (4 + #) |
| Funcionários | `employees` | Funcionário, Agend., Concl., Cancel., Valor estimado (5 + #) |
| Clientes recorrentes | `clients.topClients` (limit 5) + texto no header (total/recorrentes) | Cliente, Agend., Concl., Valor estimado (4 + #) |

`RankingTable`: tabela Bootstrap `table table-hover`, `thead` com `#` + headers, `tbody` com índice 1-based.

### 3.7 Cancelamentos

- **Não é tabela:** `card` com `card-body` e três linhas `d-flex justify-content-between` (Cancelados, Total, Percentual — `data-testid="cancellation-rate"` no percentual).

### 3.8 Chamadas API (ordem em `loadReports`)

1. `getOverview` (bloqueante para erro de página)
2. `getRevenue`, `getTopServices`, `getEmployees`, `getClients`, `getCancellations` (falhas agregadas em `relatedError`)

Parâmetros: `startAt`/`endAt` derivados de `buildReportRange` + timezone da empresa.

### 3.9 Elementos adicionais

- Texto longo no header do card **Clientes recorrentes** (totais inline).
- Ícones Bootstrap (`bi-*`) nos KPIs via `DashboardCard`.

---

## 4. Problemas por resolução (facto de código vs hipótese visual)

Legendas: **Facto** = inferido do código/CSS; **Hipótese** = requer DevTools/dispositivo.

| Resolução / tema | Observação |
|------------------|------------|
| **≤767px — `PageHeader`** | **Facto:** [`index.css`](../../client/src/index.css) empilha `.page-header` em coluna, `.page-actions` e `.page-actions` child a **100%** largura — o texto «Período: …» passa para linha própria abaixo do título (comportamento global mobile). |
| **≤767px — Filtros** | **Facto:** `.filter-bar` tem `overflow-x: auto`; em ≤767px `.filter-bar .btn-group` **passa a `flex-wrap: wrap`** e botões com `border-radius` corrigidos — os 4+ botões de período podem ocupar **várias linhas** ou scroll horizontal dentro da barra, não necessariamente «uma linha compacta». |
| **≤767px — KPIs (6 + receita)** | **Facto:** `col-12` empilha cards — **rolagem vertical longa** (6 status + 2 receita antes das tabelas). |
| **Tabelas rankings** | **Facto:** `.table-responsive.table-compact .table { min-width: 0 }` anula o `min-width: 680px` das tabelas genéricas em mobile — **não** forçam largura mínima 680px como outras listagens. **Hipótese:** células com números longos ou nomes largos podem comprimir ou forçar scroll **dentro** do contentor. |
| **768px–991px** | **Facto:** KPIs usam `col-md-2` (6 por linha teórica em md se couber) — **Hipótese:** pode haver quebra de linha ou cards estreitos; não auditado visualmente. |
| **≥1200px (`col-xl-6`)** | **Facto:** duas colunas lado a lado para rankings; em &lt;xl empilham (uma coluna). |
| **Funcionários (5 colunas dados)** | **Facto:** tabela mais larga que as outras rankings — **Hipótese:** maior risco de leitura pobre ou scroll horizontal no `.table-responsive` em viewports estreitos. |
| **Scroll horizontal da página** | **Facto:** `.filter-bar` contém overflow-x; tabelas em `.table-responsive` — intenção é horizontal **contida**. **Hipótese:** overflow na `main` se algum filho escapar (validar visualmente). |

---

## 5. Tabelas e listas que merecem atenção

1. **Ranking serviços** — 4 métricas + ranking.
2. **Ranking funcionários** — 5 métricas + ranking (mais denso).
3. **Clientes recorrentes** — 4 métricas; cabeçalho do card com texto longo (totais).
4. **Cancelamentos** — já em formato «lista/resumo» em `card-body` (baixa prioridade para virar card).

**Não são tabelas:** KPIs e receita (já em cards `DashboardCard`).

---

## 6. Recomendações para mobile (cards vs tabela vs outro)

Comparação com o **Dashboard**: dual surface (`d-md-none` / `d-md-block`), lista compacta de duas colunas + accordion e painel de detalhe — útil como **inspiração de hierarquia e consistência**, não como copiar o mesmo conteúdo (rankings têm mais métricas por linha).

### 6.1 Ranking de serviços

| Opção recomendada | **Lista compacta ou cards empilhados** com métricas secundárias agrupadas; **manter tabela em `md+`**. |
|-------------------|--------------------------------------------------------------------------------------------------------|
| Problema actual | Várias colunas numa tabela em viewport estreito — leitura em zigue-zague. |
| Benefício | Nome do serviço como foco; métricas legíveis em bloco. |
| Linha compacta (se estilo Dashboard) | Posição (#1–5), nome serviço, **uma** métrica destaque (ex.: valor estimado ou agendamentos). |
| Expandido / secundário | Agend., Concl., valor (resto). |
| 360 / 390 / 430 | Evitar 4 colunas horizontais; preferir uma coluna de texto + opcional chevron ou sempre cards empilhados sem accordion se preferir simplicidade. |

### 6.2 Ranking de profissionais

| Opção recomendada | **Mesmo padrão que serviços**, com **accordion** ou card com secção «detalhes» (5 métricas é pesado em linha única). |
| Problema actual | Mais colunas que serviços — maior risco de compressão. |
| Benefício | Nome + papel visual claro; cancelamentos e valores em segundo plano. |
| Compacto | Nome, #, talvez «Agend.» ou valor estimado como destaque. |
| Expandido | Agend., Concl., Cancel., Valor estimado. |

### 6.3 Clientes recorrentes

| Opção recomendada | **Cards ou lista compacta**; **mover ou resumir** o texto longo do `card-header` (totais/recorrentes) para subtítulo ou badge em mobile. |
| Problema actual | Header com frase longa + tabela pode empurrar conteúdo ou truncar. |
| Benefício | Hierarquia: cliente → contagens → valor. |
| Compacto | Nome cliente + destaque (ex.: nº de agendamentos ou valor). |
| Expandido | Concl., Valor estimado; contexto global (total clientes / recorrentes) pode ir para cima da lista ou numa linha de resumo fixa. |

### 6.4 Cancelamentos

| Opção recomendada | **Manter** estrutura actual (já não é tabela); eventual **ajuste tipográfico/espçamento** só em CSS se QA mostrar densidade má. |

### 6.5 Princípio geral

- **Não** converter automaticamente todas as tabelas em cards se uma **lista compacta + detalhe** (accordion) cobrir funcionários e serviços com o mesmo componente reutilizável.
- **Manter tabela** para tablet/desktop (`md`/`lg` breakpoint alinhado ao projeto, ex. `≥768px`).

---

## 7. Elementos que devem permanecer como estão (proposta)

- **Lógica** de `buildReportRange`, estado `period` / `custom`, validação `applyCustom`, e **todas** as chamadas [`reportsApi`](../../client/src/api/endpoints/reports.api.ts).
- **Permissões** [`getReportAbilities`](../../client/src/config/reportPermissions.ts) e UI de «sem permissão».
- **Cancelamentos** como resumo em card (sem ranking tabular).
- **empty / loading / error** flows.
- **Desktop ≥1200px** (e em geral `lg`/`xl`): layout em grelha com tabelas **se** a implementação for dual surface.

---

## 8. Riscos de regressão

- Partilha da classe **`dashboard-kpis`** com o Dashboard — alterações globais a `.dashboard-kpis` podem afetar ambas as páginas; preferir classes **scoped** para relatórios em implementação futura (ex. `reports-kpis`).
- **`filter-bar`** é global — mudar comportamento para Relatórios pode afetar outras páginas que usem a mesma classe; preferir wrapper `reports-page` + CSS scoped (padrão já usado noutras áreas).
- **`RankingTable` inline** — qualquer extração para componente partilhado deve preservar semântica de tabela ou equivalente acessível nas superfícies desktop.
- Testes [`ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) dependem de textos de cabeçalho e células — dual surface exigirá `data-testid` e `within()` como no Dashboard.

---

## 9. Testes necessários para implementação futura (não alterados nesta auditoria)

Cobertura actual (resumo): mocks de `reportsApi`, troca de período, permissões, exibição de dados e `cancellation-rate`.

**Sugerido para PR futuro:**

- Superfície **desktop** vs **mobile** (`data-testid` nos contentores).
- Rankings: pelo menos uma linha com todas as colunas no DOM da superfície desktop; na mobile, ausência de `<table>` visível ou queries scoped ao contentor mobile.
- **Accordion** (se existir): `aria-expanded`, painel `hidden`, um aberto por secção.
- **Filtros:** botões de período acessíveis, `aria-pressed` (já nos botões).
- Regressão: `table-compact` continua sem `min-width: 680px` em mobile para relatórios.

---

## 10. Proposta de implementação em etapas pequenas

1. **Inventário + wrapper** — `reports-page` (ou similar) só no JSX + comentário CSS; sem mudar layout.
2. **Cabeçalho mobile** — opcional ajuste scoped se o produto quiser período ao lado do título em certa largura (sem mudar `PageHeader` global sem critério).
3. **Rankings dual surface** — extrair linha de dados para função comum; tabela `d-none d-md-block`; lista/card `d-md-none` para Serviços; testes.
4. **Funcionários** — mesmo padrão com métricas extra no painel expandido.
5. **Clientes recorrentes** — cards/lista + header responsivo do resumo estatístico.
6. **Polimento CSS** — espaçamentos, `max-height`+scroll interno opcional em listas muito longas, alinhamento com tokens visuais do Dashboard.
7. **QA manual** — grelha de viewports (360–1366) e regressão em EMPLOYEE sem acesso.

---

## 11. Limitações desta auditoria

- **Validação visual manual** nos viewports indicados **não foi executada** nesta sessão; conclusões de overflow e hierarquia percebida são **principalmente deduções** a partir de CSS e markup.
- Não foi lançada a app no browser nesta auditoria.
- **HEAD** e estado do working tree documentados na secção 1; outro commit pode alterar linhas exactas de CSS.

---

## Resumo executivo (para handoff)

**Problemas identificados (principalmente factíveis pelo código):** página longa em mobile por muitos KPIs empilhados; tabelas de ranking com várias colunas em viewport estreito; cabeçalho global mobile empilha título e «Período»; barra de filtros de período com wrap/scroll conforme CSS.

**Recomendações de UX:** dual surface para os **três** rankings tabulares; lista compacta ou cards com detalhe expandido (prioridade **funcionários** > **serviços** > **clientes**); cancelamentos e receita/KPIs com mudanças mínimas; alinhar padrão visual ao Dashboard sem duplicar componentes inadequados.

**Candidatos a cards/lista mobile:** rankings **Serviços**, **Funcionários**, **Clientes recorrentes**.

**Manter como tabela (desktop/tablet):** os mesmos dados na superfície `md+`; cancelamentos já como bloco não tabular.

**Ficheiros prováveis numa implementação futura:** [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx), [`index.css`](../../client/src/index.css) (scoped), eventual novo ficheiro de componente local (ex. `ReportsRankingMobile.tsx`), [`ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx).

**Sem implementação nesta etapa** — apenas este documento.
