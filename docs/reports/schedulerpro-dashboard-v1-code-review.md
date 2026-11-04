# SchedulerPro — Revisão técnica do Dashboard v1

**Data:** 31/10/2026
**Branch revista:** `feature/dashboard-v1`
**Tipo:** Revisão somente leitura (sem alterações de implementação)
**Referências:**

- [schedulerpro-dashboard-v1-implementation.md](./schedulerpro-dashboard-v1-implementation.md)
- [schedulerpro-dashboard-technical-audit.md](./schedulerpro-dashboard-technical-audit.md)

---

## Resumo da revisão

A implementação do Dashboard v1 cumpre o objectivo principal da auditoria: substituir o carregamento da lista completa de agendamentos e o cálculo de KPIs no browser por **`GET /api/dashboard/summary`**, com agregações MongoDB filtradas por tenant, validação de período ISO e middlewares operacionais alinhados ao resto da API pós-lifecycle (PR #115).

O contrato de resposta, a convenção `[startAt, endAt)` sobre `Appointment.startAt`, a exclusão de soft-deletes e a leitura **sem mutação** de estados estão correctamente implementados. O frontend usa `buildReportRange("today", company.timezone)` de forma consistente com a página de Relatórios.

**Não foram identificados problemas críticos** de segurança ou fuga cross-tenant no código revisto. As principais ressalvas concentram-se em **lacunas de testes** (isolamento entre duas empresas sem Mongo real) e em **decisões de produto** já documentadas (EMPLOYEE vê KPIs da empresa; `activeClientsCount` só na API).

---

## 1. Backend

### 1.1 Contrato `GET /api/dashboard/summary`

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| Tipos e forma da resposta | Conforme | `server/src/modules/dashboard/index.ts` (`DashboardSummary`) |
| `period.startAt/endAt`, `total`, `byStatus` | Conforme | `DashboardService.ts` ~73–79 |
| `todayAppointments`, `upcomingAppointments` | Conforme | `DashboardService.ts` ~69–81 |
| `activeClientsCount` | Conforme | `DashboardRepository.ts` ~63–70 |

Montagem: `server/src/routes/index.ts` — `router.use("/dashboard", dashboardRoutes)`.

### 1.2 Validação de query

| Parâmetro | Regra | Evidência |
|-----------|--------|-----------|
| `startAt`, `endAt` | Obrigatórios, ISO com offset, `startAt < endAt`, máx. 366 dias | `validators/dashboard-summary.validator.ts` |
| `upcomingLimit` | Opcional, inteiro 1–20 | Mesmo ficheiro, `MAX_UPCOMING_LIMIT` em `index.ts` |

### 1.3 Filtros e convenção temporal

- **`[startAt, endAt)`** em `Appointment.startAt`: `DashboardRepository.buildStartAtRangeMatch` (linhas ~17–20).
- **`companyId`**: sempre argumento do service a partir de `req.user.companyId` (`DashboardController.ts` ~28–29); repositório usa `Types.ObjectId(companyId)` no match de período.
- **`deletedAt: null`**: presente em agregação, listagem do período e `findUpcoming`.
- **`companyId` na query string**: ignorado pelo controller; teste HTTP confirma sessão (`server/tests/integration/routes/dashboard.routes.test.ts` ~120–132).

### 1.4 Read-only

- Não há chamadas a `expireOverdueScheduled`, `updateMany` de status ou equivalente no módulo dashboard.
- Comentário explícito no service: read-only (`DashboardService.ts` ~48–50).

### 1.5 Regras de negócio específicas

| Regra | Resultado | Evidência |
|-------|-----------|-----------|
| `byStatus` cobre enum oficial | OK | `AppointmentStatus` em `buildByStatus` (`DashboardService.ts` ~28–34) |
| `todayAppointments` exclui `cancelled` | OK | Filtro pós-query (`DashboardService.ts` ~69–71); unit test `DashboardService.test.ts` |
| `upcoming`: scheduled/confirmed, `startAt >= now`, sort asc, limit | OK | `DashboardRepository.findUpcoming` ~46–60 |
| Clientes activos | OK | `Client.countDocuments({ companyId, deletedAt: null, isActive: true })` |

**Nota semântica (baixa):** o card **Hoje** usa `todayAppointments.length` (sem cancelados); `period.total` inclui cancelados no período. Coerente com UI anterior para a lista do dia, mas `total` ≠ card “Hoje” se existirem cancelados no dia.

---

## 2. Segurança e permissões

### 2.1 Ordem dos middlewares

Em `server/src/modules/dashboard/routes/DashboardRoutes.ts` (linhas ~16–24):

1. `AuthMiddleware.authenticate`
2. `PasswordChangeMiddleware.requirePasswordChangeCompleted`
3. `RequireOperationalCompanyMiddleware.requireOperationalCompany`
4. `authorize(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)`
5. `hasPermission(Permission.APPOINTMENT_READ)`
6. `dashboardSummaryValidator` + `validateRequest`

Ordem correcta: autenticação e empresa operacional antes de autorização e validação.

### 2.2 Papéis

| Role | Comportamento esperado | Evidência |
|------|------------------------|-----------|
| OWNER, ADMIN, MANAGER, EMPLOYEE | 200 com summary | Integração HTTP; RBAC `APPOINTMENT_READ` |
| CLIENT | **403** | `authorize(...)` exclui CLIENT; teste integração ~150–164 |

A combinação **`authorize` + `hasPermission`** é necessária: CLIENT possui `APPOINTMENT_READ` no RBAC global; sem `authorize`, CLIENT acederia a KPIs da empresa inteira.

### 2.3 Escopo EMPLOYEE

Não existe filtro por `employeeId` no dashboard. EMPLOYEE vê agregados e listas **da empresa completa**, alinhado ao dashboard anterior (lista global de appointments) e ao menu staff. **Não é fuga cross-tenant**; é decisão de produto — documentar no PR.

### 2.4 Riscos multi-tenant (código)

| Risco | Avaliação |
|-------|-----------|
| `companyId` injectado na query | Mitigado — não usado |
| Agregação sem filtro de tenant | Não observado — todos os paths usam `companyId` da sessão |
| CLIENT / empresa inactiva | Mitigado — 403 testado (CLIENT e `isActive: false`) |

---

## 3. Timezone

- **Frontend:** `buildReportRange("today", timezone)` em `client/src/pages/dashboard/DashboardPage.tsx` (~48–64); parâmetros enviados a `dashboardApi.getSummary`.
- **Timezone efectivo:** `selectCompanyTimezone` — empresa carregada → `auth.user.companyTimezone` → fallback `APPOINTMENT_TIMEZONE` (`client/src/store/slices/companySlice.ts`). A página **não** fixa `Europe/Lisbon`; fallback é padrão global da app (`client/src/config/appointmentTime.ts`).
- **DST:** janela do dia via Luxon `startOf("day")` + dia seguinte exclusivo (`reportPeriod.ts`) — mesmo padrão que Relatórios.
- **Backend:** valida instantes UTC recebidos; não reinterpreta timezone IANA (correcto para v1).

---

## 4. Frontend

| Critério | Resultado | Evidência |
|----------|-----------|-----------|
| Deixou de chamar `/appointments` sem período | OK | Sem `appointmentsApi` em `DashboardPage.tsx` |
| KPIs da API | OK | Hoje = `todayAppointments.length`; Pendentes/Confirmados = `period.byStatus.scheduled/confirmed` |
| Loading / erro / retry | OK | `LoadingState`, `ErrorState`, `loadAll` |
| Layout e navegação | OK | Três KPIs + duas tabelas + link agenda |
| Chamadas auxiliares | Aceitável v1 | `clients`, `services`, `employees` para nomes nas tabelas |
| `activeClientsCount` | Parcial UI | Presente na resposta; **não** renderizado (documentado na implementação) |

**Mudança de comportamento vs dashboard antigo:** Pendentes/Confirmados passaram de totais globais (toda a lista) para contagens **no dia civil** — alinhado ao relatório de implementação v1.

---

## 5. Testes

| Área | O que existe | Limite |
|------|--------------|--------|
| Totais / status / cancelados | `DashboardService.test.ts` | Repository mockado |
| Match Mongo (mock) | `DashboardRepository.test.ts` | Models mockados, não Mongo real |
| HTTP + RBAC + validação | `dashboard.routes.test.ts` | **DashboardRepository mockado**; auth mockado |
| Isolamento A vs B | Query `companyId` ignorado (mock) | **Sem** prova com duas empresas em BD |
| Soft-delete end-to-end | Não | Só assert no `$match` unitário |
| Frontend | `DashboardPage.test.ts` | Mock `dashboardApi`; teste de params timezone |

A contagem de 1279 testes server (referência implementação) **não substitui** testes de integração multi-tenant reais para este módulo.

---

## 6. Problemas por severidade

### Críticos

Nenhum.

### Altos

Nenhum bloqueante para merge.

### Médios

1. **Cobertura multi-tenant insuficiente nos testes**
   - **Impacto:** regressão futura no `$match` de `companyId` poderia passar CI.
   - **Evidência:** `dashboard.routes.test.ts` mocka repositório; não há teste A/B com dados distintos.
   - **Recomendação:** teste de integração com repositório real (memória) ou assert duplo em unit do repository com dois `companyId`.

2. **Escopo EMPLOYEE = empresa inteira**
   - **Impacto:** expectativa de dashboard “pessoal” não corresponde ao comportamento.
   - **Evidência:** ausência de `employeeId` em `DashboardRepository`.
   - **Recomendação:** mencionar no PR; evolução futura se produto exigir.

### Baixos

1. **`activeClientsCount` só na API** — funcionalidade parcial na UI (`DashboardPage.tsx` não usa o campo).
2. **Sobreposição today / upcoming** — agendamento hoje com `startAt >= now` pode aparecer nas duas listas.
3. **`now` do servidor** para upcoming — pequeno desvio vs relógio do cliente (`DashboardService.ts` ~56).
4. **Fallback timezone global** quando IANA inválido — comportamento preexistente, não introduzido só pelo dashboard.

---

## 7. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Dashboard não carrega lista completa sem período | **Aprovado** |
| KPIs calculados no backend | **Aprovado** |
| Isolamento por empresa (implementação) | **Aprovado** |
| Timezone da empresa respeitado | **Aprovado** (com fallback global documentado) |
| Permissões preservadas; CLIENT bloqueado | **Aprovado** |
| Relatórios existentes inalterados | **Aprovado** |
| Testes e builds (conforme relatório implementação) | **Aprovado com ressalva** (lacunas multi-tenant) |
| Escopo v1 (sem Redis, rankings, faturamento) | **Aprovado** |

---

## 8. Riscos de segurança e multi-tenancy (síntese)

- **Código:** filtragem consistente por `req.user.companyId`; CLIENT bloqueado; empresa inactiva bloqueada pelo middleware operacional.
- **Testes:** não demonstram isolamento entre tenants de forma exaustiva.
- **Produto:** EMPLOYEE com visão empresa-wide — aceitável se documentado.

---

## 9. Recomendações de correção (pós-merge ou follow-up)

1. Adicionar teste de isolamento (duas empresas, mesma query shape, dados distintos).
2. PR: secção “Ressalvas” com escopo EMPLOYEE e `activeClientsCount` na UI.
3. Opcional v1.1: card “Clientes activos”; deduplicar ou clarificar today vs upcoming na UI.

**Nenhuma correção obrigatória bloqueia commit/PR** com base nesta revisão.

---

## 10. Resultado final

### **APROVADO COM RESSALVAS**

A implementação está alinhada à auditoria técnica e aos critérios de aceitação da v1. Pode seguir para **commit e PR** para `develop`, desde que as ressalvas (testes multi-tenant, escopo EMPLOYEE, indicador de clientes activos na UI) fiquem explícitas na descrição do PR.

---

## 11. Estado Git (momento da revisão)

| Item | Valor |
|------|--------|
| Branch actual | `feature/dashboard-v1` |
| Base HEAD | `a8e6432` (merge PR #115) |
| Implementação dashboard | **Por commitar** (modified + untracked) |

**Working tree (resumo):**

- Modificados: `client/src/pages/dashboard/DashboardPage.tsx`, `DashboardPage.test.tsx`, `server/src/constants/http-messages.ts`, `server/src/routes/index.ts`
- Untracked: `server/src/modules/dashboard/`, testes dashboard, `client/src/api/endpoints/dashboard.api.ts`, `client/src/types/dashboard.ts`, relatórios em `docs/reports/`

Nenhum ficheiro de implementação foi alterado durante a redacção desta revisão.

---

## 12. Confirmação

- Revisão **somente leitura** do código da branch `feature/dashboard-v1`.
- Entregue **apenas** este relatório: `docs/reports/schedulerpro-dashboard-v1-code-review.md`.
