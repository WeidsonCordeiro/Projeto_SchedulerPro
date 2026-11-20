# CI — Mock `CompanyRepository` em appointment-write-scope

**Data:** 2026-11-20  
**Escopo:** Apenas `server/tests/integration/routes/appointment-write-scope.routes.test.ts` e este relatório. **`server/src/` inalterado.**

---

## 1. Contexto e causa raiz

Após B2.4, fluxos de escrita/reagendamento de agendamentos passam por `withBookingTransaction` e, no início da transação, `AppointmentService.assertCompanyBookableForBooking` invoca `CompanyRepository.touchBookingSerialization(companyId, session)` antes de validar `isActive`.

A suite [`appointment-write-scope.routes.test.ts`](../../server/tests/integration/routes/appointment-write-scope.routes.test.ts) mocka `withBookingTransaction` como pass-through (`operation(undefined as never)`), pelo que o serviço real executa. O mock hoisted de `CompanyRepository` expunha apenas `findById`, provocando:

```text
TypeError: default.touchBookingSerialization is not a function
```

**Efeito nos testes (antes da correção):** HTTP 500 em PATCH com persistência transacional; 6 falhas | 13 aprovados (19). Cenários de atualização/reagendamento (200 esperado), conflito (409) e preservação de IDs falhavam por exceção antes das asserções de negócio.

**Produção:** Não foi identificado defeito em `server/src/`; o problema é exclusivamente mock incompleto.

Relacionado: [`CI-company-repository-mocks-after-B2.4.md`](CI-company-repository-mocks-after-B2.4.md).

---

## 2. Ficheiros analisados

| Ficheiro | Papel |
|----------|--------|
| `server/tests/integration/routes/appointment-write-scope.routes.test.ts` | Suite afetada |
| `server/src/modules/appointments/services/AppointmentService.ts` | `assertCompanyBookableForBooking` (leitura apenas) |
| `docs/tasks/CI-company-repository-mocks-after-B2.4.md` | Padrão de mock pós-B2.4 |

---

## 3. Ficheiros efetivamente alterados

| Ficheiro | Alteração |
|----------|-----------|
| `server/tests/integration/routes/appointment-write-scope.routes.test.ts` | `touchBookingSerialization` no hoist; `activeCompanyDoc`; `beforeEach` alinhado |
| `docs/tasks/CI-appointment-write-scope-mock-fix.md` | Este relatório |

---

## 4. Descrição da correção do mock

1. No `vi.hoisted`, `companyRepository` passou a incluir `touchBookingSerialization: vi.fn()` junto de `findById`.

2. Constante partilhada `activeCompanyDoc`:
   - `_id`: `ref(ids.companyA)` (`507f1f77bcf86cd799439011`)
   - `isActive: true`
   - `timezone: "Europe/Lisbon"`

3. Em `beforeEach`:
   - `companyRepository.findById.mockResolvedValue(activeCompanyDoc)`
   - `companyRepository.touchBookingSerialization.mockResolvedValue(activeCompanyDoc)`

`findById` e `touchBookingSerialization` devolvem o mesmo documento activo; não foi alterado o mock de `withBookingTransaction`, nem cenários, permissões, dados ou asserções.

---

## 5. Testes executados e resultados reais

**Comando** (directório `server/`):

```bash
npm run test -- tests/integration/routes/appointment-write-scope.routes.test.ts
```

**Resultado (2026-11-20, ~16:00 UTC):**

- Test files: **1 passed (1)**
- Tests: **19 passed (19)**
- Duração: ~29s (transform/import dominam)

Cenários críticos validados pela suite completa (todos verdes nesta execução):

- PATCH com notas / OWNER em agendamento de outro funcionário → 200
- Reagendamento `startAt` (EMPLOYEE e OWNER) → 200
- Conflito de funcionário (`hasEmployeeConflict`) → 409
- Preservação de `clientId`, `serviceId`, `employeeId` no reagendamento → asserções executadas

---

## 6. Confirmação de que `server/src/` não foi alterado

Nenhum ficheiro sob `server/src/` foi modificado nesta tarefa.

---

## 7. Limitações e problemas encontrados

- Nenhuma limitação adicional: a correção do mock foi suficiente; não foi necessário ajustar `withBookingTransaction`.
- Outras suites de rotas sob `server/tests/integration/routes/` que só mockam `findById` em `CompanyRepository` podem falhar se passarem a exercitar PATCH/POST transacionais de agendamentos (ver auditoria CI B2.4).

---

## 8. Contexto técnico para outra IA

**Fluxo relevante:**

1. Teste HTTP → `app` real → rota PATCH appointments → `AppointmentService` update/reschedule.
2. `vi.mock(".../appointment-booking-transaction")` executa o callback com `session = undefined`.
3. Dentro da transação, `assertCompanyBookableForBooking` chama **primeiro** `CompanyRepository.touchBookingSerialization`, **depois** valida `company.isActive`.
4. `assertCompanyLiveForBooking` (outros caminhos) usa `CompanyRepository.findById`.

**Regra de mock:** Se `withBookingTransaction` é pass-through, o mock `default` de `CompanyRepository` deve expor todos os métodos que o serviço chama naquele fluxo — no mínimo `touchBookingSerialization` e `findById`, ambos coerentes com a mesma empresa de teste.

**Padrão mínimo:**

```typescript
companyRepository: {
  findById: vi.fn(),
  touchBookingSerialization: vi.fn(),
},
// beforeEach:
companyRepository.findById.mockResolvedValue(activeCompanyDoc);
companyRepository.touchBookingSerialization.mockResolvedValue(activeCompanyDoc);
```

---

## Restrições (checklist)

| Restrição | Cumprida |
|-----------|----------|
| Sem alterações em `server/src/` | Sim |
| Sem alteração de regras de negócio / asserções para “forçar” verde | Sim |
| Sem outros testes alterados | Sim |
| Sem dependências novas/atualizadas | Sim |
| Sem operações Git de escrita | Sim |