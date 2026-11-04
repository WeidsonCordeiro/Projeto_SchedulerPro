# SchedulerPro — Auditoria Técnica Global | Fase D — Integridade, índices e infraestrutura de dados

**Data:** 24/10/2026  
**Modo:** Read-only (sem alterações a código, modelos, configuração, dependências, testes, base de dados ou histórico Git)

**Relatórios de referência (confirmados no repositório):**

- [`schedulerpro-global-technical-audit.md`](schedulerpro-global-technical-audit.md) — **não alterado** nesta execução
- [`schedulerpro-global-technical-audit-phase-c.md`](schedulerpro-global-technical-audit-phase-c.md)
- [`schedulerpro-global-technical-audit-phase-c1.md`](schedulerpro-global-technical-audit-phase-c1.md)

---

## 1. Objetivo e âmbito

Auditar, de forma estática e por leitura de testes seguros:

- Modelos Mongoose e coleções (D.1)
- Índices, unicidade e TTL (D.2)
- Padrões de consulta e riscos de desempenho **hipotéticos** (D.3)
- Integridade referencial lógica e multi-tenancy nos dados (D.4)
- Concorrência em agendamentos e jobs (D.5)
- Evidências de ligação MongoDB, health e backups no repositório (D.6)
- Testes unitários relevantes (D.7)

**Fora de âmbito:** `explain()`, profiling, carga, alteração de índices, migrations, acesso a produção ou Atlas, implementação de correções.

---

## 2. Baseline Git

| Item | Fase C.1 | Fase D | Notas |
|------|----------|--------|--------|
| Branch | `develop` | `develop` | Mantida |
| HEAD | `d9f2aeaabc05a34509f77499695dfcf935921b51` | `d9f2aeaabc05a34509f77499695dfcf935921b51` | **Sem divergência** |
| Remote | Alinhado com `origin/develop` | Idem | |
| Código rastreado | Limpo | Limpo | |
| Não rastreados | Relatórios de auditoria | `??` em `docs/reports/schedulerpro-global-technical-audit*.md` (incl. C.1 criado na fase anterior) | Preservados; nenhum ficheiro removido ou sobrescrito |

Não foram executados commit, merge, push, reset, stash ou operações destrutivas.

---

## 3. Inventário de modelos e coleções (D.1)

Foram identificados **11** modelos Mongoose em `server/src/modules/**/models/*.model.ts`. A validação Mongoose **não** equivale a restrições garantidas pelo MongoDB, exceto onde existe índice `unique` / TTL.

### 3.1 Resumo

| Modelo | Ficheiro | Coleção | `companyId` | Soft delete | Timestamps |
|--------|----------|---------|-------------|-------------|------------|
| Company | `companies/models/Company.model.ts` | `companies` | — (tenant raiz) | `deletedAt` | sim |
| User | `users/models/User.model.ts` | `users` | obrigatório, ref Company | `deletedAt` | sim |
| Client | `Clients/models/Client.model.ts` | `clients` | obrigatório | `deletedAt` | sim |
| Service | `services/models/Service.model.ts` | `services` | obrigatório | `deletedAt` | sim |
| Appointment | `appointments/models/Appointment.model.ts` | `appointments` | obrigatório | `deletedAt` | sim |
| EmployeeAvailability | `availability/models/EmployeeAvailability.model.ts` | `availability` | obrigatório | `deletedAt` | sim |
| AvailabilityException | `availability/models/AvailabilityException.model.ts` | `availability_exceptions` | obrigatório | `deletedAt` | sim |
| Session | `auth/models/Session.model.ts` | `sessions` | via `userId` | `revokedAt` (lógico) | sim |
| PasswordReset | `auth/models/PasswordReset.model.ts` | `password_resets` | via `userId` | `usedAt` | sim |
| Notification | `notifications/models/Notification.model.ts` | `notifications` | obrigatório | — | sim |
| ClientInvite | `client-invites/models/ClientInvite.model.ts` | `client_invites` | obrigatório | `revokedAt` / `usedAt` | sim |

### 3.2 Detalhe por entidade

#### Company

- **Campos:** `name` (required, trim, lowercase, **unique**), `timezone` (IANA, default `Europe/Lisbon`), `isActive`, `logo` (`StoredImage`), `deletedAt`.
- **Refs:** nenhuma obrigatória.
- **Índices declarados:** `deletedAt`, `isActive`; unique implícito em `name`.
- **Nota multi-tenant:** unicidade global do **nome** da empresa (não por tenant).

#### User

- **Campos:** `name`, `email` (**unique** global, lowercase), `passwordHash` (`select: false`), `companyId`, `role` (enum `Role`), `clientId` (opcional, portal CLIENT), `isActive`, verificação email/phone, segurança (`failedLoginAttempts`, `lockUntil`, `mustChangePassword`, `passwordChangedAt`), `deletedAt`.
- **Refs:** `companyId` → Company; `clientId` → Client.
- **Índices:** `companyId`; `role`; `deletedAt`; `companyId+isActive`; `clientId`.
- **Nota:** mesmo e-mail não pode existir em duas empresas como User (unique global).

#### Client

- **Campos:** `name`, `email`/`phone` opcionais, `companyId`, `notes`, `avatar`, `isActive`, `deletedAt`.
- **Índice:** `companyId+email` (**não** único — mesmo e-mail em empresas diferentes permitido).
- **Regra app:** unicidade de e-mail é por empresa na lógica de negócio, não por índice único composto.

#### Service

- **Campos:** `companyId`, `name`, `description`, `duration` (min ≥5), `price` (≥0), `isActive`, `deletedAt`.
- **Índice:** `companyId` (field `index: true` apenas).

#### Appointment

- **Campos:** `companyId`, `clientId`, `serviceId`, `employeeId`, `startAt`, `endAt`, `status` (enum), `notes`, `priceAtTime` (snapshot histórico), tokens públicos (`publicAccessTokenHash`, `publicAccessTokenCiphertext`, `select: false`), campos de lembretes (`reminder*SentAt`, `reminder*LeaseUntil`), `deletedAt`.
- **Refs:** Company, Client, Service, User (employee).
- **Índices:** field-level em `companyId`, `clientId`, `employeeId`, `startAt`, `status`; compostos ver secção 4.

#### EmployeeAvailability

- **Campos:** `companyId`, `employeeId`, `dayOfWeek` (0–6), janelas manhã/tarde (strings), `deletedAt`.
- **Índice único parcial:** `companyId+employeeId+dayOfWeek` com `partialFilterExpression: { deletedAt: null }`.

#### AvailabilityException

- **Campos:** `companyId`, `employeeId`, `date`, tipo/bloqueio (ver schema completo), `deletedAt`.
- **Índice:** `companyId+employeeId+date`.

#### Session

- **Campos:** `userId`, `sessionStartedAt`, `lastActivityAt`, `revokedAt`.
- **Índices:** `userId`, `revokedAt`, `sessionStartedAt` — **sem TTL** no MongoDB.

#### PasswordReset

- **Campos:** `userId`, `token`, `expiresAt`, `usedAt`.
- **Índices:** TTL em `expiresAt` (`expireAfterSeconds: 0`); `userId`; `token` **unique**.

#### Notification

- **Campos:** `companyId`, `userId`, `type` (enum), `title`, `message`, `readAt`, `metadata` (appointmentId, clientId, serviceId, employeeId opcionais).
- **Índices:** `companyId+userId+createdAt` (desc na query); `companyId+userId+readAt`.

#### ClientInvite

- **Campos:** `tokenHash` (**unique**, `select: false`), `companyId`, `clientId`, `expiresAt`, `usedAt`, `revokedAt`, `createdBy`.
- **Índices:** field indexes em `companyId`, `clientId`, `expiresAt`; unique em `tokenHash`.

---

## 4. Inventário e avaliação de índices (D.2)

### 4.1 Índices por coleção (declarados no código)

| Coleção | Índice | Tipo | Finalidade declarada / inferida |
|---------|--------|------|----------------------------------|
| `appointments` | `{ companyId, clientId, startAt }` | composto | Listagem cliente / calendário |
| `appointments` | `{ publicAccessTokenHash }` partial unique | único parcial | Lookup link público |
| `appointments` | `companyId`, `clientId`, `employeeId`, `startAt`, `status` | simples (schema) | Filtros diversos |
| `users` | `email` | unique | Login global |
| `users` | `companyId`, `companyId+isActive`, etc. | compostos/simples | Listagens RBAC |
| `clients` | `companyId+email` | composto | Booking público por e-mail |
| `availability` | `companyId+employeeId+dayOfWeek` | unique parcial | Uma linha por dia/funcionário |
| `availability_exceptions` | `companyId+employeeId+date` | composto | Exceções por dia |
| `password_resets` | `expiresAt` | TTL | Expurgo automático |
| `password_resets` | `token` | unique | Lookup reset |
| `notifications` | `companyId+userId+createdAt` / `+readAt` | compostos | Lista e contagem não lidas |
| `sessions` | `userId`, `revokedAt`, `sessionStartedAt` | simples | Validação / manutenção (sem TTL) |
| `companies` | `name` | unique | Registo |
| `client_invites` | `tokenHash` | unique | Aceite convite |

### 4.2 Correlação índice ↔ consulta (estática)

**Conflito de horário (funcionário e cliente)** — `AppointmentRepository.hasEmployeeConflict` / `hasClientConflict` (`AppointmentRepository.ts` L178–288):

```text
Filtro: companyId, employeeId|clientId, deletedAt: null,
        status ∈ {scheduled, confirmed},
        startAt < endAt_req AND endAt > startAt_req
```

- Índice composto explícito mais próximo: `{ companyId, clientId, startAt }` — **não inclui** `employeeId` nem `status`.
- Índices simples em `employeeId` e `startAt` existem no schema.
- **Hipótese estática (não medida):** consultas de conflito e `findBlockingForEmployee` podem fazer scan mais amplo do que o ideal em coleções grandes. **Não** implica incorreção de dados.

**Listagem admin calendário** — `findByCompanyId` (L95–118): `companyId`, opcional `clientId`, overlap de intervalo em `startAt`/`endAt`, `sort({ startAt: 1 })`, **sem `.limit()`**.

- Com filtro `clientId`, alinha-se parcialmente ao índice `companyId+clientId+startAt`.
- Sem `clientId`, depende sobretudo de `companyId` (+ índice simples).

**Relatórios** — `ReportRepository.buildBaseMatch` (L63–84): `$match` com `companyId`, `deletedAt: null`, `startAt` no período — coerente com índices que incluem `companyId` e `startAt`.

**Notificações** — `findByUser` / `countUnread`: alinhados aos índices `companyId+userId+…`.

### 4.3 Unicidade e multi-tenant

| Restrição | Âmbito | Risco / nota |
|-----------|--------|----------------|
| `User.email` unique | **Global** | Produto: uma conta User por e-mail no sistema inteiro |
| `Company.name` unique | **Global** | Nomes de empresa colidem entre tenants |
| `Client` `companyId+email` | Não único | Correto para SaaS |
| `EmployeeAvailability` unique parcial | Por empresa + funcionário + dia | Impede duplicata lógica |
| `publicAccessTokenHash` unique parcial | Global entre tokens reais | Dois `null` permitidos (documentado no schema) |

### 4.4 Sobreposição / duplicação

- `appointments`: vários índices simples em campos também usados em compostos — possível redundância (ex. `companyId` indexado no campo e em compostos). **Impacto:** maior custo de escrita; **não verificado** em produção.

---

## 5. Análise de consultas (D.3)

### 5.1 Padrões observados

| Padrão | Onde | Notas |
|--------|------|-------|
| `find` / `findOne` / `findById` | Todos os repositories | Quase sempre `deletedAt: null` em entidades com soft delete |
| `aggregate` | `ReportRepository` | `$match` com `companyId` ObjectId |
| `populate` | — | **Não utilizado** no `server/src` (grep vazio) |
| `insertMany` | `NotificationRepository.createMany` | Fan-out de notificações |
| `updateOne` condicional | `claimReminder` | Concorrência de jobs |

### 5.2 Listagens sem paginação

- **`AppointmentRepository.findByCompanyId`:** devolve **todos** os documentos do tenant (e intervalo opcional) — `AppointmentController.findAll` (`AppointmentController.ts` L52–71). Validators limitam formato de datas, **não** volume.
- **Estado:** **Confirmado** no código — risco de payload e tempo de resposta em empresas com muitos agendamentos (hipótese de escala, não medida).

### 5.3 Padrão N+1

- **`AppointmentService.findMine`** (L685–712): para cada agendamento, `serviceRepository.findById` e `userRepository.findById` em `Promise.all` sobre o array.
- **Estado:** **Confirmado** — 1 + 2N consultas para N agendamentos no portal cliente.
- **Mitigação existente:** N limitado indiretamente pelo volume de agendamentos do cliente (sem cap explícito no repository).

### 5.4 Limites com cap

| Endpoint / fluxo | Limite | Evidência |
|------------------|--------|-----------|
| Notificações | 1–50 (validator), default 50 | `list-notifications.validator.ts`, `DEFAULT_NOTIFICATIONS_LIMIT` |
| Relatórios “top N” | default 5 | `DEFAULT_REPORT_LIMIT` em `reports/index.ts` |

### 5.5 Projeção e dados sensíveis

- `passwordHash`, `publicAccessTokenHash`, `tokenHash` (convites): `select: false` onde aplicável.
- Relatórios fazem `$lookup` a serviços/funcionários/clientes **incluindo soft-deleted** de propósito (`ReportRepository.ts` L16–18) para não quebrar histórico.

---

## 6. Integridade referencial e multi-tenancy (D.4)

O MongoDB **não** impõe foreign keys. O projeto usa validação em **services**.

### 6.1 Criação de agendamento

`AppointmentService.create` (L382–417):

1. `requireActiveClient(dto.clientId, companyId)`
2. `PublicBookingEligibility.requireActiveService` / `requireActiveEmployee`
3. `schedule()` → disponibilidade + conflitos + `create`

**Confirmado:** cliente, serviço e funcionário validados contra a **mesma** `companyId` da sessão ou do fluxo público antes da persistência.

### 6.2 Leitura cross-tenant

- Documentos referenciados por `ObjectId` podem pertencer a outra empresa se IDs forem adivinhados; a **API autenticada** rejeita na camada de serviço (403/404 — ver Fase C.1).
- Dados **no documento** Appointment guardam `companyId` + refs; inconsistência (ex. `serviceId` de outra empresa) **não deveria** ser criada pelos fluxos validados; **não** há constraint BD.

### 6.3 Soft delete e referências órfãs lógicas

- Serviços, clientes, utilizadores e disponibilidades usam `deletedAt`; agendamentos **históricos** mantêm `serviceId`/`clientId`/`employeeId` apontando a registos possivelmente inativos ou soft-deleted.
- **Comportamento intencional** para histórico (`priceAtTime`, relatórios com lookup a entidades eliminadas).
- **Classificação:** risco de **inconsistência lógica** na UI (nomes em falta), não de fuga cross-tenant.

### 6.4 Notificações

- `metadata` guarda IDs opcionais; dispatcher é best-effort (`AppointmentService.dispatchAppointmentNotification` L347–374).
- `markAsRead` usa repository com filtro `companyId` + `userId` — não confia só em `findById` global.

### 6.5 Testes de integridade / isolamento

| Área | Testes |
|------|--------|
| Conflitos de query | `appointment-conflicts.test.ts` (mock) |
| Agendamentos / disponibilidade cross-tenant | `availability-appointment.routes.test.ts` (integração mockada) |
| Relatórios | `ReportRepository.test.ts` |
| Modelo token público | `appointment-public-token.schema.test.ts` |

**Lacuna:** testes de integridade referencial explícitos (ex. appointment com serviceId inválido na BD) **não** identificados.

---

## 7. Concorrência e consistência (D.5)

### 7.1 Double-booking (agendamentos)

Fluxo `schedule` (`AppointmentService.ts` L266–323):

1. `ensureSlotIsAvailable` → `hasEmployeeConflict` (`findOne`)
2. `ensureClientHasNoConflict`
3. `appointmentRepository.create`

- **Sem** transação MongoDB no create de appointment (contraste: `AuthService.register` usa `mongoose.startSession()`).
- Duas requisições concorrentes podem ambas passar `findOne` antes de qualquer `create` — **janela TOCTOU**.
- **Estado:** **Parcialmente confirmado** (risco clássico read-check-write); mitigação **não** observada (unique parcial em intervalo, transação, findOneAndUpdate condicional).

### 7.2 Lembretes (positivo)

`AppointmentRepository.claimReminder` (L339–359): `updateOne` com condições em `sentField`, `leaseField`, `status`, `deletedAt` — **confirmado** como mecanismo de lease/idempotência sob jobs concorrentes. Testes: `appointment-reminders.test.ts`.

### 7.3 Disponibilidade semanal

Índice unique parcial em `EmployeeAvailability` impede duas linhas ativas para o mesmo `(companyId, employeeId, dayOfWeek)` — **confirmado** para esse eixo; não cobre exceções de data (índice separado em `availability_exceptions`).

### 7.4 Testes de concorrência

Não executados (escreveriam na BD). Recomendados para fase futura controlada (staging, duas requisições paralelas).

---

## 8. Backups, recuperação e configuração (D.6)

### 8.1 Ligação MongoDB

| Aspeto | Evidência |
|--------|-----------|
| URI | `MONGO_URI` obrigatório — `validateEnv.ts` L17–18, `env.ts` |
| Conexão | `MongoDatabase.connect` — `mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })` |
| Falha na subida | `process.exit(1)` em falha de conexão (`MongoDatabase.ts` L45–49) |
| Pool / opções avançadas | **Não** configuradas explicitamente (defaults Mongoose) |
| Shutdown | `server.ts` — `Database.disconnect()` no graceful shutdown |
| `trust proxy` | Não aplicável à BD; ver Fase C (rate limit) |

### 8.2 Health check

`GET /api/health` (`routes/index.ts` L75–86): retorna `uptime` e timestamp — **não** chama `Database.isConnected()`.

### 8.3 Backups e DR

- **Nenhum** runbook de backup, retenção PITR ou procedimento de restore encontrado no repositório (apenas menções genéricas em auditoria global AUD-INV-005).
- Configuração Atlas / snapshots: **não verificável** nesta fase.

### 8.4 Separação de ambientes

- Depende exclusivamente de `MONGO_URI` por ambiente (ficheiro `.env` não versionado). **Valores não inspecionados** (regra de não divulgar secrets).

### 8.5 Testes e base de dados

- `tests/setup.ts` define apenas variáveis de criptografia de teste — **sem** MongoMemoryServer.
- Testes de integração em `server/tests/integration` mockam repositórios/controllers na maior parte — **não** foi executada suíte de integração nesta fase para evitar ligação acidental a BD real via `MONGO_URI` local.

---

## 9. Testes consultados e executados (D.7)

### 9.1 Executados (Vitest, mockados, sem MongoDB)

```text
npm run test -- --run \
  tests/unit/repositories/appointment-conflicts.test.ts \
  tests/unit/repositories/appointment-reminders.test.ts \
  tests/unit/repositories/appointment-public-token.schema.test.ts \
  tests/unit/appointments/AppointmentService.test.ts \
  tests/unit/reports/ReportRepository.test.ts \
  tests/unit/notifications/NotificationRepository.test.ts
```

**Resultado:** 6 ficheiros, **50 testes passed**, 0 failed (duração ~7s).

### 9.2 Consultados, não executados

| Suíte | Motivo |
|-------|--------|
| `server/tests/integration/*.test.ts` | Supertest + mocks variados; risco/perda de tempo se algum teste ligar a BD real — não confirmado ficheiro a ficheiro nesta fase |
| Testes que exigem MongoDB real | Ausência de memory server no setup |

### 9.3 Limitações de cobertura

- Índices e desempenho **não** validados por testes.
- Concorrência de booking **não** coberta por testes automatizados identificados.

---

## 10. Matriz de achados (AUD-DATA)

| ID | Categoria | Título | Estado | Impacto | Prob. | Prio |
|----|-----------|--------|--------|---------|-------|------|
| AUD-DATA-001 | Concorrência | Criação de agendamento sem transação/lock atômico (risco double-booking) | Parcialmente confirmado | Alto em picos de reserva | Média | **P2** |
| AUD-DATA-002 | Índices | Índice composto possivelmente subótimo para queries de conflito por `employeeId` + intervalo | Parcialmente confirmado (hipótese estática) | Médio (latência) | Média em escala | **P2** |
| AUD-DATA-003 | Consultas | `findByCompanyId` sem paginação/limit | Confirmado | Médio (API/UX) | Média com histórico longo | **P2** |
| AUD-DATA-004 | N+1 | `findMine` — 2 queries por agendamento (service + employee) | Confirmado | Médio | Alta com muitos registos | **P2** |
| AUD-DATA-005 | Infra | Health check não reflecte estado MongoDB | Confirmado | Médio (operações) | Média | **P2** |
| AUD-DATA-006 | Infra / DR | Estratégia de backup e restore não documentada no repo | Não verificável (operações) | Alto se ausente em prod | — | **P2** |
| AUD-DATA-007 | Dados | Sessões sem TTL Mongo — acumulação de documentos | Confirmado | Baixo–médio | Média | **P3** |
| AUD-DATA-008 | Modelo | Unicidade global `User.email` e `Company.name` | Confirmado (desenho) | Produto / onboarding | — | Informativa |
| AUD-DATA-009 | Integridade | Referências a entidades soft-deleted em agendamentos históricos | Confirmado (comportamento) | Baixo | Alta | **P3** |
| AUD-DATA-010 | Testes | Sem testes de concorrência de booking nem integridade FK na BD | Confirmado (lacuna) | — | — | **P3** |

### Evidências resumidas por achado

- **001:** `AppointmentService.schedule` + `AppointmentRepository.create` sem session; `hasEmployeeConflict` é `findOne` não atômico com `create`.
- **002:** Query L185–207 vs índices `Appointment.model.ts` L216–220 e field indexes.
- **003:** `AppointmentRepository.ts` L116–118.
- **004:** `AppointmentService.ts` L697–711.
- **005:** `routes/index.ts` L75–86 vs `MongoDatabase.isConnected`.
- **006:** ausência de docs; AUD-INV-005 no relatório global.
- **007:** `Session.model.ts` L44–46 sem TTL.
- **008:** `User.model.ts` L120–126; `Company.model.ts` L44–49.
- **009:** comentários em `ReportRepository` e snapshot `priceAtTime`.
- **010:** inventário de testes secção 9.

---

## 11. Critérios de aceitação (futuras correções)

### AUD-DATA-001

- Duas reservas concorrentes no mesmo slot para o mesmo funcionário: **uma** falha com `409 CONFLICT` (teste de integração em staging ou testcontainers).
- Implementação aceite: transação, índice unique parcial em intervalo, ou upsert condicional documentado.

### AUD-DATA-002

- `explain("executionStats")` em staging para `hasEmployeeConflict` com volume representativo; índice composto proposto (ex. `companyId, employeeId, status, startAt`) validado antes/depois.
- Regressão zero em criação de índices em produção (janela de deploy).

### AUD-DATA-003

- Listagem admin de agendamentos com `limit`/`cursor` obrigatório ou intervalo máximo de datas documentado.
- Teste: empresa com >N registos não excede tempo/payload acordado.

### AUD-DATA-004

- `findMine` usa agregação com `$lookup` ou batch `find({ _id: { $in } })` — no máximo 3 queries por pedido.
- Teste unitário contando chamadas ao repository.

### AUD-DATA-005

- `/api/health` (ou `/api/health/ready`) retorna 503 se MongoDB desconectado; usado pelo orchestrator.

### AUD-DATA-006

- Runbook em repo ou wiki ligado: frequência de backup, RPO/RTO, teste de restore trimestral — evidência documental, não código.

### AUD-DATA-007

- Job ou TTL index em sessões revogadas/antigas com política documentada; métrica de tamanho da coleção `sessions`.

### AUD-DATA-008

- Decisão de produto documentada; se multi-tenant por e-mail for requisito, migrar para índice unique `{ companyId, email }` com plano de migração.

### AUD-DATA-009

- Comportamento documentado na API (nomes opcionais em agendamentos antigos); UI degrada graciosamente.

### AUD-DATA-010

- Adicionar testes conforme correções 001 e 004.

---

## 12. Questões não verificáveis e dependências externas

- Tamanho real das coleções, uso de índices, slow queries — MongoDB Atlas / logs APM.
- Existência e idade dos backups em produção.
- `MONGO_URI` de produção vs desenvolvimento.
- Impacto de índices redundantes no write throughput.
- Comportamento sob falha de rede prolongada além de `serverSelectionTimeoutMS: 5000`.

---

## 13. Recomendações para a fase seguinte

| Fase | Foco | Relação com D |
|------|------|----------------|
| **E** | Frontend (FE-*, UX, chamadas API) | Consumo de listagens sem paginação; portal `findMine` |
| **F** | Execução e fiabilidade da suíte de testes | AUD-INV-002; validar se algum integration test usa BD real |
| **G** | Deploy, monitorização, backups (AUD-INV-005) | Fechar AUD-DATA-005 e AUD-DATA-006 com evidência operacional |

**Ordem sugerida:** avançar **F** (inventário seguro de testes + execução controlada) em paralelo com **G** (runbook backup/health); **E** pode prosseguir independentemente. Correções **P2** de dados (001, 003, 005) devem entrar no backlog de implementação **após aprovação explícita**, idealmente antes de escala comercial agressiva.

**Validação adicional opcional:** `explain()` em staging apenas; teste de concorrência de booking em ambiente descartável.

---

## 14. Confirmação de conformidade (read-only)

Nesta Fase D **não** foram realizadas:

- Alterações a código, modelos, índices MongoDB, configuração ou dependências.
- Escritas na base de dados (migrations, seeds, DDL de índices).
- Commits, merges, pushes ou operações destrutivas no Git.
- Acesso a produção ou restauro de backups.
- Atualização de relatórios A–C.1 ou do relatório global.

**Artefato criado:** este ficheiro `schedulerpro-global-technical-audit-phase-d.md`.

---

## 15. Resumo executivo (síntese)

- **Modelos:** 11 coleções bem delimitadas; soft delete generalizado; multi-tenant via `companyId` na maioria das entidades.
- **Índices:** TTL em `password_resets`; unique parcial forte em disponibilidade e token público; **hipótese** de lacuna de índice para conflitos por funcionário (desempenho).
- **Consultas:** calendário admin **sem limite**; portal com **N+1** confirmado; relatórios e notificações com limites razoáveis.
- **Integridade:** validação na criação de agendamentos é sólida em código; **sem** FKs BD; histórico com refs a entidades eliminadas é intencional.
- **Concorrência:** risco **TOCTOU** em booking (P2); lembretes com lease **bem modelados**.
- **Infra:** conexão Mongo fail-fast; **health não verifica BD**; **backups não evidenciados** no repo.
- **Testes:** 50 unitários passed (mock); integração não executada.

**Prontidão para fase seguinte:** **sim** — Fases E/F/G podem avançar; recomenda-se validação operacional (G) e testes (F) antes de tratar P2 de concorrência/indexação apenas com código estático.
