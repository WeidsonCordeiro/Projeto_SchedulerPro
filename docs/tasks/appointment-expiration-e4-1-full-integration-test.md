# Appointment Expiration — E4.1: Teste de integração ponta a ponta

**Data:** 11/11/2026  
**Branch:** `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` (sem commit)  
**Dependências:** [E3](appointment-expiration-e3-mongodb-integration-tests.md), [E4](appointment-expiration-e4-remove-get-side-effect.md), [Auditoria E4](../audits/appointment-expiration-e4-approval-audit.md)

---

## Objetivo

Comprovar num **único** teste de integração o ciclo:

MongoDB (`scheduled` vencido) → `GET /api/appointments` → permanece `scheduled` → `AppointmentExpirationScheduler.run()` → `cancelled`.

Sem alterações de código de produção.

---

## Estado Git — início

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Árvore | E1–E4 + ficheiros untracked |

**Git write:** não executado.

---

## Ficheiro criado

| Caminho | Descrição |
|---------|-----------|
| [`server/tests/integration/appointments/appointment-expiration-full-cycle.mongo.test.ts`](../../server/tests/integration/appointments/appointment-expiration-full-cycle.mongo.test.ts) | Um `it` com os cinco passos |

**Produção:** nenhum ficheiro alterado.

---

## Configuração do teste

| Componente | Abordagem |
|------------|-----------|
| Mongo | `MongoMemoryReplSet` (1 nó) ou `GW3_TEST_MONGO_URI`; `beforeAll` 180s |
| HTTP | `supertest` + `app` real (`/api/appointments`) |
| Auth | Mock **apenas** `auth.middleware` → `req.user` OWNER seedado |
| Middlewares | Reais (`PasswordChangeMiddleware`, `RequireOperationalCompanyMiddleware`, RBAC) |
| Persistência / expiração | `AppointmentRepository`, `CompanyRepository`, `AppointmentExpirationService` **reais** |
| Scheduler | `new AppointmentExpirationScheduler()` + `await scheduler.run()` (sem `start()` / intervalo) |
| Mocks auxiliares | `AvailabilityService`, `NotificationDispatcher` (padrão E3) |

**Tempos:** `startAt = 2020-01-01T10:00:00.000Z` (passado estável face a `new Date()` no serviço de expiração).

---

## Sequência dos cinco passos (mesmo teste)

| # | Ação | Assert |
|---|------|--------|
| 1 | Seed empresa ativa, utilizadores, `Appointment` `scheduled` vencido | `findById` → `scheduled` |
| 2 | `GET /api/appointments` como OWNER | HTTP 200; item na resposta com `scheduled` |
| 3 | `findById` após GET | Documento existe; `scheduled` |
| 4 | `scheduler.run()` | Execução concluída (service real) |
| 5 | `findById` após scheduler | Documento existe; `cancelled` |

---

## Comandos e resultados (11/11/2026)

```bash
cd server
npm test -- appointment-expiration-full-cycle.mongo.test
npm test -- find-all-no-expiration.mongo.test
npm test -- cancel-overdue-scheduled.mongo.test
npm test -- AppointmentExpirationScheduler.test AppointmentExpirationService.test
npm test -- appointment-visibility.routes.test
npm run build
```

| Comando | Resultado |
|---------|-----------|
| `appointment-expiration-full-cycle.mongo.test` | **1 passed** (~15.9s / ~5s em execuções locais) |
| `find-all-no-expiration.mongo.test` | **1 passed** |
| `cancel-overdue-scheduled.mongo.test` | **11 passed** |
| Scheduler + ExpirationService | **24 passed** |
| `appointment-visibility.routes.test` | **18 passed** |
| `npm run build` | **exit 0** |

**Total documentado:** 55 testes nas suítes acima, 0 falhas.

---

## Limitações

| Item | Nota |
|------|------|
| Autenticação | JWT não exercitado; sessão simulada via mock de auth |
| Papel no ciclo | Apenas **OWNER** no teste ponta a ponta; outros papéis continuam cobertos em O6 / unitários |
| `now` | Expiração usa `new Date()` em runtime; `startAt` fixo no passado evita flakiness |
| Instância do scheduler | Nova instância no teste (não o singleton de `server.ts`) — mesmo código de produção |

---

## Estado Git — fim

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Novo | teste E4.1 + este documento |

**Git write:** não executado.

---

## Referências

- [Auditoria E4 — lacuna L1 endereçada](../audits/appointment-expiration-e4-approval-audit.md#6-parecer-final)
- [E4 — remoção do side-effect GET](appointment-expiration-e4-remove-get-side-effect.md)
