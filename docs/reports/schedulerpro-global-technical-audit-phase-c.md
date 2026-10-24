# SchedulerPro — Auditoria Técnica Global | Fase C — Segurança e Multi-tenancy

**Data:** 24/10/2026  
**Modo:** Read-only  
**Relatório base:** [`schedulerpro-global-technical-audit.md`](schedulerpro-global-technical-audit.md) (Fases A–B)

---

## 1. Linha de base Git verificada

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `d9f2aeaabc05a34509f77499695dfcf935921b51` |
| vs Fase A/B | **Igual** — sem novos commits |
| Working tree | `?? docs/reports/schedulerpro-global-technical-audit.md` (untracked); relatório Fase C criado nesta sessão |
| Testes executados | **Nenhum** (sem escrita em BD / sem carga) |
| Produção | **Não acessada** — CORS efetivo em prod não verificado |

---

## 2. Resumo executivo

A Fase C analisou autenticação por **cookie JWT + sessão servidor**, RBAC (`RolePermissions` + `hasPermission` / `authorize`), isolamento **multi-tenant** (padrão `req.user.companyId` na API autenticada e `:companyId` na URL pública), endpoints públicos com **tokens** e **rate limits** locais, uploads com validação por **magic bytes**, e configuração HTTP (`helmet`, CORS aberto no código).

**Não foi encontrada evidência de bypass multi-tenant confirmado** nos fluxos cobertos por testes de integração/unidade (agendamentos, disponibilidade, relatórios, booking público, convites). O desenho repete um padrão: repositórios muitas vezes fazem `findById` só por `_id`, e **services** aplicam `companyId` da sessão (404 homogéneo ou 403 em alguns módulos).

**Riscos principais (prováveis, não críticos confirmados):** ausência de rate limit em login/refresh/recuperação de password; refresh token **sem rotação** (JWT refresh anterior válido até expirar); alteração de password **sem revogar** outras sessões; CORS permissivo no código; `mongoSanitize` desativado; superfície CSRF parcialmente mitigada por `SameSite=Strict`.

**Isolamento multi-tenant:** **não declarado globalmente seguro** — vários módulos carecem de testes de integração E2E cross-tenant (ex.: `services`, `users` CRUD completo, `notifications`).

---

## 3. Âmbito e limitações

- Análise estática de código e testes existentes; sem exploração em ambientes reais.
- Sem alterações a código, config, dependências ou base de dados.
- Sem valores de segredos, tokens ou PII nos registos.
- Jobs (`ReminderScheduler`, `ReminderService`) revistos apenas por amostragem (`companyId` do agendamento).
- Configuração de proxy/`trust proxy` em produção não verificada (impacta rate limit por IP).

---

## 4. Autenticação e sessões

### 4.1 Fluxo confirmado (código)

| Etapa | Evidência |
|-------|-----------|
| Access token | Cookie `accessToken`; `AuthMiddleware.authenticate` (`auth.middleware.ts` L44–54) |
| Validação JWT | `JwtProvider.verifyAccessToken` — assinatura + expiração (`JwtProvider.ts` L33–50) |
| Tipo de token | Access exige `payload.type === TokenType.ACCESS` (`auth.middleware.ts` L52–54) |
| Sessão servidor | `sessionService.validate(sessionId, userId)` — revogada, idle/absolute timeout (`SessionService.ts` L18–68) |
| Identidade | `req.user` de `UserRepository.findByIdForAccessControl` — `companyId`, `role`, `clientId` opcional (`auth.middleware.ts` L67–110) |
| Utilizador inativo / email | Bloqueio `isActive`, `emailVerified`, `lockUntil`, CLIENT sem `clientId` (L73–100) |
| Refresh | Cookie `refreshToken`; `AuthService.refresh` valida refresh JWT + sessão + `validateUserStatus` (`AuthService.ts` L220–252) |
| Logout | `sessionService.revoke(sessionId)` + limpar cookies (`AuthController.logout`, `SessionService.revoke` L75–80) |

### 4.2 Cookies (`CookieProvider.ts`)

- `httpOnly: true`, `sameSite: "strict"`, `secure` só se `NODE_ENV === "production"` (L23–27).
- Access e refresh com `maxAge` via `CookieConfig`.

### 4.3 Pontos analisados

| # | Tópico | Conclusão | Confiança |
|---|--------|-----------|-----------|
| 1 | Rotação de refresh | `refresh` reemite par de tokens com **mesmo `sessionId`** (`authenticateWithSession` L150–158); JWT refresh **anterior não é invalidado** na BD | **Provável** gap | Código |
| 2 | Reutilização refresh | Sessão revogada no logout invalida refresh; múltiplos JWT refresh válidos até expiração se sessão ativa | **Provável** | Código |
| 3 | Tipo no refresh | `verifyRefreshToken` não valida `TokenType.REFRESH` explicitamente; segredo distinto do access impede troca direta | **Informativo** | Código |
| 4 | Password change | `UserService.changePassword` atualiza hash **sem** `sessionService.revoke` / revogar outras sessões (`UserService.ts` L457–482) | **Provável** | Código |
| 5 | Forgot password | Utilizador inexistente → return silencioso (anti-enumeração) (`AuthService.ts` L483–487) | **Confirmado** (desenho) | Código |
| 6 | CSRF | API state-changing com cookies; `SameSite=Strict` reduz CSRF cross-site; sem token CSRF dedicado | **Provável** superfície residual | Código |
| 7 | Login rate limit | **Não** há `express-rate-limit` em `/auth/login`, `/register`, `/refresh`, `/forgot-password` | **Confirmado** | Grep em `server/src` |

---

## 5. RBAC e autorização

### 5.1 Matriz de roles (`constants/rbac.ts`)

| Role | Destaques |
|------|-----------|
| OWNER | Permissões completas incl. USER/ COMPANY delete, AVAILABILITY CRUD |
| ADMIN | Sem USER_DELETE, COMPANY_DELETE/activate; resto amplo |
| MANAGER | Sem USER_CREATE; AVAILABILITY sem CREATE; SERVICE só READ |
| EMPLOYEE | READ + APPOINTMENT_UPDATE; sem CREATE |
| CLIENT | Só `APPOINTMENT_READ`; rotas portal usam `authorize(CLIENT)` + `clientScope` |

### 5.2 Rotas especiais

| Área | Mecanismo |
|------|-----------|
| Relatórios | `authorize(OWNER, ADMIN, MANAGER)` — sem `companyId` em query (`ReportRoutes.ts`, teste L148–160) |
| Notificações | Staff only; `NotificationService` usa só `req.user` (`NotificationService.ts` L10–12) |
| Convite cliente | `authorize(OWNER, ADMIN)` em `POST /clients/:id/invite` |
| Uploads | Mesmas permissões que update do recurso; multer **após** auth (`UserRoutes.ts` L104–107) |

### 5.3 Consistência

- Rotas autenticadas de negócio usam quase sempre: `authenticate` → `requirePasswordChangeCompleted` → `hasPermission` ou `authorize`.
- Exceção intencional: `PATCH /users/me/password` sem gate de password change completo.
- **EMPLOYEE** com `APPOINTMENT_UPDATE` pode alterar/cancelar agendamentos — alinhado a `RolePermissions`; validar intenção de produto na Fase E.

---

## 6. Matriz de isolamento multi-tenant por módulo

Legenda: **V** = verificado com evidência suficiente; **P** = problema confirmado; **I** = cobertura insuficiente; **N** = não auditado em profundidade.

| Módulo | Padrão tenant | Classificação | Evidência |
|--------|---------------|---------------|-----------|
| **appointments** | Service compara `appointment.companyId` após `findById` sem filtro repo | **V** | `AppointmentService.findById` L664–665; integração `availability-appointment.routes.test.ts` L224–239 |
| **availability** | Service valida `companyId` do documento | **V** | Integração L166–170; unit `AvailabilityExceptionService.test.ts` |
| **availability-exceptions** | Idem + conflito com agendamentos ativos | **V** | Unit tests cross-tenant L184–249 |
| **clients** | `ClientService` filtra por `companyId` | **V** (parcial) | Unit `ClientService.photo.test.ts` L200; integração convite L229 |
| **services** | `ServiceService.findById` L78–79 | **I** | Padrão código OK; poucos testes integração dedicados |
| **users** | `UserService` compara `user.companyId` L161 | **I** | Unit sync L306; sem integração HTTP completa cross-tenant |
| **companies** | `ensureTenant(id, companyId)` L39–43 | **V** | `CompanyService.ts` |
| **notifications** | Queries com `companyId` + `userId`; `markAsRead` filtra ambos L103–108 | **V** | `NotificationRepository` / `NotificationService` |
| **reports** | Agregações `$match` com `companyId` sessão | **V** | `ReportRepository.buildBaseMatch`; `report.routes.test.ts` L148–160 |
| **public-booking** | Tenant = `:companyId` URL; validators rejeitam `companyId` extra | **V** | `PublicBookingRoutes.ts`; `public-booking.routes.test.ts` |
| **public appointments** | Criação amarrada a URL; acesso por hash de token | **V** | `PublicAppointmentRoutes.ts`; unit `AppointmentService.public*.test.ts` |
| **client-invites** | Token hash; cross-tenant 404 | **V** | `ClientInviteService`; `client-invite.routes.test.ts` L229 |
| **auth** | Registo cria empresa+owner; não há leitura cross-tenant | **N** | Fora do modelo tenant por recurso |
| **reminders** | Usa `appointment.companyId` no dispatch | **I** | Amostra `ReminderService.ts`; sem auditoria de jobs completa |

**Conclusão multi-tenant:** padrão **defesa em profundidade no service** é consistente nos módulos lidos; **repositórios genéricos `findById(_id)`** aumentam risco de regressão se um controller/service omitir o check. **Não** se declara isolamento globalmente seguro.

---

## 7. Endpoints públicos e tokens

| Superfície | Controlo | Avaliação |
|------------|----------|-----------|
| POST agendamento público | `companyId` path + rate limit + validação corpo sem campos privilegiados | **V** desenho |
| GET/PATCH/DELETE por token agendamento | Token 32 bytes → SHA-256; sem `validateObjectId` no token (`PublicAppointmentRoutes.ts` L25–28) | **V** |
| Catálogo /availability | Só dados da empresa da URL; testes empresa B | **V** |
| Convites | POST body token; rate limit; resposta uniforme inválido (`ClientInviteService.invalidInvite`) | **V** |
| Enumeração | Tokens longos; formato rejeitado antes da BD (`PUBLIC_TOKEN_LENGTH`) | **V** desenho |

**Limitação:** não foi feita análise criptográfica formal nem fuzzing.

---

## 8. Rate limiting

| Middleware | Rotas |
|------------|--------|
| `public-booking-rate-limit` | POST criação agendamento público |
| `public-appointment-link-rate-limit` | GET/PATCH/DELETE token agendamento |
| `public-catalog-rate-limit` | GET services/employees |
| `public-availability-rate-limit` | GET availability |
| `client-invite-rate-limit` | inspect / accept |

**Chave:** IP via `req.ip` + `ipKeyGenerator`; comentários explicam **não** usar `X-Forwarded-For` sem `trust proxy` (`public-booking-rate-limit.middleware.ts` L17–23).

**Lacuna confirmada:** `/api/auth/*` sensíveis **sem** rate limit (→ AUD-SEC-003).

---

## 9. Uploads

- `uploadSingleImage`: `multer.memoryStorage`, limite tamanho (`imageUpload.middleware.ts`).
- `imageValidation.ts`: magic bytes — não confia em MIME/extensão (L10–15).
- Autorização antes do multer nas rotas de foto/logo (`UserRoutes`, `ClientRoutes`, `CompanyRoutes`).
- Tenant: services (`UserService.findEmployeeForPhoto`, `ClientService`, `CompanyService.ensureTenant`).

**Não auditado:** quotas Cloudinary, URLs públicas das imagens, testes de upload malicioso E2E.

---

## 10. Exposição de dados sensíveis

| Canal | Medida |
|-------|--------|
| Logs HTTP | Morgan `safe-url` + `redactPublicAppointmentToken` (`morgan.ts` L21–22) |
| Erros API | `error.middleware` — mensagem `AppError`; 500 genérico sem stack ao cliente (L89–92) |
| Stack | Registada em logger servidor (L52–59) — risco operacional se logs vazarem |
| Respostas auth | Mapper de utilizador — não auditado campo a campo nesta fase |
| Convites / tokens | Comentários e hints de hash; tokens no corpo em rotas públicas de convite (evitar log em path) |

---

## 11. Segurança HTTP e CORS

| Controlo | Estado |
|----------|--------|
| `helmet()` | Ativo (`app.ts` L37) — opções default não detalhadas |
| `mongoSanitize` | **Comentado** (`app.ts` L73) — ver AUD-SEC-005 / AUD-001 |
| `cors()` | **Default** (todas as origens no código) — ver AUD-SEC-006 / AUD-002 |
| Body JSON | `express.json()` sem limite explícito nesta leitura |
| Cookies | Ver §4.2 |

---

## 12. Registo de achados `AUD-SEC-*`

| ID | Título | Gravidade | Estado | Prioridade |
|----|--------|-----------|--------|------------|
| AUD-SEC-001 | Refresh JWT sem rotação nem invalidação do token anterior | Média | Provável | P2 |
| AUD-SEC-002 | Alteração de password não revoga outras sessões | Média | Provável | P2 |
| AUD-SEC-003 | Ausência de rate limit em login/register/refresh/forgot-password | Média | Confirmado | P2 |
| AUD-SEC-004 | Superfície CSRF em API cookie-based (mitigação parcial SameSite=Strict) | Média | Provável | P2 |
| AUD-SEC-005 | `express-mongo-sanitize` desativado | Média/Baixa | Confirmado | P2 — ver AUD-001 |
| AUD-SEC-006 | CORS permissivo no código | Média | Confirmado | P2 — ver AUD-002 |
| AUD-SEC-007 | Resposta 403 vs 404 em alguns recursos cross-tenant (`ServiceService` L78–80) | Baixa | Confirmado | P3 |
| AUD-SEC-008 | Cobertura de testes cross-tenant incompleta (users/services HTTP) | Informativa | Confirmado | P3 |

### Detalhe (amostra)

**AUD-SEC-001 — Refresh sem rotação**  
- **Evidência:** `AuthService.refresh` → `authenticateWithSession(user, payload.sessionId)` L252; gera novos tokens L158 sem revogar JWT refresh antigo.  
- **Risco:** roubo de refresh token usável até expiração mesmo após refresh legítimo.  
- **Aceitação futura:** após refresh, invalidar refresh anterior (allowlist de `jti` ou rotação com secret por sessão).

**AUD-SEC-003 — Auth sem rate limit**  
- **Evidência:** grep `rateLimit` só em middlewares públicos.  
- **Aceitação:** limiter por IP+rota em `/auth/login` e `/auth/forgot-password`; testes de 429.

---

## 13. Priorização de riscos

1. **P2:** Rate limits auth; rotação refresh; revogar sessões no change password; rever CORS por ambiente.  
2. **P2:** Reavaliar `mongoSanitize` vs queries com input utilizador.  
3. **P3:** Alinhar 404 em cross-tenant; expandir testes integração users/services.  
4. **Fase D:** índices e integridade MongoDB.  
5. **Fase F:** executar suites e regressões de data.

---

## 14. Testes existentes e lacunas

| Área | Testes relevantes |
|------|-------------------|
| Cross-tenant HTTP | `availability-appointment.routes.test.ts` |
| Relatórios tenant | `report.routes.test.ts` |
| Booking público | `public-booking.routes.test.ts` |
| Convites | `client-invite.routes.test.ts`, `client-invite-public.routes.test.ts` |
| Unit tenant | `AppointmentService.public*.test.ts`, `AvailabilityExceptionService.test.ts`, `ClientInviteService.create.test.ts` |

**Lacunas:** integração E2E `users/:id`, `services/:id` com empresa B; notificações cross-user; testes de auth brute-force; uploads E2E.

---

## 15. Recomendações para fases futuras

- **Fase C (follow-up):** matriz controller→service→repository para `users` e `services` linha a linha.  
- **Fase D:** índices compostos `{ companyId, _id }` onde aplicável.  
- **Fase F:** `npm run test` server com Mongo de teste; confirmar falhas históricas Dashboard/Reports no client.  
- **Correções:** só após aprovação explícita; começar por AUD-SEC-003 e AUD-SEC-001.

---

## 16. Atualização cruzada — achados Fase B

| ID Fase B | Atualização Fase C |
|-----------|-------------------|
| **AUD-001** (`mongoSanitize`) | Reconfirmado `app.ts` L73 comentado. Superfície real depende de operadores `$` em input — **não auditado endpoint a endpoint**. Tratado como **AUD-SEC-005**. Risco **provável baixo-médio**, não crítico isolado. |
| **AUD-002** (CORS) | Reconfirmado `cors()` sem `origin` (`app.ts` L42). **AUD-SEC-006**. Config produção pode diferir — **não verificado**. |
| **AUD-005** (multi-tenant global) | Parcialmente endereçado: padrão service-layer **consistente**; testes **não cobrem todos os módulos**. **Não** marcar como resolvido. Ver §6. |

---

## 17. Ficheiros e comandos consultados

**Comandos:** `git branch --show-current`, `git rev-parse HEAD`, `git status -sb`

**Ficheiros (amostra representativa):**

- `server/src/app.ts`, `middlewares/auth.middleware.ts`, `error.middleware.ts`, `morgan.ts`
- `server/src/modules/auth/services/AuthService.ts`, `SessionService.ts`
- `server/src/providers/security/CookieProvider.ts`, `JwtProvider.ts`, `PublicAppointmentTokenProvider.ts`
- `server/src/constants/rbac.ts`, `permissions.ts`
- `server/src/modules/*/services/*`, `repositories/AppointmentRepository.ts`, `NotificationRepository.ts`
- `server/src/middlewares/*rate-limit*`, `providers/images/imageUpload.middleware.ts`, `imageValidation.ts`
- `server/tests/integration/availability-appointment.routes.test.ts`, `public-booking.routes.test.ts`, `report.routes.test.ts`, `client-invite.routes.test.ts`
- `docs/reports/schedulerpro-global-technical-audit.md`

---

## 18. Confirmação

- **Nenhuma** alteração a código, testes, configurações ou dependências do projeto (exceto criação deste ficheiro de relatório e atualização do relatório principal referenciada).
- **Nenhum** commit, merge, push, migration, seed ou escrita em base de dados.
- **Nenhum** teste destrutivo ou brute force executado.

---

**Fase C:** concluída com a limitação de que **reminders**, **configuração de produção** e **auditoria linha-a-linha de todos os controllers** permanecem com cobertura parcial — registado em §6 e §14.
