# SchedulerPro — Auditoria técnica para implementação do Dashboard

**Data:** 31/10/2026
**Branch analisada:** `develop` @ `a8e6432` (merge PR #115 — companies lifecycle + auth)
**Tipo:** Auditoria somente leitura
**Contexto:** Pós-merge do lifecycle de empresas (`RequireOperationalCompanyMiddleware`, auth com empresa inactiva, suspensão de staff).
**Relacionado:** [schedulerpro-companies-lifecycle-auth.md](./schedulerpro-companies-lifecycle-auth.md)

---

## Verificação Git (início da auditoria)

| Item | Valor |
|------|--------|
| Branch actual | `develop` |
| Tracking | `develop...origin/develop` |
| HEAD | `a8e6432` — Merge pull request #115 (feature/companies-lifecycle-auth) |
| Working tree | Limpo |

Não foram executados checkout, commit, push, merge ou alterações a ficheiros de implementação.

---

## 1. Resumo da arquitectura actual

### 1.1 Backend (multi-tenant)

- **Tenant:** cada `User` tem um `companyId`; JWT/sessão expõe `req.user.companyId` e `req.user.role` ([`auth.middleware.ts`](../../server/src/middlewares/auth.middleware.ts)).
- **Isolamento:** repositórios filtram por `companyId`; rotas de mutação usam `ensureTenant` ou comparação explícita (ex.: [`CompanyService.ts`](../../server/src/modules/companies/services/CompanyService.ts)).
- **Empresa operacional:** rotas de negócio (incl. relatórios e listagens operacionais) passam por `RequireOperationalCompanyMiddleware` após auth ([`require-operational-company.middleware.ts`](../../server/src/middlewares/require-operational-company.middleware.ts)).
- **RBAC:** matriz em [`rbac.ts`](../../server/src/constants/rbac.ts); autorização por `hasPermission` ou `authorize(roles)`.

### 1.2 Models relevantes

| Entidade | Ficheiro | Campos-chave para indicadores |
|----------|----------|-------------------------------|
| **Appointment** | [`Appointment.model.ts`](../../server/src/modules/appointments/models/Appointment.model.ts) | `companyId`, `clientId`, `serviceId`, `employeeId`, `startAt`, `endAt`, `status`, `deletedAt`, `priceAtTime` |
| **Client** | [`Client.model.ts`](../../server/src/modules/Clients/models/Client.model.ts) | `companyId`, `isActive`, `deletedAt` |
| **Service** | [`Service.model.ts`](../../server/src/modules/services/models/Service.model.ts) | `companyId`, `name`, `price`, `duration`, `isActive`, `deletedAt` |
| **User** | [`User.model.ts`](../../server/src/modules/users/models/User.model.ts) | `companyId`, `role`, `isActive`, `deletedAt`, `companyDeactivationSuspended` |
| **Company** | [`Company.model.ts`](../../server/src/modules/companies/models/Company.model.ts) | `isActive`, `timezone`, `deletedAt` |

**Status de agendamento:** [`appointment-status.ts`](../../server/src/constants/appointment-status.ts) — `scheduled`, `confirmed`, `completed`, `cancelled`, `no-show`.

### 1.3 Módulo de relatórios (já existente)

Não existe módulo `dashboard` no backend. Indicadores agregados vivem em **`server/src/modules/reports`**:

- **Rotas:** `GET /api/reports/overview|revenue|top-services|employees|clients|cancellations`
- **Stack:** `ReportRoutes` → `ReportController` → `ReportService` → `ReportRepository` (único uso de `.aggregate()` em `server/src`)
- **Filtros base:** `companyId` (sessão), `deletedAt: null` em appointments; período opcional em **`startAt` do appointment** intervalo **`[startAt, endAt)`** UTC; máximo **366 dias** ([`list-reports.validator.ts`](../../server/src/modules/reports/validators/list-reports.validator.ts)).

### 1.4 Frontend actual do Dashboard

- **Página:** [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) — rota `/`, menu para OWNER, ADMIN, MANAGER, EMPLOYEE ([`menu.ts`](../../client/src/config/menu.ts)).
- **Dados:** `GET /appointments` **sem filtro de período** (lista completa da empresa), mais `GET /clients`, `/services`, `/employees` (condicional) para resolver nomes.
- **KPIs calculados no browser:** contagem “Hoje”, “Pendentes” (`scheduled`), “Confirmados”; listas “Agenda do dia” e “Próximos 5”.
- **Relatórios:** [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) consome `/api/reports/*` com período derivado do timezone da empresa — **padrão correcto** para agregações.

### 1.5 Camadas por domínio

| Domínio | Repository | Service | Routes |
|---------|------------|---------|--------|
| Appointments | `AppointmentRepository` | `AppointmentService` | `AppointmentRoutes` |
| Clients | `ClientRepository` | `ClientService` | `ClientRoutes` |
| Services | `ServiceRepository` | `ServiceService` | `ServiceRoutes` |
| Users | `UserRepository` | `UserService` | `UserRoutes` |
| Reports | `ReportRepository` | `ReportService` | `ReportRoutes` |

---

## 2. Indicadores viáveis com dados existentes

Legenda: **Sim** = calculável hoje com dados e APIs existentes; **Parcial** = possível com limitações; **Não** = exige novo model/campo ou definição de negócio.

### 2.1 Agendamentos de hoje

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** (melhor no servidor) |
| **Models/campos** | `Appointment`: `companyId`, `startAt`, `status`, `deletedAt` |
| **Filtros** | `deletedAt: null`; janela do dia no **timezone da empresa** convertida para UTC (`startAt` ∈ `[inícioDia, fimDia)`); excluir `cancelled` se alinhado ao UI actual |
| **Hoje** | Frontend filtra lista completa; backend suporta `GET /appointments?startAt=&endAt=` ([`AppointmentController.findAll`](../../server/src/modules/appointments/controllers/AppointmentController.ts)) |
| **Alternativa** | `GET /api/reports/overview?startAt=&endAt=` (contagens por status no dia) |
| **Limitações** | Lista sem período dispara `expireOverdueScheduled` em cada `findAll` ([`AppointmentService.findAll`](../../server/src/modules/appointments/services/AppointmentService.ts)); carregar **todos** os agendamentos não escala |

### 2.2 Agendamentos por período

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** |
| **API** | `/api/reports/overview` ou `/appointments` com query ISO |
| **Filtros** | Mesmo contrato `[startAt, endAt)` em `startAt`; soft-delete excluído |
| **Limitações** | Relatórios: máx. 366 dias; appointments list: validador de período separado |

### 2.3 Agendamentos por status

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** |
| **API** | `/api/reports/overview` → `{ total, byStatus }` |
| **Filtros** | Todos os status do enum; `no-show` entra no total/overview |
| **Limitações** | KPI “Pendentes” no dashboard actual usa só `scheduled`, não `confirmed` |

### 2.4 Total de clientes activos

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** (não exposto como indicador dedicado) |
| **Models/campos** | `Client`: `companyId`, `isActive`, `deletedAt` |
| **Filtros recomendados** | `companyId`, `deletedAt: null`, `isActive: true` |
| **Hoje** | `GET /clients` devolve lista (`findByCompanyId` filtra só `deletedAt: null` — **inactivos incluídos**); contagem activa = **client-side** ou novo endpoint/`$match` |
| **Limitações** | `/api/reports/clients` mede **clientes com agendamentos no período** (recorrentes/top), **não** cadastro activo |

### 2.5 Serviços mais agendados

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** |
| **API** | `/api/reports/top-services?startAt&endAt&limit` |
| **Models** | Agregação em `appointments` + `$lookup` `services` (nome histórico) |
| **Filtros** | `completed` para receita; contagem total inclui outros status conforme pipeline |
| **Limitações** | Serviços soft-deleted/inactivos ainda aparecem no nome via lookup |

### 2.6 Profissionais com mais agendamentos

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Sim** |
| **API** | `/api/reports/employees` |
| **Models** | `appointments.employeeId` + `$lookup` `users`; exclui `Role.CLIENT` |
| **Limitações** | EMPLOYEE no dashboard **não** acede a relatórios (403); ranking é visão de gestão |

### 2.7 Faturamento / receita

| Aspecto | Detalhe |
|---------|---------|
| **Viável?** | **Parcial** — **receita estimada**, não pagamentos |
| **API** | `/api/reports/revenue` |
| **Campo** | `priceAtTime` no appointment (snapshot); **não** `Service.price` actual |
| **Regras** | `completed` → receita; `scheduled`+`confirmed` → previsão; preço desconhecido (`null`/ausente) → contadores `*WithoutPrice`, **fora** da soma |
| **Limitações** | Sem model de pagamento, invoice, ou gateway; **não** chamar “faturamento real” |

---

## 3. Indicadores que dependem de alterações

| Indicador | O que falta |
|-----------|-------------|
| Faturamento real / caixa | Model de pagamentos ou integração financeira |
| Clientes activos como KPI oficial | Endpoint ou agregação em `clients` (hoje mistura-se com `/reports/clients`) |
| Dashboard unificado EMPLOYEE vs gestão | Definir se EMPLOYEE vê KPIs da empresa inteira ou só `employeeId` próprio (hoje `findAll` é **empresa completa**) |
| Taxa de ocupação / horas disponíveis | Cruzar `availability` com appointments (não existe agregação pronta) |
| Meta vs realizado | Campos de meta inexistentes |

---

## 4. Multi-tenancy e segurança

### 4.1 Origem do `companyId`

- **Sempre** `req.user.companyId` após `AuthMiddleware` (JWT + validação de sessão + user/company na BD).
- Relatórios: controller **ignora** `companyId` em query ([teste de integração](../../server/tests/integration/routes/report.routes.test.ts)).

### 4.2 Isolamento

- Agregações: `buildBaseMatch(companyId, range)` em [`ReportRepository.ts`](../../server/src/modules/reports/repositories/ReportRepository.ts).
- Appointments/clients/services: filtros `companyId` nos repositórios; `findById` com comparação de tenant no service.

### 4.3 Middlewares recomendados para novas rotas de Dashboard

Mesma cadeia das rotas operacionais actuais:

1. `AuthMiddleware.authenticate`
2. `PasswordChangeMiddleware.requirePasswordChangeCompleted`
3. `RequireOperationalCompanyMiddleware.requireOperationalCompany`
4. Autorização (ver §4.4)

### 4.4 Permissões sugeridas

**Opção A — Reutilizar padrão Relatórios (gestão):**

- Roles: `OWNER`, `ADMIN`, `MANAGER` via `authorize(...)` (como [`ReportRoutes.ts`](../../server/src/modules/reports/routes/ReportRoutes.ts)).
- Alinha KPIs agregados à página Relatórios.

**Opção B — Alinhar ao menu actual do Dashboard (incl. EMPLOYEE):**

- Usar `hasPermission(Permission.APPOINTMENT_READ)` (e `CLIENT_READ` se KPI de clientes).
- EMPLOYEE já acede ao dashboard e à lista global de agendamentos; KPIs server-side devem **replicar o mesmo scope** (empresa inteira) unless product muda regra.

**Opção C — Permissão nova `DASHBOARD_READ`:**

- Só se for necessário separar “ver agenda” de “ver KPIs financeiros”; implica alterar `permissions.ts` + `rbac.ts` + testes.

**Recomendação v1:** endpoint(s) de dashboard com **mesmos guards que `GET /appointments`** para indicadores operacionais do dia; endpoints de **receita/ranking** restritos a OWNER/ADMIN/MANAGER (delegar a `/reports` ou reutilizar guards).

### 4.5 Riscos de fuga cross-tenant

| Risco | Mitigação actual |
|-------|------------------|
| `companyId` injectado pelo cliente | Ignorado nos relatórios; appointments usam sessão |
| JWT desactualizado | Middleware recarrega user e company |
| Empresa inactiva | Middleware operacional 403 |
| Agregação sem filtro | Revisar qualquer novo `$match` — copiar `buildBaseMatch` |

---

## 5. Desempenho e estratégia de consultas

### 5.1 Índices MongoDB (appointments)

Em [`Appointment.model.ts`](../../server/src/modules/appointments/models/Appointment.model.ts):

- Simples: `companyId`, `clientId`, `employeeId`, `startAt`, `status`
- Compostos: `{ companyId, clientId, startAt }`, `{ companyId, employeeId, status, startAt }` (partial para booking)

**Dashboard por dia/semana:** consultas com `companyId + startAt range` beneficiam de índice composto **`{ companyId: 1, startAt: 1, deletedAt: 1 }`** — **não existe explicitamente**; avaliar após medição (pode usar índice em `companyId` + filtro `startAt`).

### 5.2 Consultas pesadas

| Padrão | Risco |
|--------|--------|
| `GET /appointments` sem período (dashboard actual) | O(n) documentos por empresa; side-effect `expireOverdueScheduled` |
| Múltiplos `/reports/*` no load | 6 round-trips (ReportsPage); aceitável para gestão, pesado se duplicado no dashboard |
| `$lookup` em rankings | OK com `$match` inicial selectivo |

### 5.3 Agregações

- Reutilizar `ReportRepository` ou extrair `buildBaseMatch` partilhado para um futuro `DashboardRepository`.
- **Endpoint composto** `GET /api/dashboard/summary?startAt&endAt` com `$facet` ou várias agregações paralelas no service reduz latência vs. frontend actual.

### 5.4 Redis

- Config em [`env.ts`](../../server/src/config/env.ts); **sem cliente Redis** nem cache de queries em `server/src`.
- **v1:** Redis **não necessário** se o dashboard deixar de carregar a lista completa e usar agregações indexadas.
- Reavaliar se uma empresa tiver volume muito alto ou summary for chamado em polling agressivo.

---

## 6. Plano de testes

### 6.1 Existentes (referência)

- [`ReportRepository.test.ts`](../../server/tests/unit/reports/ReportRepository.test.ts), [`ReportService.test.ts`](../../server/tests/unit/reports/ReportService.test.ts)
- [`report.routes.test.ts`](../../server/tests/integration/routes/report.routes.test.ts) — roles, período, `companyId` da sessão, validação

### 6.2 Necessários para Dashboard (backend)

| Área | Casos |
|------|--------|
| Isolamento | Summary empresa A não inclui dados empresa B |
| Período | Limites UTC; dia civil no timezone da empresa (contrato com frontend) |
| Status | Contagens coerentes com `overview` |
| Permissões | EMPLOYEE vs MANAGER conforme decisão de produto |
| Empresa inactiva | 403 com middleware operacional |
| Clientes activos | Filtro `isActive` + `deletedAt` |

### 6.3 Frontend

- Actualizar [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) para mocks da nova API (em vez de lista completa).
- Testes de timezone (já existem padrão na dashboard page).

### 6.4 Integração

- Opcional: teste com Mongo em memória para um `$facet` de summary (hoje relatórios mockam repositório na integração HTTP).

---

## 7. Escopo recomendado — primeira versão

### Incluir

1. **Backend:** `GET /api/dashboard/summary` (ou `/dashboard/today` + query de período curto) retornando:
   - contagens do dia / período por status (subset de overview);
   - lista limitada de agendamentos do dia (ou reutilizar appointments com `startAt`/`endAt` **obrigatórios** no dashboard);
   - opcional: `activeClientsCount` via contagem em `clients`.
2. **Frontend:** substituir `getAppointments()` sem filtro por chamada(s) com janela UTC derivada de `company.timezone`.
3. **Segurança:** guards alinhados a appointments + empresa operacional.
4. **Documentação:** deixar claro que receita no dashboard de gestão aponta para `/reports` ou incluir só OWNER/ADMIN/MANAGER.

### Adiar

- Redis / cache;
- Faturamento real;
- Endpoint único que duplica os 6 relatórios completos;
- Ocupação vs disponibilidade;
- Permissão `DASHBOARD_READ` unless product exige.

### Não duplicar

- Rankings e receita detalhada: manter **`/api/reports/*`**; link “Ver relatórios” no dashboard para MANAGER+.

---

## 8. Ficheiros prováveis a criar ou alterar

### Criar (backend)

| Ficheiro | Propósito |
|----------|-----------|
| `server/src/modules/dashboard/routes/DashboardRoutes.ts` | Montagem de rotas |
| `server/src/modules/dashboard/controllers/DashboardController.ts` | Extrair `companyId` da sessão |
| `server/src/modules/dashboard/services/DashboardService.ts` | Orquestração read-only |
| `server/src/modules/dashboard/repositories/DashboardRepository.ts` | Agregações / contagens (ou delegar a `ReportRepository`) |
| `server/src/modules/dashboard/index.ts` | Tipos de resposta |
| `server/src/modules/dashboard/validators/dashboard-summary.validator.ts` | Período ISO (reutilizar regras de reports/appointments) |
| `server/tests/unit/dashboard/*.test.ts` | Service/repository |
| `server/tests/integration/routes/dashboard.routes.test.ts` | HTTP + RBAC + tenant |

### Alterar

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/routes/index.ts`](../../server/src/routes/index.ts) | `router.use("/dashboard", dashboardRoutes)` |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | Consumir API agregada / appointments filtrados |
| `client/src/api/endpoints/dashboard.api.ts` (novo) | Cliente HTTP |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Expectativas da nova API |

### Opcional

- Índice `{ companyId: 1, startAt: 1 }` partial `deletedAt: null` em `Appointment.model.ts`
- Extrair `buildBaseMatch` partilhado entre reports e dashboard

---

## 9. Riscos técnicos e de segurança (consolidado)

| Risco | Severidade | Notas |
|-------|------------|-------|
| Dashboard carrega todos os agendamentos | **Alta** (escala) | Estado actual do frontend |
| Divergência KPI browser vs servidor | **Média** | Timezone e status parcial |
| EMPLOYEE vê métricas globais | **Média** (produto) | Consistente com lista actual |
| Receita interpretada como pagamento | **Média** (UX/legal) | Rotular “estimada” |
| Agregações sem índice ideal | **Baixa–média** | Monitorizar slow queries |
| Empresa inactiva | **Baixa** | Middleware já bloqueia |

---

## 10. Conclusão

O SchedulerPro em `develop` **já possui** a maior parte dos dados e agregações necessários para indicadores de gestão no módulo **`reports`**. O **Dashboard** actual no frontend é uma **visão operacional** baseada em listagens completas, não em indicadores server-side — adequado para MVP pequeno, **inadequado** como modelo final para tenants com volume.

A implementação recomendada da **v1** foca em **consultas filtradas por período** (idealmente um summary backend), mantendo **isolamento por `req.user.companyId`**, **middleware operacional** pós-lifecycle, e **RBAC** explícito para KPIs sensíveis (receita/rankings vs. agenda do dia).

---

## Confirmação

- Auditoria executada em **`develop`** @ `a8e6432`, working tree limpo no início.
- **Nenhum** ficheiro de implementação (`server/src`, `client/src`, configs, tests) foi alterado durante esta auditoria.
- **Entregue apenas** este relatório: `docs/reports/schedulerpro-dashboard-technical-audit.md`.
