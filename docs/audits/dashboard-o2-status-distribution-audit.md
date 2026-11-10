# SchedulerPro — Dashboard O2: Auditoria de Distribuição de Agendamentos por Estado

**Data:** 2026-11-10  
**Objetivo:** Preparar a implementação O2 (distribuição compacta por estado) **sem alterar código**.  
**Referências:** [schedulerpro-dashboard-functional-evolution-audit.md](../reports/schedulerpro-dashboard-functional-evolution-audit.md) (O2), [schedulerpro-dashboard-o1-active-clients.md](../reports/schedulerpro-dashboard-o1-active-clients.md) (O1 concluído).

---

## 1. Estado inicial — branch e working tree

| Campo | Valor |
| --- | --- |
| Branch actual | `develop` (coincide com a esperada) |
| HEAD (full) | `bc7310a172965ac9ea8feed09c96c9cd5dfab18f` |
| Tracking | `develop...origin/develop` |
| Working tree | **Limpo** (`git status --porcelain` vazio) |
| Staged / modified / untracked | Nenhum |

**Nota:** Não foram executadas operações Git de escrita. A branch `develop` inclui o KPI O1 «Clientes ativos» (quarto card em `DashboardPage.tsx`).

---

## 2. Arquitectura actual do Dashboard

### 2.1 Página principal e fluxo de dados

| Peça | Ficheiro | Linhas / função relevante |
| --- | --- | --- |
| Página | [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | L36–291: orquestração |
| Listas do dia / próximos | [`client/src/pages/dashboard/DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) | Tabela desktop + cards mobile; badges de status |
| KPI card | [`client/src/components/common/DashboardCard.tsx`](../../client/src/components/common/DashboardCard.tsx) | L11–42: título, valor, ícone Bootstrap Icons |
| API | [`client/src/api/endpoints/dashboard.api.ts`](../../client/src/api/endpoints/dashboard.api.ts) | L15–22: `GET /dashboard/summary` |
| Tipos | [`client/src/types/dashboard.ts`](../../client/src/types/dashboard.ts) | L3–13: `DashboardSummary` |
| Período «hoje» | [`client/src/config/reportPeriod.ts`](../../client/src/config/reportPeriod.ts) | `buildReportRange("today", timezone)` |
| Rota | [`client/src/routes/AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx) | Dashboard em `/` (staff) |

**Carregamento (facto):**

1. Redux: `authSlice` (utilizador, `staffCompanyAccessSuspended`), `companySlice` (`selectCompany`, `selectCompanyTimezone`) — **não há slice de dashboard**; estado local com `useState`.
2. `loadSummary` → `dashboardApi.getSummary({ startAt, endAt, upcomingLimit: 5 })` (L64–76).
3. Após sucesso do summary: `loadRelated` (clientes, serviços, funcionários condicional OWNER/ADMIN) para maps de nomes nas listas.
4. Loading global; erro no summary bloquea related; `alert-warning` para falhas parciais em related.

### 2.2 Layout e KPIs actuais

- Secção «Resumo do dia»: `dashboard-section-heading` + grelha Bootstrap `row g-3 dashboard-kpis` (L237–266).
- Quatro colunas: `col-12 col-md-6 col-lg-3` (2×2 em `md`, 4 em `lg`).
- KPIs:

| Card (UI) | Fonte de dados | Ficheiro |
| --- | --- | --- |
| Hoje | `todayAppointments.length` | `DashboardPage.tsx` L171, L239–243 |
| Pendentes | `period.byStatus.scheduled` | L175, L246–250 |
| Confirmados | `period.byStatus.confirmed` | L176, L252–256 |
| Clientes ativos | `activeClientsCount` | L177, L258–264 |

- Abaixo: `dashboard-agenda-grid` com dois blocos `DashboardAppointments`.

### 2.3 Redux vs local

- **Redux:** apenas leitura de auth e empresa/timezone.
- **Sem** RTK Query nem cache de summary; refresh só em `useEffect` → `loadAll` ao montar / dependências.

### 2.4 Gráficos e bibliotecas

- **`client/package.json`:** sem Recharts, Chart.js ou similar; stack UI = Bootstrap 5 + Bootstrap Icons.
- **Facto:** não existe componente de gráfico reutilizável no Dashboard. Relatórios usam grelha de `DashboardCard`, não gráficos.

### 2.5 CSS e padrão visual

- Dashboard: [`client/src/index.css`](../../client/src/index.css) L1104–1151 (`.dashboard-section-heading`, `.dashboard-kpis`, `.dashboard-agenda-grid`).
- Bordas superiores coloridas nos KPIs: `nth-child(1–3)` apenas (L1124–1131); o **quarto** card (Clientes ativos) não tem cor dedicada — detalhe visual menor, fora do escopo O2.
- Badges de status na agenda: `APPOINTMENT_STATUS_BADGE_CLASS` + classe utilitária `.status-badge-80` (L1197 em `index.css`).
- Cores de bloco no calendário (referência visual alternativa): [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) L168–187 (`.status-scheduled`, etc.).

---

## 3. Estrutura dos dados no backend

### 3.1 Endpoint

| Aspecto | Detalhe |
| --- | --- |
| Método / path | `GET /api/dashboard/summary` |
| Rotas | [`server/src/modules/dashboard/routes/DashboardRoutes.ts`](../../server/src/modules/dashboard/routes/DashboardRoutes.ts) L16–26 |
| Controller | [`server/src/modules/dashboard/controllers/DashboardController.ts`](../../server/src/modules/dashboard/controllers/DashboardController.ts) L28–42 |
| Service | [`server/src/modules/dashboard/services/DashboardService.ts`](../../server/src/modules/dashboard/services/DashboardService.ts) L51–84 |
| Repository | [`server/src/modules/dashboard/repositories/DashboardRepository.ts`](../../server/src/modules/dashboard/repositories/DashboardRepository.ts) |

**Guards (facto):** JWT, password change, empresa operacional, `authorize(OWNER, ADMIN, MANAGER, EMPLOYEE)`, `Permission.APPOINTMENT_READ`, validação de query.

**Query:** `startAt`, `endAt` (ISO com offset, `[startAt, endAt)`), `upcomingLimit` opcional 1–20 — [`dashboard-summary.validator.ts`](../../server/src/modules/dashboard/validators/dashboard-summary.validator.ts).

**Tenant:** `companyId` = `req.user.companyId` apenas; query `companyId` ignorada (teste de integração L120–132).

### 3.2 Resposta — campo relevante para O2

```typescript
// server/src/modules/dashboard/index.ts L11–17 + client/src/types/dashboard.ts L4–9
period: {
  startAt: string;
  endAt: string;
  total: number;
  byStatus: Record<AppointmentStatus, number>;
}
```

**Agregação por estado:**

- `DashboardRepository.findStatusCounts` (L24–34): `$match` por `companyId`, `deletedAt: null`, `startAt` no intervalo; `$group` por `status`.
- `DashboardService.buildByStatus` (L24–45): inicializa **todos** os cinco estados a `0` e preenche a partir das linas da agregação; `total` = soma das contagens.

**Outros campos (contexto):**

- `todayAppointments`: documentos no período, **excluindo** `cancelled` no service (L69–71) — a lista do dia ≠ soma de `byStatus`.
- `upcomingAppointments`: `scheduled` \| `confirmed`, `startAt >= now` (servidor), limite configurável.
- `activeClientsCount`: clientes activos da empresa.

### 3.3 Necessidade de alteração no backend para O2

| Veredicto | **Não é necessária alteração de contrato** para O2 |
| --- | --- |
| Motivo | `period.byStatus` já expõe os cinco estados com zeros explícitos; o período é o mesmo que o frontend envia para «hoje». |
| Optimização futura | O3 (uma query em vez de `findStatusCounts` + `findAppointmentsInPeriod`) — **não** requisito para O2. |

---

## 4. Enum, labels e cores dos estados

### 4.1 Enum (fonte de verdade)

[`server/src/constants/appointment-status.ts`](../../server/src/constants/appointment-status.ts) L13–19:

| Constante | Valor |
| --- | --- |
| `SCHEDULED` | `scheduled` |
| `CONFIRMED` | `confirmed` |
| `COMPLETED` | `completed` |
| `CANCELLED` | `cancelled` |
| `NO_SHOW` | `no-show` |

Frontend: [`client/src/types/appointment.ts`](../../client/src/types/appointment.ts) L5–10 (`AppointmentStatus` union).

### 4.2 Labels e badges (frontend centralizado)

[`client/src/config/appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts):

| Status | Label (`APPOINTMENT_STATUS_LABELS`) | Badge Bootstrap (`APPOINTMENT_STATUS_BADGE_CLASS`) |
| --- | --- | --- |
| scheduled | Agendado | `text-bg-primary` |
| confirmed | Confirmado | `text-bg-info` |
| completed | Concluído | `text-bg-success` |
| cancelled | Cancelado | `text-bg-secondary` |
| no-show | Não compareceu | `text-bg-warning` |

**Inconsistência actual (facto):** no Dashboard, o KPI usa o título **«Pendentes»** para `scheduled` (`DashboardPage.tsx` L247), enquanto `APPOINTMENT_STATUS_LABELS.scheduled` = **«Agendado»**. Em Relatórios, `STATUSES_HEADERS.scheduled` = **«Agendados»** ([`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) L723–728).

**Recomendação O2:** no bloco de distribuição, alinhar rótulos ao Dashboard operacional («Pendentes» / «Confirmados») **ou** adoptar `APPOINTMENT_STATUS_LABELS` de forma consistente em toda a secção — decisão de produto mínima; **não** inventar novos estados.

### 4.3 Cores

- **Badges (agenda e listagens):** classes Bootstrap em `appointmentStatus.ts` (tabela acima).
- **Calendário:** hex fixos em `appointments-calendar.css` (podem diferir ligeiramente dos badges Bootstrap).
- **KPI cards:** acentos decorativos por `nth-child` em `index.css`, não por status.

---

## 5. Componentes e padrões reutilizáveis

| Recurso | Reutilização para O2 |
| --- | --- |
| `DashboardCard` | Já usado para KPIs; Relatórios repete 5 cards por status — **denso** se duplicado no Dashboard (já há 4 KPIs). |
| `APPOINTMENT_STATUS_LABELS` / `APPOINTMENT_STATUS_BADGE_CLASS` | **Sim** — lista ou indicadores coloridos sem duplicar enum. |
| `DashboardAppointments` | Badges por linha; não é distribuição agregada. |
| `ReportsPage` — `STATUSES` + map de cards (L35–41, L422–430) | **Padrão de dados** (iterar os 5 estados); **não** copiar layout 6×`DashboardCard` no Dashboard sem ajuste compacto. |
| Bootstrap `progress` | **Hipótese:** não usado hoje no staff UI; disponível sem nova dependência para barras relativas a `period.total`. |
| Novo subcomponente | Ex.: `DashboardStatusDistribution.tsx` em `client/src/pages/dashboard/` — recomendado para manter `DashboardPage` legível. |

**Facto:** **Não** existe hoje nenhum UI no Dashboard que mostre `completed`, `cancelled` ou `no-show` apesar de virem na API.

---

## 6. RBAC, multi-tenancy e filtros de período

### 6.1 Autorização

- Mesmo conjunto de roles para summary: OWNER, ADMIN, MANAGER, EMPLOYEE com `APPOINTMENT_READ`.
- CLIENT: 403; empresa inactiva: 403 (`RequireOperationalCompany`).
- **EMPLOYEE (O6 / P0):** summary inclui agendamentos de **toda a empresa** — sem filtro `employeeId` no repositório. O2 herda este escopo; **não** alterar sem decisão de produto.

### 6.2 Período

- Dashboard fixa `buildReportRange("today", selectCompanyTimezone())` — **não** há selector de período na UI (diferente de Relatórios).
- `byStatus` reflecte **todos** os agendamentos com `startAt` no intervalo do dia local (convertido a UTC), **incluindo cancelados** na agregação.
- Card «Hoje» = contagem da lista filtrada (sem cancelados) — pode divergir de `period.total` se houver cancelados no dia.

### 6.3 Isolamento

- Todas as queries do repositório filtram `companyId` + `deletedAt: null` onde aplicável.

---

## 7. Testes existentes

### 7.1 Inventário

| Ficheiro | Casos (aprox.) | Cobertura relevante O2 |
| --- | --- | --- |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | **26** `it(...)` | KPIs scheduled/confirmed, active clients, agenda, erros, RBAC related employees |
| [`client/src/api/apiClient.test.ts`](../../client/src/api/apiClient.test.ts) | Parcial | Erros em `/dashboard/summary` |
| [`server/tests/unit/dashboard/DashboardService.test.ts`](../../server/tests/unit/dashboard/DashboardService.test.ts) | 4 | `buildByStatus`, exclusão cancelados na lista |
| [`server/tests/unit/dashboard/DashboardRepository.test.ts`](../../server/tests/unit/dashboard/DashboardRepository.test.ts) | 4 | Pipeline tenant / intervalo |
| [`server/tests/integration/routes/dashboard.routes.test.ts`](../../server/tests/integration/routes/dashboard.routes.test.ts) | 10 | Estrutura `byStatus` com zeros (L200–215), RBAC |

**Sem** testes dedicados frontend ao serviço `dashboard.api.ts` (só mock na página).

### 7.2 Ampliações sugeridas na implementação O2

| Área | Testes sugeridos |
| --- | --- |
| `DashboardPage.test.tsx` | Mock `byStatus` com valores em `completed` / `cancelled` / `no-show` visíveis no novo bloco; estados a zero ainda presentes (acessibilidade / texto). |
| `DashboardPage.test.tsx` | Regressão: quatro KPIs existentes + Clientes ativos inalterados. |
| Subcomponente (se criado) | Testes unitários do cálculo de percentagens e ordem estável dos 5 estados. |
| Backend | **Nenhum obrigatório** se não houver alteração de API. |

**Não** foram executados testes nesta auditoria (read-only).

---

## 8. Riscos e possíveis regressões

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Duplicar scheduled/confirmed (KPI + distribuição) | Ruído visual | Distribuição mostra os 5 estados de forma compacta; **não** remover KPIs sem decisão; ou usar distribuição só para estados «em falta» (hipótese — menos coerente). |
| Confusão Hoje vs `period.total` | Utilizador interpreta totais | Copy curto: «no dia» / período alinhado ao mesmo `startAt`/`endAt`; opcional nota que cancelados entram na distribuição mas não na lista. |
| Layout mobile sobrecarregado | KPIs + novo bloco + 2 agendas | Um único card full-width com linhas empilhadas; evitar segunda fila de 5 `DashboardCard`. |
| Regressão O1 | Clientes ativos | Asserts existentes em `describe("active clients KPI")` (L764+). |
| Labels inconsistentes | UX | Documentar escolha Pendentes vs Agendado no O2. |
| O6 EMPLOYEE scope | Privacidade | Fora de O2; não filtrar no frontend. |
| CSS `nth-child` KPIs | Quarto card sem cor de topo | Opcional polish, não bloqueante. |

---

## 9. Recomendação técnica de implementação

### 9.1 Escopo

- **Frontend-only** — consumir `summary.period.byStatus` e `summary.period.total` já devolvidos.
- **Sem** novas dependências, **sem** Tailwind, **sem** alteração de `GET /api/dashboard/summary`.

### 9.2 Representação UI (recomendada)

**Um card compacto «Distribuição por estado»** (ou subtítulo sob «Resumo do dia»), colocado **entre** a grelha `dashboard-kpis` e `dashboard-agenda-grid`:

- Para cada `AppointmentStatus` numa ordem fixa (ex.: a mesma que `ReportsPage` `STATUSES`, L35–41):
  - Rótulo (labels partilhados ou mapa dashboard-específico para «Pendentes»).
  - Contagem inteira (`pt-PT` opcional, como Relatórios `formatInteger`).
  - Indicador visual: badge pequeno **ou** barra `progress` Bootstrap com largura `count / max(total, 1)` e cor derivada de `APPOINTMENT_STATUS_BADGE_CLASS` / variante CSS local.
- **Mostrar os cinco estados mesmo com contagem 0** (requisito funcional).
- `period.total === 0`: mostrar zeros ou mensagem curta («Sem agendamentos no período») sem esconder a estrutura.

**Não recomendado para O2:** segunda fila com cinco `DashboardCard` adicionais (paridade com Relatórios) — aumenta scroll mobile e repete scheduled/confirmed já nos KPIs.

**Alternativa aceitável:** lista densa tipo ranking (sem barras), se CSS mínimo for prioridade.

### 9.3 Constantes partilhadas (opcional, baixo risco)

- Extrair ordem `AppointmentStatus[]` para `client/src/config/appointmentStatus.ts` (hoje duplicada em `ReportsPage` e potencialmente no novo componente) — **não obrigatório** no primeiro PR O2.

### 9.4 Dados e regras de negócio

- Contagens **apenas** da API; frontend não recalcula a partir de `todayAppointments`.
- Não derivar estados; não agrupar «finalizados» (completed + no-show).

---

## 10. Ficheiros prováveis de alteração (implementação futura)

| Ficheiro | Alteração esperada |
| --- | --- |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | Inserir secção O2; passar `summary.period` |
| **Novo** `client/src/pages/dashboard/DashboardStatusDistribution.tsx` (nome sugerido) | UI compacta por estado |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Casos O2 + regressão KPIs |
| [`client/src/index.css`](../../client/src/index.css) | Estilos opcionais `.dashboard-status-distribution` |
| [`client/src/config/appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts) | Opcional: `APPOINTMENT_STATUS_ORDER` |
| **Backend** | Nenhum (O2) |
| **Docs** | `docs/reports/schedulerpro-dashboard-o2-*.md` após implementação (padrão O1) |

**Inalterados (garantia explícita):** `dashboard.api.ts`, tipos `DashboardSummary`, KPI Clientes ativos, contratos API, `touchBookingSerialization` / GW-3.

---

## 11. Critérios de aceitação — O2

1. Com summary válido do dia actual, o utilizador vê **os cinco estados** com contagens correspondentes a `period.byStatus`.
2. Estados sem agendamentos mostram **0** (não omitem a linha).
3. Rótulos e cores alinham com [`appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts) (com decisão documentada para «Pendentes» vs «Agendado» no Dashboard).
4. O período efectivo é o mesmo da chamada actual (`buildReportRange("today", …)`); **sem** novo selector de datas.
5. Os quatro KPIs existentes (Hoje, Pendentes, Confirmados, Clientes ativos) mantêm valores e testes passando.
6. Listas «Agenda do dia» e «Próximos agendamentos» inalteradas em comportamento.
7. Layout responsivo: legível em `col-12` mobile e desktop sem quebrar `dashboard-agenda-grid`.
8. Sem novas dependências npm; apenas Bootstrap 5 / ícones existentes.
9. OWNER, ADMIN, MANAGER, EMPLOYEE continuam a ver o bloco quando o summary carrega (mesmo RBAC).
10. Testes automatizados em `DashboardPage.test.tsx` cobrem pelo menos um cenário com contagens não nulas em `completed`, `cancelled` ou `no-show`.

---

## 12. Contexto para implementação (outro agente)

- **Única fonte de agregação:** `GET /dashboard/summary` → `data.period.byStatus` + `data.period.total`.
- **Não** implementar revenue, rankings ou períodos customizados (isso é Relatórios).
- **Não** alterar `activeClientsCount` nem o quarto `DashboardCard` (O1).
- **Testes de referência:** `makeSummary` + `emptyByStatus()` em `DashboardPage.test.tsx` L57–89; integração backend `byStatus` com zeros em `dashboard.routes.test.ts` L200–215.
- **Servidor lista do dia:** cancelados aparecem em `byStatus` mas não em `todayAppointments` (`DashboardService.ts` L69–71).
- **Próximos passos sugeridos na auditoria funcional:** O2 + O5 (refresh ao voltar à rota) como segunda onda — O5 independente de O2.

---

## Veredicto final

**AUDITORIA CONCLUÍDA**

- Branch `develop`, working tree limpo, sem bloqueios técnicos.
- Dados para O2 **já disponíveis** no contrato actual; implementação **recomendada só no frontend**.
- Nenhum código, contrato API ou dependência foi alterado nesta tarefa; apenas este relatório foi criado.
