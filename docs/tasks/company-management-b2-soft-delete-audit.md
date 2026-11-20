# Auditoria B2 — Política de soft delete de empresas

**Data:** 2026-11-18  
**Tipo:** auditoria somente leitura (sem alterações a código, testes ou configuração)  
**Branch no início/fim:** `develop` @ `9d9aee295bae9b614f587f525cfc02057dbddc53`  
**Referências:** [`company-management-audit.md`](./company-management-audit.md), [`company-management-b1-http-isolation-implementation.md`](./company-management-b1-http-isolation-implementation.md)

**Único artefacto criado por esta auditoria:** este ficheiro.  
**Git:** `git diff` vazio em tracked; working tree limpa no fecho; sem commit/branch/push.

---

## 1. Resumo executivo

O SchedulerPro distingue **desactivação operacional** (`isActive: false`, suspensão de staff, bloqueio de módulos via `RequireOperationalCompany`) do **encerramento lógico** (`Company.deletedAt`). O soft delete actual **não valida agendamentos** nem outras dependências: após `DELETE /api/companies/:id`, apenas o documento Company recebe `deletedAt`; clientes, utilizadores, serviços, agendamentos e restantes coleções **permanecem**.

| Aspeto | Conclusão |
|--------|-----------|
| Regras propostas 1–8 | **Parcialmente** alinhadas com o código; várias **não implementadas** (gate por appointments) |
| Regra 5 vs código | **Conflito:** empresa desactivada **não pode** soft delete hoje (403 `RequireOperationalCompany` no DELETE) |
| Regra 6 | **Já satisfeita:** `activate`/`deactivate` usam `findById` com `deletedAt: null` → 404 |
| Regra 3–4 | **Satisfeitas:** sem cascata; histórico preservado |
| Risco principal (P2) | Dados órfãos + `SCHEDULED`/`CONFIRMED` futuros ainda resolvíveis por token após company deleted |
| Corrida (P2) | Delete sem transação com verificação de appointments permite booking entre check e delete |
| Implementação B2 | Recomendada no `CompanyService.delete` com query no `AppointmentRepository` + transação Mongo; HTTP **409** sugerido |

Esta auditoria **não implementa** B2 nem recuperação de empresas (regra 8).

---

## 2. Comportamento actual confirmado

### 2.1 Cadeia HTTP DELETE

| Camada | Evidência |
|--------|-----------|
| Rota | [`CompanyRoutes.ts`](../../server/src/modules/companies/routes/CompanyRoutes.ts) L56-64 — `Auth`, `validateObjectId`, `PasswordChangeMiddleware`, **`RequireOperationalCompany`**, `COMPANY_DELETE`, controller |
| Controller | [`CompanyController.delete`](../../server/src/modules/companies/controllers/CompanyController.ts) L69-72 — delega `CompanyService.delete(id, req.user.companyId)` |
| Service | [`CompanyService.delete`](../../server/src/modules/companies/services/CompanyService.ts) L244-253 — `ensureTenant` → `findById` → `softDelete` |
| Repository | [`CompanyRepository.softDelete`](../../server/src/modules/companies/repositories/CompanyRepository.ts) L168-175 — `findOneAndUpdate({ deletedAt: null }, { deletedAt: new Date() })` — **não** altera `isActive` |

```mermaid
sequenceDiagram
  participant HTTP as DELETE_api_companies_id
  participant Op as RequireOperationalCompany
  participant Svc as CompanyService
  participant Repo as CompanyRepository

  HTTP --> Op
  Op --> Svc
  Svc --> Svc: ensureTenant id eq companyId
  Svc --> Repo: softDelete id apenas
```

### 2.2 Filtros `deletedAt` (Company)

Todas as operações de leitura/mutação “normais” em [`CompanyRepository`](../../server/src/modules/companies/repositories/CompanyRepository.ts) incluem `deletedAt: null` (excepto o próprio `softDelete` que define a data).

### 2.3 Pós-delete (efeitos colaterais observáveis)

| Área | Comportamento |
|------|----------------|
| Login / token refresh | [`AuthService.assertCompanyAllowsAuthentication`](../../server/src/modules/auth/services/AuthService.ts) L363-368 — `companyRepository.findById` → `null` se soft-deleted → [`assertUserMayAuthenticateAgainstCompany`](../../server/src/modules/auth/utils/assert-company-active-for-auth.ts) → **404** `COMPANY_NOT_FOUND` |
| Agendamento público | [`PublicBookingEligibility.requireActiveCompany`](../../server/src/modules/public-booking/services/PublicBookingEligibility.ts) L86-92 — empresa apagada → **404** |
| Job expiração | [`AppointmentExpirationService`](../../server/src/modules/appointments/services/AppointmentExpirationService.ts) — só [`findAllActiveNotDeleted`](../../server/src/modules/companies/repositories/CompanyRepository.ts) empresas; soft-deleted **excluídas** do cancelamento automático de `SCHEDULED` vencidos |
| Dados tenant | Users, clients, appointments, etc. **inalterados** |
| Frontend | [`CompanyPage`](../../client/src/pages/company/CompanyPage.tsx) — logout após DELETE bem-sucedido |

### 2.4 Ativação / desactivação (preservar no B2)

| Operação | Transaction | Efeito em users |
|----------|-------------|-----------------|
| `deactivate` | [`withCompanyLifecycleTransaction`](../../server/src/modules/companies/services/company-lifecycle-transaction.ts) | [`suspendActiveNonOwnerStaffForCompanyDeactivation`](../../server/src/modules/users/repositories/UserRepository.ts) L197-218 |
| `activate` | Idem | [`restoreUsersSuspendedByCompanyDeactivation`](../../server/src/modules/users/repositories/UserRepository.ts) L223-238 |

**Não monta** `RequireOperationalCompany` em `activate` (OWNER pode reactivar empresa inactiva).  
**Monta** em `deactivate` e `DELETE` (e PATCH/update operacional).

### 2.5 Reativação de empresa soft-deleted

`activate` / `deactivate` chamam `CompanyRepository.findById` → documento com `deletedAt` **não** devolvido → **404**. Fluxo normal de activação **não** recupera empresa eliminada (regra 6).

### 2.6 Inconsistência `isActive` + `deletedAt`

Soft delete **não** põe `isActive: false`. Na API a empresa desaparece; na BD pode ficar `{ isActive: true, deletedAt: <date> }`. Risco **P3** (higiene de dados / relatórios directos à BD).

---

## 3. Entidades e relações identificadas

Persistência por `companyId` (modelos principais):

| Entidade | Model | `companyId` | Soft delete próprio | Consulta histórica | Efeito se Company soft-delete |
|----------|-------|-------------|---------------------|--------------------|-------------------------------|
| Company | `Company.model.ts` | — (é o tenant) | `deletedAt` | Não via API | N/A |
| User | `User.model.ts` | Sim, indexado | `deletedAt` | Sim (repo com filtros) | Permanece; OWNER não autentica |
| Client | `Client.model.ts` | Sim | `deletedAt` | Sim | Permanece |
| Service | `Service.model.ts` | Sim | `deletedAt` | Sim | Permanece |
| Appointment | `Appointment.model.ts` | Sim, indexado | `deletedAt` | Sim (`findByCompanyId` filtra) | Permanece; **pode** ter SCHEDULED/CONFIRMED futuros |
| Notification | `Notification.model.ts` | Sim | **Sem** `deletedAt` no schema | Por `companyId` + `userId` | Permanece |
| EmployeeAvailability | `EmployeeAvailability.model.ts` | Sim | `deletedAt` | Sim | Permanece |
| AvailabilityException | `AvailabilityException.model.ts` | Sim | `deletedAt` | Sim | Permanece |
| ClientInvite | `ClientInvite.model.ts` | Sim | Sem soft delete global; `revokedAt`/`usedAt` | Por `clientId`/`companyId` | Permanece |

**Módulos agregadores (sem collection tenant própria):** `dashboard`, `reports` — queries scoped por `req.user.companyId` / repositórios; não há cascata ao apagar Company.

**Estratégia actual de exclusão Company:** uma única escrita `deletedAt` — **sem** exclusão em cascata (regra 4 satisfeita).

---

## 4. Análise dos estados dos agendamentos

### 4.1 Estados (`AppointmentStatus`)

Definidos em [`appointment-status.ts`](../../server/src/constants/appointment-status.ts):

| Status | Valor | Papel |
|--------|-------|-------|
| SCHEDULED | `scheduled` | Default no schema; pode ser auto-cancelado se vencido |
| CONFIRMED | `confirmed` | Bloqueia horário em conflitos |
| COMPLETED | `completed` | Histórico |
| CANCELLED | `cancelled` | Histórico / expiração |
| NO_SHOW | `no-show` | Histórico terminal |

### 4.2 Temporalidade

- Campos: `startAt`, `endAt` (**UTC** `Date` no MongoDB).
- Listagens/filtros: janela por sobreposição documentada em [`AppointmentRepository`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) L21-29 (`findByCompanyId` com `range`).
- Timezone da empresa: usado na **criação/validação** de slots (frontend converte para UTC); comparações de “agora” em jobs usam `Date` do servidor (`cancelOverdueScheduled(companyId, now)`).

### 4.3 Definição canónica “bloqueia horário” (código existente)

Em `hasEmployeeConflict`, `findBlockingForEmployee`, etc. ([`AppointmentRepository`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) L287-300, L341-354):

- `deletedAt: null`
- `status ∈ { SCHEDULED, CONFIRMED }`
- Sobreposição: `startAt < windowEnd && endAt > windowStart`

### 4.4 “Futuro” vs “em andamento” vs “histórico”

| Conceito | Definição recomendada para B2 (alinhada ao domínio) | Notas |
|----------|------------------------------------------------------|-------|
| **Futuro** | `endAt > now` e status `SCHEDULED` ou `CONFIRMED` | Inclui slot ainda não iniciado |
| **Em andamento** | `startAt ≤ now < endAt` e status `SCHEDULED` ou `CONFIRMED` | Não existe status “in_progress”; **não** usar só `startAt` |
| **Histórico / fechado** | `COMPLETED`, `CANCELLED`, `NO_SHOW` | Não entra em conflitos |
| **SCHEDULED vencido** | `status=SCHEDULED` e `startAt < now` | Job [`cancelOverdueScheduled`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) L527-541 cancela; **até lá** ainda é “aberto” na política de bloqueio se não cancelado |

**Impeditivo proposto (regra 1):** existe ≥1 appointment com `deletedAt: null`, status ∈ `{SCHEDULED, CONFIRMED}`, e **`endAt > now`** (cobre futuro e em andamento).

### 4.5 Inconsistências / bordas

| Caso | Risco |
|------|-------|
| `CONFIRMED` com `endAt <= now` sem transição a `COMPLETED` | Pode permanecer “aberto” indefinidamente face a `endAt > now` false — **decisão funcional** se conta como histórico |
| Appointment soft-deleted | Ignorado em conflitos (`deletedAt: null`) |
| Token público | [`findByPublicAccessTokenHash`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts) L107-114 — appointment soft-deleted → null; empresa apagada não impede documento appointment se não houver gate |

---

## 5. Riscos técnicos e funcionais

| ID | Risco | Prioridade | Evidência |
|----|-------|------------|-----------|
| R1 | Delete permitido com appointments abertos | P2 | `CompanyService.delete` sem query appointments |
| R2 | Corrida: novo booking após check e antes de `softDelete` | P2 | Delete sem `session` partilhada com criação |
| R3 | `SCHEDULED` vencidos não cancelados após company deleted (job ignora tenant) | P2 | `findAllActiveNotDeleted` |
| R4 | Dados órfãos (users com `companyId` válido, company invisível) | P2 | Sem cascata — regra 3 intencional |
| R5 | `isActive` true + `deletedAt` set na BD | P3 | `softDelete` não altera `isActive` |
| R6 | Links públicos / tokens de appointments existentes | P2 | Appointment continua na BD |
| R7 | Cross-tenant delete | Mitigado | `ensureTenant` + testes B1 |

Nenhuma vulnerabilidade P0/P1 de IDOR no delete (coberto em B1).

---

## 6. Regras de negócio recomendadas

Ajustes às 8 regras propostas após confronto com o código:

| # | Regra | Recomendação |
|---|-------|--------------|
| 1 | Bloquear delete com appointments futuros/em curso | **Adoptar** com predicado: `status ∈ {SCHEDULED, CONFIRMED}`, `deletedAt: null`, **`endAt > now`** (UTC de referência documentada) |
| 2 | Permitir delete se só histórico | **Adoptar** — implícito na regra 1 |
| 3 | Preservar clientes, staff, serviços, histórico | **Manter** — sem cascata |
| 4 | Sem exclusão em cascata | **Manter** |
| 5 | Empresa desactivada pode soft delete | **Rever produto:** hoje **403** por `RequireOperationalCompany` no DELETE. Opções: (a) remover middleware só do DELETE; (b) exigir reactivação antes do delete; (c) permitir delete inactivo mas manter gate appointments |
| 6 | Soft-deleted não reactivar via activate | **Manter** (já assim) |
| 7 | Não alterar activate/deactivate | **Manter** no B2 |
| 8 | Sem restore nesta fase | **Manter** |

**Desactivação vs encerramento:** documentar para utilizadores que desactivar **não** apaga dados; soft delete **encerra** o tenant na aplicação mas **não** apaga histórico.

---

## 7. Estratégia técnica recomendada (implementação futura)

### 7.1 Camada de regra

1. Novo método em [`AppointmentRepository`](../../server/src/modules/appointments/repositories/AppointmentRepository.ts), por exemplo `hasOpenAppointmentsForCompany(companyId, now)`:
   ```text
   { companyId, deletedAt: null, status: { $in: [SCHEDULED, CONFIRMED] }, endAt: { $gt: now } }
   ```
2. Em [`CompanyService.delete`](../../server/src/modules/companies/services/CompanyService.ts), **antes** de `softDelete`:
   - Se predicate true → `AppError` com HTTP **409 Conflict** (ou 422 — decisão sec. 11) e mensagem em [`http-messages`](../../server/src/constants/http-messages.ts).
3. **Transação** (`mongoose.startSession`):
   - Opcional mas recomendado: re-check appointments + `softDelete` no mesmo `session` para mitigar R2.

### 7.2 O que não mudar no B2

- `activate` / `deactivate` / suspensão de staff.
- Assinaturas públicas de rotas (excepto novo código de erro).
- Cascata ou hard delete de entidades filhas.

### 7.3 Middleware DELETE

Se regra 5 for “delete em empresa inactiva”:

- Remover `RequireOperationalCompany` **apenas** de `DELETE /:id`, **ou**
- Documentar que OWNER deve reactivar primeiro (mantém código actual).

### 7.4 Frontend

- Tratar **409** na zona perigosa ([`company.api.ts`](../../client/src/api/endpoints/company.api.ts) / `CompanyPage`) com mensagem explícita (lista appointments em aberto).

### 7.5 Timezone de `now`

- **Recomendado:** usar `Date` UTC no servidor de forma consistente com `cancelOverdueScheduled` (já usa `now` único).
- Alternativa (mais precisa): instante “agora” na timezone da empresa — só se produto exigir alinhamento com UI.

---

## 8. Ficheiros que provavelmente precisarão de alteração

| Ficheiro | Alteração provável |
|----------|-------------------|
| `server/src/modules/companies/services/CompanyService.ts` | Gate + transação |
| `server/src/modules/appointments/repositories/AppointmentRepository.ts` | Query `hasOpenAppointments…` |
| `server/src/constants/http-messages.ts` | Mensagem COMPANY_DELETE_BLOCKED_APPOINTMENTS |
| `server/src/modules/companies/routes/CompanyRoutes.ts` | Opcional: middleware DELETE |
| `client/src/api/errors.ts` / `CompanyPage.tsx` | UX 409 |
| `server/tests/unit/companies/CompanyService.*.test.ts` | Novos casos |
| `server/tests/integration/routes/multi-tenant-companies.routes.test.ts` | HTTP 409 |
| `server/tests/integration/appointments/*.mongo.test.ts` | Opcional cenário real Mongo |

**Não obrigatório:** alterar `CompanyRepository.softDelete` (pode opcionalmente set `isActive: false` — decisão separada, P3).

---

## 9. Testes necessários (futuro)

| Tipo | Cenário |
|------|---------|
| Unit `CompanyService.delete` | Com mock appointment repo: open → 409, só histórico → softDelete; cross-tenant inalterado |
| Unit `AppointmentRepository` | Query open vs completed/cancelled; `endAt` boundary |
| Integration HTTP | OWNER DELETE com appointment CONFIRMED futuro → 409; só COMPLETED → 200 |
| Integration HTTP | Empresa inactiva + DELETE (conforme decisão regra 5) |
| Mongo (opcional) | Transação: criar appointment entre check sem session → deve falhar com session |
| Regressão | B1 cross-tenant; lifecycle activate/deactivate inalterados |

**Cobertura actual (sem gate):**

- `CompanyService.behavior.test.ts` — delete sem appointments
- `CompanyService.isolation.test.ts` — tenant
- `multi-tenant-companies.routes.test.ts` — DELETE 200 mock
- **Ausente:** bloqueio por appointments, activate pós-deleted (implícito via findById null)

---

## 10. Critérios de aceitação (implementação B2)

1. `DELETE /api/companies/:id` devolve **409** (ou código acordado) quando existir appointment `SCHEDULED` ou `CONFIRMED` com `endAt > now` e `deletedAt: null` do mesmo `companyId`.
2. Delete com **apenas** appointments `COMPLETED` / `CANCELLED` / `NO_SHOW` (ou `endAt ≤ now` se política incluir) **sucede** e define `deletedAt` na Company.
3. **Nenhuma** entidade filha é apagada ou soft-deleted em cascata.
4. `activate` / `deactivate` comportam-se como antes para empresas **não** eliminadas.
5. Empresa com `deletedAt` **não** pode `activate` (regressão 404).
6. Testes unitários + integração HTTP cobrem 409 e happy path.
7. Isolamento multi-tenant no delete **mantido** (404 cross-tenant).
8. Documentação de mensagem HTTP e UX frontend para o bloqueio.

---

## 11. Questões que dependem de decisão funcional

| # | Questão | Opções |
|---|---------|--------|
| Q1 | Definição exacta “em andamento” | A) `endAt > now` + SCHEDULED/CONFIRMED; B) acrescentar transição automática CONFIRMED→COMPLETED após `endAt` |
| Q2 | `SCHEDULED` com `startAt < now` antes do job cancelar | Bloquear delete? (recomendado **sim**, alinhado a regra 1) |
| Q3 | `CONFIRMED` após `endAt` sem `COMPLETED` | Tratar como aberto ou histórico? |
| Q4 | Delete com empresa **desactivada** (`isActive: false`) | Manter 403 actual, remover middleware no DELETE, ou fluxo “reactivar → apagar” |
| Q5 | Código HTTP do bloqueio | **409 Conflict** vs **422 Unprocessable** |
| Q6 | Referência temporal `now` | UTC servidor vs “agora” na timezone da empresa |
| Q7 | Pós-delete: cancelar appointments abertos automaticamente? | Fora do B2 se regra 1 bloqueia antes; senão política de limpeza separada |
| Q8 | Ajustar `isActive` no soft delete? | Higiene BD vs comportamento actual |

---

## Anexo — Mapeamento regras propostas vs código

| # | Proposta | Estado no código (`develop` @ 9d9aee) |
|---|----------|--------------------------------------|
| 1 | Sem delete com appointments futuros/em curso | **Não implementado** |
| 2 | Só histórico → OK | **Permitido** (sem validação) |
| 3 | Preservar entidades | **Sim** |
| 4 | Sem cascata | **Sim** |
| 5 | Desactivada pode delete | **Conflito** — DELETE exige empresa operacional |
| 6 | Soft-deleted não reactivar | **Sim** |
| 7 | Manter activate/deactivate | **Sim** (inalterados no audit) |
| 8 | Sem restore | **Sim** (ausente) |

---

*Auditoria concluída. Nenhum ficheiro fora de `docs/tasks/company-management-b2-soft-delete-audit.md` foi criado ou modificado.*