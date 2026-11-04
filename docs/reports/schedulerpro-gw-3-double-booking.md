# SchedulerPro — GW-3: Prevenção de double-booking

**Data:** 27/10/2026  
**Itens backlog:** **CANON-003** (AUD-DATA-001, AUD-DATA-010, AUD-TEST-001), **CANON-016** (AUD-DATA-002 — índice para queries de conflito)  
**Estado da implementação:** **Código GW-3 + ACC-01–07 verdes** (29/10/2026); **transacções Atlas confirmadas manualmente** (30/10/2026 — sec. **17**); fecho operacional pendente de commit/CI, permissões da conta de aplicação e índice CANON-016.  
**Última revisão:** 30/10/2026 — consistência documental pré-commit; Atlas em [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md) (sec. **17**); ACC-04 em [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md); sec. **18**.

---

## 1. Objetivo e âmbito

Garantir que pedidos **concorrentes** não criem marcações sobrepostas para o mesmo funcionário ou cliente (mesma empresa), em **criação**, **atualização** e **reagendamento** (incl. fluxo público), com resposta **409 CONFLICT** alinhada aos contratos actuais.

**Fora de âmbito:** GW-4 (rate limit auth), GW-5 (CI/health), GW-7 (CORS whitelist), migrações destrutivas de dados.

---

## 2. Estado Git

| Momento                          | Valor                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Branch inicial                   | `develop` @ `90e597264df60a99cd719146bd347bf6723d7b7c`                                          |
| Branch de trabalho               | `fix/gw-3-double-booking` @ base `90e5972`                                                      |
| Working tree (pré-commit, 30/10) | **15** ficheiros `M` em `server/`; **6** entradas `??` (3 relatórios GW-3, 3 artefactos código) |
| `git diff --stat` (tracked)      | 904 insertions, 158 deletions                                                                   |
| `git diff --check`               | **Sem erros** (última verificação documental 30/10)                                             |
| Commit / merge / push / PR       | **Nenhum**                                                                                      |

---

## 3. Diagnóstico — causa técnica (TOCTOU)

### 3.1 Fluxo actual (`AppointmentService.schedule`) — baseline pré-GW-3

_Estado descrito abaixo corresponde ao código **antes** da implementação transaccional (sec. **15**); mantido como diagnóstico histórico._

Ordem em [`AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts) (L230–323):

1. Calcula `endAt` a partir da duração do serviço.
2. Rejeita `startAt` no passado.
3. `ensureSlotIsAvailable` → `AvailabilityService` + `hasEmployeeConflict` (**`findOne`**).
4. `resolveClientId()` (público pode criar cliente).
5. `ensureClientHasNoConflict` (**`findOne`**).
6. `appointmentRepository.create` (**`Appointment.create`**).

**Sem** `mongoose.startSession()` / transação no agendamento (contraste: [`AuthService.register`](../../server/src/modules/auth/services/AuthService.ts) usa transação).

### 3.2 Regra de sobreposição (correcta para intervalos)

Em [`AppointmentRepository.ts`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) (L185–197, L265–277):

- Filtro: `startAt < endAt_janela` **e** `endAt > startAt_janela`.
- Estados bloqueantes: `scheduled`, `confirmed`.
- `deletedAt: null`.
- `companyId` sempre no filtro (multi-tenant).
- `excludeAppointmentId` em updates/remarcações.

Testes unitários do repositório: [`appointment-conflicts.test.ts`](../../server/tests/unit/repositories/appointment-conflicts.test.ts) validam a query, **não** concorrência real.

### 3.3 Caminhos de escrita

| Fluxo          | Método                      | Conflito antes de persistir                                      |
| -------------- | --------------------------- | ---------------------------------------------------------------- |
| Admin create   | `create` → `schedule`       | Sim (não atómico)                                                |
| Público create | `createPublic` → `schedule` | Idem                                                             |
| Admin update   | `update`                    | `ensureSlotIsAvailable` + `ensureClientHasNoConflict` → `update` |
| Público update | `updatePublicByToken`       | Idem                                                             |

Não foram encontrados atalhos de escrita que contornem `AppointmentService` para creates normais.

### 3.4 Índices (`Appointment.model.ts`)

- Existe: `{ companyId, clientId, startAt }`.
- **Não** existe índice composto optimizado para `hasEmployeeConflict` (`companyId`, `employeeId`, `status`, intervalo) — **CANON-016**.

Índice único simples em `(companyId, employeeId, startAt)` **não** impede sobreposições com `startAt` diferente (ex.: 09:00–09:30 vs 09:15–09:45).

### 3.5 Evidência auditoria

- Fase D **AUD-DATA-001**: TOCTOU read-check-write; aceitação = uma de duas reservas concorrentes falha com **409**.
- Fase F **AUD-TEST-001**: lacuna de testes paralelos.
- Fase H **CANON-003** P1.

---

## 4. Decisão técnica final (após revisão sec. 12)

**Adoptar:** transação MongoDB multi-documento + **serialização explícita** via escrita no `User` (funcionário) e no `Client` + verificações de conflito e persistência do agendamento **na mesma sessão**, com **reintentos** limitados em erros transitórios / write conflict (código **112**).

**Não adoptar como garantia de integridade:** índice composto parcial (apenas desempenho — CANON-016).  
**Não adoptar nesta fase:** Redis, nova coleção de locks por minuto, `npm audit fix --force`, criação automática de índices em produção.

**Pré-requisito de ambiente:** MongoDB em **replica set** (Atlas M0+ e `mongodb-memory-server` com `MongoMemoryReplSet` nos testes). Transações falham em standalone.

**Confiança:** a garantia contra double-booking **só é aceitável** após testes de integração com concorrência real (sec. 14); a argumentação teórica da sec. 12.1 é necessária mas **não substitui** esses testes.

---

## 4bis. Estratégia resumida (referência rápida)

| Camada                  | Função                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Transação               | Agrupa leituras de conflito + `create`/`update` do appointment                  |
| Touch `User` + `Client` | Força contenção de escrita nos documentos partilhados por reservas concorrentes |
| Reintento               | Reexecuta o bloco após abort (máx. 4 tentativas)                                |
| Índice parcial          | Acelera `hasEmployeeConflict`; **não** impede sobreposição                      |
| HTTP 409                | Mantém `EMPLOYEE_CONFLICT` / `CLIENT_CONFLICT`                                  |

---

## 5. Ficheiros alterados (implementação — inventário)

| Ficheiro                                                                                                                         | Alteração                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts)        | **Novo** (`??`) — `withBookingTransaction`                                    |
| [`appointment-repository.types.ts`](../../server/src/modules/appointments/repositories/appointment-repository.types.ts)          | **Novo** (`??`) — `session?` options                                          |
| [`AppointmentRepository.ts`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts)                        | `session` em conflitos / `create` / `update`                                  |
| [`UserRepository.ts`](../../server/src/modules/users/repositories/UserRepository.ts)                                             | `touchBookingSerialization`                                                   |
| [`ClientRepository.ts`](../../server/src/modules/Clients/repositories/ClientRepository.ts)                                       | `touchBookingSerialization`; `create` / `findByEmailAndCompany` com `session` |
| [`AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts)                                  | `schedule`, `update`, `updatePublicByToken` — protocolo transaccional         |
| [`Appointment.model.ts`](../../server/src/modules/appointments/models/Appointment.model.ts)                                      | Índice parcial CANON-016 (schema)                                             |
| [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts) | **Novo** (`??`) — ACC-01–07                                                   |
| [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md)                                         | **Novo** (`??`) — causa/correcção ACC-04                                      |
| [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md)                         | **Novo** (`??`) — validação manual Atlas 30/10                                |
| Testes unitários / rotas (mocks `withBookingTransaction`)                                                                        | Ver sec. **15.2**                                                             |
| [`server/package.json`](../../server/package.json)                                                                               | `mongodb-memory-server@^10.4.3` em **devDependencies**                        |

---

## 6. Testes obrigatórios (plano)

### 6.1 Infraestrutura

**Estado actual (29/10):** [`server/package.json`](../../server/package.json) inclui **`mongodb-memory-server@^10.4.3`** em `devDependencies`. A suite ACC usa **`MongoMemoryReplSet`** (`replSet: { count: 1 }`) em [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts).

Alternativa manual: staging com requisições paralelas (documentar no relatório de execução) — **não substitui** ACC local quando o replSet em memória estiver funcional.

### 6.2 Casos

| Caso                                            | Tipo                                  |
| ----------------------------------------------- | ------------------------------------- |
| `Promise.all` duas `create` mesmo slot/employee | Integração + memory server            |
| Intervalos parcialmente sobrepostos             | 409 numa                              |
| Adjacentes (09:00–09:30 e 09:30–10:00)          | Ambas OK se regras actuais permitirem |
| `update` para slot ocupado                      | 409                                   |
| Cancelled não bloqueia slot                     | create OK                             |
| `companyId` diferente                           | Sem interferência                     |
| Resposta 409 + mensagens existentes             | supertest ou service                  |

Teste unitário com mocks: validar que `schedule` chama `withBookingTransaction` e ordem touch → conflict → create.

### 6.3 Baseline (não reexecutado nesta sessão para GW-3)

Referência GW-2 Fase 0 (27/10): server `npm run test` falhou 1× timeout em `object-id.routes.test.ts`; client verde. Reexecutar após implementação e **não** misturar com falha GW-3.

---

## 7. Validação pós-implementação (checklist)

```bash
cd server
npm run test -- tests/unit/repositories/appointment-conflicts.test.ts
npm run test -- tests/unit/appointments/AppointmentService.test.ts
npm run test -- tests/integration/appointments/appointment-booking-concurrency.test.ts  # após criar
npm run test
npm run build
```

Registar exit codes e contagens no relatório — **preenchido** em sec. **15.1** (29/10/2026).

---

## 8. Impactos

| Área        | Impacto                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Schema      | Novo índice (não altera documentos)                                                                                                 |
| Dados       | Nenhuma migração destrutiva                                                                                                         |
| Deploy      | Atlas: replica set e transacção básica **confirmados manualmente** (30/10, sec. **17**); índice CANON-016 e conta app API pendentes |
| Performance | Touch extra em User/Client por booking; índice melhora `findOne` de conflito                                                        |
| API         | Sem mudança de contrato (409 existente)                                                                                             |

---

## 9. Riscos e limitações (actualizado)

**Mitigados com evidência ACC (29/10):** double-booking de appointment no mesmo funcionário/cliente (intervalos activos) sob `Promise.all` — ACC-01–07 + contagem MongoDB.

**Riscos residuais aceites (pré-commit):**

| Risco                     | Descrição                                                                                                                                                                              | Cobertura de teste                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Disponibilidade semanal   | `ensureEmployeeAvailabilityOnly` / `AvailabilityService` **fora** da transacção — janela TOCTOU entre check de horário de trabalho e commit                                            | Não coberto por ACC; aceite documentado (sec. 12.2) |
| Cliente público duplicado | Índice `(companyId, email)` **não único**; `findByEmailAndCompany` + `create` com `session` reduz risco, mas **não há** ACC de duas `createPublic` concorrentes com o **mesmo e-mail** | Lacuna explícita; mitigação parcial em código       |
| ACC-04 setup              | Preparação do cenário público usa `create` admin, não `createPublic` — valida reagendamento/conflito, não o caminho HTTP público completo                                              | Aceite para CANON-003 (conflito de slot)            |
| Índice CANON-016          | Só no schema; produção sem índice parcial até script ops                                                                                                                               | Performance de query, não integridade               |
| Mocks unitários           | `vi.mock(withBookingTransaction)` — não exercita transacção real                                                                                                                       | ACC compensa                                        |

- **Notificações** após `commitTransaction` (implementado) — evita e-mails duplicados em reintentos.
- Timeout intermitente `object-id.routes.test.ts` (GW-1.2.1) é independente do GW-3.

---

## 10. Próximos passos

1. **Commit** na branch `fix/gw-3-double-booking` (incluir todos os `??` GW-3 — sec. **15.2**) após aprovação humana.
2. **CI** verde no remoto (ACC + suite completa).
3. **Ops:** permissões da **conta MongoDB da aplicação**; deploy controlado índice CANON-016 (sec. **12.3**). Topologia replica set e transacção básica no Atlas **confirmadas em 30/10** (sec. **17**); credencial do teste manual (`atlasAdmin`) **≠** conta da API.
4. Merge em `develop` quando critérios operacionais satisfeitos (sec. **15.3**).

---

## 11. Declaração cumulativa

- **Commit / merge / push:** nenhum (até decisão do utilizador).
- Relatório global de auditoria não alterado.
- **Implementação** conforme sec. **13:** concluída 28/10/2026.
- **Evidência automatizada (29/10):** ACC-01–07, suite server **1239** testes em **82** ficheiros, `npm run build` exit **0**, `git diff --check` sem erros — detalhe em sec. **15.1**; ACC-04 em [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md).
- **Evidência Atlas (30/10):** topologia replica set + transacção com `abortTransaction` — sec. **17** e [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md); **não** substitui ACC nem testa concorrência no Atlas.
- **Pendências operacionais:** lista única em sec. **15.3**.

---

## 12. Revisão técnica pré-implementação (27/10/2026)

### 12.1 Serialização User/Client — por que ajuda (e o que não prova)

**Problema:** Com isolamento _snapshot_, duas transacções podem executar `hasEmployeeConflict` → vazio e ambas `insert` em documentos de appointment **diferentes**, sem conflito de escrita entre si.

**Mecanismo proposto:** No início do bloco transaccional, `findOneAndUpdate` no documento do **funcionário** (`User`, filtrado por `_id` + `companyId` + `deletedAt: null`) e, após conhecer `clientId`, no **cliente** (`Client`, mesmo filtro de tenant). Duas transacções que reservam o mesmo funcionário (ou o mesmo cliente em conflito de cliente) **alteram o mesmo documento**.

No MongoDB 4.4+ (Atlas; Mongoose **9.x** no projeto), duas transacções que modificam o mesmo documento: uma commit pode fazer a outra **abortar com WriteConflict (112)** ou obrigar **reintento**. No reintento, a transação nova vê o appointment já commitado pela primeira → `hasEmployeeConflict` / `hasClientConflict` devolve verdadeiro → **409**.

**Por que isto não é uma prova formal sem testes:** A garantia depende de (a) **todas** as reservas concorrentes relevantes passarem pelo touch nos mesmos documentos, (b) commits ordenados e reintentos correctos, (c) replica set funcional. Não substitui teste com `Promise.all` e contagem na coleção `appointments`.

**Cenários cobertos pelo desenho:**

| Concorrência                                              | Documentos em contenção     | Resultado esperado     |
| --------------------------------------------------------- | --------------------------- | ---------------------- |
| Mesmo `employeeId`, mesmo slot                            | Mesmo `User`                | Uma 409 ou uma sucesso |
| Mesmo `clientId`, slots sobrepostos, employees diferentes | Mesmo `Client` (após touch) | Uma 409                |
| `companyId` diferente                                     | Users/Clients distintos     | Sem interferência      |

**Cenário fraco se mal implementado:** Touch omitido num caminho; ou `resolveClientId` cria cliente **fora** da sessão → leituras inconsistentes e duplicados de cliente (não índice único em `(companyId, email)`).

### 12.2 Protocolo único em todos os caminhos de escrita

| Caminho                      | Entrada                     | Persistência hoje    | Deve usar o mesmo protocolo                                            |
| ---------------------------- | --------------------------- | -------------------- | ---------------------------------------------------------------------- |
| Admin create                 | `create` → `schedule`       | `create`             | **Sim** — extrair `persistNewAppointment` transaccional                |
| Público create               | `createPublic` → `schedule` | `create`             | **Sim** — `resolvePublicClient` dentro da transação com `session`      |
| Admin update / reagendamento | `update`                    | `update` após checks | **Sim** — `persistReschedule` transaccional com `excludeAppointmentId` |
| Público update               | `updatePublicByToken`       | `update` após checks | **Sim** — idem                                                         |

**Fora do protocolo (correcto):** `updateStatus` (cancelar, confirmar, etc.) — não introduz sobreposição de intervalo activo; cancelar **liberta** slot.

**Ordem recomendada dentro da transação (create):**

1. Touch `User` (employee).
2. `hasEmployeeConflict` (session).
3. `clientId = await resolveClientId()` — se criar `Client`, **com `{ session }`**.
4. Touch `Client`.
5. `hasClientConflict` (session).
6. `Appointment.create([...], { session })` ou `update` com session.
7. `commitTransaction`.

**Fora da transação (antes):** validações de tenant/entidades activas, `ensureEmployeeAvailable`, regra de passado, geração de token público (hash/ciphertext preparados antes; persistência do appointment continua atómica com o hash).

**Reintentos:** Apenas o corpo `withBookingTransaction` reexecuta. Efeitos **após** commit (notificações, e-mail) **não** devem correr dentro do loop. Se `resolvePublicClient` criar cliente no attempt 1 e o commit falhar, attempt 2 deve **reutilizar** cliente existente (`findByEmailAndCompany`).

**Sessões:** `finally { session.endSession() }` sempre; `abortTransaction` em cada falha antes de reintentar; nunca deixar sessão aberta após erro.

### 12.3 Índice MongoDB (CANON-016)

**Função:** Otimizar a query de conflito do funcionário (`companyId`, `employeeId`, `status ∈ {scheduled, confirmed}`, `deletedAt: null`, intervalo). **Não** impede intervalos sobrepostos — dois documentos com `startAt`/`endAt` diferentes não violam unicidade.

**Compatibilidade `partialFilterExpression` (MongoDB 4.2+, Atlas actual):**

```javascript
partialFilterExpression: {
  deletedAt: null,
  status: { $in: ["scheduled", "confirmed"] },
}
```

- Valores alinhados com [`AppointmentStatus`](../../server/src/constants/appointment-status.ts) (`"scheduled"`, `"confirmed"`).
- `$in` com dois literais é suportado em índices parciais.
- Documentos com `deletedAt` ausente vs `null`: o schema usa soft-delete com `null`; manter filtro `deletedAt: null` consistente com queries.

**Índice recomendado (consulta, não integridade):**

```javascript
{ companyId: 1, employeeId: 1, status: 1, startAt: 1 }
```

com o mesmo `partialFilterExpression`. Incluir `endAt` no índice tem benefício limitado para `endAt: { $gt: startAt }`; priorizar prefixo que corresponde à igualdade do filtro.

**Deploy:** Declarar no schema Mongoose para `syncIndexes` **apenas** em dev/test controlado, ou script ops documentado — **não** correr migração destrutiva nem `dropDatabase` em produção nesta tarefa.

### 12.4 Criação de cliente e escritas relacionadas (pré-implementação)

_Notas históricas da revisão 27/10; comportamento actual com `session` em sec. **15**._

- [`resolvePublicClient`](../../server/src/modules/appointments/services/AppointmentService.ts) chamava `clientRepository.create` **sem** transação antes do GW-3.
- Comentário em `createPublic` diz que o cliente só é criado depois do conflito de funcionário — **verdade** na ordem actual de `schedule`, mas ainda **antes** do conflito de **cliente** e do `create` do appointment.
- **Obrigatório na implementação:** `ClientRepository.create(data, { session })`; leituras `findByEmailAndCompany` com `.session(session)` dentro da mesma transação.
- Índice `(companyId, email)` **não único** — duplicados sob concorrência são risco **adjacente**; mitigação mínima: transação + re-leitura por email; índice único parcial fica **fora** do GW-3 salvo decisão de produto.

---

## 13. Proposta objetiva de implementação

1. **Branch:** Continuar em `fix/gw-3-double-booking` (base `90e5972`); sem commit até revisão humana pós-testes.

2. **Novos artefactos**
   - `appointment-booking-transaction.ts` — `withBookingTransaction(operation)` com reintento 112 / labels transitórios, `endSession` garantido.
   - `appointment-repository.types.ts` — `{ session?: ClientSession }`.

3. **Repositórios**
   - `AppointmentRepository`: `session` em `hasEmployeeConflict`, `hasClientConflict`, `create`, `update`.
   - `UserRepository.touchBookingSerialization(id, companyId, session)`.
   - `ClientRepository.touchBookingSerialization` + `create(..., { session })`.

4. **AppointmentService**
   - Refatorar `schedule` para bloco transaccional (sec. 12.2).
   - Extrair método privado partilhado para updates (`update` + `updatePublicByToken`).
   - Manter `dispatchAppointmentNotification` **depois** do commit.

5. **Modelo**
   - Adicionar índice parcial sec. 12.3 (sem auto-deploy prod).

6. **Testes** — sec. 14.

7. **Validação:** `npm run test` (escopo GW-3 + suite), `npm run build`; documentar falha `object-id` se ocorrer.

---

## 14. Testes de aceitação (GW-3)

### 14.1 Infraestrutura

| Opção                             | Estado no repo                                                                 | Decisão                                                                |
| --------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Integração existente (rotas/unit) | Mocks de repositório; **sem** Mongo real                                       | Insuficiente para AUD-DATA-001                                         |
| `mongodb-memory-server`           | **Presente** — `^10.4.3` em [`server/package.json`](../../server/package.json) | **`MongoMemoryReplSet`** na suite ACC — transacções exigem replica set |
| Atlas de teste                    | Possível manualmente                                                           | Alternativa; CI local deve preferir ACC em memória                     |

Ficheiro: [`server/tests/integration/appointments/appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts) (Vitest, `beforeAll` connect + seed mínimo, `afterAll` teardown).

### 14.2 O que cada teste deve provar

Não basta assertar status HTTP: após `Promise.all`, **consultar MongoDB** (`countDocuments` com filtro de sobreposição) — **exactamente 1** appointment activo no slot disputado.

| ID     | Cenário                                                               | Assertiva principal                         |
| ------ | --------------------------------------------------------------------- | ------------------------------------------- |
| ACC-01 | Duas `create` paralelas — mesmo `companyId`, `employeeId`, intervalo  | 1 sucesso + 1 rejeição (409); **count = 1** |
| ACC-02 | Intervalos parcialmente sobrepostos                                   | Idem                                        |
| ACC-03 | Intervalos adjacentes (fim = início)                                  | **count = 2** se regras actuais permitirem  |
| ACC-04 | `update` / `updatePublicByToken` para slot ocupado                    | 409; count inalterado                       |
| ACC-05 | Appointment `cancelled` no slot                                       | Nova create OK                              |
| ACC-06 | Mesmo slot, **companyId** diferente                                   | **count = 2** (uma por empresa)             |
| ACC-07 | Conflito de **cliente** (employees diferentes, mesmo client, overlap) | 1 + 409                                     |

### 14.3 Limitação declarada

- Testes unitários / integração de rotas com mocks **não** satisfazem AUD-DATA-001 — a evidência vem de ACC-01–07 com Mongo real em memória.
- **29/10/2026:** ACC-01–07 verdes com `MongoMemoryReplSet` (ver sec. **15**). Ambientes sem replSet funcional (ex.: Windows sem VC++ Redistributable) podem **skip/falhar** a suite ACC até corrigir o runtime — não invalida o desenho, mas impede fecho local nesse ambiente.

### 14.4 Critério de fecho GW-3

- ACC-01 a ACC-07 verdes em integração com replica set em memória **ou** evidência equivalente em staging documentada (**cumprido** em memória, 29/10 — sec. **15.1**).
- Suite `npm run test` e `npm run build` registadas no relatório (sec. **15.1**). Validação Atlas transacções básicas: sec. **17** (30/10).

---

## 15. Implementação e validação (28/10/2026)

### 15.0 Decisões aplicadas

| Decisão                  | Implementação                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withBookingTransaction` | [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts) — 4 tentativas, labels transitórios + código 112, `abortTransaction` + `endSession` |
| Serialização             | `UserRepository.touchBookingSerialization` + `ClientRepository.touchBookingSerialization` no início do bloco transaccional                                                                                    |
| Criação / reagendamento  | `schedule` e `persistReschedule` partilhados por admin + público; disponibilidade **fora** da tx; notificações **após** commit                                                                                |
| Cliente público          | `resolvePublicClient` + `findByEmailAndCompany` / `create` com `session` quando em transacção real                                                                                                            |
| Índice CANON-016         | Índice parcial em [`Appointment.model.ts`](../../server/src/modules/appointments/models/Appointment.model.ts) — **sem** deploy automático em produção                                                         |
| Testes unitários         | `vi.mock` de `withBookingTransaction` + `touchBookingSerialization` nos mocks de repositório                                                                                                                  |

### 15.1 Resultados de validação

| Comando                                                                                  | Exit                      | Notas                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- tests/integration/appointments/appointment-booking-concurrency.test.ts` | **0** (29/10)             | **7/7 passed** (MongoMemoryReplSet). ACC-04 corrigido — ver [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md). |
| `npm run test` (server)                                                                  | **0** (29/10)             | **1239 passed** em **82 ficheiros**, **0 failed** (~99s).                                                                                             |
| `npm run build`                                                                          | **0** (29/10)             | `tsc` sem erros (`cd server && npm run build`)                                                                                                        |
| `git diff --check`                                                                       | **0** (29/10, pré-commit) | Sem avisos de whitespace nos hunks tracked                                                                                                            |

_Validação intermédia 28/10 (Windows sem VC++): ACC skipped; 1232 passed — substituída pelos resultados acima quando replSet local funcional._

### 15.2 Ficheiros alterados

**Novos (`??` até `git add`)**

- [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts)
- [`appointment-repository.types.ts`](../../server/src/modules/appointments/repositories/appointment-repository.types.ts)
- [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts)
- [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md)
- [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md)
- Este relatório [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md)

**Produção**

- `server/src/modules/appointments/services/AppointmentService.ts` — protocolo transaccional em create/update/reagendamento
- `server/src/modules/appointments/repositories/AppointmentRepository.ts` — `session` opcional em conflitos, create, update
- `server/src/modules/users/repositories/UserRepository.ts` — `touchBookingSerialization`
- `server/src/modules/Clients/repositories/ClientRepository.ts` — `session` em find/create + touch
- `server/src/modules/appointments/models/Appointment.model.ts` — índice parcial de conflito

**Testes / deps**

- [`server/package.json`](../../server/package.json), `server/package-lock.json` — `mongodb-memory-server@^10.4.3`
- `server/tests/integration/availability-appointment.routes.test.ts`
- `server/tests/integration/public-appointment-link.routes.test.ts`
- `server/tests/integration/public-appointment.routes.test.ts`
- `server/tests/unit/appointments/AppointmentPriceHistory.test.ts`
- `server/tests/unit/appointments/AppointmentService.public-link.test.ts`
- `server/tests/unit/appointments/AppointmentService.public.test.ts`
- `server/tests/unit/appointments/AppointmentService.test.ts`
- `server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts`

### 15.3 Pendências operacionais (impedem fecho GW-3)

1. **Transacções MongoDB no cluster Atlas:** topologia replica set e transacção básica (insert + `abortTransaction` / rollback) **confirmadas manualmente em 30/10/2026** — ver sec. **17** e [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md). **Pendente:** confirmar que a **conta de aplicação** em produção/staging (não `SchedulerPro_root` / `atlasAdmin` do teste manual) tem permissões adequadas para transacções multi-documento nas coleções GW-3.
2. **Índice CANON-016:** aplicar índice parcial via script ops / `syncIndexes` **controlado** — declarado no schema, **sem** deploy automático em produção nesta entrega.
3. **Git / CI:** commit + push + pipeline verde; PR e merge em `develop`.
4. **Revisão humana** antes de merge.

| Item                       | Estado final (30/10/2026)                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Branch                     | `fix/gw-3-double-booking` @ `90e5972` + alterações locais                                                      |
| Código GW-3                | **Implementado**                                                                                               |
| ACC-01–07                  | **Verdes** (registado 29/10)                                                                                   |
| Transacções Atlas (manual) | **Topologia + abort/rollback** confirmados (30/10); **sem** teste de concorrência no Atlas                     |
| Fecho CANON-003            | **Evidência de testes + Atlas básico**; **fecho operacional pendente** (commit, CI, permissões app, CANON-016) |

---

## 16. Revisão final pré-commit (29/10/2026)

### 16.1 Âmbito desta revisão

- Actualização **documental** dos relatórios GW-3 e ACC-04 para reflectir o estado real do repositório (incl. correcção sec. **6.1** / **14.1** sobre `mongodb-memory-server`).
- Verificações **não destrutivas:** `git status --short`, `git diff --check`, `git diff --stat`; `npm run build` confirmado **nesta sessão de revisão** (exit **0**).
- **Não** reexecutada suite Vitest / ACC nesta revisão — resultados de testes citados são os **registados em 29/10** (sec. **15.1**).
- **Não** executados: `git commit`, `git merge`, `git push`, abertura ou merge de PR.
- **Não** alterada lógica de negócio nem código de produção/testes GW-3.

### 16.2 Ficheiros tocados só pela revisão documental

- [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md) (este ficheiro)
- [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md) — sec. **7** (referência cruzada)

### 16.3 Handoff para continuidade (outra IA / revisor)

| Tópico         | Acção sugerida                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Staging        | `git add` dos **6** `??` + **15** `M` (sec. **15.2**); mensagem CANON-003 / CANON-016                                               |
| CI             | Garantir job server com replSet (VC++ no Windows runners se aplicável)                                                              |
| ACC-04         | Manter [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md) no PR — histórico da falha de setup |
| Ops            | Runbook índice parcial sec. **12.3**; permissões conta app MongoDB; ver Atlas sec. **17**                                           |
| Riscos         | Sec. **9** — disponibilidade fora da tx; lacuna teste cliente público mesmo e-mail                                                  |
| Fora de âmbito | Avisos npm (`devdir`), Vite, Mongoose — não tratados nesta tarefa                                                                   |

**Contratos preservados:** HTTP **409** com `EMPLOYEE_CONFLICT` / `CLIENT_CONFLICT`; comportamento documentado em ACC e unitários existentes.

---

## 17. Validação manual de transacções — MongoDB Atlas (30/10/2026)

### 17.1 Objetivo

Complementar ACC-01–07 (memória local) com evidência no **cluster Atlas** de que a topologia suporta **replica set** e que uma **transacção Mongosh** (inserção + `abortTransaction`) comporta-se correctamente. **Não** demonstra concorrência de agendamentos no Atlas.

Relatório completo (comandos, resultados literais, limitações): [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md).

### 17.2 Ambiente (resumo)

| Campo                   | Valor                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| MongoDB                 | **8.0.34** (Atlas)                                               |
| Mongosh                 | **2.14.1**                                                       |
| Replica set             | `atlas-ukj0uz-shard-0` — **3** membros, região AWS **EU_WEST_3** |
| Sessão                  | Utilizador `SchedulerPro_root`, papel `atlasAdmin` (`admin`)     |
| BD do teste             | **`schedulerpro_transaction_test`** apenas                       |
| BD `schedulerpro` (app) | **Sem alterações** nesta validação                               |

### 17.3 Resultados observados

- `db.adminCommand({ hello: 1 })` → `setName: "atlas-ukj0uz-shard-0"`, `isWritablePrimary: true`, três hosts `cluster0-shard-00-0{0,1,2}.farg7.mongodb.net:27017`, `ok: 1`.
- `db.runCommand({ connectionStatus: 1 })` → utilizador `SchedulerPro_root` / `atlasAdmin`, `ok: 1`.
- `startTransaction` → `insertOne` em `transaction_tests` com `testId: "GW3-TRANSACTION-001"` → `acknowledged: true`, `insertedId: ObjectId("6ae4b6a38a9c299b7c132f87")`.
- `abortTransaction` + `endSession` → `find` / `countDocuments` para `GW3-TRANSACTION-001` → **`[]`** e **`0`**.

### 17.4 Conclusão e limitações

| Conclusão                                | Detalhe                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Suporte básico a transacções no cluster  | **Confirmado** (rollback após abort)                                                  |
| Double-booking / write conflict no Atlas | **Não testado** nesta sessão                                                          |
| Credencial de produção da API            | **Não validada** — teste com `atlasAdmin`; confirmar permissões da conta de aplicação |
| CANON-016                                | Continua **pendente** de deploy ops                                                   |

Nenhuma password, connection string completa ou segredo foi registado nesta secção.

---

## 18. Revisão de consistência documental (30/10/2026)

### 18.1 Objectivo

Alinhar os três relatórios GW-3 antes do commit: numeração de secções (**11** antes de **12**), pendências operacionais centralizadas em **15.3**, remoção de contradições entre diagnóstico histórico (sec. **3**, **12.4**) e implementação/Atlas (**15**, **17**).

### 18.2 Alterações documentais (sem código)

| Documento                                                                                                | Correcções                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Este relatório                                                                                           | Sec. **11** reordenada e resumida; sec. **2**, **10**, **8**, **7**, **14.4**, **16.3**, inventário sec. **5**; nova sec. **18** |
| [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md)                 | Sec. **6**–**8**: pendências por referência; sec. **7**–**8** actualizadas                                                       |
| [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md) | Sec. **9**: pendências remissivas a **15.3**                                                                                     |

### 18.3 Verificações

- Evidências Atlas (sec. **17** e relatório dedicado): **inalteradas**.
- Resultados ACC / suite / build (sec. **15.1**): **inalterados**.
- **Não** reexecutados testes, build, MongoDB, commit, merge ou push nesta revisão.
