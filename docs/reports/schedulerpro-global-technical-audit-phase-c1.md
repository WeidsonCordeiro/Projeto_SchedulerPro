# SchedulerPro — Auditoria Técnica Global | Fase C.1 — Validação dirigida dos achados de segurança

**Data:** 24/10/2026  
**Modo:** Read-only (sem alterações a código, config, dependências, testes, dados ou Git)  
**Relatórios de referência:**

- Global (Fases A–C): [`schedulerpro-global-technical-audit.md`](schedulerpro-global-technical-audit.md) — **não alterado nesta execução** (consolidação pendente de etapa autorizada).
- Fase C: [`schedulerpro-global-technical-audit-phase-c.md`](schedulerpro-global-technical-audit-phase-c.md).

---

## 1. Objetivo e âmbito

Validar de forma dirigida os achados **AUD-SEC-001** a **AUD-SEC-008** identificados na Fase C, determinando para cada um:

- Confirmação por código e evidências disponíveis.
- Vulnerabilidade efetiva vs risco potencial vs lacuna de testes.
- Impacto, probabilidade e prioridade reavaliados.
- Critérios objetivos de aceitação para uma futura fase de correções.

**Fora de âmbito:** implementação de correções, alteração do relatório global, acesso a produção, brute force, fuzzing agressivo ou operações que possam bloquear contas.

---

## 2. Baseline Git e estado do working tree

| Item | Valor Fase C | Valor Fase C.1 | Notas |
|------|----------------|----------------|--------|
| Branch | `develop` | `develop` | Mantida durante a auditoria |
| HEAD | `d9f2aeaabc05a34509f77499695dfcf935921b51` | `d9f2aeaabc05a34509f77499695dfcf935921b51` | **Igual** à Fase C |
| Remote | — | `develop...origin/develop` (sem ahead/behind reportado) | |
| Working tree (app) | Limpo | Limpo | Sem modificações rastreadas em código |
| Ficheiros não rastreados | Relatórios de auditoria | `?? docs/reports/schedulerpro-global-technical-audit.md`, `?? docs/reports/schedulerpro-global-technical-audit-phase-c.md` | Este relatório C.1 criado como novo ficheiro |

Não foram executados reset, checkout destrutivo, stash, commits, merges ou pushes.

---

## 3. Ficheiros e fluxos inspecionados

### 3.1 HTTP e autenticação

| Área | Ficheiros principais |
|------|----------------------|
| Stack Express | `server/src/app.ts` |
| Rotas auth | `server/src/modules/auth/routes/AuthRoutes.ts`, `AuthController.ts`, `AuthService.ts` |
| Sessões | `server/src/modules/auth/services/SessionService.ts`, `SessionRepository` |
| Cookies / JWT | `server/src/providers/security/CookieProvider.ts`, `JwtProvider.ts`, `server/src/constants/cookie.ts` |
| Middleware auth | `server/src/middlewares/auth.middleware.ts` |
| Rate limit (público) | `server/src/middlewares/public-booking-rate-limit.middleware.ts`, `public-appointment-link-rate-limit.middleware.ts` |
| Password | `server/src/modules/users/services/UserService.ts` (`changePassword`), `AuthService.ts` (`resetPassword`, `forgotPassword`) |

### 3.2 Multi-tenant (users / services)

| Área | Ficheiros principais |
|------|----------------------|
| Users | `UserRoutes.ts`, `UserController.ts`, `UserService.ts` |
| Services | `ServiceRoutes.ts`, `ServiceController.ts`, `ServiceService.ts` |
| Appointments (comparação 403/404) | `AppointmentService.ts` (`findById`) |
| Rotas API | `server/src/routes/index.ts` (`/api/users`, `/api/services`) |

### 3.3 Validação / NoSQL

| Área | Ficheiros principais |
|------|----------------------|
| Sanitize | `app.ts` L73 (`mongoSanitize` comentado) |
| ObjectId | `server/src/middlewares/object-id.middleware.ts` |
| Listagens | `list-appointments.validator.ts`, `list-reports.validator.ts`, `create-public-appointment.validator.ts`, `public-availability.validator.ts` |

### 3.4 Testes consultados / executados

| Ficheiro | Uso |
|----------|-----|
| `server/tests/unit/auth/AuthService.test.ts` | **Executado** — 22 testes passed |
| `server/tests/unit/auth/SessionService.test.ts` | **Executado** — passed |
| `server/tests/unit/users/UserService.behavior.test.ts` | **Executado** — passed (cross-company update) |
| `server/tests/unit/companies/CompanyService.isolation.test.ts` | **Executado** — passed |
| `server/tests/integration/availability-appointment.routes.test.ts` | Leitura — cross-tenant appointments/availability |
| `server/tests/integration/public-booking.routes.test.ts` | Leitura — 404 recursos de outra empresa (público) |
| `server/tests/integration/users/create-user.route.test.ts` | Leitura — não cobre isolamento cross-tenant |

---

## 4. Metodologia e testes executados

1. Inspeção estática de rotas → middleware → controller → service → repository.
2. Cruzamento com testes unitários e de integração existentes.
3. Execução **apenas** de testes Vitest com mocks (sem escrita em MongoDB nem chamadas a serviços externos reais).

**Comandos executados (servidor):**

```text
npm run test -- --run tests/unit/auth/AuthService.test.ts
npm run test -- --run tests/unit/auth/SessionService.test.ts tests/unit/users/UserService.behavior.test.ts tests/unit/companies/CompanyService.isolation.test.ts
```

**Resultado:** 1 + 3 ficheiros de teste, **54 testes passed**, 0 failed.

**Não executado:** testes de integração com supertest que possam depender de BD real; tentativas massivas de login; validação dinâmica de CORS em produção.

**Estados de validação utilizados:** Confirmado | Parcialmente confirmado | Não confirmado | Não verificável nesta fase.

---

## 5. Validação C1.1 — Rate limiting da autenticação (AUD-SEC-003)

### 5.1 Mapeamento por endpoint (`/api/auth/*`)

| Endpoint | Rota | Validator | Rate limit | Controller → Service |
|----------|------|-----------|------------|----------------------|
| Registo | `POST /register` | `registerValidator` + `validateRequest` | **Nenhum** | `AuthController.register` → `AuthService.register` |
| Login | `POST /login` | `loginValidator` + `validateRequest` | **Nenhum** | `AuthController.login` → `AuthService.login` |
| Refresh | `POST /refresh` | **Nenhum** | **Nenhum** | `AuthController.refresh` → `AuthService.refresh` |
| Me | `GET /me` | — | N/A (autenticado) | `AuthMiddleware` → `AuthService.me` |
| Logout | `POST /logout` | — | N/A (autenticado) | `AuthService.logout` |
| Forgot password | `POST /forgot-password` | `forgotPasswordValidator` | **Nenhum** | `AuthService.forgotPassword` |
| Reset password | `POST /reset-password` | `resetPasswordValidator` | **Nenhum** | `AuthService.resetPassword` |
| Verify email | `GET /verify-email` | `verifyEmailValidator` | **Nenhum** | `AuthService.verifyEmail` |

Evidência de rotas: `AuthRoutes.ts` L32–59 (`/refresh` em L39 sem validator).

### 5.2 Rate limit noutras superfícies (contraste)

- Rotas públicas de booking, catálogo e convites usam `express-rate-limit` com chave `routeKey:ip` (`public-appointment-link-rate-limit.middleware.ts` L56–74).
- Comentário explícito: **`trust proxy` não configurado**; IP obtido via `req.ip` apenas (L41–48).

### 5.3 Mitigações parciais observadas (não substituem rate limit HTTP)

- Campos `failedLoginAttempts` / `lockUntil` existem no modelo e repositório (`UserRepository.incrementFailedLogin`, `lockUser`), mas **não há chamadas** a `incrementFailedLogin` / `lockUser` a partir de `AuthService.validatePassword` (grep no módulo auth) — bloqueio por tentativas **não ativo** no fluxo de login atual.
- Mensagens genéricas em credenciais inválidas (boa prática anti-enumeration).

### 5.4 Conclusão AUD-SEC-003

| Campo | Valor |
|-------|--------|
| **Estado** | **Confirmado** |
| **Impacto** | Médio — credential stuffing, abuso de refresh, spam de forgot-password / registo |
| **Probabilidade** | Média-alta em ambiente exposto à Internet sem WAF/proxy rate limit |
| **Prioridade** | **P2** |

---

## 6. Validação C1.2 — Refresh token e sessões (AUD-SEC-001)

### 6.1 Fluxo técnico

1. **Login:** `sessionService.start` → `generateTokens` com `sessionId` (`AuthService.ts` L150–200).
2. **Refresh:** `verifyRefreshToken` → `sessionService.validate(sessionId, userId)` → `authenticateWithSession(user, existingSessionId)` — **reutiliza o mesmo `sessionId`** (L220–252, L154–156).
3. **Novos tokens:** JWT access e refresh **reemitidos**; não há blacklist nem `jti` rotativo no código inspecionado.
4. **Invalidação:** `sessionService.revoke` no logout (`AuthService.logout` L260–261); sessão revogada ou expirada (idle 2h / absoluto 8h — `session.ts`) faz `validate` falhar.
5. **Refresh JWT anterior:** permanece **criptograficamente válido** até `REFRESH_EXPIRES_IN` (default `8h` em `env.ts`) enquanto a sessão servidor estiver válida — **reutilizável** após um refresh bem-sucedido.

### 6.2 Evidência de desenho intencional

Teste unitário `múltiplos refreshes preservam a sessão absoluta original` (`AuthService.test.ts` L171–179): três chamadas a `refresh` com o mesmo token; `sessionService.start` **não** chamado; `validate` chamado 3 vezes com o mesmo `sessionId`.

Teste `logout revoga a sessão e refresh posterior falha` (L182–186): após revoke, refresh falha — confirma que a barreira efetiva é **estado da sessão**, não invalidação do JWT refresh anterior isoladamente.

### 6.3 Limitações da validação

- Não foi medido em runtime o comportamento com dois refresh JWT distintos emitidos em momentos diferentes da mesma sessão (ambos devem funcionar até logout/expiração, por desenho).
- Não foram usados tokens de produção.

### 6.4 Conclusão AUD-SEC-001

| Campo | Valor |
|-------|--------|
| **Estado** | **Confirmado** (comportamento de **ausência de rotação** / reutilização do refresh anterior) |
| **Natureza** | Lacuna de segurança **alinhada com desenho documentado em testes**, não bug acidental |
| **Impacto** | Médio — roubo de refresh token amplia janela de abuso até expiração JWT ou revogação de sessão |
| **Probabilidade** | Média (depende de XSS, exfiltração de cookie, malware) |
| **Prioridade** | **P2** |

---

## 7. Validação C1.3 — Alteração de password e revogação de sessões (AUD-SEC-002)

### 7.1 `PATCH /api/users/me/password` (autenticado)

- `UserService.changePassword` (L457–482): valida `currentPassword`, persiste hash via `userRepository.updatePassword` (define `passwordChangedAt` — L198–203 do repositório).
- **Sem** `sessionService.revoke` nem revogação de outras sessões do utilizador.
- `auth.middleware.ts` **não** compara `passwordChangedAt` com `iat` do JWT — sessão e access token **continuam válidos** após troca de password até expirarem ou logout.

### 7.2 `POST /api/auth/reset-password` (público com token)

- `AuthService.resetPassword` (L540–576): valida token de reset, atualiza hash, `passwordChangedAt`, `lastPasswordResetAt`, invalida token de reset.
- **Sem** revogação de sessões existentes.

### 7.3 Conclusão AUD-SEC-002

| Campo | Valor |
|-------|--------|
| **Estado** | **Confirmado** |
| **Impacto** | Médio — após compromisso de password, atacante com sessão/token roubado mantém acesso |
| **Probabilidade** | Média em cenários de credential stuffing + sessão persistente |
| **Prioridade** | **P2** |

---

## 8. Validação C1.4 — CORS e configuração HTTP (AUD-SEC-004, AUD-SEC-006)

### 8.1 Configuração no repositório (`app.ts`)

| Componente | Evidência | Notas |
|------------|-----------|--------|
| Helmet | L37 `app.use(helmet())` | Ativo |
| CORS | L42 `app.use(cors())` | Sem `origin` — default permissivo do pacote `cors` (**AUD-SEC-006**) |
| JSON body | L52 `express.json()` | Sem `limit` explícito |
| mongoSanitize | L73 comentado | Ver C1.5 |
| trust proxy | **Ausente** em `app.ts` / bootstrap inspecionado | Afeta interpretação de `req.ip` |

### 8.2 Cookies de autenticação

`CookieProvider.ts` L23–27: `httpOnly: true`, `sameSite: "strict"`, `secure` em `NODE_ENV === "production"`. Max-age refresh alinhado a 8h (`cookie.ts`).

### 8.3 CSRF (AUD-SEC-004)

- API usa cookies para access/refresh; mutações autenticadas dependem de cookies enviados pelo browser.
- **Sem** token CSRF dedicado no código inspecionado.
- Mitigação parcial: `SameSite=Strict` reduz pedidos cross-site com cookies em browsers modernos.
- CORS aberto no código **não** substitui CSRF para clientes que enviem cookies em contextos permitidos por SameSite; expansão para clientes cross-origin aumentaria superfície.

### 8.4 Produção

Comportamento efetivo de CORS, limites de body no proxy (nginx, etc.) e `trust proxy` — **não verificável nesta fase**.

### 8.5 Conclusões

| Achado | Estado | Prioridade |
|--------|--------|------------|
| **AUD-SEC-006** | **Confirmado** no código; impacto em produção **não verificável** | P2 (config + deploy) |
| **AUD-SEC-004** | **Parcialmente confirmado** — superfície CSRF teórica com mitigação SameSite; sem prova de exploit nesta fase | P2–P3 |

---

## 9. Validação C1.5 — express-mongo-sanitize (AUD-SEC-005)

### 9.1 Estado do middleware

`app.ts` L73: `//app.use(mongoSanitize());` — middleware **desativado**.

### 9.2 Uso de operadores `$` no código

Operadores MongoDB em repositórios (ex. `AppointmentRepository`, `ReportRepository`) são construídos **no servidor**, não a partir de objetos `req.body`/`req.query` inteiros.

### 9.3 Entrada do cliente → consultas

| Padrão | Exemplos | Risco NoSQL |
|--------|----------|-------------|
| Query strings validadas como string/ISO | `list-appointments.validator.ts`, `list-reports.validator.ts` | Baixo — não aceitam objetos com `$gt` |
| Params `:id` | `validateObjectId` em users/services | Baixo — rejeita não-ObjectId |
| Body com whitelist | `create-public-appointment.validator.ts` rejeita campos extra incl. `companyId` | Baixo no endpoint público analisado |
| `req.body` em DTOs tipados | Users, services — campos mapeados explicitamente nos services | Baixo se validators impedem tipos objeto em campos escalares |
| `NotificationController` `limit` de query | Cast a string; serviço deve normalizar | Não auditado até ao repositório nesta fase em profundidade |

**Varredura estática:** não foi identificado um caminho óbvio `req.query`/`req.body` → `Model.find(clientObject)` sem validação nos fluxos prioritários (auth, appointments list, public booking). **Não** constitui prova formal de ausência de vulnerabilidade em todos os ~87 endpoints.

### 9.4 Conclusão AUD-SEC-005

| Campo | Valor |
|-------|--------|
| **Estado** | **Parcialmente confirmado** — camada global ausente; **vulnerabilidade demonstrável não confirmada** por esta varredura |
| **Impacto** | Baixo–médio condicional |
| **Prioridade** | **P2** (defesa em profundidade) |

---

## 10. Validação C1.6 — Isolamento multi-tenant users/services (AUD-SEC-008)

### 10.1 Origem do `companyId`

- API autenticada: `req.user.companyId` definido em `auth.middleware.ts` L104–110 a partir do utilizador na BD (não do body).
- Controllers: `UserController` / `ServiceController` passam `req.user!.companyId` a todos os métodos inspecionados.

### 10.2 Enforcement no service

| Operação | UserService | ServiceService |
|----------|-------------|----------------|
| findById | `findById` repo → compare `companyId` → **403** se diferente (L155–166) | Idem L71–83 |
| update | **403** cross-tenant (L201–209) | L95–107 |
| delete | **403** (L175–185) | L131–143 |
| findAll / create | `findByCompanyId` / `companyId` da sessão | Idem |

Repositórios usam `findById(id)` sem filtro de empresa; **restrição aplicada na camada de serviço**.

### 10.3 Vulnerabilidade concreta nos fluxos analisados

**Não confirmada** — utilizador autenticado de empresa A que conhece `_id` de recurso de empresa B recebe **403** (users/services), não dados do recurso.

### 10.4 Testes

| Cobertura | Evidência |
|-----------|-----------|
| Unit users cross-company | `UserService.behavior.test.ts` — update com `companyId` diferente → FORBIDDEN |
| Unit companies | `CompanyService.isolation.test.ts` |
| HTTP integration users/services cross-tenant | **Ausente** (apenas `create-user.route.test.ts` com mocks de auth) |
| Appointments / availability | Integração extensa cross-tenant (`availability-appointment.routes.test.ts`) |

### 10.5 Conclusão AUD-SEC-008

| Campo | Valor |
|-------|--------|
| **Estado** | **Confirmado** como **lacuna de testes**, **não** como vulnerabilidade confirmada em users/services |
| **Prioridade** | **P3** |

---

## 11. Validação C1.7 — Consistência 403 vs 404 (AUD-SEC-007)

| Módulo | Recurso existe noutra empresa | HTTP | Mensagem |
|--------|------------------------------|------|----------|
| Users | Sim | **403** | `USER_NOT_PREVILEGES` |
| Services | Sim | **403** | `USER_NOT_PREVILEGES` |
| Appointments | Sim (ou inexistente) | **404** | "Agendamento não encontrado." (`AppointmentService.ts` L664–665) |

**Efeito:** um cliente pode distinguir “ID existe mas não pertence ao tenant” (403) de “não encontrado” (404) em appointments vs users/services — **information disclosure** de baixo impacto, não bypass de autorização.

### Conclusão AUD-SEC-007

| Campo | Valor |
|-------|--------|
| **Estado** | **Confirmado** (inconsistência de resposta) |
| **Prioridade** | **P3** |

---

## 12. Matriz resumida — fluxos multi-tenant (users / services)

| Rota API | Middleware | companyId | Service check | Cross-tenant (código) | Teste HTTP cross-tenant |
|----------|------------|-----------|---------------|------------------------|-------------------------|
| `GET /api/users` | auth + RBAC | sessão | `findByCompanyId` | N/A (lista própria empresa) | Não |
| `GET /api/users/:id` | auth + objectId + RBAC | sessão | compare → 403 | Protegido | Não |
| `PUT/PATCH/DELETE /api/users/:id` | idem | sessão | compare → 403 | Protegido | Não |
| `GET /api/services` | auth + RBAC | sessão | `findByCompanyId` | N/A | Não |
| `GET /api/services/:id` | auth + objectId + RBAC | sessão | compare → 403 | Protegido | Não |
| `PATCH/DELETE /api/services/:id` | idem | sessão | compare → 403 | Protegido | Não |

---

## 13. Resultados consolidados por achado

| ID | Estado validação | Impacto | Prob. | Prioridade |
|----|------------------|---------|-------|------------|
| AUD-SEC-001 | Confirmado (sem rotação refresh) | Médio | Média | P2 |
| AUD-SEC-002 | Confirmado (sem revoke sessões) | Médio | Média | P2 |
| AUD-SEC-003 | Confirmado (sem rate limit auth) | Médio | Média-alta | P2 |
| AUD-SEC-004 | Parcialmente confirmado (CSRF / cookies) | Médio | Baixa-média | P2–P3 |
| AUD-SEC-005 | Parcialmente confirmado (sanitize off) | Baixo-médio | Baixa | P2 |
| AUD-SEC-006 | Confirmado no repo; prod não verificável | Médio | Depende deploy | P2 |
| AUD-SEC-007 | Confirmado (403 vs 404) | Baixo | Média | P3 |
| AUD-SEC-008 | Confirmado (lacuna testes) | Informativo | — | P3 |

---

## 14. Critérios de aceitação propostos (futuras correções)

### AUD-SEC-001

- Após refresh bem-sucedido, refresh token **anterior** deixa de ser aceite (rotação com família de tokens ou blacklist por `jti`/`sessionId` + versão).
- Teste automatizado: segundo refresh com token antigo → 401.
- Documentar compatibilidade com múltiplos dispositivos (várias sessões vs uma sessão).

### AUD-SEC-002

- `changePassword` e `resetPassword` revogam **todas** as sessões do utilizador (ou todas exceto a atual, se política explícita).
- Opcional: `auth.middleware` rejeita tokens emitidos antes de `passwordChangedAt`.
- Testes unitários + integração.

### AUD-SEC-003

- Rate limit em `POST /login`, `/register`, `/refresh`, `/forgot-password`, `/reset-password` (limites e janelas documentados).
- Chave: IP (+ email normalizado para login/forgot, se aplicável).
- Documentar `trust proxy` por ambiente; testes de middleware.

### AUD-SEC-004

- Política CSRF escrita; alinhar CORS ao origin do SPA; ou CSRF token em mutações cookie-auth.
- Revisão se clientes third-party usarem a API com cookies.

### AUD-SEC-005

- Reativar `express-mongo-sanitize` ou equivalente; teste que body `{"email":{"$gt":""}}` em endpoint representativo é rejeitado ou neutralizado.

### AUD-SEC-006

- `cors({ origin: allowlist })` via env; `express.json({ limit: '...' })`; evidência em pipeline/deploy.

### AUD-SEC-007

- Resposta uniforme (ex. **404** genérico) para recurso inexistente **ou** pertencente a outro tenant em users, services e appointments.
- Testes de contrato HTTP.

### AUD-SEC-008

- Testes de integração: utilizador empresa A → `GET/PATCH/DELETE /api/users/:id` e `/api/services/:id` com IDs de empresa B → 403 ou 404 conforme política do 007.

---

## 15. Riscos que permanecem sem validação

- Configuração real de **CORS**, **TLS**, **proxy** e rate limit na borda (CDN/WAF) em produção.
- Exploit **NoSQL** end-to-end em endpoints não cobertos pela varredura amostral.
- Módulos fora do foco C.1 (notifications, reports completos, jobs) — isolamento não revalidado endpoint a endpoint.
- Comportamento do frontend (origins, credenciais `fetch`) não auditado nesta fase.
- Ativação futura de `incrementFailedLogin` / lockout — hoje **não** integrado no login.

---

## 16. Recomendações para a próxima fase

1. **Fase de correções aprovada (antes ou em paralelo com Fase D):** priorizar **AUD-SEC-003**, **001**, **002** — impacto direto em autenticação e abuso.
2. **Fase D (dados / infra / MongoDB):** pode avançar em paralelo para inventário de índices, backups e secrets, desde que correções P2 de auth não sejam adiadas indefinidamente.
3. **Validação adicional opcional:** testes HTTP cross-tenant users/services (fecha AUD-SEC-008); pentest leve em staging com rate limits desligados apenas em ambiente controlado.
4. **Documentação:** consolidar achados C + C.1 no relatório global quando o utilizador autorizar edição de `schedulerpro-global-technical-audit.md`.

---

## 17. Confirmação de conformidade (restrições)

Nesta Fase C.1 **não** foram realizadas:

- Alterações a código de produção ou desenvolvimento.
- Alterações a configuração, dependências ou testes.
- Migrations, seeds ou escrita em base de dados.
- Acesso a produção, brute force ou fuzzing agressivo.
- Commits, merges, pushes ou alterações ao histórico Git.
- Atualização do relatório global `schedulerpro-global-technical-audit.md`.

**Único artefato novo/modificado nesta tarefa:** este ficheiro `schedulerpro-global-technical-audit-phase-c1.md`.

---

## 18. Resumo executivo (síntese)

| Categoria | Achados |
|-----------|---------|
| **Confirmados** | AUD-SEC-001, 002, 003, 007; AUD-SEC-006 no repositório; AUD-SEC-008 como lacuna de testes |
| **Parcialmente confirmados** | AUD-SEC-004, 005 |
| **Não verificável nesta fase** | CORS/ proxy / body limits **em produção** |
| **Correção prioritária** | Rate limit auth (003), rotação/invalidate refresh (001), revoke sessões após password (002) |
| **Avançar para Fase D?** | **Sim**, com backlog P2 de segurança planeado; Fase D não substitui correções de auth |
