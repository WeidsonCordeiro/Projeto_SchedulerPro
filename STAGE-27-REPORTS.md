# STAGE 27 — Relatórios operacionais

> Módulo de relatórios (visão geral, receita estimada, serviços, funcionários,
> clientes e cancelamentos) para OWNER/ADMIN/MANAGER, com isolamento por
> `companyId`, período no timezone da empresa e receita **estimada** (sem
> pagamento real registrado no domínio).

---

## 1. OBJETIVO

Implementar o módulo de **Relatórios Operacionais** do SchedulerPro: seis
endpoints de consulta (somente leitura) sob `/api/reports` e uma página
`/reports` no frontend com gráficos/cards/tabelas de síntese do negócio por
período (hoje, semana, mês, personalizado).

Restrições da API:

- **Nenhuma mutação**: relatórios fazem apenas agregações (não expiram
  agendamentos, não alteram status).
- **Isolamento absoluto por empresa**: `companyId` vem **sempre** da sessão
  autenticada (`req.user.companyId`), nunca de query/body.
- Acesso restrito a **OWNER, ADMIN e MANAGER**; EMPLOYEE e CLIENT → 403.
- Período calculado no **timezone da empresa** (frontend) com intervalo
  semiaberto `[startAt, endAt)` sobre o `startAt` do agendamento.
- Receita é **estimada** a partir do `price` do serviço (o domínio não possui
  cobrança/pagamento real).

---

## 2. CONTEXTO ANTERIOR

O backend já possuía:

- RBAC por permissões (`RolePermissions`) e middleware `authorize(...roles)`
  (`server/src/middlewares/role.middleware.ts`) que retorna **403** com
  `USER_NOT_PERMISSION` quando o role não está na lista.
- `role.middleware.ts` é aplicado na `permission.middleware.ts` (verificação de
  permissão individual). O `Authorize` por lista de roles é o usado aqui.
- Controle de sessão (Stage 26.x) com `PasswordChangeMiddleware`
  (`requirePasswordChangeCompleted`), aplicado às rotas protegidas.
- Models/constantes relevantes:
  - `AppointmentStatus` (`server/src/constants/appointment-status.ts`):
    `scheduled | confirmed | completed | cancelled | no-show`.
  - `Role` (`server/src/constants/roles.ts`): `OWNER | ADMIN | MANAGER |
    EMPLOYEE | CLIENT`.
  - `Appointment.model.ts`: `companyId, clientId, serviceId, employeeId,
    startAt, endAt, status, notes, deletedAt`, `createdAt/updatedAt`.
  - `Service.model.ts`: `price` (number), `isActive`, `deletedAt`.
  - `User.model.ts`: `role`, `companyId`, `clientId`, `deletedAt` (users são os
    funcionários).
  - `Client.model.ts`: `name`, `isActive`, `deletedAt`.
- Padrão de projeto: módulos em `server/src/modules/<modulo>/` com
  `repositories/`, `services/`, `validators/`, `controllers/`, `routes/`;
  rotas registradas em `server/src/routes/index.ts`; mensagens centralizadas em
  `server/src/constants/http-messages.ts`; `ResponseHandler` em
  `server/src/core/response.ts` (`success`/`error`); convenções de teste em
  `server/tests/{unit,integration}`.
- Frontend: padrão de páginas com Redux Toolkit, `selectCompanyTimezone` (com
  fallback), `getApiError`/`getFriendlyErrorMessage`, Bootstrap 5, formatação
  `toLocaleString("pt-PT")` (sem símbolo monetário, por convenção do projeto),
  menu baseado em `client/src/config/menu.ts` e gating por `getXAbilities`.

---

## 3. PROBLEMA ENCONTRADO

1. **Não existia nenhum relatório operacional** — apenas o Dashboard com as
   contagens do dia (`DashboardPage.tsx`).
2. **Nenhuma permissão do `RolePermissions` distingue MANAGER de EMPLOYEE**:
   EMPLOYEE já tem `CLIENT_READ`, `SERVICE_READ`, `APPOINTMENT_READ` e
   `AVAILABILITY_READ`. Qualquer tentativa de autorizar relatórios por uma
   permissão nova (`REPORT_READ`) exigiria adicioná-la manualmente aos três
   roles administrativos e validar todos os testes de RBAC existentes, para um
   ganho semântico nulo — a lista de roles (`authorize(OWNER, ADMIN, MANAGER)`)
   já expressa exatamente quem pode ver o negócio.
3. **`startOf("today")` é unidade inválida no Luxon** (o DOM/API só aceita
   `day`, `week`, `month`, etc.) — causaria erro de runtime na construção do
   período "Hoje".

---

## 4. IMPLEMENTAÇÃO

### Backend — módulo `reports`

Novo módulo `server/src/modules/reports/`:

| Arquivo | Responsabilidade |
|---------|------------------|
| `index.ts` | Tipos de resposta (`StatusCountRow`, `RevenueAggregateRow`, `TopServiceRow`, `EmployeeRow`, `ClientMetricsAggregate`, `ReportOverview`/`ReportReceita`/etc. agregados), `ReportRange`, `DEFAULT_REPORT_LIMIT = 5` |
| `repositories/ReportRepository.ts` | 5 agregações MongoDB (`findStatusCounts`, `findRevenue`, `findTopServices`, `findEmployeeMetrics`, `findClientMetrics`) |
| `services/ReportService.ts` | Orquestra agregações → resposta final; normaliza `limit` (1..20); taxa de cancelamento arredondada a 2 casas; formata overview por status |
| `validators/list-reports.validator.ts` | `startAt`/`endAt` ISO 8601 UTC opcionais, `startAt < endAt`, span ≤ 366 dias; `limit` int 1..20 |
| `controllers/ReportController.ts` | Handlers dos 6 endpoints usando `ResponseHandler.success` |
| `routes/ReportRoutes.ts` | Rotas GET + guards |

Rotas (todas GET, `companyId` da sessão):

```
/api/reports/overview        → total + contagem por status no período
/api/reports/revenue         → estimatedRevenue (completed) + forecastRevenue (scheduled+confirmed)
/api/reports/top-services    → ranking por count/estimatedRevenue, limit 1..20 (default 5)
/api/reports/employees       → ranking por funcionário (exclui role CLIENT)
/api/reports/clients         → totalClients + recurringCount (≥2) + topClients, limit
/api/reports/cancellations   → total, cancelledCount, cancellationRate (%)
```

Guards das rotas:

```
AuthMiddleware.authenticate
  → PasswordChangeMiddleware.requirePasswordChangeCompleted
  → authorize(Role.OWNER, Role.ADMIN, Role.MANAGER)
  → new listReportsValidator().validate()
  → validateRequest
```

Alterações em arquivos existentes:

- `server/src/constants/http-messages.ts`: 6 mensagens novas na seção
  `/*Relatórios*/` (`REPORT_*_FOUND`).
- `server/src/routes/index.ts`: `router.use("/reports", reportRoutes)`.

Detalhes das agregações (`ReportRepository.ts`):

- **Filtro comum** (`buildBaseMatch`): `companyId` (cast `Types.ObjectId`) +
  `deletedAt: null`; quando há período, `startAt >= startAt && startAt < endAt`.
- **Lookups preservam referências soft-deleted** (decisão de negócio): o
  relatório usa `$arrayElemAt` + `$ifNull` para ler `service.price`/`name`,
  `employee.name`/`role`, `client.name` mesmo que a referência tenha `deletedAt`
  — não quebra histórico.
- **Valor de serviço**: preço do serviço referenciado; `$ifNull(..., 0)` quando
  o agendamento não possui serviço válido.
- **Funcionários**: lookup em `users`; após o `$group`, `$match` remove `role:
  CLIENT`; projeção sem `_id`.
- **Clientes recorrentes**: `$facet` com 3 sub-pipelines (`stats`,
  `recurring` com `n >= 2`, `topClients` com lookup/clientes+serviços, sort e
  limit); resultado mapeado com `?? 0`/`?? []`.

### Frontend

| Arquivo | Conteúdo |
|---------|----------|
| `client/src/types/report.ts` | Tipos `ReportOverview`, `ReportRevenue`, `ReportTopService`, `ReportEmployee`, `ReportClientRank`, `ReportClients`, `ReportCancellations` |
| `client/src/api/endpoints/reports.api.ts` | `reportsApi` (default): 6 métodos GET com `GetReportsParams` / `GetRankingReportsParams` |
| `client/src/config/reportPeriod.ts` | `ReportPeriodKey` ("today"\|"week"\|"month"\|"custom"), `REPORT_PERIOD_LABELS`, `buildReportRange(period, tz, start?, end?)`, `formatReportDate`; mapa `LUXON_UNIT` p/ converter período em unidade Luxon |
| `client/src/config/reportPermissions.ts` | `getReportAbilities(role)` → `{ canView }` para OWNER/ADMIN/MANAGER |
| `client/src/config/menu.ts` | Novo item "Relatórios" (`/reports`, roles OWNER/ADMIN/MANAGER) entre Agendamentos e Empresa |
| `client/src/pages/reports/ReportsPage.tsx` | Página com seletor de período, cards de status, receita estimada/prevista, % de cancelamento e rankings |
| `client/src/routes/AppRoutes.tsx` | Rota `/reports` (`ReportsPage`) |

`ReportsPage.tsx` detalhes:

- Períodos: `btn-group` com Hoje / Esta semana / Este mês / Personalizado
  (`applyCustom` valida data inicial ≤ final e informa erro inline; botão
  "Aplicar").
- Consulta: 6 chamadas paralelas sequenciais; `getOverview` é o endpoint
  principal — falha nele → estado de erro com "Tentar novamente"; falha nos
  outros → alerta de aviso "Não foi possível carregar parte dos relatórios."
  mantendo o que carregou; valores ausentes usam `EMPTY_*` defaults.
- Estado vazio quando `total === 0` (`!range` → falso).
- `canView === false` → bloco "Você não tem permissão para acessar esta
  página." e efeito de carregamento **não** dispara.
- Formatação: `toLocaleString("pt-PT")` com 2 casas para moeda ("120,00", sem
  símbolo) e `%` para taxa; timezone via `selectCompanyTimezone` (fallback
  `APPOINTMENT_TIMEZONE`).

---

## 5. DECISÕES TÉCNICAS

1. **Autorização por lista de roles** (`authorize(OWNER, ADMIN, MANAGER)`), não
   por permissão nova: nenhuma permissão atual distingue MANAGER de EMPLOYEE e
   adicionar `REPORT_READ` exigiria tocar em 3 roles + testes de RBAC sem
   ganho. Documentado no módulo para revisão futura.
2. **Receita estimada, nunca transacional**: o domínio não possui pagamento; os
   valores são `price × count` por status. Chamado de `estimatedRevenue` /
   `forecastRevenue` na API para deixar explícito.
3. **Lookups mantêm referências soft-deleted**: relatório histórico não deve
   zerar valores quando um serviço/funcionário/cliente é removido.
4. **Sem `expireOverdueScheduled` / sem mutação**: relatório é somente leitura;
   decisões operacionais (cancelar scheduled vencido) ficam para stages futuras.
5. **`limit` fixo 1..20 (default 5)** nos rankings, sem paginação por cursor
   (superfície pequena de dados por empresa).
6. **Intervalo semiaberto `[startAt, endAt)`** tanto na regra de negócio quanto
   no cálculo do range do frontend (Luxon), evitando dupla contagem nas bordas.
7. **Frontend calcula o range em UTC a partir do timezone da empresa** (são
   passados instantes ISO UTC); o backend apenas filtra — nenhuma lógica de TZ
   no servidor.
8. **`LUXON_UNIT`** em `reportPeriod.ts`: mapeia `"today" → "day"`,
   `"week" → "week"`, `"month" → "month"`, `"custom" → "day"` — correção do
   `startOf("today")` inválido no Luxon.

---

## 6. O QUE NÃO FOI ALTERADO

- **RBAC/roles/permissões existentes**: nenhum `Permission` novo;
  `permission.middleware.ts` e `role.middleware.ts` inalterados.
- **Política de sessão** (cookies, refresh, idle/absolute). Apenas os guards
  foram reaproveitados.
- **Agendamentos**: nenhum agendamento é expirado/cancelado por relatório;
  `AppointmentRepository`/`AppointmentService` inalterados.
- **Dashboard, portal (CLIENT) e calendário**: intocados.
- **Sem** paginação por cursor, sem exportação PDF/CSV, sem gráficos de
  biblioteca externa (cards/tabelas Bootstrap), sem cache/esquema novo.

---

## 7. TESTES

### Backend — 37 arquivos / 417 testes: PASS

(antes: 36 arquivos / 406 testes → +11 testes novos, 1 arquivo novo)

- `server/tests/unit/reports/ReportService.test.ts` — overview/resumo, receita
  estimada vs. prevista, rankings, taxa de cancelamento com arredondamento,
  `normalizeLimit`.
- `server/tests/unit/reports/ReportRepository.test.ts` — pipelines de
  agregação: filtro base (`companyId` ObjectId + `deletedAt: null` + range
  `$gte/$lt`), lookup de services, limite 1..20/default 5, exclusão de role
  CLIENT em funcionários, facet de clientes recorrentes e fallbacks de zeros.
- `server/tests/integration/routes/report.routes.test.ts` — express + supertest
  com `auth.middleware` e repositórios mockados: autorização (200 p/
  OWNER/ADMIN/MANAGER; 403 p/ EMPLOYEE/CLIENT), isolamento por `companyId`,
  validação (período inválido, span > 366 dias, limit fora do intervalo),
  formatação das respostas.

### Frontend — 77 arquivos / 826 testes: PASS

(antes: 73 arquivos / 784 testes → +42 testes novos: 4 arquivos de teste novos
+ 3 casos adicionados em `AppRoutes.test.tsx`)

- `client/src/pages/reports/ReportsPage.test.tsx` — spinner, cards e rankings
  com dados, chamadas com range mensal padrão, troca de período (Hoje),
  período personalizado válido e inválido, estado vazio, erro primário com
  "Tentar novamente", aviso de falha parcial, bloqueio p/ EMPLOYEE e acesso p/
  MANAGER.
- `client/src/config/reportPeriod.test.ts` — ranges today/week/month/custom no
  timezone da empresa (fake timers), custom incompleto/fora de ordem/inválido,
  `formatReportDate`.
- `client/src/config/reportPermissions.test.ts` — acesso OWNER/ADMIN/MANAGER e
  bloqueio EMPLOYEE/CLIENT/null.
- `client/src/api/endpoints/reports.api.test.ts` — URLs e params dos 6
  endpoints (+ propagação de erro).
- `client/src/routes/AppRoutes.test.tsx` — mock de `reports.api`; rota `/reports`
  no loop de módulos, bloqueio de EMPLOYEE e redirect de CLIENT → `/portal`.
- `client/src/config/menu.test.ts` — item de menu "Relatórios" (roles).

---

## 8. COVERAGE

### Backend — módulo `reports` (filtrado com `--coverage.include=src/modules/reports/**`)

| Arquivo | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| All files (módulo) | 98.23% | 92.42% | 100% | 98.19% |
| `repositories/ReportRepository.ts` | 100% | 91.66% | 100% | 100% |
| `services/ReportService.ts` | 97.05% | 95.83% | 100% | 96.87% |
| `validators/list-reports.validator.ts` | 91.66% | 83.33% | 100% | 91.66% |

(Controller e rotas são exercidas pelos testes de integração; o restante da
suite (`npm run test:coverage`) permanece nos patamares das stages anteriores.)

### Frontend (`npm run test:coverage`)

| Métrica | Resultado |
|---------|-----------|
| Statements | 95.94% |
| Branches | 90.78% |
| Functions | 96.45% |
| Lines | 96.16% |

Detalhes de arquivos-chave: `reportPeriod.ts` Lines 100% |
`ReportsPage.tsx` Lines 91.52%.

---

## 9. TYPECHECK

- Frontend: `npm run typecheck` (tsc -b --noEmit) **sem erros**.
- Backend: `npm run build` (tsc) **sem erros**.

---

## 10. BUILD

- Frontend: `npm run build` **OK**. Aviso pré-existente (já reportado nas
  stages anteriores, fora de escopo): chunk `index--QtIv-UT.js` 528.08 kB
  (> 500 kB, sem code-splitting solicitado).
- Backend: `npm run build` **OK**.

---

## 11. PROBLEMAS ENCONTRADOS

1. **Luxon `startOf("today")` inválido**: a primeira versão de
   `buildReportRange` usava `startOf(period === "week" ? "week" : period)` e
   `startOf("today")` lançava `InvalidUnitError`. Corrigido com o mapa
   `LUXON_UNIT` (`today → day`). Detectado ao calcular valores esperados dos
   testes.
2. **Gate de permissão desviado do efeito de carregamento**: em `ReportsPage`,
   a proteção por `canView` só existia no render, mas o `useEffect` disparava
   `loadReports` mesmo para EMPLOYEE — o teste de bloqueio provou o vazamento
   (`getOverview` era chamado). Corrigido com guard `if (!canView) return;` no
   efeito (mesmo padrão do `CompanyPage`).
3. **Teste de rota: `vi.hoisted` antes da inicialização**: referências de `id`
   usadas em `vi.mock` antes de serem definidas em `vi.hoisted` → literais
   inline. Também corrigido o caminho relativo `../../src` → `../../../src`
   (profundidade `tests/integration/routes/`).

Fora isso: nenhum problema adicional identificado.

---

## 12. ESTADO FINAL

- Implementação concluída: **sim** (backend + frontend + testes + docs).
- Testes backend: 37 arquivos / **417** testes PASS.
- Testes frontend: 77 arquivos / **826** testes PASS.
- Coverage frontend: Lines **96.16%** | Statements 95.94% | Branches 90.78% |
  Functions 96.45%.
- Coverage módulo reports (backend): module Lines **98.19%**.
- Typecheck frontend: **OK**.
- Build frontend e backend: **OK** (warning de chunk pré-existente).
- **Commit / merge / push: NÃO realizados** (conforme regra da task).

---

## CONTEXTO PARA A PRÓXIMA IA

Estado deixado pela Stage 27:

- Módulo de relatórios **somente leitura** em `server/src/modules/reports/`,
  autorizado por `authorize(Role.OWNER, Role.ADMIN, Role.MANAGER)`; página
  `client/src/pages/reports/ReportsPage.tsx` na rota `/reports`.

Pontos de atenção antes de modificar:

1. **Autorização por roles, não por permissão nova**: se uma stage futura criar
   permissões granulares de relatórios, reavalie o guard de `ReportRoutes.tsx`
   e o `getReportAbilities`/`reportPermissions.ts` no frontend (e os testes de
   RBAC dos 3 roles). Não "refatore" sem mudar a lista de roles + testes.
2. **Receita é estimada** (`service.price`): renomear para algo como "faturamento"
   ou usar valores transacionais exigiria modelar pagamentos — fora do escopo
   até aqui. Manter as mensagens de `http-messages.ts` coerentes se renomear.
3. Os **lookups preservam referências soft-deleted** de propósito. Não adicionar
   `deletedAt: null` aos estágios `$lookup` sem decidir o que acontece com
   relatórios históricos (valores zerariam).
4. **`buildReportRange` usa intervalo semiaberto `[startAt, endAt)`** e o range
   do mês termina no 1º dia do mês seguinte (ex.: `2026-08-31T23:00Z` →
   `2026-09-30T23:00Z` em Europe/Lisbon). O frontend passa instantes UTC; o
   backend apenas filtra — não introduzir timezone no servidor.
5. `ReportRoutes` não aplica limite de companhia via `objectId`/param; o
   `companyId` vem de `req.user`. `Tests` garantem 403 e isolamento — se mudar
   a unicidade do modelo, ajustar `report.routes.test.ts`/`ReportService.test.ts`.
6. O menu ("Relatórios") está entre "Agendamentos" e "Empresa" em
   `client/src/config/menu.ts`; se reordenar, atualizar `menu.test.ts`.
7. Caso o chunk do build cresça ainda mais, considerar `React.lazy` na rota
   `/reports` — não implementado por decisão de não introduzir code-splitting
   nesta etapa.