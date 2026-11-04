# GW-3 — Validação manual de transacções MongoDB Atlas

**Data da validação:** 30/10/2026  
**Branch de trabalho:** `fix/gw-3-double-booking` (sem commit/merge/push nesta tarefa documental)  
**Relatório principal:** [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md) — sec. **17**

---

## 1. Objetivo

Confirmar no **MongoDB Atlas** que o cluster utilizado pelo SchedulerPro expõe topologia de **replica set** e que **sessões com transacções** (`startTransaction`, escrita, `abortTransaction`) funcionam como esperado — requisito do protocolo GW-3 (`withBookingTransaction`) e do padrão já adoptado em registo de utilizador.

Esta validação **não** substitui ACC-01–07 (concorrência em `MongoMemoryReplSet`) nem prova double-booking no Atlas.

---

## 2. Ambiente

| Campo                  | Valor                         |
| ---------------------- | ----------------------------- |
| Serviço                | MongoDB Atlas                 |
| Versão MongoDB         | **8.0.34**                    |
| Versão Mongosh         | **2.14.1**                    |
| Cluster (UI)           | `cluster0`                    |
| Replica set            | `atlas-ukj0uz-shard-0`        |
| Membros                | **3**                         |
| Região                 | AWS **EU_WEST_3**             |
| Utilizador autenticado | `SchedulerPro_root` (`admin`) |
| Papel apresentado      | `atlasAdmin` (`admin`)        |

**Base de dados usada no teste:** `schedulerpro_transaction_test` — **exclusivamente** para o teste manual.

**Base de dados principal `schedulerpro`:** **não** alterada (sem escritas em coleções de produção da aplicação).

**Segurança:** este relatório **não** inclui passwords, connection strings completas nem tokens.

---

## 3. Confirmação da topologia

Comando:

```javascript
db.adminCommand({ hello: 1 });
```

Resultado relevante:

```javascript
{
  setName: "atlas-ukj0uz-shard-0",
  isWritablePrimary: true,
  hosts: [
    "cluster0-shard-00-00.farg7.mongodb.net:27017",
    "cluster0-shard-00-01.farg7.mongodb.net:27017",
    "cluster0-shard-00-02.farg7.mongodb.net:27017"
  ],
  ok: 1
}
```

**Interpretação:** replica set com primary gravável e três hosts — condição necessária para transacções multi-documento.

---

## 4. Confirmação da autenticação

Comando:

```javascript
db.runCommand({ connectionStatus: 1 });
```

Resultado relevante:

```javascript
{
  authInfo: {
    authenticatedUsers: [
      { user: "SchedulerPro_root", db: "admin" }
    ],
    authenticatedUserRoles: [
      { role: "atlasAdmin", db: "admin" }
    ]
  },
  ok: 1
}
```

**Nota:** o teste foi executado com credencial administrativa Atlas (`atlasAdmin`). **Não** constitui validação das permissões da **conta de aplicação** que a API usa em produção/staging — isso permanece pendente de confirmação explícita.

---

## 5. Teste efetivo de transacção

### 5.1 Sessão e início

```javascript
const session = db.getMongo().startSession();
const testDb = session.getDatabase("schedulerpro_transaction_test");

session.startTransaction();
```

### 5.2 Inserção dentro da transacção

```javascript
testDb.transaction_tests.insertOne({
  description: "Teste de transação SchedulerPro",
  createdAt: new Date(),
  testId: "GW3-TRANSACTION-001",
});
```

Resultado:

```javascript
{
  acknowledged: true,
  insertedId: ObjectId("6ae4b6a38a9c299b7c132f87")
}
```

### 5.3 Cancelamento da transacção

```javascript
session.abortTransaction();
session.endSession();
```

### 5.4 Verificação pós-abort (base `schedulerpro_transaction_test`)

Consulta:

```javascript
db.transaction_tests
  .find({
    testId: "GW3-TRANSACTION-001",
  })
  .toArray();
```

Resultado:

```javascript
[];
```

Contagem:

```javascript
db.transaction_tests.countDocuments({
  testId: "GW3-TRANSACTION-001",
});
```

Resultado:

```text
0
```

**Interpretação:** após `abortTransaction`, o documento inserido **não** persistiu — comportamento esperado de rollback de transacção.

---

## 6. Conclusão técnica

| Verificação                              | Resultado                                 |
| ---------------------------------------- | ----------------------------------------- |
| Replica set operacional no Atlas         | **Confirmado** (`hello`, 3 membros)       |
| Sessão + `startTransaction` + escrita    | **Confirmado** (`insertOne` acknowledged) |
| `abortTransaction` descarta a escrita    | **Confirmado** (find `[]`, count `0`)     |
| Integridade da base `schedulerpro` (app) | **Preservada** (teste isolado noutra BD)  |

O cluster Atlas alvo deste teste **suporta transacções** no sentido básico exigido pelo desenho GW-3. A evidência de prevenção de double-booking continua a assentar nos testes **ACC-01–07** (29/10/2026) e na implementação transaccional no código.

---

## 7. Limitações do teste

1. **Não** foram executadas transacções **concorrentes** nem cenários de write conflict (112) directamente no Atlas.
2. **Não** foi executado `commitTransaction` com verificação de persistência commitada neste script (apenas fluxo abort).
3. **Não** foi testado o fluxo completo `AppointmentService` / multi-documento (`User`, `Client`, `Appointment`) contra Atlas.
4. Credencial **`SchedulerPro_root` / `atlasAdmin`** — **não** valida a conta de serviço da aplicação; confirmar roles mínimas (read/write nas coleções necessárias + transacções) antes de fecho ops.
5. **Índice CANON-016** e deploy em produção permanecem pendências separadas (ver relatório GW-3 sec. **15.3**).

---

## 8. Ficheiros documentais actualizados (30/10/2026)

| Ficheiro                                                                                                 | Acção                              |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md) | **Criado** (este documento)        |
| [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md)                             | Sec. **17**; sec. **15.3**, **18** |
| [`schedulerpro-gw-3-acc-04-investigation.md`](schedulerpro-gw-3-acc-04-investigation.md)                 | Referência cruzada sec. **6**      |

**Código-fonte, testes, dependências e `.env`:** **não** alterados nas tarefas documentais Atlas / consistência.

---

## 9. Estado final do Git (após documentação, 30/10/2026)

| Verificação                                               | Resultado                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `git diff --check`                                        | **Sem erros**                                               |
| `git commit` / merge / push                               | **Nenhum**                                                  |
| Ficheiros `server/` alterados **nas tarefas documentais** | **Nenhum** (diff tracked em `server/` = GW-3 pré-existente) |

`git status --short` (resumo):

- **15** entradas `M` em `server/` (implementação GW-3).
- **6** entradas `??`: três relatórios em `docs/reports/`, `appointment-booking-transaction.ts`, `appointment-repository.types.ts`, `tests/integration/appointments/`.

**Pendências operacionais:** ver exclusivamente sec. **15.3** de [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md).

---

## 10. Handoff (outra IA)

- **Validado no Atlas (30/10):** topologia replica set + transacção simples com abort e rollback observável na BD `schedulerpro_transaction_test`.
- **Já validado em código (29/10):** ACC-01–07, suite 1239 testes, build.
- **Próximo passo ops:** mapear user MongoDB da API → roles efectivas; opcionalmente repetir teste de transacção com essa credencial (BD de teste dedicada).
- **Não afirmar** concorrência Atlas testada neste relatório.
