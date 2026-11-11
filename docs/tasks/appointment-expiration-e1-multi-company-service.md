# Appointment Expiration — E1: Serviço multiempresa

**Data:** 11/11/2026  
**Branch:** `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` (sem commit)  
**Âmbito:** Serviço de domínio + método de repositório + testes unitários. Sem scheduler, sem HTTP, sem alteração ao side-effect em `GET /api/appointments`.

**Contexto:** [`docs/audits/appointment-expiration-audit.md`](../audits/appointment-expiration-audit.md)

---

## Estado Git — início

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `a605931149b42b353822a78b01ac5dc26909d92d` |
| Staged / unstaged | Nenhum |
| Untracked pré-existente | `docs/audits/appointment-expiration-audit.md` |

**Git write:** não executado.

---

## Objectivo

Disponibilizar `processOverdueForAllCompanies(now?)` para cancelar agendamentos `scheduled` vencidos (`startAt < now` → `cancelled`) em **todas** as empresas activas e não eliminadas, reutilizando `AppointmentRepository.cancelOverdueScheduled`.

---

## Regra de negócio (inalterada vs repositório)

- Só status `scheduled`; critério `startAt < now`; destino `cancelled`.
- Sem tolerância, sem `expired`, sem notificações.
- Isolamento por `companyId` em cada chamada ao repositório.
- Empresas: `deletedAt: null` e `isActive: true`.

O comportamento em `AppointmentService.findAll` (expiração antes do `GET` para escopo empresa) **não foi modificado**.

---

## Ficheiros criados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`server/src/modules/appointments/appointment-expiration.types.ts`](../../server/src/modules/appointments/appointment-expiration.types.ts) | `AppointmentExpirationRunSummary` |
| [`server/src/modules/appointments/services/AppointmentExpirationService.ts`](../../server/src/modules/appointments/services/AppointmentExpirationService.ts) | Orquestração multiempresa |
| [`server/tests/unit/appointments/AppointmentExpirationService.test.ts`](../../server/tests/unit/appointments/AppointmentExpirationService.test.ts) | Testes com mocks |

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/modules/companies/repositories/CompanyRepository.ts`](../../server/src/modules/companies/repositories/CompanyRepository.ts) | `findAllActiveNotDeleted()` |
| [`server/tests/unit/companies/CompanyRepository.test.ts`](../../server/tests/unit/companies/CompanyRepository.test.ts) | Assert do filtro Mongo |

---

## Decisões técnicas

1. **Listagem de empresas:** novo método no `CompanyRepository` (o `findAll(companyId)` existente é por tenant único). O serviço **não** acede ao Mongo directamente.
2. **Cancelamento:** delegação a `cancelOverdueScheduled(companyId, now)` — mesma query que o fluxo HTTP indirecto.
3. **Falhas por empresa:** `try/catch` por iteração; incrementa `failedCompanies`, `Logger.error` com `companyId`; **continua** as restantes (padrão `ReminderService` por item).
4. **Falha ao listar empresas:** `Logger.error` + **rethrow** (não há trabalho parcial válido).
5. **Logging de sucesso:** `Logger.system` com meta estruturada (`processedCompanies`, `totalCancelled`, `failedCompanies`, `referenceTime` ISO).
6. **DI:** singleton `export default new AppointmentExpirationService()`; testes via `vi.mock` dos repositórios.

---

## API do serviço

```typescript
processOverdueForAllCompanies(now?: Date): Promise<AppointmentExpirationRunSummary>
```

| Campo | Significado |
|-------|-------------|
| `processedCompanies` | Empresas com `cancelOverdueScheduled` concluído sem erro |
| `totalCancelled` | Soma de `modifiedCount` |
| `failedCompanies` | Empresas com excepção no cancelamento |
| `referenceTime` | `now` utilizado na execução |

---

## Validação executada

```bash
cd server
npm test -- AppointmentExpirationService.test CompanyRepository.test AppointmentService.test
npm run build
```

| Comando | Resultado |
|---------|-----------|
| Testes (3 ficheiros) | **36 passed** |
| `npm run build` (`tsc`) | **exit 0** |

---

## Limitações / fora de E1

- Nenhum **scheduler** nem alteração em `server.ts`.
- Sem teste de integração Mongo para `cancelOverdueScheduled` (E3 sugerido na auditoria).
- Serviço ainda **não invocado** em runtime — apenas exportado.

---

## Próxima etapa (E2 — não iniciada)

`AppointmentExpirationScheduler` + registo em `server.ts`, espelhando `ReminderScheduler`, chamando `AppointmentExpirationService.processOverdueForAllCompanies()`.

---

## Estado Git — fim

| Item | Valor |
|------|--------|
| Branch | `develop` @ `a605931149b42b353822a78b01ac5dc26909d92d` |
| Modified | `CompanyRepository.ts`, `CompanyRepository.test.ts` |
| Novos (untracked) | `AppointmentExpirationService.ts`, `appointment-expiration.types.ts`, `AppointmentExpirationService.test.ts`, este doc; audit untracked pré-existente |
| Git write | Não executado |
