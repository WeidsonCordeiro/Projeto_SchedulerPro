# O7 — Escopo de escrita em agendamentos por perfil

## 1. Objetivo

Corrigir IDOR de **escrita**: colaboradores (`EMPLOYEE`) só podem mutar agendamentos em que são o `employeeId` atribuído; administradores mantêm escrita empresa-inteira. Alinhar falhas fora de escopo com O6 (**404** na leitura/escrita).

## 2. Contexto

- Auditoria: [`docs/audits/o7-appointment-write-scope-audit.md`](../audits/o7-appointment-write-scope-audit.md)
- Leitura (O6): [`docs/tasks/o6-appointment-visibility-by-role.md`](o6-appointment-visibility-by-role.md)
- Implementação em `develop` (sem commit automático)

## 3. Regras de negócio

| Perfil | Escrita |
|--------|---------|
| OWNER, ADMIN, MANAGER | Empresa inteira (inalterado) |
| EMPLOYEE | Apenas `appointment.employeeId === req.user.userId` |
| CLIENT | **403** nas rotas staff (RBAC) |

**EMPLOYEE — PATCH `/:id`**

- Permitido: `notes`, `startAt` (recalcula `endAt`, conflitos e disponibilidade com o `employeeId` existente).
- Proibido no body: `clientId`, `serviceId`, `employeeId` → **400** (`APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED`).
- Colega / outro tenant → **404** (mesma mensagem que leitura).
- Transições (`/confirm`, `/cancel`, etc.): mesmo escopo de escrita.
- **DELETE** → **403** (`APPOINTMENT_DELETE` não concedido a EMPLOYEE).

Rotas públicas por token e GW-3 **não** alteradas.

## 4. Decisões aplicadas

1. Reutilizar `resolveAppointmentReadScope` / `findByIdInCompany` para carregar documentos antes de mutar.
2. Defesa em profundidade: `updateInCompany` / `updateStatusInCompany` incluem `companyId` e escopo opcional no filtro Mongo.
3. `persistReschedule` passa sempre por `updateInCompany` (staff e fluxo público com `companyId` no filtro).
4. Cancelamento público por token continua sem `sessionUser` (caminho `findById` + `updateStatus` legado).

## 5. Arquitetura

```
req.user → AppointmentController.sessionUser()
         → AppointmentService (update / changeStatus / delete)
         → appointment-write-access (load, assert PATCH EMPLOYEE)
         → AppointmentRepository.updateInCompany / updateStatusInCompany
```

Ficheiro central: `server/src/modules/appointments/utils/appointment-write-access.ts`

## 6. Ficheiros criados

| Ficheiro |
|----------|
| `server/src/modules/appointments/utils/appointment-write-access.ts` |
| `server/tests/unit/appointments/appointment-write-access.test.ts` |
| `server/tests/integration/routes/appointment-write-scope.routes.test.ts` |
| `docs/tasks/o7-appointment-write-scope-by-role.md` |

## 7. Ficheiros modificados (principais)

| Área | Ficheiros |
|------|-----------|
| Constantes | `server/src/constants/http-messages.ts` |
| Appointments | `AppointmentRepository.ts`, `AppointmentService.ts`, `AppointmentController.ts` |
| Testes | `AppointmentService.test.ts`, `availability-appointment.routes.test.ts`, `AppointmentPriceHistory.test.ts`, `AppointmentNotificationDispatch.test.ts`, `AppointmentService.public-link.test.ts`, `appointment-booking-concurrency.test.ts` (assinatura `update`) |

**Frontend:** sem alterações (API rejeita campos extra para EMPLOYEE).

## 8. Mensagens HTTP

- `APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED`: *"Este perfil não pode alterar cliente, serviço ou funcionário do agendamento."*

## 9. Testes executados

### Comando principal (plano O7)

```bash
cd server
npm test -- appointment-write-access appointment-visibility AppointmentService appointment-write-scope availability-appointment
npm run build
```

**Resultado (2026-11-10):**

| Comando | Resultado |
|---------|-----------|
| Filtro O7 acima | **7 ficheiros**, **183 testes** — todos passaram (~46s) |
| `npm run build` (`tsc`) | **OK** |
| `AppointmentPriceHistory` (complementar) | **13/13** |
| `AppointmentNotificationDispatch` (complementar) | **OK** no lote manual |
| `appointment-booking-concurrency` | **Ignorado** nesta máquina — MongoMemoryReplSet não subiu em 10s (ambiente local, não regressão de código) |

### Matriz de aceite (integração `appointment-write-scope.routes.test.ts`)

- [x] EMPLOYEE PATCH notes próprio → 200
- [x] EMPLOYEE PATCH colega → 404
- [x] EMPLOYEE transições em colega → 404
- [x] EMPLOYEE PATCH `clientId` / `serviceId` / `employeeId` → 400
- [x] EMPLOYEE DELETE → 403
- [x] OWNER PATCH colega → 200
- [x] CLIENT POST/PATCH staff → 403
- [x] `companyId` na query ignorado (tenant da sessão)

## 10. Critérios de aceite

- [x] EMPLOYEE: 404 colega (write); 400 campos proibidos; 403 DELETE; próprio notes/startAt + transições OK
- [x] OWNER/ADMIN/MANAGER: sem regressão nos fluxos HTTP existentes
- [x] CLIENT: 403 em mutações staff
- [x] Multi-tenant: 404 fora da empresa (via `findByIdInCompany` / mocks de integração)

## 11. Validação complementar

Reagendamento EMPLOYEE, regressão GW-3 e isolamento multi-tenant com Mongo: [`o7-appointment-write-scope-validation.md`](o7-appointment-write-scope-validation.md).

## 12. Fora de âmbito

- GW-3 / `withBookingTransaction` além do uso actual em `persistReschedule`
- Rotas públicas (comportamento preservado; persistência migrou para `updateInCompany` com `companyId`)
- Dashboard O1/O2/O5, O6 leitura, relatórios
