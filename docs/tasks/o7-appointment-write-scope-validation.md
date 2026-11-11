# O7 — Validação complementar (reagendamento, GW-3, multi-tenant)

## Objetivo

Comprovar — com testes e auditoria estática — três pontos pós-implementação O7:

1. Reagendamento pelo EMPLOYEE (`startAt`, `endAt`, conflitos, disponibilidade).
2. Regressão do mecanismo de concorrência GW-3.
3. Isolamento multi-tenant na escrita com MongoDB de teste, quando a infraestrutura permitir.

**Não** foram alteradas regras de negócio aprovadas; apenas testes e um ajuste justificado de `launchTimeout` do MongoMemoryReplSet.

## Contexto

- Implementação: [`o7-appointment-write-scope-by-role.md`](o7-appointment-write-scope-by-role.md)
- Auditoria inicial: [`../audits/o7-appointment-write-scope-audit.md`](../audits/o7-appointment-write-scope-audit.md)
- Branch no início da validação: `develop` @ `970d85095feef762fbd70fe652ffc9a94c8e128a`
- Git: alterações O7 pré-existentes (staged/unstaged/untracked); **sem** commit/push nesta tarefa

## Ficheiros inspecionados (produção)

| Ficheiro | Foco |
|----------|------|
| [`AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts) | `update`, `persistReschedule`, `changeStatus` |
| [`AppointmentRepository.ts`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) | `updateInCompany`, `updateStatusInCompany` |
| [`appointment-write-access.ts`](../../server/src/modules/appointments/utils/appointment-write-access.ts) | `loadAppointmentForStaffWrite`, `assertEmployeePatchAllowed` |
| [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts) | GW-3 retry / commit |

## Testes existentes (antes desta validação)

| Área | Ficheiro | Cobertura prévia |
|------|----------|------------------|
| Escopo HTTP | `appointment-write-scope.routes.test.ts` | notes, 404 colega, 400 campos, 403 DELETE |
| Reagendamento OWNER | `availability-appointment.routes.test.ts` | `startAt`, conflitos (mock) |
| GW-3 unitário | `appointment-booking-transaction.test.ts` | retry, erros transitórios |
| GW-3 integração | `appointment-booking-concurrency.test.ts` | ACC-01–07 |
| Multi-tenant mock | `availability-appointment.routes.test.ts` | update/confirm 404 outra empresa (mock) |

## Testes criados ou modificados (esta validação)

| Ficheiro | Alteração |
|----------|-----------|
| [`appointment-write-scope.routes.test.ts`](../../server/tests/integration/routes/appointment-write-scope.routes.test.ts) | +6 casos em `reagendamento EMPLOYEE (startAt)`; mock hoisted de `AvailabilityService` |
| [`AppointmentService.test.ts`](../../server/tests/unit/appointments/AppointmentService.test.ts) | +1 caso: `listScope` `{ employeeId }` em `updateInCompany` |
| [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts) | `instanceOpts: [{ launchTimeout: 120_000 }]` no `MongoMemoryReplSet.create` |
| [`appointment-write-scope-mongo.test.ts`](../../server/tests/integration/appointments/appointment-write-scope-mongo.test.ts) | **Novo** — 4 casos cross-tenant com Mongo real |

### Matriz reagendamento EMPLOYEE (HTTP)

| Cenário | Teste | Resultado |
|---------|-------|-----------|
| PATCH `startAt` próprio → 200 | `EMPLOYEE altera startAt...` | Passou |
| Recálculo `endAt` (30 min) | assert `updateInCompany` | Passou |
| Preserva client/service/employee | `EMPLOYEE preserva...` | Passou |
| Conflito funcionário → 409 | `hasEmployeeConflict` true | Passou |
| Indisponibilidade → 409 | `ensureEmployeeAvailable` reject | Passou |
| Colega `startAt` → 404 | `EMPLOYEE recebe 404 ao reagendar...` | Passou |
| OWNER colega `startAt` → 200 | `OWNER reagenda startAt...` | Passou |

## Comandos executados e resultados (2026-11-10)

```bash
cd server
npm test -- appointment-write-scope                    # 19/19 passed
npm test -- appointment-booking-transaction            # 18/18 passed (unitário GW-3)
npm test -- tests/integration/appointments/appointment-booking-concurrency.test.ts   # 7/7 ACC passed
npm test -- tests/integration/appointments/appointment-write-scope-mongo.test.ts     # 4/4 passed
npm test -- appointment-write-access appointment-write-scope AppointmentService \
  appointment-booking-transaction availability-appointment \
  tests/integration/appointments/appointment-booking-concurrency.test.ts           # 202/202 passed
npm run build                                                                        # exit 0
```

| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| `appointment-write-scope` (HTTP) | 19 | 0 | 0 |
| `appointment-booking-transaction` | 18 | 0 | 0 |
| `appointment-booking-concurrency` | 7 | 0 | 0 |
| `appointment-write-scope-mongo` | 4 | 0 | 0 |
| Bateria agregada (comando acima) | 202 | 0 | 0 |
| `npm run build` | OK | — | — |

## GW-3 — diagnóstico

| Item | Conclusão |
|------|-----------|
| Falha anterior (10s) | Timeout de **launch** da instância `mongodb-memory-server`, não do `beforeAll` Vitest (já 120s) |
| `GW3_TEST_MONGO_URI` | Não configurada nesta execução |
| Correção aplicada | `instanceOpts: [{ launchTimeout: 120_000 }]` em `appointment-booking-concurrency.test.ts` (e no novo ficheiro mongo O7) |
| Unitário GW-3 | Sempre executável sem Mongo |
| ACC-04 (reschedule → 409) | Passou com assinatura O7 `sessionUser` em `AppointmentService.update` |

## Isolamento multi-tenant

| Camada | Evidência |
|--------|-----------|
| HTTP (mock) | `availability-appointment.routes.test.ts`, query `companyId` em write-scope |
| Service + Mongo | `appointment-write-scope-mongo.test.ts`: update/confirm/delete da empresa A sobre agendamento da B → **404**; documento em B inalterado |

`companyId` nas mutações vem de `sessionUser` / `req.user`, não do body do cliente.

## Limitações

- ReplSet continua dependente de CPU/AV no Windows; sem `GW3_TEST_MONGO_URI`, CI deve repetir os testes de integração Mongo.
- Testes HTTP de reagendamento não exercitam `touchBookingSerialization` real (mock de transação).
- Avisos Mongoose `findOneAndUpdate` `new` deprecado — pré-existentes, fora do escopo O7.

## Pendências

Nenhuma pendência funcional identificada nesta validação. Recomenda-se manter ACC + mongo O7 na pipeline CI.

## Conclusão por eixo

| Eixo | Veredicto |
|------|-----------|
| Reagendamento EMPLOYEE | **Aprovado** (HTTP + 1 unitário de escopo) |
| GW-3 | **Aprovado** (18 unitários + 7 ACC com ReplSet) |
| Multi-tenant escrita | **Aprovado** (mocks + 4 casos Mongo) |

## Continuidade para outra IA

1. Ler [`o7-appointment-write-scope-by-role.md`](o7-appointment-write-scope-by-role.md) para regras de produto.
2. Reagendamento: ramo `employeeScoped` em `AppointmentService.update` — EMPLOYEE não processa `clientId`/`serviceId`/`employeeId` no body.
3. Se ACC falhar só no launch: verificar `launchTimeout` ou usar `GW3_TEST_MONGO_URI`.
4. Não tratar suite Mongo ignorada como aprovada.
