# SchedulerPro — Auditoria mobile do Dashboard e Relatórios

**Data da auditoria:** 2026-11-05  
**Tipo:** auditoria read-only (sem alterações de código, CSS, testes ou dependências)

**Relacionado:** [`schedulerpro-mobile-entity-listings-step-6-4d-1-audit.md`](./schedulerpro-mobile-entity-listings-step-6-4d-1-audit.md), [`schedulerpro-mobile-entity-listings-step-6-4d-2-implementation.md`](./schedulerpro-mobile-entity-listings-step-6-4d-2-implementation.md), [`schedulerpro-mobile-ux-step-6-4-audit.md`](./schedulerpro-mobile-ux-step-6-4-audit.md)

**Legenda:** **Facto (código)** = verificado no repositório; **Recomendação** = proposta para implementação futura; **Hipótese / não verificado visualmente** = requer DevTools ou dispositivo real nos viewports indicados.

---

## 1. Data da auditoria

2026-11-05 (inspeção de código e estrutura; validação visual manual **não** executada nesta etapa).

---

## 2. Branch, HEAD e estado do Working Tree

Inspeção read-only no início desta auditoria (sem commit, push, switch ou outras operações Git):

| Verificação | Resultado |
|-------------|-----------|
| Branch actual | `develop` (tracking `origin/develop`) |
| HEAD | `cb6427814205c8006be665d621444a08b11959a1` |
| Working tree | **Limpo** — sem ficheiros modified/staged/untracked antes da criação deste relatório |

**Nota:** O HEAD difere do registado na auditoria 6.4d.1 (`e32241a…`), reflectindo commits integrados em `develop` entretanto (incl. possível merge da etapa 6.4d.2). A análise abaixo reflecte o código em **HEAD actual**.

---

## 3. Arquivos e componentes analisados

### 3.1 Páginas e rotas

| Página | Rota | Ficheiro | Registo de rotas |
|--------|------|----------|------------------|
| Dashboard | `/` | [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx) |
| Relatórios | `/reports` | [`client/src/pages/reports/ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) | Idem |

Menu: [`client/src/config/menu.ts`](../../client/src/config/menu.ts) — Dashboard: OWNER, ADMIN, MANAGER, EMPLOYEE; Relatórios: OWNER, ADMIN, MANAGER.

### 3.2 Componentes filhos e partilhados

| Componente | Papel |
|------------|--------|
| [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) | Duas listagens (agenda do dia + próximos) em tabela |
| [`DashboardCard.tsx`](../../client/src/components/common/DashboardCard.tsx) | KPIs numéricos (Dashboard e Relatórios) |
| [`PageHeader.tsx`](../../client/src/components/common/PageHeader.tsx) | Título, descrição, acções |
| [`LoadingState`](../../client/src/components/common/LoadingState.tsx), [`ErrorState`](../../client/src/components/common/ErrorState.tsx), [`EmptyState`](../../client/src/components/common/EmptyState.tsx) | Estados (Relatórios empty; Dashboard usa empty inline nos cards de agenda) |
| `RankingTable` (função interna em `ReportsPage.tsx`) | Tabelas de ranking |

### 3.3 APIs e tipos

| Área | API | Tipos |
|------|-----|--------|
| Dashboard | [`dashboard.api.ts`](../../client/src/api/endpoints/dashboard.api.ts) — `GET /dashboard/summary` | [`dashboard.ts`](../../client/src/types/dashboard.ts) |
| Relatórios | [`reports.api.ts`](../../client/src/api/endpoints/reports.api.ts) — overview, revenue, top-services, employees, clients, cancellations | [`report.ts`](../../client/src/types/report.ts) |
| Período | [`reportPeriod.ts`](../../client/src/config/reportPeriod.ts) — `buildReportRange`, labels Hoje/Semana/Mês/Personalizado | — |

### 3.4 Permissões (frontend)

| Ficheiro | Regra |
|----------|--------|
| Dashboard | Sem gate dedicado na página; menu limita CLIENT. Funcionários relacionados: só OWNER/ADMIN carregam `employeesApi` ([`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) `CAN_LIST_EMPLOYEES_ROLES`). |
| Relatórios | [`reportPermissions.ts`](../../client/src/config/reportPermissions.ts) — `canView`: OWNER, ADMIN, MANAGER; outros → alerta de permissão. |

### 3.5 Estilos

| Ficheiro | Secções relevantes |
|----------|-------------------|
| [`client/src/index.css`](../../client/src/index.css) | `.dashboard-kpis`, `.dashboard-agenda-*`, `.dashboard-table`, `.filter-bar` (mobile ≤767.98px), `.table-responsive .table { min-width: 680px }`, `.table-responsive.table-compact .table { min-width: 0 }`, `@media (max-width: 767.98px)` |

### 3.6 Testes

| Ficheiro |
|----------|
| [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) |
| [`ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) |
| [`AppRoutes.test.tsx`](../../client/src/routes/AppRoutes.test.tsx) (menu / rotas) |

### 3.7 Gráficos

**Facto (código):** Não há biblioteca de gráficos (Chart.js, Recharts, etc.) nas páginas Dashboard ou Relatórios. Indicadores são **cards numéricos** e **tabelas/listas**.

---

## 4. Diagnóstico do Dashboard

### 4.1 Estrutura e dados

- **Cabeçalho:** `PageHeader` — título, saudação (`Olá, {name}`), botão primário «Abrir agenda» → `/appointments`.
- **Secção «Resumo do dia»:** três [`DashboardCard`](../../client/src/components/common/DashboardCard.tsx) em `row g-3 dashboard-kpis` com `col-12 col-md-4`:
  - **Hoje** — `todayAppointments.length`
  - **Pendentes** — `summary.period.byStatus.scheduled`
  - **Confirmados** — `summary.period.byStatus.confirmed`
- **Agendas:** `dashboard-agenda-grid` com dois [`DashboardAppointments`](../../client/src/pages/dashboard/DashboardAppointments.tsx):
  - «Agenda do dia» — `summary.todayAppointments`
  - «Próximos agendamentos» — `summary.upcomingAppointments` (limite `UPCOMING_LIMIT = 5` no request)

**Carregamento:** `dashboardApi.getSummary` com intervalo «hoje» via `buildReportRange("today", timezone)`; em paralelo `loadRelated` (clientes, serviços, funcionários condicional) para maps de nomes.

**Facto:** `DashboardSummary.activeClientsCount` existe no tipo mas **não é exibido** na UI.

### 4.2 Tabela de agendamentos (`DashboardAppointments`)

**Facto (código):**

- Card com `card-header` (título + contador).
- Tabela 6 colunas: Dia, Horário, Cliente, Serviço, Profissional, Status (badge `status-badge-80`).
- `table-responsive` + `table-card` + classe `dashboard-table` (`table-layout: fixed`, `colgroup` com larguras %).
- **Sem** classe `table-compact`.
- **Sem** acções por linha (somente leitura).
- Empty: `card-body` centrado com mensagem.

### 4.3 Comportamento por perfil

| Role | Dashboard no menu | Employees API | Efeito nas colunas Profissional |
|------|-------------------|---------------|----------------------------------|
| OWNER, ADMIN | Sim | Sim | Nomes resolvidos |
| MANAGER, EMPLOYEE | Sim | Não | Nomes de funcionário «—» se API employees não correr; warning `relatedError` se clients/services falharem |

**Facto:** `staffCompanyAccessSuspended` impede fetch (`loadAll` retorna cedo).

### 4.4 Responsividade (código)

| Viewport | Comportamento esperado |
|----------|------------------------|
| &lt;768px | KPIs empilham (`col-12`); `page-header` empilha acções ([`index.css`](../../client/src/index.css)); `.dashboard-agenda-grid` → `display: block` em ≤767.98px |
| ≥768px | KPIs em 3 colunas; duas agendas em coluna vertical (grid flex column) |

**Problema principal (facto CSS):** tabelas de agenda usam a regra global em mobile:

```css
@media (max-width: 767.98px) {
  .table-responsive .table {
    min-width: 680px;
  }
}
```

→ **Rolagem horizontal** nas duas widgets de agenda, análoga às listagens de entidades **antes** da etapa 6.4d.2.

**Hipótese:** Em 360–430px, `table-layout: fixed` com 6 colunas comprime texto (cliente/serviço); legibilidade reduzida mesmo com scroll.

---

## 5. Diagnóstico dos Relatórios

### 5.1 Estrutura

- **Cabeçalho:** título, descrição, texto «Período: …» no slot de acções.
- **Filtros:** `filter-bar` com `btn-group` (Hoje, Esta semana, Este mês, Personalizado). Modo custom: inputs `date` Início/Fim + «Aplicar» + validação local.
- **Conteúdo** (se `overview.total > 0` após load):
  - **Visão geral:** 1 card Total + 5 cards por status (`col-12 col-md-2` cada).
  - **Receita:** 2 cards (`col-md-6`).
  - Nota opcional `missing-price-note` se agendamentos sem preço histórico.
  - **Duas colunas `col-xl-6`:** rankings «Serviços mais realizados» e «Funcionários».
  - **Duas colunas `col-xl-6`:** «Clientes recorrentes» (subtítulo no header) e «Cancelamentos».

### 5.2 Tabelas e listagens

| Bloco | Formato | Classe responsive |
|-------|---------|-------------------|
| Rankings (3 tabelas) | `RankingTable` — coluna `#` + headers curtos | `table-responsive table-compact` |
| Cancelamentos | Três linhas label/valor no `card-body` | N/A (não é tabela) |

**Facto:** `table-compact` activa `min-width: 0` em mobile — **não** força 680px (contraste com Dashboard agendas).

### 5.3 Exportação / download

**Facto (código):** Não há botões ou chamadas API de export CSV/PDF na [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) nem em [`reports.api.ts`](../../client/src/api/endpoints/reports.api.ts).

### 5.4 Estados

| Estado | Comportamento |
|--------|----------------|
| Loading | `LoadingState` |
| Erro primário (overview) | `ErrorState` + retry |
| Overview total = 0 | `EmptyState` «Nenhum agendamento neste período» |
| Falhas parciais endpoints | `relatedError` warning; dados parciais mantidos |

### 5.5 Permissões

EMPLOYEE: item de menu **sem** Relatórios; se aceder à rota, `!canView` → alerta. MANAGER: acesso confirmado nos testes.

### 5.6 Responsividade (código)

| Viewport | Comportamento |
|----------|----------------|
| &lt;768px | KPIs status empilham (6 cards + total = scroll vertical longo); receita 2 cards empilhados; rankings `col-xl-6` → coluna única; `filter-bar` btn-group com wrap ([`index.css`](../../client/src/index.css)) |
| 768–1199px | KPIs podem mostrar 2–3 por linha conforme `col-md-2` |
| ≥1200px | Dois rankings lado a lado |

**Hipótese (360px):** Linha de período personalizado (`col-auto` + inputs date + Aplicar) pode ficar apertada ou quebrar de forma irregular — verificar visualmente.

**Hipótese:** Header «Clientes recorrentes» com texto longo inline (`totalClients` / `recurringCount`) pode quebrar mal em telas estreitas.

---

## 6. Problemas encontrados

### 6.1 Confirmados no código

| # | Página | Problema | Severidade mobile |
|---|--------|----------|-------------------|
| P1 | Dashboard | Agendas `DashboardAppointments`: tabela 6 colunas sem `table-compact` → **scroll horizontal** ≤767.98px (680px min-width) | Alta |
| P2 | Dashboard | Duas tabelas independentes (hoje + próximos) — utilizador faz scroll horizontal **duas vezes** se ambas tiverem dados | Média |
| P3 | Relatórios | Seis cards de status + total em mobile — **scroll vertical longo** (não horizontal); pode cansar | Baixa (UX) |
| P4 | Relatórios | Filtro personalizado com layout `col-auto` — risco de cramped em 360px | Média (**hipótese visual**) |

### 6.2 Não identificados como problemas de código

- Relatórios rankings com `table-compact` — desenho intencional para caber na largura.
- Cancelamentos — já formato lista mobile-friendly.
- KPIs Dashboard — já cards responsivos.

### 6.3 Não verificado nesta auditoria

- Comportamento real em 360 / 390 / 430 / 768 / 992px (screenshots).
- Performance de scroll com muitos agendamentos no dashboard (limite upcoming = 5 no API; today sem limite explícito no frontend além do backend).

---

## 7. Oportunidades de melhoria

| Oportunidade | Página | Tipo |
|--------------|--------|------|
| Dual surface tabela + cards de agendamento (padrão 6.4d) | Dashboard | Recomendação |
| Reutilizar estilo denso de [`AppointmentCalendarItem`](../../client/src/components/appointments/AppointmentCalendarItem.tsx) para leitura (sem acções) | Dashboard | Recomendação |
| Empilhar / accordion «Próximos» abaixo de «Hoje» (já vertical) — cards reduzem necessidade de scroll horizontal | Dashboard | Recomendação |
| Ajuste CSS filtros custom Relatórios (full-width inputs, botão Aplicar abaixo) | Relatórios | Recomendação |
| Cards por linha de ranking **só se** QA falhar `table-compact` | Relatórios | Opcional |
| Agrupar KPIs status Relatórios (ex. 2×3 grid) ou secção colapsável | Relatórios | Opcional produto |
| Testes com `data-testid` desktop/mobile | Ambas | Recomendação |

---

## 8. Proposta de adaptação para mobile

### 8.1 Dashboard

**Recomendação:** Implementar **dual surface** em [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) (ambas instâncias partilham o mesmo componente):

| Surface | Breakpoint | Conteúdo |
|---------|------------|----------|
| Desktop | `d-none d-md-block` + `data-testid="dashboard-agenda-desktop"` | Tabela actual inalterada |
| Mobile | `d-md-none` + `entity-list-mobile` ou `.dashboard-agenda-mobile` | Card por agendamento |

**Campos no card mobile (espelhar colunas actuais):**

- Data e horário (destaque; `text-nowrap` só se couber, senão stack).
- Cliente (peso visual — já enfatizado no CSS da coluna 3).
- Serviço e profissional (texto secundário).
- Badge de status.

**Não recomendado:**

- Duplicar chamadas `getSummary` / related APIs.
- Adicionar acções de edição no dashboard sem requisito de produto (hoje só link «Abrir agenda»).
- Remover globalmente `min-width: 680px` (afecta outras páginas).

**Opcional produto:** toque no card navega para `/appointments` com contexto do agendamento — **não existe hoje**; exige decisão.

### 8.2 Relatórios

**Recomendação prioritária:** Manter **tabelas compactas** em mobile; investir em **filtros** (período personalizado full-width em ≤767.98px) e **tipografia** do header de clientes recorrentes.

**Recomendação opcional (fase 2):** Se QA visual mostrar overflow ou leitura pobre nas rankings:

- Dual surface por tabela: desktop `RankingTable`; mobile lista de cards (posição `#`, nome, métricas Agend./Concl./Valor).
- Reutilizar padrão `.entity-list-mobile` da 6.4d.2 para consistência visual.

**Manter como está:**

- Secção Cancelamentos (lista).
- Cards KPI e receita (já empilham).
- Lógica de período e `buildReportRange`.

### 8.3 Breakpoint alvo

**Recomendação:** **768px** (Bootstrap `md`) — alinhado a 6.4d, calendário mobile e [`MOBILE_CALENDAR_MEDIA_QUERY`](../../client/src/hooks/useMatchMedia.ts) `(max-width: 767.98px)`.

### 8.4 Viewports de validação manual

360px, 390px, 430px, 768px, 992px+ — checklist no final do documento.

---

## 9. Elementos que devem permanecer inalterados (salvo decisão explícita)

- Contratos API `dashboard` / `reports` e payloads TypeScript.
- [`reportPermissions.ts`](../../client/src/config/reportPermissions.ts) e regra employees no dashboard.
- Comportamento desktop das tabelas de agenda e rankings (visual ≥768px).
- Sidebar / `AppLayout` (6.4c).
- Calendário, `AppointmentForm`, listagens de entidades já adaptadas em 6.4d.2.
- Ausência de exportação em Relatórios (não inventar sem backend).

---

## 10. Testes existentes e testes recomendados

### 10.1 Existentes

**[`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx)** — **Facto:**

- Spinner loading; greeting; summary cards; tabelas com dados; ordem API; upcoming; empty; erro summary; retry; related warning; employees fetch só OWNER/ADMIN; timezone no request; suspended access; company inactive alerts.

**[`ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx)** — **Facto:**

- Spinner; cards + receita + rankings; params mensal; troca para hoje; período custom; validação datas; empty; erro + retry; falha parcial endpoints; RBAC negado; MANAGER permitido.

**[`AppRoutes.test.tsx`](../../client/src/routes/AppRoutes.test.tsx)** — EMPLOYEE não vê «Relatórios» no menu.

### 10.2 Lacunas

- Nenhum teste simula viewport mobile ou asserta cards vs tabela.
- Nenhum teste de overflow / `d-md-none` (padrão 6.4d.2 aplicável aqui).

### 10.3 Recomendados na implementação

| Área | Teste |
|------|--------|
| Dashboard | `data-testid` desktop/mobile; conteúdo agendamento dentro de `within(mobile)`; desktop mantém `role="table"` |
| Dashboard | Regressão: KPIs e `getSummary` params inalterados |
| Relatórios | Se filtros CSS mudarem: custom period em layout (roles/labels) |
| Relatórios | Se cards ranking: um card por linha mock + desktop table scoped |
| Manual | Checklist §12 abaixo |

---

## 11. Riscos e possíveis impactos

| Risco | Mitigação |
|-------|-----------|
| Duplicar markup tabela + cards no dashboard | Um componente `DashboardAppointments` com render interno partilhado por linha |
| Testes `getByText` ambíguos com dual surface | Scope `data-testid` (lição 6.4d.2 photo tests) |
| Alterar CSS global 680px | Não tocar; usar surfaces separadas |
| Ranking cards duplicam lógica de formatação (`formatMoney`, etc.) | Extrair helper de células ou map rows uma vez |
| Prioridade vs outras listagens mobile (Agendamentos lista) | Decisão produto (§13) |

**Impacto noutras páginas:** Baixo se alterações ficarem em `DashboardAppointments` e CSS scoped; Relatórios opcional.

---

## 12. Sugestão de divisão em etapas de implementação

| Etapa | Escopo | Ficheiros principais | Dependência |
|-------|--------|----------------------|-------------|
| **A** | Este relatório + decisões §13 | — | — |
| **B** | Dashboard agendas mobile (dual surface + cards) | `DashboardAppointments.tsx`, `index.css`, `DashboardPage.test.tsx` | Padrão 6.4d.2 |
| **C** | Relatórios — polish filtros custom mobile | `ReportsPage.tsx`, `index.css` | QA visual |
| **D** | Relatórios — cards ranking (opcional) | `ReportsPage.tsx`, testes | Só se C insuficiente |
| **E** | QA manual viewports + regressão suite | — | B (e D se aplicável) |

Ordem sugerida: **B → C → E → D (condicional)**.

---

## 13. Dúvidas e pontos dependentes do responsável pelo projeto

1. **Prioridade:** Dashboard agendas mobile vs vista Lista de Agendamentos (ainda tabela 680px no roadmap 6.4 original)?
2. **Interacção:** Cards do dashboard devem ser clicáveis (abrir agenda/detalhe) ou permanecer só informativos?
3. **`activeClientsCount`:** Expor no dashboard ou manter omitido?
4. **Relatórios:** Confirmar que exportação não está planeado no produto (UI e API actuais sem export).
5. **Relatórios rankings:** Aceitar tabelas compactas em mobile após QA, ou exigir cards por linha por consistência com entidades?
6. **KPIs Relatórios:** Seis cards de status em mobile — aceitar scroll longo ou pedir agrupamento/colapso?

---

## Checklist de validação visual manual (pós-implementação futura)

**Dashboard (`/`):**

- [ ] 360px: KPIs empilhados; **sem** scroll horizontal nas agendas (após etapa B).
- [ ] 768px: transição tabela vs cards.
- [ ] «Abrir agenda» acessível; empty states legíveis.

**Relatórios (`/reports`):**

- [ ] 360px: botões de período utilizáveis; custom dates aplicáveis.
- [ ] Rankings legíveis sem scroll horizontal.
- [ ] Cancelamentos legíveis.
- [ ] EMPLOYEE não acede; MANAGER acede.

---

## Resumo executivo (resposta ao prompt §9)

| Pergunta | Resposta |
|----------|----------|
| Dashboard precisa adaptação mobile? | **Sim** — foco nas tabelas de [`DashboardAppointments`](../../client/src/pages/dashboard/DashboardAppointments.tsx) (scroll horizontal ≤767px). KPIs já adequados. |
| Relatórios precisam adaptação mobile? | **Parcial / menor prioridade** — rankings usam `table-compact`; melhorias prováveis em filtros e densidade de KPIs; cancelamentos já OK. |
| O que virar cards? | **Recomendado:** cada linha de agendamento no Dashboard (mobile). **Opcional:** linhas de ranking em Relatórios se QA falhar. |
| Manter tabelas/gráficos? | Desktop: tabelas actuais; **não há gráficos** — manter cards numéricos. |
| Ficheiros futuros | `DashboardAppointments.tsx`, `DashboardPage.test.tsx`, opcional `ReportsPage.tsx` + `index.css` |
| Testes | Estender padrão 6.4d.2; suite actual cobre lógica, não layout mobile |
| Decisões pendentes | §13 |

---

## Confirmação da etapa

| Item | Estado |
|------|--------|
| Alterações em código/CSS/testes | **Nenhuma** |
| Único artefacto produzido | Este relatório |
| Implementação mobile | **Não iniciada** — aguardar autorização |
