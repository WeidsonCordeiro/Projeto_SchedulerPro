# Appointment Expiration — E4: Remover efeito colateral do GET `/api/appointments`

**Data:** 11/11/2026  
**Branch:** `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` (sem commit)  
**Dependências:** [E1](appointment-expiration-e1-multi-company-service.md), [E2](appointment-expiration-e2-scheduler.md), [E2.1](appointment-expiration-e2-1-shutdown-hardening.md), [E3](appointment-expiration-e3-mongodb-integration-tests.md)

---

## Objetivo

Garantir que `GET /api/appointments` é **apenas leitura**: lista agendamentos sem chamar `cancelOverdueScheduled` nem `AppointmentExpirationService`. A expiração passa a ser responsabilidade exclusiva do `AppointmentExpirationScheduler` (já integrado em [`server.ts`](../../server/src/server.ts) após `Database.connect()`).

---

## Estado Git — início

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Árvore | E1–E3 + alterações E4 |

**Git write:** não executado.

---

## Comportamento anterior

Em [`AppointmentService.findAll`](../../server/src/modules/appointments/services/AppointmentService.ts), quando o escopo era empresa inteira (`isCompanyWideAppointmentReadScope`), executava-se `expireOverdueScheduled(companyId, now)` **antes** de `findByCompanyId`. OWNER/ADMIN/MANAGER disparavam cancelamento em massa de `scheduled` com `startAt < now`. EMPLOYEE e CLIENT no portal **não** expiravam (já assim desde O6).

---

## Comportamento novo

- `findAll` chama apenas `appointmentRepository.findByCompanyId` e mapeia a resposta.
- Parâmetro `now` mantido na assinatura (compatibilidade); não usado na listagem (`void now`).
- Método `expireOverdueScheduled` **mantido** no service (delegação ao repo; sem chamadores internos após E4).
- Scheduler inalterado: `AppointmentExpirationScheduler` → `AppointmentExpirationService` → `cancelOverdueScheduled` por empresa ativa.

---

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/modules/appointments/services/AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts) | Removido bloco de expiração em `findAll`; import `isCompanyWideAppointmentReadScope` removido; comentário no cancelamento público atualizado |

## Ficheiros criados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/tests/integration/appointments/find-all-no-expiration.mongo.test.ts`](../../server/tests/integration/appointments/find-all-no-expiration.mongo.test.ts) | Mongo: `findAll` não altera `scheduled` vencido persistido |

## Testes atualizados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/tests/unit/appointments/AppointmentService.test.ts`](../../server/tests/unit/appointments/AppointmentService.test.ts) | `findAll` não chama `cancelOverdueScheduled` (escopo empresa) |
| [`server/tests/integration/routes/appointment-visibility.routes.test.ts`](../../server/tests/integration/routes/appointment-visibility.routes.test.ts) | OWNER/ADMIN/MANAGER sem expiração; caso HTTP com overdue `scheduled` na resposta |
| [`server/tests/integration/availability-appointment.routes.test.ts`](../../server/tests/integration/availability-appointment.routes.test.ts) | GET não cancela vencidos |
| [`server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts`](../../server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts) | Listagem sem expiração nem notificações |

**E3 inalterado:** [`cancel-overdue-scheduled.mongo.test.ts`](../../server/tests/integration/appointments/cancel-overdue-scheduled.mongo.test.ts) — 11 testes, todos passando.

---

## Onde o side-effect foi removido

Único ponto de produção: `AppointmentService.findAll` (~L737–739 antes de E4). Controller e rotas **não** alterados.

---

## Scheduler permanece responsável

```text
server.ts → AppointmentExpirationScheduler.start()
           → AppointmentExpirationService.processOverdueForAllCompanies()
           → AppointmentRepository.cancelOverdueScheduled()
```

Encerramento E2.1 inalterado (`AppointmentExpirationScheduler.stop()` antes de `Database.disconnect()`).

---

## Comandos e resultados (11/11/2026)

```bash
cd server
npm test -- AppointmentService.test
npm test -- appointment-visibility.routes.test availability-appointment.routes.test
npm test -- AppointmentNotificationDispatch.test
npm test -- find-all-no-expiration.mongo.test
npm test -- cancel-overdue-scheduled.mongo.test
npm test -- AppointmentExpirationScheduler.test AppointmentExpirationService.test
npm test -- CompanyRepository.test
npm run build
```

| Comando | Resultado |
|---------|-----------|
| `AppointmentService.test` | **19 passed** |
| `appointment-visibility` + `availability-appointment` routes | **56 passed** (2 ficheiros) |
| `AppointmentNotificationDispatch.test` | **17 passed** |
| `find-all-no-expiration.mongo.test` | **1 passed** |
| `cancel-overdue-scheduled.mongo.test` | **11 passed** |
| Scheduler + ExpirationService | **24 passed** |
| `CompanyRepository.test` | **9 passed** |
| `npm run build` | **exit 0** |

**Total documentado acima:** 137 testes passados, 0 falhas.

---

## Limitações

| Item | Nota |
|------|------|
| Latência | `scheduled` vencido pode permanecer listável até o próximo tick do scheduler (ou arranque imediato do job) |
| Audits antigos | Documentos em `docs/audits/` e relatórios históricos ainda descrevem expiração no GET — não actualizados nesta etapa |
| `expireOverdueScheduled` | Método público órfão no service; remoção opcional numa limpeza futura |
| `updatedAt` | Sem alteração nesta etapa |

---

## Estado Git — fim

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| E4 | `AppointmentService.ts` modificado; testes + doc E4 novos/actualizados |

**Git write:** não executado.

---

## Handoff

- **Validação complementar (ciclo completo):** [E4.1 — teste ponta a ponta](appointment-expiration-e4-1-full-integration-test.md).
- Frontend pode mostrar `scheduled` no passado até o scheduler correr — comportamento já coberto pelo job de fundo.
- Próximo passo sugerido (produto): alinhar UI/mensagens se necessário; opcional actualizar auditoria principal com fluxo pós-E4.
- Regressão: manter E3 + `find-all-no-expiration.mongo.test` nas suítes de CI quando integradas.
