# O6 — Visibilidade de agendamentos por perfil

## Objetivo

Restringir **leitura** de agendamentos e dados derivados no dashboard por perfil autenticado, com isolamento por empresa (`req.user.companyId`) e, para `EMPLOYEE`, por `appointment.employeeId === req.user.userId`.

## Contexto

- Auditoria: [`docs/audits/appointment-visibility-by-role-audit.md`](../audits/appointment-visibility-by-role-audit.md)
- Branch de referência na auditoria: `develop` @ `9b435f9`
- Implementação feita em `develop` (sem commit automático)

## Regras de negócio

| Perfil | Leitura de agendamentos |
|--------|-------------------------|
| OWNER, ADMIN, MANAGER | Todos da empresa |
| EMPLOYEE | Apenas `employeeId === userId` da sessão |
| CLIENT | `clientId` da sessão (inalterado) |

- Tenant sempre de `req.user.companyId`.
- Query/body **não** definem autorização.
- Escrita, relatórios (403 EMPLOYEE), rotas públicas, GW-3 e O5 **não** foram alterados nesta entrega.

## Decisões aplicadas

1. KPI `activeClientsCount` **omitido** na API e **oculto** na UI para EMPLOYEE.
2. Expiração `cancelOverdueScheduled` só em listagens de **empresa inteira** (sem `clientId` nem `employeeId` no escopo).
3. `findById` usa consulta Mongo com filtros de tenant + escopo (404 indistinguível).

## Arquitetura

```
req.user → resolveAppointmentReadScope()
         → AppointmentController / DashboardController
         → Services → Repositories (Mongo $match / findOne)
```

Ficheiro central: `server/src/modules/appointments/utils/appointment-read-scope.ts`

## Ficheiros criados

| Ficheiro |
|----------|
| `server/src/modules/appointments/utils/appointment-read-scope.ts` |
| `server/tests/unit/appointments/appointment-read-scope.test.ts` |
| `server/tests/integration/routes/appointment-visibility.routes.test.ts` |
| `docs/tasks/o6-appointment-visibility-by-role.md` |

## Ficheiros modificados (principais)

| Área | Ficheiros |
|------|-----------|
| Appointments | `AppointmentRepository.ts`, `AppointmentService.ts`, `AppointmentController.ts` |
| Dashboard | `DashboardRepository.ts`, `DashboardService.ts`, `DashboardController.ts`, `index.ts` |
| Frontend | `DashboardPage.tsx`, `client/src/types/dashboard.ts` |
| Testes | `AppointmentService.test.ts`, `DashboardService.test.ts`, `dashboard.routes.test.ts`, `availability-appointment.routes.test.ts`, `DashboardPage.test.tsx`, `AppointmentNotificationDispatch.test.ts` |

## Expiração de scheduled vencidos

- **Antes:** qualquer listagem sem `clientScope` disparava expiração global da empresa.
- **Agora:** apenas escopo empresa inteira (OWNER/ADMIN/MANAGER em `GET /appointments`).
- **EMPLOYEE:** listagem **não** cancela agendamentos de colegas; os próprios `scheduled` vencidos podem persistir até uma listagem com escopo empresa (melhoria futura: job ou expiração escopada).

## Contrato `DashboardSummary`

- `activeClientsCount` passou a **opcional** (`?: number`); omitido para EMPLOYEE.

## Testes executados

### Servidor

```bash
cd server
npm test -- appointment-read-scope AppointmentService dashboard appointment-visibility availability-appointment
npm test -- appointment-visibility
npm run build
```

**Resultado (2026-11-10):** 189 testes no filtro agregado — **todos passaram** após correções; `appointment-visibility` — **17/17**; `npm run build` — **OK**.

### Cliente

```bash
cd client
npm test -- DashboardPage -t "hides active clients KPI for EMPLOYEE"
npm run build
```

**Resultado:** teste O6 EMPLOYEE — **OK**; build — **OK**.

Suite completa `DashboardPage` (48 testes): **47 passaram**, 1 falha intermitente em `waits for the full 45 second throttle` (O5, timing); o mesmo teste **passa isolado** — não introduzido por O6.

## Validação manual sugerida

1. **Postman — EMPLOYEE:** `GET /api/appointments` → só agendamentos com `employeeId` igual ao utilizador; `GET /api/appointments/:id` de colega → 404.
2. **Postman — OWNER:** listagem completa; expiração de `scheduled` vencidos mantém-se ao listar.
3. **Dashboard EMPLOYEE:** sem card «Clientes ativos»; KPIs/listas coerentes com agenda própria.
4. **Relatórios EMPLOYEE:** 403 em `/api/reports/overview`.

## Limitações / riscos

- Testes de integração usam mocks (padrão do projeto), não Mongo real multi-tenant.
- EMPLOYEE não dispara expiração na listagem (trade-off documentado acima).

## Melhorias futuras

- Job agendado ou expiração escopada por `employeeId` para o próprio funcionário.
- Teste E2E com base de dados real para isolamento entre empresas.
