# SchedulerPro — Auditoria Técnica Global | Fase F — Testes e Fiabilidade

**Data:** 24/10/2026  
**Modo:** Read-only (sem alterações a código, testes, dependências, configuração ou histórico Git)

**Relatórios de referência (preservados, não alterados):**

- [`schedulerpro-global-technical-audit.md`](schedulerpro-global-technical-audit.md)
- [`schedulerpro-global-technical-audit-phase-c.md`](schedulerpro-global-technical-audit-phase-c.md)
- [`schedulerpro-global-technical-audit-phase-c1.md`](schedulerpro-global-technical-audit-phase-c1.md)
- [`schedulerpro-global-technical-audit-phase-d.md`](schedulerpro-global-technical-audit-phase-d.md)

---

## 1. Objetivo e âmbito

Auditar a qualidade, cobertura e fiabilidade dos testes do monorepo SchedulerPro (API Node/Express + frontend React/Vitest), identificando lacunas, padrões de mock, riscos de regressão e ausência de validação de cenários críticos (incluindo concorrência e isolamento HTTP multi-tenant).

**Não** foram implementadas correções, novos testes ou alterações de configuração.

---

## 2. Baseline Git observado

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `d9f2aeaabc05a34509f77499695dfcf935921b51` |
| Remote | `develop...origin/develop` (sem ahead/behind reportado) |
| vs Fases C.1 / D | **Igual** |

---

## 3. Estado do working tree

### 3.1 Inicial (início da Fase F)

- Código rastreado: **limpo** (sem modificações em ficheiros versionados).
- Não rastreados: relatórios de auditoria em `docs/reports/schedulerpro-global-technical-audit*.md` (4 ficheiros antes desta fase).

### 3.2 Final (após relatório)

- Esperado: apenas adição de **este** ficheiro como `?? docs/reports/schedulerpro-phase-f-test-reliability-audit.md`.
- Código e testes: **sem alterações** (confirmado na secção 13).

---

## 4. Inventário dos testes (F1)

### 4.1 Frameworks e scripts

| Pacote | Runner | Configuração | Scripts npm |
|--------|--------|--------------|-------------|
| [`server/`](../../server/) | Vitest **4.1.11** | [`server/vitest.config.ts`](../../server/vitest.config.ts) — `environment: node`, `setupFiles: [tests/setup.ts]`, `clearMocks: true`, **`restoreMocks: true`**, `include: tests/**/*.test.ts` | `test`, `test:watch`, `test:coverage` |
| [`client/`](../../client/) | Vitest **4.1.11** + jsdom | [`client/vite.config.ts`](../../client/vite.config.ts) — `globals: true`, `setupFiles: [src/test/setup.ts]`, `pool: threads`, `maxWorkers: 3`, bloco `coverage` v8 | idem |

**Supertest** (server devDependency): usado nos testes de integração HTTP.

**E2E:** não há Playwright, Cypress nem pasta `e2e` com suíte automatizada.

### 4.2 Contagem de ficheiros

| Tipo | Quantidade | Localização |
|------|------------|-------------|
| Testes client | **128** ficheiros | `client/src/**/*.test.ts`, `*.test.tsx` |
| Testes server — total | **81** ficheiros | `server/tests/**/*.test.ts` |
| Server — integração HTTP | **14** ficheiros | `server/tests/integration/**` |
| Server — unitários (aprox.) | **67** ficheiros | `server/tests/unit/**` |

### 4.3 Classificação

| Categoria | Descrição |
|-----------|-----------|
| **Unitário (server)** | Services, repositories, middlewares, validators; modelos Mongoose frequentemente mockados com `vi.mock`. |
| **Integração HTTP (server)** | `supertest` + app Express parcial ou router; **repositórios e por vezes rate-limit middleware mockados** — não usa MongoDB real. |
| **Componente / hook / página (client)** | `@testing-library/react`, mocks de API (axios/RTK), jsdom. |
| **Contrato API (client)** | `*.api.test.ts` — formas de pedido/resposta, muitas vezes sem backend. |

### 4.4 Testes ignorados / condicionais

- **Nenhum** `describe.skip`, `it.skip` ou `test.skip` encontrado na suíte (grep em `*.test.ts(x)`).
- O domínio de lembretes usa propriedade `summary.skipped` (contagem de negócio), não skip do Vitest.

### 4.5 Cobertura de código

- Ambos os pacotes declaram `@vitest/coverage-v8` e script `test:coverage`.
- Client: `coverage.include` = `src/**/*.{ts,tsx}` com exclusões (`main.tsx`, `types`, `test`).
- **Não executado nesta fase** — evita gerar diretório `coverage/` e alterar o working tree. **Não** foram inventadas métricas de percentagem.

### 4.6 CI / pipeline

- **Nenhum** ficheiro `.github/workflows/*` nem outro `.yml` de CI no repositório.
- Execução de testes em PR/merge: **não verificável** a partir do repo (pode existir fora do Git).

### 4.7 Base de dados nos testes

- Grep em `server/tests`: **sem** `mongoose.connect`, `MONGO_URI` ou MongoMemoryServer.
- [`server/tests/setup.ts`](../../server/tests/setup.ts): apenas variáveis de criptografia de token público para testes.
- Conclusão: suíte server **não escreve** em MongoDB durante os testes executados.

### 4.8 Lista dos 14 ficheiros de integração server

| Ficheiro | Foco principal |
|----------|----------------|
| `integration/public-booking.routes.test.ts` | Catálogo público, cross-tenant 404 |
| `integration/public-appointment.routes.test.ts` | Criação pública |
| `integration/public-appointment-link.routes.test.ts` | Link token GET/PATCH/DELETE |
| `integration/public-appointment.rate-limit.test.ts` | Rate limit criação |
| `integration/public-appointment-link.rate-limit.test.ts` | Rate limit link |
| `integration/public-catalog-rate-limit.test.ts` | Rate limit catálogo |
| `integration/availability-appointment.routes.test.ts` | Disponibilidade + appointments admin, cross-tenant |
| `integration/availability-exception.routes.test.ts` | Exceções |
| `integration/client-invite.routes.test.ts` | Convites autenticados |
| `integration/client-invite-public.routes.test.ts` | Aceite público convite |
| `integration/routes/report.routes.test.ts` | Relatórios HTTP |
| `integration/routes/notification.routes.test.ts` | Notificações HTTP |
| `integration/routes/object-id.routes.test.ts` | Validação ObjectId |
| `integration/users/create-user.route.test.ts` | Ordem middleware upload (mocks pesados) |

---

## 5. Metodologia e comandos executados (F6)

1. Inspeção estática de configs, inventário de ficheiros, grep por skips/Mongo/CI.
2. Leitura de testes representativos (integração com `vi.hoisted` mocks, conflitos, auth).
3. Execução Vitest **sem** `--coverage` e **sem** `npm install`.

### 5.1 Comandos

```bash
# Baseline
git branch --show-current && git rev-parse HEAD && git status -sb

# Server — suíte completa
cd server && npm run test

# Subconjunto referência Fase D (6 ficheiros)
cd server && npm run test -- --run \
  tests/unit/repositories/appointment-conflicts.test.ts \
  tests/unit/repositories/appointment-reminders.test.ts \
  tests/unit/repositories/appointment-public-token.schema.test.ts \
  tests/unit/appointments/AppointmentService.test.ts \
  tests/unit/reports/ReportRepository.test.ts \
  tests/unit/notifications/NotificationRepository.test.ts

# Client — suíte completa
cd client && npm run test
```

### 5.2 Pré-requisitos

- Node conforme `server/package.json` (`engines.node >= 22`).
- Dependências já instaladas em `node_modules` (não reinstaladas).

---

## 6. Resultados reais dos testes

| Execução | Ficheiros | Testes | Falhas | Ignorados | Duração | Exit code |
|----------|-----------|--------|--------|-----------|---------|-----------|
| Server completo | 81 | **1232** | **0** | 0 | ~99.8 s | 0 |
| Server subset Fase D (6 ficheiros) | 6 | **50** | **0** | 0 | ~5.8 s | 0 |
| Client completo | 128 | **1376** | **0** | 0 | ~377.9 s | 0 |
| **Total executado** | **209** | **2608** | **0** | **0** | ~483 s | 0 |

### 6.1 Avisos do runner

- Server: aviso Vite `configLoader: 'native'` / `vitest.config.ts` ESM vs CommonJS — **não** afeta resultado (todos passed).
- npm: aviso `Unknown env config "devdir"` no ambiente local — irrelevante para asserções.

### 6.2 Referência histórica vs resultado atual

| Referência | Valor histórico | Fase F |
|------------|-----------------|--------|
| Fase D (6 ficheiros mockados) | 50 passed | **Confirmado** — 50/50 |
| Fase A / AUD-INV-002 (client) | 1376 testes citados | **Confirmado** — 1376/1376 |
| Stage 32 — 4 falhas Dashboard/Reports | Documentado como preexistente | **Não reproduzido** — suíte completa client passou |
| Stage 31 — 6 falhas PublicBooking (datas) | Documentado | **Não reproduzido** na suíte completa |

**Nota:** ausência de falhas **não** elimina lacunas de cobertura nem riscos de concorrência; apenas confirma que, neste ambiente e data, a suíte existente está verde.

### 6.3 Não executado

- `npm run test:coverage` (server e client).
- Testes contra API ou MongoDB reais.
- Subconjunto isolado Dashboard/Reports/PublicBooking (redundante após suíte completa verde).

---

## 7. Matriz de cobertura dos fluxos críticos (F2)

Legenda: **Forte** = comportamento/status assertado de forma significativa; **Parcial** = mocks ou só uma camada; **Lacuna** = sem teste adequado ao risco.

| Fluxo | Cobertura | Evidência | O que **não** é validado |
|-------|-----------|-----------|---------------------------|
| Registo | Parcial | `AuthService.test.ts` (register), validators | HTTP `POST /api/auth/register`, cookies |
| Login | Parcial | `AuthService.test.ts`, `auth.middleware.test.ts`, `LoginPage.test.tsx` | HTTP login, rate limit |
| Refresh / logout | Parcial | `AuthService` (refresh preserva sessão, logout revoga), `authSlice` | HTTP `/refresh`; rotação de refresh token |
| Forgot / reset password | Parcial | `AuthService` forgot/reset | HTTP; e-mail real |
| `changePassword` | Lacuna | Integração mock stub em `create-user.route.test.ts` apenas | `UserService.changePassword`, revogação sessões (AUD-SEC-002) |
| JWT + sessão | Forte (unit) | `SessionService.test.ts`, `token-expiration.test.ts` | — |
| RBAC / permissions | Forte (unit) | `permission.middleware.test.ts`, `UserService.role-authorization.test.ts`, `clientPermissions.test.ts` | Todas as rotas × todas as roles |
| Multi-tenant users/services **HTTP** | Lacuna | `UserService.behavior.test.ts` (unit 403) | `GET/PATCH/DELETE /api/users/:id`, `/api/services/:id` cross-tenant (AUD-SEC-008) |
| Multi-tenant appointments/availability HTTP | Forte (mock) | `availability-appointment.routes.test.ts` | Queries MongoDB reais |
| Clientes / convites | Forte–Parcial | `ClientService.*`, `client-invite*.routes.test.ts`, `ClientsPage.test.tsx` | — |
| Serviços admin (API) | Parcial | `ServicesPage.test.tsx`, `ServiceForm.test.tsx` | **Sem** `ServiceService` no server/tests |
| Disponibilidade / exceções | Forte | `AvailabilityService.test.ts`, `availability-exception.routes.test.ts` | — |
| Conflitos employee/client | Parcial | `appointment-conflicts.test.ts` (formato query) | `AppointmentService.schedule` end-to-end; **concorrência** |
| Booking / appointments públicos | Forte | `public-booking.routes.test.ts`, `AppointmentService.public*.test.ts`, client booking | — |
| Rate limit público | Parcial | 3 ficheiros `public-*-rate-limit.test.ts` | Auth endpoints (AUD-SEC-003) |
| Notificações | Forte–Parcial | `NotificationService/Repository`, `notification.routes.test.ts`, dispatcher tests | Fan-out com BD |
| Lembretes / idempotência | Forte (unit) | `ReminderService.test.ts`, `appointment-reminders.test.ts` (claim condicional) | Job scheduler com BD |
| Relatórios | Forte–Parcial | `ReportRepository/Service`, `report.routes.test.ts`, `ReportsPage.test.tsx` | Agregações em volume real |
| Erros / envelope API | Parcial | `api-contract.status.test.ts`, `api/errors.test.ts` | Todos os códigos de erro |
| Concorrência double-booking | Lacuna | — | Paralelismo (AUD-DATA-001) |
| E2E browser | Lacuna | — | Fluxos completos UI+API |

---

## 8. Análise de qualidade dos testes (F3)

### 8.1 Pontos fortes

- Volume elevado e **suíte verde** no ambiente auditado (2608 testes).
- Testes de timezone, ISO instant e validadores alinhados a regras de negócio críticas.
- Integração HTTP cobre muitos cenários de status, permissões simuladas e cross-tenant em appointments/booking público.
- Lembretes: testes do **lease** (`claimReminder`) validam condições de `updateOne`, boa prática para idempotência.

### 8.2 Riscos de qualidade / falsos conforto

| Risco | Evidência | Impacto |
|-------|-----------|---------|
| Repos mockados na integração | Padrão em `availability-appointment.routes.test.ts` (repos `vi.fn`) | Services rodam, mas **queries e índices MongoDB** não são exercidos — regressões no repository podem passar |
| `appointment-conflicts.test.ts` | Asserta objeto passado a `Appointment.findOne` mock | Não garante que duas reservas sequenciais falham no service |
| `restoreMocks: true` | `server/vitest.config.ts` | Testes de rate limit usam contadores em vez de `vi.fn` (documentado em reports Stage 31) — fragilidade se mocks não reinicializados |
| Client `maxWorkers: 3` | `vite.config.ts` | Possível flakiness com estado global; **não observada** nesta execução (0 falhas) |
| Auth refresh “preserva sessão” | `AuthService.test.ts` | Documenta desenho atual; **não** é teste de segurança de rotação |

### 8.3 Asserções

- Maioria dos testes unitários usa `expect(...).rejects.toMatchObject({ statusCode })` ou igualdade estrutural — **adequado**.
- Alguns testes de integração verificam sobretudo status HTTP e mensagens — **aceitável** para contrato, insuficiente para integridade de dados.

---

## 9. Lacunas de concorrência, integração e regressão (F4 / F5)

### 9.1 Concorrência (F4)

Relacionamento com Fase D:

- **AUD-DATA-001:** TOCTOU em `AppointmentService.schedule` (check conflito + `create` sem transação) — **não** coberto por teste paralelo.
- **AUD-DATA-010:** lacuna de testes de concorrência — **confirmada**.

**Contrast:** `appointment-reminders.test.ts` e `ReminderService.test.ts` cobrem concorrência lógica de lembretes via lease.

**Estado:** concorrência de agendamentos **não validada** por testes (apenas análise estática Fase D + inspeção Fase F).

### 9.2 Integração HTTP (F5)

- **14** ficheiros exercitam rotas reais com supertest; **auth middleware** frequentemente substituído por inject de `req.user`.
- **Lacunas confirmadas:** `/api/auth/*`, admin `/api/services`, cross-tenant HTTP users/services, rate limit em auth.
- **Segurança da execução:** integração não conecta a MongoDB; execução da suíte server considerada **segura** nesta auditoria.

### 9.3 Regressão

- Histórico AUD-INV-002 (falhas Dashboard/Reports/PublicBooking): **não reproduzido** em 24/10/2026 — atualizar backlog: tratar como **resolvido no develop atual** até nova falha, sem apagar a nota histórica dos relatórios antigos.

---

## 10. Achados classificados (AUD-TEST)

| ID | Título | Estado | Sev. | Prio | Impacto / prob. |
|----|--------|--------|------|------|-----------------|
| AUD-TEST-001 | Ausência de testes de concorrência para double-booking | Confirmado (lacuna) | Alta | P2 | Média/alta em pico de reservas |
| AUD-TEST-002 | Sem testes HTTP de `/api/auth/*` | Confirmado (lacuna) | Média | P2 | Regressões auth/cookies |
| AUD-TEST-003 | Lacuna HTTP cross-tenant users/services admin | Confirmado (lacuna) | Média | P2 | Alinhado AUD-SEC-008 |
| AUD-TEST-004 | Integração HTTP com repositórios mockados | Confirmado | Média | P2 | Regressões em queries BD |
| AUD-TEST-005 | Sem pipeline CI no repositório | Confirmado | Média | P2 | Risco de merge sem testes |
| AUD-TEST-006 | Falhas históricas client Dashboard/Reports/PublicBooking | **Não reproduzido** (suíte verde) | — | Informativa | AUD-INV-002 desatualizado no HEAD atual |
| AUD-TEST-007 | Sem suíte E2E browser | Confirmado (lacuna) | Baixa | P3 | Regressões UI integradas |
| AUD-TEST-008 | Sem testes `UserService.changePassword` / sessões | Confirmado (lacuna) | Média | P2 | AUD-SEC-002 |
| AUD-TEST-009 | Rate limiting auth não testado | Confirmado (lacuna) | Média | P2 | AUD-SEC-003 |
| AUD-TEST-010 | `ServiceService` sem ficheiro de teste no server | Confirmado (lacuna) | Baixa | P3 | Lógica tenant só indireta |

### 10.1 Evidências e critérios de aceitação (resumo)

**AUD-TEST-001** — Evidência: ausência de `Promise.all`/`parallel` em `server/tests` para create appointment; Fase D AUD-DATA-001.  
**Aceitação:** teste (staging/testcontainers) com duas requisições concorrentes no mesmo slot → exatamente uma 409.

**AUD-TEST-002** — Evidência: grep sem `AuthRoutes` em integration tests.  
**Aceitação:** supertest contra app com auth real (ou semi-real) validando cookies e 401/403.

**AUD-TEST-003** — Evidência: só `UserService.behavior.test.ts`; C.1 matriz HTTP vazia para services.  
**Aceitação:** casos company A → resource id company B → 403 ou 404 conforme política.

**AUD-TEST-004** — Evidência: padrão mock em `availability-appointment.routes.test.ts` L19–50.  
**Aceitação:** pelo menos um fluxo crítico com MongoMemoryServer ou testcontainers sem mock de repository.

**AUD-TEST-005** — Evidência: zero `.github/workflows`.  
**Aceitação:** workflow que executa `npm test` em server e client em PR.

**AUD-TEST-008** — Evidência: grep `changePassword` só em `AuthService` reset e stub route test.  
**Aceitação:** unit tests que após changePassword sessões antigas falham em refresh (quando produto exigir).

**AUD-TEST-009** — Evidência: rate limit tests só em rotas públicas.  
**Aceitação:** teste que 429 após N tentativas em `/api/auth/login` (mock store).

---

## 11. Limitações e verificações não executadas

- Métricas de cobertura (`test:coverage`) — não corridas.
- CI externo (GitHub Actions noutro repo, Jenkins, etc.) — não verificável.
- Flakiness estatística (múltiplas execuções client) — uma única execução completa.
- Testes que dependem de credenciais Cloudinary/Resend reais — assumidos mockados (`ResendProvider.test.ts`, etc.).
- Validação de que nenhum teste futuro importa `server.ts` com connect — apenas grep estático nesta fase.

---

## 12. Recomendações e próximos passos

1. **Prioridade P2 (testes):** AUD-TEST-001, 002, 003, 008, 009 — alinhar com backlog segurança (SEC) e dados (DATA).
2. **Infra (Fase G):** AUD-TEST-005 — adicionar CI mínimo no repo; health + test gate.
3. **Não confundir** suíte verde com cobertura de riscos TOCTOU ou HTTP auth.
4. **Opcional P3:** E2E smoke (Playwright) para login + criar appointment; `ServiceService` unit.

**Decisão de implementação:** pertence ao utilizador; esta fase não alterou código.

---

## 13. Conclusão

- **Fiabilidade da suíte atual (HEAD `d9f2aea`, ambiente local 24/10/2026):** **alta** — 2608 testes, 0 falhas.
- **Adequação aos riscos críticos de produto:** **parcial** — lacunas importantes em concorrência, auth HTTP, cross-tenant admin HTTP e testes sem BD real na integração.
- **Pronto para Fase G (infra/CI)?** **Sim**, com recomendação forte de endereçar AUD-TEST-005 e revisitar AUD-INV-002 no relatório global quando autorizado.

---

## 14. Contexto para continuidade (outra IA / sessão)

| Item | Detalhe |
|------|---------|
| Comandos verdes | `cd server && npm run test` → 1232 tests; `cd client && npm run test` → 1376 tests |
| Padrão integração | `vi.hoisted` repos + mock `auth.middleware` → `req.user` |
| Server setup | `server/tests/setup.ts` — encryption keys only |
| Client setup | `client/src/test/setup.ts` — jest-dom + URL blob shim |
| Ficheiros-chave auth | `server/tests/unit/auth/AuthService.test.ts`, `auth.middleware.test.ts` |
| Conflitos | `server/tests/unit/repositories/appointment-conflicts.test.ts` (query only) |
| Cross-tenant HTTP forte | `availability-appointment.routes.test.ts`, `public-booking.routes.test.ts` |
| Sem testes | `ServiceService`, HTTP `/api/auth`, `UserService.changePassword` |
| Fase D link | AUD-DATA-001, AUD-DATA-010 |
| Fase C.1 link | AUD-SEC-008, AUD-SEC-003, AUD-SEC-002 |

---

## Verificação read-only (checklist)

| Verificação | Resultado |
|-------------|-----------|
| Código de produção alterado | **Não** |
| Testes ou configs alterados | **Não** |
| Dependências / lockfiles alterados | **Não** |
| Relatórios anteriores alterados | **Não** |
| `test:coverage` / artefactos coverage | **Não executado** |
| Commits / git write operations | **Não** |
| Novo relatório | `docs/reports/schedulerpro-phase-f-test-reliability-audit.md` |

*Estado Git final: executar `git status` após criação deste ficheiro — esperado `??` apenas para relatórios de auditoria não commitados.*
