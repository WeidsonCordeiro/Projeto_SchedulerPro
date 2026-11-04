# SchedulerPro — Stage 32 — Convite e associação de conta do Cliente

## 1. Objetivo

Permitir que um OWNER ou ADMIN convide um `Client` existente (e-mail já cadastrado) a
criar a própria conta de acesso com role `CLIENT`, mediante link seguro de uso único:

- Emissão: botão **"Convidar"** na linha do cliente na Clients Page.
- Aceite: página pública `/convite/cliente/:token` onde o convidado define a senha e a
  conta `User` (role `CLIENT`) é criada e associada ao cliente e à empresa.
- Segurança: token aleatório de 43 caracteres (`randomBytes(32)` → base64url), guardado
  **apenas como hash SHA-256 prefixado (`sha256:`)**, TTL de 7 dias, uso único, revogação
  dos pendentes ao reconvite; o token viaja **no corpo da requisição**, nunca em query
  string, resposta ou logs.

## 2. Implementação

### Backend

- **Model** `ClientInvite.model.ts` (collection `client_invites`): `tokenHash` (unique,
  `select: false`), `companyId`, `clientId`, `email`, `expiresAt`, `usedAt`, `usedBy`,
  `revokedAt`, índices em `tokenHash` e `(companyId, clientId, expiresAt)`.
- **Token** `providers/security/ClientInviteTokenProvider.ts`: `generateInviteToken()`
  (`randomBytes(32)` → base64url, `INVITE_TOKEN_LENGTH = 43`), `hashInviteToken()`
  (SHA-256 hex prefixado `sha256:`), `isValidInviteTokenFormat()` (43 chars base64url) —
  é a malha fina que iguala token malformado e inexistente.
- **Repository** `ClientInviteRepository.ts`: `create`, `findByTokenHash` (`+token`),
  `claim` (update atómico `usedAt: null → now`, `n = 1`), `release(id, usedAt)` (desfaz
  claim em erro posterior), `revokePendingForClient` (pendentes → `revokedAt`).
- **Service** `ClientInviteService.ts` (toda a regra):
  - `createInvite`: valida e-mail no cliente, **só envia se cliente ainda não tem conta**
    (`portalAccess.exists` → `CLIENT_ALREADY_HAS_ACCOUNT`), revoga pendentes, cria token,
    despacha o e-mail (erro de envio **propaga** — não cria convite órfão) e devolve só
    `expiresAt` (token nunca sai do backend).
  - `inspect`: valida formato → 404 genérico; não achou/expirado/revogado usado → 404
    genérico idêntico (`CLIENT_INVITE_INVALID`, oráculo anti-enumeração); só token
    existente e válido devolve `ClientInviteInfo` (`company.name`, `client.name`,
    `client.email`, `expiresAt`).
  - `accept`: mesma malha + `CLIENT_INVITE_EXPIRED` distinto; claim atómico; **Cenário A**
    cria `User` (role `CLIENT`, companyId/clientId do convite); **Cenário B** e-mail já
    com conta → 409 `CLIENT_ALREADY_HAS_ACCOUNT` + `release`; **Cenário C** e-mail de
    outra conta → 409 `EMAIL_ALREADY_EXISTS` + `release` (nunca associa); sucesso →
    `CLIENT_ACCOUNT_CREATED`; falha após claim → `release`.
- **DTO/validators** (`AcceptClientInvite.dto.ts`, `accept-client-invite.validator.ts`,
  `inspect-client-invite.validator.ts`): whitelist de campos
  (`INSPECT_CLIENT_INVITE_FIELDS = [token]`,
  `ACCEPT_CLIENT_INVITE_FIELDS = [token, password, confirmPassword]`) — campos extras →
  400 (anti mass assignment); senha ≥ 8; e-mail sempre derivado do convite (nunca do
  cliente da requisição).
- **Controller** `ClientInviteController.ts`: `createInvite` (`req.user!.companyId`/
  `req.user!.userId`), `inspect`, `accept` — sem regra de negócio.
- **Rotas**:
  - `POST /api/clients/:id/invite` (`ClientRoutes.ts`): `authenticate` →
    `requirePasswordChangeCompleted` → `validateObjectId("id")` →
    **`authorize(Role.OWNER, Role.ADMIN)`** → controller.
  - `POST /api/public/client-invites/inspect` e `/accept`
    (`PublicClientInviteRoutes.ts`, montadas via `router.use("/public", …)` em
    `routes/index.ts`): rate limit → validator → `validateRequest` → controller. Sem
    sessão (públicas).
- **Rate limit** `middlewares/client-invite-rate-limit.middleware.ts`: factory
  `createPublicLinkRateLimit` → inspect 30/15 min (routeKey `POST /public/client-invites/inspect`),
  accept 10/15 min.
- **E-mail**: `dispatchClientInviteEmail` em `NotificationDispatcher.ts` (erros
  propagam; logger **sem token**) + template `providers/mail/templates/client-invite.template.ts`;
  link via `utils/client-invite-url.ts` → `buildClientInviteUrl(token)` =
  `${FRONTEND_URL sem trailing slash}/convite/cliente/${token}`.
- **Mensagens** (`constants/http-messages.ts`): `CLIENT_INVITE_SENT`,
  `CLIENT_INVITE_FOUND`, `CLIENT_INVITE_INVALID`, `CLIENT_INVITE_EXPIRED`,
  `CLIENT_ALREADY_HAS_ACCOUNT`, `CLIENT_EMAIL_INVALID`, `CLIENT_EMAIL_REQUIRED`,
  `CLIENT_ACCOUNT_CREATED`.

### Frontend

- **Tipos** `types/clientInvite.ts` (`ClientInviteInfo`, payloads, `ClientInviteEmission`).
- **API** `api/endpoints/clientInvites.api.ts`: `inspect({ token })`,
  `accept(payload)` — POST com token **no corpo**; `clients.api.ts` ganhou
  `sendClientInvite(id)` → `POST /clients/:id/invite`.
- **Permissões** `config/clientPermissions.ts`: `canInvite` (OWNER/ADMIN via
  `CAN_INVITE_ROLES`), ligado às abilities da Clients Page.
- **Página pública** `pages/public/ClientInvitePage.tsx`: `public-shell` + PageHeader
  "Criar conta de cliente"; estados de loading, erro (retry para network/server/unknown,
  botão "Entrar" para conflict), re-inspeção quando `accept` responde 404, sem token na
  rota → "Convite inválido ou incompleto."; senha ≥ 8 + confirmação; sucesso sem token
  na URL/DOM.
- **Modal** `components/clients/SendClientInviteModal.tsx`: confirmação com e-mail do
  cliente, erros ficam **no modal** (409 mantém aberto), botões desabilitados durante
  submit, fecha só quando ocioso.
- **Clients Page** `pages/clients/ClientsPage.tsx`: botão "Convidar" visível só para
  `canInvite && client.email && !client.portalAccess.exists`; estado `invitingClient`;
  `handleInviteSent(email)` mostra alerta de sucesso e recarrega a lista.
- **Rota** `routes/AppRoutes.tsx`: `/convite/cliente/:token` fora de Guest/Protected/
  AppLayout (entre `/verify-email` e o `*`), renderiza sem esperar a sessão.

### RBAC (justificativa)

Nenhum Permission novo foi criado: `CLIENT_UPDATE` pertence também ao MANAGER, o que
liberaria convites a quem não pode gerir contas de acesso. Usou-se
`authorize(Role.OWNER, Role.ADMIN)` — mesma alavanca já usada para ações de gestão de
contas — de forma explícita e testável por role.

## 3. Testes

### Backend — 1182/1182 (baseline Stage 31: 1132; +50)

| Arquivo | Testes |
|---|---|
| `tests/unit/client-invites/ClientInviteService.create.test.ts` | 11 |
| `tests/unit/client-invites/ClientInviteService.accept.test.ts` | 14 |
| `tests/integration/client-invite.routes.test.ts` (rota autenticada) | 9 |
| `tests/integration/client-invite-public.routes.test.ts` (públicas) | 13 |
| `tests/unit/appointments/AppointmentService.public.test.ts` (+3 Cenário D) | 34 |

Cobertura de cenários e regras:

- **A** (sem conta): `User` CLIENT criado e associado; hash nunca persiste senha do token.
- **B** (cliente já tem conta): 409 `CLIENT_ALREADY_HAS_ACCOUNT` em emissão e aceite.
- **C** (e-mail de outra conta): 409 `EMAIL_ALREADY_EXISTS`, nenhuma associação.
- **D** (agendamento público com e-mail de User existente): não cria/altera User nem
  consulta a coleção `User` (mock em `User.findByEmail` que falharia se chamado).
- **RBAC real (app montado)**: OWNER/ADMIN 200; MANAGER/EMPLOYEE/CLIENT 403; sem sessão
  401; id inválido 400; cross-tenant 404; token fora da resposta (snapshot do body).
- **Oráculo**: malformado e inexistente respondem **exatamente** a mesma mensagem/404;
  só expirado tem mensagem própria; revogado/uso único idêntico a inexistente.
- **Uso único/claim**: claim atómico, `release` em erro, pendentes revogados ao
  reconvite, expiração por `expiresAt` (fake timers).
- **Públicas**: sem sessão, rate-limit counters, mass assignment (extras → 400),
  validação de senha, token nunca na resposta.
- Falhas de envio de e-mail propagam (sem convite órfão).

### Frontend — 1243 (1239 passaram; 4 falhas **preexistentes** em `DashboardPage.test.tsx`
e `ReportsPage.test.tsx`; baseline Stage 31: 1205/1201; +38)

| Arquivo | Novos/afetados |
|---|---|
| `pages/public/ClientInvitePage.test.tsx` | 13 casos (loading, erro/retry, 409, sucesso, sem token, senha, re-inspeção) |
| `components/clients/SendClientInviteModal.test.tsx` | 7 (confirmação, envio, 409, submit único, Cancelar, 500) |
| `routes/AppRoutes.test.tsx` (+5) | rota pública sem redirecionar, sem layout, durante init, inspeção, expirado |
| `api/endpoints/clientInvites.api.test.ts` | 3 (corpo/URL corretos) |
| `api/endpoints/clients.api.test.ts` (+1) | `sendClientInvite` |
| `pages/clients/ClientsPage.test.tsx` (+8) | OWNER/ADMIN veem "Convidar"; MANAGER/EMPLOYEE não; some com portal ativo ou sem e-mail; modal → sucesso; 409 mantém modal |
| `config/clientPermissions.test.ts` | atualizado (`canInvite`) |

Suítes focadas dos arquivos novos/alterados: backend 81/81, frontend 120/120.

## 4. Cobertura

| | Stage 31 (baseline) | Stage 32 | Δ |
|---|---|---|---|
| Backend S | 81,66% | **81,98%** | +0,32 |
| Backend B | 80,22% | **80,43%** | +0,21 |
| Backend F | 72,15% | 71,84% | −0,31 |
| Backend L | 81,88% | **82,19%** | +0,31 |
| Frontend S | 96,28% | 96,22% | −0,06 |
| Frontend B | 91,34% | **91,40%** | +0,06 |
| Frontend F | 96,51% | 96,37% | −0,14 |
| Frontend L | 96,46% | 96,42% | −0,04 |

- Sem thresholds configurados (`exit 0` em ambos); artefatos em `client/coverage/` e
  `server/coverage/` (frontend gerado com `--coverage.reportOnFailure` por causa das 4
  falhas preexistentes).
- `ClientInvitePage.tsx` 95,45% S / 92,85% B / 100% F; `SendClientInviteModal.tsx`
  93,75% S (só o early-return de fechar durante submit não alcançado — botões ficam
  `disabled`); `clientInvites.api.ts` 100%.
- `client-invite.template.ts` 0/1 statement — mesmo padrão preexistente de
  `reset-password.template.ts` e `welcome.template.ts` (templates de e-mail cobertos
  indireatamente via mock do dispatcher).

## 5. Typecheck

Frontend (`tsc -b --noEmit`) e backend (`tsc --noEmit`) **passaram**.

## 6. Build

Frontend (`tsc -b && vite build`) e backend (`tsc`) **passaram** (aviso preexistente de
chunk > 500 kB no frontend).

## 7. Arquivos alterados

**Novos — backend (14):**

- `server/src/modules/client-invites/` (8): `models/ClientInvite.model.ts`,
  `repositories/ClientInviteRepository.ts`, `services/ClientInviteService.ts`,
  `controllers/ClientInviteController.ts`, `routes/PublicClientInviteRoutes.ts`,
  `dto/AcceptClientInvite.dto.ts`, `validators/accept-client-invite.validator.ts`,
  `validators/inspect-client-invite.validator.ts`
- `server/src/providers/security/ClientInviteTokenProvider.ts`
- `server/src/providers/mail/templates/client-invite.template.ts`
- `server/src/utils/client-invite-url.ts`
- `server/src/middlewares/client-invite-rate-limit.middleware.ts`
- `server/tests/unit/client-invites/ClientInviteService.create.test.ts`,
  `ClientInviteService.accept.test.ts`
- `server/tests/integration/client-invite.routes.test.ts`,
  `client-invite-public.routes.test.ts`

**Novos — frontend (7):**

- `client/src/types/clientInvite.ts`
- `client/src/api/endpoints/clientInvites.api.ts` + `.test.tsx`
- `client/src/components/clients/SendClientInviteModal.tsx` + `.test.tsx`
- `client/src/pages/public/ClientInvitePage.tsx` + `.test.tsx`

**Modificados (13):**

- Backend: `constants/http-messages.ts`, `modules/Clients/routes/ClientRoutes.ts`,
  `modules/notifications/services/NotificationDispatcher.ts`, `routes/index.ts`,
  `tests/unit/appointments/AppointmentService.public.test.ts`
- Frontend: `api/endpoints/clients.api.ts` + `.test.ts`, `config/clientPermissions.ts`
  + `.test.ts`, `pages/clients/ClientsPage.tsx` + `.test.tsx`,
  `routes/AppRoutes.tsx` + `.test.tsx`

## 8. Limitações

- As 4 falhas preexistentes de `DashboardPage.test.tsx`/`ReportsPage.test.tsx` continuam
  (reproduzidas em HEAD limpo na Stage 31); `AvailabilityPage.test.tsx` já falhou 1× de
  forma intermitente sob carga da suíte completa e passou isolado e na corrida seguinte
  (flaky, não relacionado à Stage 32).
- Validação **manual** (envio real de e-mail + aceite no navegador) ainda não foi feita —
  depende de backend/frontend rodando e `RESEND_*` configurados.
- O template do e-mail de convite não tem teste de renderização próprio (mesmo padrão dos
  templates preexistentes).
- Rate limits são estáticos por factory (30/15 min inspect, 10/15 min accept), sem
  dependência de IP além do comportamento da factory existente.

## 9. Validação manual

Não executada nesta stage. Roteiro sugerido:

1. `npm run dev` em `server/` e `client/`, logar como OWNER.
2. Clients Page → cliente sem portal → "Convidar" → confirmar e-mail.
3. Abrir o link recebido em `/convite/cliente/:token`, definir senha ≥ 8, entrar como
   CLIENT e conferir que só enxerga o próprio portal.
4. Reemitir convite para o mesmo cliente → link antigo deve falhar (uso único).
5. Convidar cliente que já tem conta → 409 no modal; colar token expirado/lixo →
   mensagens respectivas.
6. Acessar como MANAGER → botão "Convidar" ausente; `POST /api/clients/:id/invite` via
   curl com sessão MANAGER → 403.

## CONTEXTO PARA A PRÓXIMA IA

- **Estado do Stage 32:** implementação completa, suítes verdes, typecheck/build OK.
  Backend 1182/1182 (79 arquivos); frontend 1243 (1239 ok, **4 falhas preexistentes**
  em Dashboard/Reports — não são desta stage). Cobertura: backend 81,98 S / 80,43 B /
  71,84 F / 82,19 L; frontend 96,22 S / 91,40 B / 96,37 F / 96,42 L (baseline Stage 31:
  81,66/80,22/72,15/81,88 e 96,28/91,34/96,51/96,46). Artefatos em `client/coverage/` e
  `server/coverage/`.
- **Contratos finais:**
  - `POST /api/clients/:id/invite` (sessão; `authorize(OWNER, ADMIN)`; resposta
    `{ expiresAt }` — token nunca sai do backend).
  - `POST /api/public/client-invites/inspect` e `/accept` (públicas, rate-limited; token
    **no corpo**; inspect → `ClientInviteInfo { company.name, client.name, client.email,
    expiresAt }`; accept → `{ token, password, confirmPassword }`).
  - Rota frontend `/convite/cliente/:token` (pública, fora dos layouts).
  - Mensagens únicas em `constants/http-messages.ts`; oráculo: malformado e inexistente
    são **indistinguíveis** (`CLIENT_INVITE_INVALID` 404); expirado é distinto
    (`CLIENT_INVITE_EXPIRED`).
  - `CLIENT_INVITE_TTL_MS = 7 dias` (exportado do Service); `INVITE_TOKEN_LENGTH = 43`;
    hash `sha256:<hex>`; collection `client_invites`.
  - `clientPermissions.canInvite` (OWNER/ADMIN) é a única porta de entrada de UI — se um
    dia houver Permission para gestão de contas, é aqui que se troca
    (`CAN_INVITE_ROLES`), mantendo o backend com `authorize(Role…)` (justificado no §2:
    `CLIENT_UPDATE` inclui MANAGER).
- **Armazenamento do cliente:** `Client.portalAccess.exists/isActive` é a fonte de
  verdade para "já tem conta" (Cenário B) — derivado do User associado, não do convite.
- **Testes executados (comandos):** `cd server && npm run typecheck && npm test &&
  npm run build && npm run test:coverage`; `cd client && npm run typecheck && npm test
  && npm run build && npx vitest run --coverage --coverage.reportOnFailure` (o flag
  `reportOnFailure` é obrigatório no frontend por causa das 4 falhas preexistentes).
- **Armadilhas conhecidas (Stage 32):** (1) `vi.mock` de `server/src/...` a partir de
  `server/tests/unit/client-invites/` precisa de `../../../src/...` (3 níveis) — com 2
  níveis os mocks não aplicam e todos os testes estouram timeout por mongoose sem DB;
  (2) `vitest.config.ts` do backend tem `restoreMocks: true` — reatribua implementações
  em `beforeEach` e use funções/contadores planos para mocks de middleware; (3) no
  frontend não há restoreMocks global — `vi.clearAllMocks()` em `beforeEach` e
  `mockResolvedValueOnce` onde a ordem importa; (4) ao editar `AppRoutes.test.tsx` cuidado
  com o fecho dos `describe` (a stage 32 já teve um desbalanceamento corrigido); (5) o
  teste de flakiness `AvailabilityPage.test.tsx > loads and renders the exceptions of the
  selected employee` pode falhar 1× sob carga — reexecutar isolado antes de concluir
  regressão.
- **Limitações/pendências:** validação manual do e-mail e do aceite ainda não feita
  (roteiro no §9); `client-invite.template.ts` sem teste de renderização (padrão dos
  demais templates); rate limits estáticos (30 e 10/15 min).
- **Git:** nenhum commit/merge/push realizado; alterações pendentes na branch
  `Stage-32-—-Convite-e-associação-de-conta-do-Cliente` para o desenvolvedor commitar.
