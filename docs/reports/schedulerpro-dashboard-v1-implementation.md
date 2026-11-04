# SchedulerPro — Dashboard v1: Relatório de implementação

**Data:** 31/10/2026
**Branch:** `feature/dashboard-v1` (base `develop` @ `a8e6432`)
**Referência:** [schedulerpro-dashboard-technical-audit.md](./schedulerpro-dashboard-technical-audit.md)

---

## 1. Objetivo

Substituir o carregamento da lista completa de agendamentos e o cálculo de KPIs no browser por **`GET /api/dashboard/summary`**, com agregações MongoDB, isolamento multi-tenant e timezone da empresa no frontend.

---

## 2. Arquitectura

Novo módulo **`server/src/modules/dashboard`** (read-only):

- `DashboardRoutes` → `DashboardController` → `DashboardService` → `DashboardRepository`
- Agregação por status; consultas filtradas por `startAt` no intervalo `[startAt, endAt)`; próximos agendamentos sem alterar estados (`expireOverdueScheduled` **não** é invocado).

Montagem: `router.use("/dashboard", dashboardRoutes)` em [`server/src/routes/index.ts`](../../server/src/routes/index.ts).

---

## 3. Endpoint e contrato

### `GET /api/dashboard/summary`

**Query:**

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `startAt` | Sim | Instante ISO UTC (início do período) |
| `endAt` | Sim | Instante ISO UTC (fim exclusivo) |
| `upcomingLimit` | Não | 1–20, default **5** |

**Resposta (`data`):**

```json
{
  "period": {
    "startAt": "ISO",
    "endAt": "ISO",
    "total": 0,
    "byStatus": {
      "scheduled": 0,
      "confirmed": 0,
      "completed": 0,
      "cancelled": 0,
      "no-show": 0
    }
  },
  "todayAppointments": [],
  "upcomingAppointments": [],
  "activeClientsCount": 0
}
```

- **`todayAppointments`:** agendamentos com `startAt ∈ [startAt, endAt)`, `deletedAt: null`, **excluindo** `cancelled` (alinhado ao UI anterior).
- **`upcomingAppointments`:** `scheduled` ou `confirmed`, `startAt >= now`, ordenados, limitados.
- **`activeClientsCount`:** `Client` com `deletedAt: null` e `isActive: true` (mesma empresa).

---

## 4. Regras de negócio

- Período contabiliza agendamentos pelo **`startAt`** (não `endAt` nem `createdAt`).
- Soft-deleted appointments excluídos.
- Status oficiais do enum `AppointmentStatus` apenas.
- **Sem** mutação de agendamentos na leitura do dashboard.
- KPIs no frontend (v1): **Hoje** = `todayAppointments.length`; **Pendentes** / **Confirmados** = `period.byStatus.scheduled` / `.confirmed` no dia civil (período `today`).

---

## 5. Multi-tenant e segurança

- `companyId` **apenas** de `req.user.companyId`.
- Filtros de repositório com `companyId` + `deletedAt: null`.
- Middlewares: `AuthMiddleware` → `requirePasswordChangeCompleted` → `RequireOperationalCompanyMiddleware` → **`authorize(OWNER, ADMIN, MANAGER, EMPLOYEE)`** → `hasPermission(APPOINTMENT_READ)`.
- **CLIENT bloqueado** (403): evita expor KPIs da empresa inteira a contas de portal com `APPOINTMENT_READ`.

---

## 6. Timezone

- Frontend: `buildReportRange("today", company.timezone)` ([`client/src/config/reportPeriod.ts`](../../client/src/config/reportPeriod.ts)) — mesmo padrão que Relatórios.
- Backend valida e usa instantes UTC recebidos.

---

## 7. Frontend

- [`client/src/api/endpoints/dashboard.api.ts`](../../client/src/api/endpoints/dashboard.api.ts)
- [`client/src/types/dashboard.ts`](../../client/src/types/dashboard.ts)
- [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) — deixa de chamar `GET /appointments` sem período; mantém clients/services/employees só para nomes nas tabelas.

**Nota:** `activeClientsCount` está na API; o layout v1 mantém os 3 KPIs existentes (sem card extra).

---

## 8. Ficheiros criados

**Backend**

- `server/src/modules/dashboard/index.ts`
- `server/src/modules/dashboard/validators/dashboard-summary.validator.ts`
- `server/src/modules/dashboard/repositories/DashboardRepository.ts`
- `server/src/modules/dashboard/services/DashboardService.ts`
- `server/src/modules/dashboard/controllers/DashboardController.ts`
- `server/src/modules/dashboard/routes/DashboardRoutes.ts`
- `server/tests/unit/dashboard/DashboardService.test.ts`
- `server/tests/unit/dashboard/DashboardRepository.test.ts`
- `server/tests/integration/routes/dashboard.routes.test.ts`

**Frontend**

- `client/src/api/endpoints/dashboard.api.ts`
- `client/src/types/dashboard.ts`

**Docs**

- `docs/reports/schedulerpro-dashboard-v1-implementation.md` (este ficheiro)

---

## 9. Ficheiros alterados

- `server/src/routes/index.ts`
- `server/src/constants/http-messages.ts` (`DASHBOARD_SUMMARY_FOUND`)
- `client/src/pages/dashboard/DashboardPage.tsx`
- `client/src/pages/dashboard/DashboardPage.test.tsx`

Módulo **`reports`** inalterado.

---

## 10. Testes executados

| Comando | Resultado |
|---------|-----------|
| `cd server && npm run test` | 90 ficheiros, **1279** testes (após fix CLIENT) |
| `cd server && npm run test -- dashboard` | 3 ficheiros, **18** testes OK |
| `cd server && npm run build` | OK |
| `cd client && npm run test -- DashboardPage` | **11** testes OK |
| `cd client && npm run build` | OK |

---

## 11. Limitações conhecidas

- KPIs **Pendentes/Confirmados** limitados ao **dia civil** (período `today`), não à empresa inteira (comportamento desejado na v1).
- `activeClientsCount` não exposto na UI.
- Próximos agendamentos usam `now` do servidor (pequeno desvio vs relógio do cliente).
- Sem cache Redis; sem índice composto dedicado `{ companyId, startAt }` (opcional futuro).

---

## 12. Pendências futuras

- Card ou secção de clientes activos; rankings/receita continuam em `/api/reports/*`.
- Testes E2E com Mongo real; índice Mongo se volume crescer.
- Endpoint composto adicional só se latência de múltiplas chamadas for problema.

---

## 13. Continuidade para outra IA

1. Branch: `feature/dashboard-v1`.
2. Validar: `cd server && npm run test && npm run build` e `cd client && npm run test -- DashboardPage && npm run build`.
3. Commit/push/PR: responsabilidade do utilizador.
4. Não confundir dashboard operacional (staff) com relatórios de gestão (`reports`).
