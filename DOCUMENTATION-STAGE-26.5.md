# STAGE 26.5 — Documentação Técnica

> Controle de Sessão, Inatividade e Duração Absoluta (Session Timeout / Idle / Absolute Expiration)

---

## 1. Contexto

Esta documentação resume o trabalho realizado no **Stage 26.5** do projeto **SchedulerPro**.
O objetivo foi implementar uma **política de sessão controlada exclusivamente pelo backend**, capaz de:

- Renovar o **Access Token**;
- Expirar a sessão por **inatividade (idle)**;
- Limitar a **duração máxima absoluta** da sessão;

**Sem confiar em estado do frontend** (sem `localStorage`/`sessionStorage` como fonte de verdade).

Evolui o interceptor do **Stage 26.4** (sem reescrevê-lo) e cobre a política com testes de backend e frontend.

> Fontes de origem: `Stage-26.5-Session-Timeout-Report.txt` e `checkpoint-stage-26.5.txt`.

---

## 2. Política Final de Sessão

| Item | Valor |
|------|-------|
| Access Token | **15 minutos** |
| Refresh Token | **8 horas** (era 7 dias) |
| Inatividade máxima (idle) | **2 horas** |
| Duração absoluta máxima | **8 horas** |
| Reset Password Token | **15 minutos** |
| Email Verification Token | **24 horas** |

### Regras invioláveis

1. **Atividade real** = requisição autenticada válida (NÃO mouse/teclado/foco/timer).
2. **Ordem de validação**: sessão → absolute → idle → rejeitar/atualizar.
3. Sessão expirada **nunca** atualiza `lastActivityAt`.
4. **Refresh não é atividade**: não renova `lastActivityAt` nem `sessionStartedAt`.
5. Sessão absoluta **nunca é renovada**, mesmo com refreshes contínuos.
6. **CLIENT segue exatamente a mesma política**.
7. **Logout revoga a sessão**; refresh pós-logout falha.
8. Erros transitórios (network/timeout/5xx) **não** provocam logout automático.
9. Nenhum token em `localStorage`/`sessionStorage`; tokens vivem em **cookies HttpOnly**.
10. Ordem de atualização: `lastActivityAt` é atualizado em ponto **central** (middleware/serviço), não em N controllers.

---

## 3. Arquitetura

### Modelo de dados

**`Session` (MongoDB)** — `server/src/modules/auth/models/Session.model.ts`

Campos: `userId`, `sessionStartedAt`, `lastActivityAt`, `revokedAt`, `timestamps`.

Índices: `userId`, `revokedAt`, `sessionStartedAt`.

### Camadas

| Camada | Responsabilidade |
|--------|------------------|
| `SessionService` (`services/SessionService.ts`) | `start` / `validate` / `touch` / `revoke` (regra de expiração) |
| `SessionRepository` (`repositories/SessionRepository.ts`) | Persistência: `create` / `findById` / `touch` / `revoke` |
| `AuthService` (`auth/services/AuthService.ts`) | Abre sessão no login/registro; refresh **valida** e **reutiliza o MESMO sessionId** (não cria nova, não toca) |
| `AuthMiddleware` (`middlewares/auth.middleware.ts`) | Valida a sessão em ponto **central**; atualiza `lastActivityAt` apenas em requisição válida; injeta `sessionId` em `req.user` |
| `AuthController` (`auth/controllers/AuthController.ts`) | Logout revoga a sessão antes de limpar os cookies |

### Tokens JWT

- `JwtPayload` ganhou o campo `sessionId` (opcional para compatibilidade de mocks).
- Access e Refresh Token carregam o **mesmo** `sessionId`.
- Refresh **sem** `sessionId` → `401 INVALID_SESSION`.

### Erros (HTTP 401)

| `code` | Significado |
|--------|-------------|
| `INVALID_SESSION` | Sessão inexistente / revogada / de outro usuário |
| `SESSION_IDLE_TIMEOUT` | Inatividade ≥ 2h |
| `SESSION_ABSOLUTE_TIMEOUT` | Duração ≥ 8h (precedência sobre idle) |

O campo `code` foi adicionado a `AppError`, `ApiResponse` e `ResponseHandler` e é propagado pelo `error.middleware`.

### Config central

- `server/src/constants/session.ts` → `IDLE_TIMEOUT` (2h), `ABSOLUTE_TIMEOUT` (8h).
- `server/src/constants/token-expiration.ts` / `cookie.ts` / `auth.ts` / `config/env.ts` / `server/.env` → Refresh Token ajustado de **7 dias para 8 horas**.

---

## 4. Armazenamento no Frontend

- **Nenhum token** é armazenado em `localStorage`/`sessionStorage`.
- Tokens permanecem em **cookies HttpOnly** definidos pelo backend.
- Estado de sessão vive no **Redux**, limpo por `clearCredentials` / `clearCompany`.
- O frontend **reage aos erros do backend** (`401` → refresh → expired → logout); não decide expiração por conta própria.
- Cobertura de segurança: `client/src/routes/authStorage.security.test.tsx` → *"does not write tokens to localStorage or sessionStorage"*.

---

## 5. Arquivos Criados / Modificados

### Backend — Criados (novos)

```
server/src/constants/session.ts
server/src/constants/error-codes.ts
server/src/modules/auth/models/Session.model.ts
server/src/modules/auth/repositories/SessionRepository.ts
server/src/modules/auth/services/SessionService.ts
server/tests/unit/auth/SessionService.test.ts
server/tests/unit/auth/token-expiration.test.ts
```

### Backend — Alterados

```
server/src/constants/token-expiration.ts   (REFRESH_TOKEN -> 8h)
server/src/constants/cookie.ts             (REFRESH_TOKEN_MAX_AGE -> 8h)
server/src/constants/auth.ts               (REFRESH_TOKEN -> "8h")
server/src/constants/http-messages.ts      (INVALID_SESSION/IDLE/ABSOLUTE)
server/src/config/env.ts                   (default REFRESH_EXPIRES_IN -> "8h")
server/.env                                (REFRESH_EXPIRES_IN=8h)
server/src/errors/AppError.ts              (campo code)
server/src/types/api.types.ts              (campo code)
server/src/utils/response.ts               (propaga code)
server/src/middlewares/error.middleware.ts (propaga code)
server/src/providers/security/types.ts     (JwtPayload.sessionId)
server/src/types/express.d.ts              (req.user.sessionId)
server/src/modules/auth/services/AuthService.ts
server/src/middlewares/auth.middleware.ts
server/src/modules/auth/controllers/AuthController.ts

Testes alterados:
server/tests/unit/auth/AuthService.test.ts
server/tests/unit/middlewares/auth.middleware.test.ts
```

### Frontend — Alterados

```
client/src/types/api.ts                    (campo code)
client/src/api/errors.ts                   (code + SESSION_ERROR_CODES + getSessionExpiryMessage)
client/src/api/apiClient.test.ts           (Casos 11-13, rede, códigos)
```

---

## 6. Testes

### Backend — 34 arquivos / 377 testes: **PASS**

- **Token expiration**: ACCESS 15min, REFRESH 8h (não 7d), RESET 15min, EMAIL 24h.
- **SessionService**: `start`; `validate` inexistente/revogada/outro usuário; idle 1h59 (válido), 2h e 3h (expirado); absolute 7h59 (válido), 8h e 10h (expirado); absolute tem precedência; idle vence com absolute válida; `touch`; `revoke` (inclusive sem id).
- **AuthService**: login/registro abrem sessão; refresh valida e reutiliza o mesmo `sessionId` (`start`/`touch` não chamados); refresh sem `sessionId` → 401 `INVALID_SESSION`; sessão expirada → 401; múltiplos refreshes preservam a sessão absoluta; logout revoga e refresh posterior falha.
- **AuthMiddleware**: valida a sessão e faz `touch` em requisição válida; token sem `sessionId` → 401 `INVALID_SESSION`; sessão expirada não toca `lastActivityAt` e não consulta o usuário.

### Frontend — 73 arquivos / 766 testes: **PASS**

- Casos 1–10 (Stage 26.4) preservados.
- Casos 11–13: `SESSION_IDLE_TIMEOUT` / `SESSION_ABSOLUTE_TIMEOUT` / `INVALID_SESSION` no refresh limpam a sessão.
- Falha de rede no refresh **não** encerra a sessão.
- `getApiError` captura `code` + `status`; `getSessionExpiryMessage` mapeia os códigos.

> Caso 14 (retorno após período prolongado → validação server-side) está implícito na política: o backend é a autoridade e rejeita requisições/refreshes de sessões expiradas.

---

## 7. Coverage

| Área | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| **Backend** | 71.35% | 70.82% | 57.79% | 71.68% |
| **Frontend** | 96.08% | 91.18% | 96.19% | 96.31% |

Destaques:
- Backend: `AuthService` 95.52% Lines; `SessionService` coberto via `SessionService.test.ts`.
- Frontend: `api/errors.ts` 100% Lines; `api/apiClient.ts` 97.22% Lines.

---

## 8. Typecheck & Build

| Etapa | Backend | Frontend |
|-------|---------|----------|
| Typecheck | `npx tsc` (build) sem erros | `npm run typecheck` sem erros |
| Build | `npm run build` OK | `npm run build` OK |

Aviso pré-existente (frontend): chunk `index-*.js` com **516.08 kB** (> 500 kB). **Fora do escopo** desta stage (não há code-splitting/refactor solicitado).

---

## 9. Problemas Encontrados

1. **Working tree revertido ao HEAD** entre interações, exigindo recriar toda a implementação desta stage; nenhuma perda de desenho, apenas retrabalho.
2. O prompt referenciou `server/src/config/token-expiration.ts`; o arquivo real é `server/src/constants/token-expiration.ts`. **Mantido o caminho existente** para não introduzir renome cosmético.
3. Não foi criado arquivo de teste dedicado `auth.session-expiration.test.ts` para evitar duplicação: as sections 29–31 estão cobertas por `SessionService.test.ts` (limites) e `AuthService.test.ts` (refresh/logout).
4. Lua de protocolo Vitest: **nunca usar `await expect(p).rejects;` sem matcher encadeado**.

---

## 10. Limitações / Notas

- **Access Tokens pré-deploy** (sem `sessionId`) passam a ser rejeitados com `INVALID_SESSION`; usuários precisam fazer login novamente (comportamento esperado e *fail-closed*).
- **Sem índice TTL** nem job de limpeza para documentos `Session` expirados (fora do escopo; sem Redis/infra extra). Sessões expiradas são rejeitadas na validação, mas **permanecem na coleção**.
- A mensagem amigável de expiração (`getSessionExpiryMessage`) está disponível; a exibição em UI depende do consumidor de `getApiError`.
- `SessionService` é **agnóstico de papel**; a política CLIENT é idêntica por construção (`AuthService`/middleware não diferenciam role na sessão).
- **Sem commit / merge / push**: alterações permanecem no working tree, na branch `Política-de-Expiração,-Inatividade-e-Duração-da-Sessão`.

---

## 11. Restrições do Prompt (não implementar)

- Não usar `localStorage`/`sessionStorage` como fonte de verdade da sessão.
- Não adicionar Redis / WebSocket / tracking.
- Não alterar regras de negócio (calendar, appointments, clients, employees, services, dashboard, RBAC, timezone, Portal) além do necessário.
- Não refatorar fora do escopo.
- Preservar Stage 26.3 (sem `normalizeEmail`) e 26.4 (`sessionRefreshPromise`, `_retry`, `clearAuth`/`clearCompany`, guards, tratamento 401, suporte CLIENT).

---

## 12. Comandos de Validação

```bash
# Backend (rodar isolado no diretório server/)
npm test
npm run test:coverage
npm run build          # tsc

# Frontend (rodar isolado no diretório client/)
npm test
npm run test:coverage
npm run typecheck
npm run build
```

---

## 13. Resumo Final

- **Backend**: 34 arquivos / 377 testes PASS | coverage Lines 71.68% | build OK.
- **Frontend**: 73 arquivos / 766 testes PASS | coverage Lines 96.31% | typecheck OK | build OK.
- **Status**: Stage **CONCLUÍDO**.
- **Relatório oficial**: `Stage-26.5-Session-Timeout-Report.txt`.
- **Checkpoint**: `checkpoint-stage-26.5.txt`.