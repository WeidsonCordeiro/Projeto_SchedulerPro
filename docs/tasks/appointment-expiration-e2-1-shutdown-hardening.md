# Appointment Expiration — E2.1: Encerramento seguro do scheduler

**Data:** 11/11/2026  
**Branch:** `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` (sem commit)  
**Dependências:** [E1](appointment-expiration-e1-multi-company-service.md), [E2](appointment-expiration-e2-scheduler.md)

---

## Problema identificado na E2

| Gap | Risco |
|-----|--------|
| `stop()` só fazia `clearInterval` | Mongo podia desligar com `processOverdueForAllCompanies` ainda em curso |
| Shutdown em `server.ts`: HTTP → Reminder → Expiration → DB | Expiração corria **depois** de fechar HTTP e na mesma fase que disconnect |
| Sem `stopping` | Ticks e `run()` podiam iniciar trabalho após decisão de encerrar |
| `start()` após `stop()` | Singleton podia recriar intervalo |

**Critério E2.1:** `Database.disconnect()` só depois da conclusão da execução de expiração já iniciada.

---

## Estado Git — início

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Árvore | E1 + E2 + docs (untracked/staged conforme estado local) |

**Git write:** não executado.

---

## Comportamento anterior

- `AppointmentExpirationScheduler.stop()`: limpava timer, log imediato, sem `await`.
- `shutdown`: `server.close` → `ReminderScheduler.stop()` → `AppointmentExpirationScheduler.stop()` → `Database.disconnect()`.

---

## Solução implementada

### Scheduler ([`AppointmentExpirationScheduler.ts`](../../server/src/modules/appointments/scheduler/AppointmentExpirationScheduler.ts))

| Estado | Função |
|--------|--------|
| `stopping` | Após `stop()`, `run()` não inicia novas rodadas |
| `inFlight` | Promise da `executeRun()` activa; `stop()` faz `await` |
| `stopCompleted` | Evita log duplicado de encerrado e `stop()` idempotente |
| `running` | Overlap in-process (inalterado) |

**`stop()`:** `stopping = true` → `clearInterval` → `await inFlight` → log `encerrado` (uma vez).

**`start()`:** retorno imediato se `stopping` ou timer já existente.

**`executeRun()`:** corpo anterior de `run()` (sem alterar serviço/repo).

### Shutdown ([`server.ts`](../../server/src/server.ts))

Ordem final:

1. SIGINT / SIGTERM  
2. `await AppointmentExpirationScheduler.stop()` (Mongo ainda conectado)  
3. `server.close()`  
4. `await ReminderScheduler.stop()` (**implementação inalterada**)  
5. `await Database.disconnect()`

**Nota:** Reminder mantém-se **após** HTTP (legado); apenas a expiração antecede HTTP para cumprir o critério Mongo + job de expiração.

---

## Testes

| Suíte | Resultado |
|-------|-----------|
| 4 ficheiros (scheduler + reminder + expiration service + appointment service) | **50 passed** |
| `npm run build` (`tsc`) | **exit 0** |

Cenários E2.1 cobertos: await em `stop()`, bloqueio pós-`stop`, ticks extra, `start` após `stop`, `stop` duplo, erro + libertação de `running`.

**Limitação:** sem teste de integração de `server.ts`; garantia de ordem Mongo documentada + await em `stop()`.

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `AppointmentExpirationScheduler.ts` | `stopping`, `inFlight`, `executeRun`, `stop`/`start` |
| `server.ts` | Ordem de shutdown |
| `AppointmentExpirationScheduler.test.ts` | E2.1 |

**Inalterados:** `ReminderScheduler.ts`, `AppointmentExpirationService.ts`, repositório, `AppointmentService.findAll`, intervalo env.

---

## Riscos e limitações

- Multi-instância: sem lock distribuído (inalterado).
- Reminder pode ainda correr enquanto HTTP fecha; expiração já terminou.
- GET side-effect mantido (E3 não iniciada).

---

## Próxima etapa sugerida (E3 — não autorizada)

- Remover side-effect em `GET /api/appointments` após validação em produção.
- Teste integração Mongo para `cancelOverdueScheduled`.
- Alinhar shutdown do `ReminderScheduler` (futuro, fora de E2.1).

---

## Estado Git — fim

| Item | Valor |
|------|--------|
| Branch | `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` |
| E2.1 | `AppointmentExpirationScheduler.ts`, `server.ts`, testes scheduler |
| Git write | Não executado |
