# Appointment Expiration — E2: Scheduler e integração com servidor

**Data:** 11/11/2026  
**Branch:** `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` (sem commit)  
**Dependência:** [E1 — Serviço multiempresa](appointment-expiration-e1-multi-company-service.md)

---

## Objetivo

Executar periodicamente `AppointmentExpirationService.processOverdueForAllCompanies()` via `AppointmentExpirationScheduler`, integrado ao boot/shutdown em `server.ts`, seguindo o padrão de [`ReminderScheduler`](../../server/src/modules/reminders/scheduler/ReminderScheduler.ts).

---

## Estado Git — início

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Pré-existente | E1 (CompanyRepository, AppointmentExpirationService, testes, docs untracked) |

**Git write:** não executado.

---

## Ficheiros criados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`server/src/modules/appointments/scheduler/AppointmentExpirationScheduler.ts`](../../server/src/modules/appointments/scheduler/AppointmentExpirationScheduler.ts) | Intervalo, overlap, delegação ao serviço E1 |
| [`server/src/modules/appointments/appointment-expiration.config.ts`](../../server/src/modules/appointments/appointment-expiration.config.ts) | Default 60s + resolver env |
| [`server/tests/unit/appointments/AppointmentExpirationScheduler.test.ts`](../../server/tests/unit/appointments/AppointmentExpirationScheduler.test.ts) | Testes com fake timers |

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/server.ts`](../../server/src/server.ts) | `start()` após Mongo; `stop()` no shutdown |
| [`server/src/config/env.ts`](../../server/src/config/env.ts) | `jobs.APPOINTMENT_EXPIRATION_INTERVAL_MS` |
| [`server/src/config/validateEnv.ts`](../../server/src/config/validateEnv.ts) | Validação opcional > 0 |

**Inalterados (confirmado):** `AppointmentExpirationService`, `AppointmentRepository.cancelOverdueScheduled`, `AppointmentService.findAll` / `GET /api/appointments`.

---

## Fluxo de inicialização

1. `Database.connect()`
2. `ReminderScheduler.start()`
3. `AppointmentExpirationScheduler.start()` — log intervalo; `void run()` imediato; `setInterval`
4. `app.listen`

---

## Fluxo de execução periódica

1. `running` guard — ignora tick sobreposto
2. `Logger.system` início da rodada
3. `processOverdueForAllCompanies()` (serviço E1 + logs próprios)
4. `Logger.system` resumo da rodada (processedCompanies, totalCancelled, failedCompanies, referenceTime)
5. Erro global da rodada → `Logger.error`, sem derrubar o processo
6. `finally`: `running = false`

---

## Fluxo de encerramento

1. SIGINT/SIGTERM → `shutdown` existente
2. `server.close()`
3. `ReminderScheduler.stop()`
4. `AppointmentExpirationScheduler.stop()` — `clearInterval`, log encerrado
5. `Database.disconnect()`

`stop()` **não** aguarda rodada em curso (igual ao reminder). Não há novos ticks após `clearInterval`; uma execução em voo pode concluir.

---

## Intervalo

| Origem | Valor |
|--------|--------|
| Default | `DEFAULT_APPOINTMENT_EXPIRATION_INTERVAL_MS = 60_000` |
| Env opcional | `APPOINTMENT_EXPIRATION_INTERVAL_MS` (inteiro positivo; fail-fast em `validateEnv` se inválido) |
| Runtime | `env.jobs.APPOINTMENT_EXPIRATION_INTERVAL_MS` |

---

## Proteção contra sobreposição

Flag `running` + early return; libertação em `finally` (sucesso ou erro).

---

## Tratamento de erros

- Falha na rodada inteira (ex.: serviço relança ao listar empresas): capturada em `run()`, log, scheduler continua no próximo tick.
- Falhas por empresa: tratadas dentro do **serviço E1** (não alterado nesta etapa).

---

## Validação executada

```bash
cd server
npm test -- AppointmentExpirationScheduler.test ReminderScheduler.test AppointmentExpirationService.test AppointmentService.test
npm run build
```

| Comando | Resultado |
|---------|-----------|
| Testes (4 ficheiros) | **44 passed** |
| `npm run build` (`tsc`) | **exit 0** |

---

## Limitações e riscos

- Várias instâncias API → vários schedulers sem lock distribuído (`updateMany` idempotente).
- Logs duplicados de resumo: scheduler + serviço E1 (aceitável para observabilidade).
- Side-effect em `GET /api/appointments` **mantido** até E3 autorizada.

---

## Próxima etapa sugerida (E3 — não iniciada)

- Remover ou tornar opcional expiração em `AppointmentService.findAll` após validação em produção.
- Teste de integração Mongo para `cancelOverdueScheduled`.
- Avaliar redução de ruído de logs.

---

## Estado Git — fim

| Item | Valor |
|------|--------|
| Branch | `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` |
| Modified | `env.ts`, `validateEnv.ts`, `server.ts` (+ E1 em CompanyRepository) |
| Novos | scheduler, config, testes scheduler, docs E1/E2/audit, E1 service |
| Git write | Não executado |
