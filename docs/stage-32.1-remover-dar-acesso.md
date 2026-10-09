# Stage 32.1 — Remover a funcionalidade obsoleta "Dar acesso" ao Cliente

## Objetivo e resultado

A funcionalidade anterior **"Dar acesso"** (definir credenciais de acesso ao portal
diretamente no backoffice, criando/reativando o `User` CLIENT a partir de uma senha
introduzida pelo operador) foi **removida por completo**. A ação **"Convidar"**
(Stage 32) passa a ser o **único mecanismo oficial** para conceder acesso ao portal.

Resultado:

- A ação, o modal, a chamada de API, o endpoint, o DTO, o validator, a lógica de serviço
  e os testes exclusivos de "Dar acesso" deixaram de existir.
- "Convidar" continua intacto (mesmo contrato e regras de autorização).
- Os agendamentos públicos continuam a funcionar sem conta e sem criar `User`.
- Nenhum dado existente (Clientes, Users, agendamentos) foi removido ou alterado.

## Funcionalidades e ficheiros alterados

### Frontend — removido

- `client/src/components/clients/SetClientCredentialsModal.tsx` (modal "Dar acesso" /
  "Gerenciar acesso" / "Reativar acesso") — **ficheiro eliminado**.
- `client/src/components/clients/SetClientCredentialsModal.test.tsx` (10 testes) —
  **eliminado**.
- `client/src/pages/clients/ClientsPage.tsx`: removidos o botão de acesso
  (`getAccessButtonLabel`, `getAccessButtonTitle`), o estado `credentialingClient`, o
  handler `handleCredentialsSaved`, o `<SetClientCredentialsModal>` e o import.
- `client/src/api/endpoints/clients.api.ts`: removido `setClientCredentials`
  (`POST /clients/:id/credentials`) e o import de `SetClientCredentialsPayload`.
- `client/src/types/client.ts`: removido `SetClientCredentialsPayload`.
- Testes: removidos 4 casos de "Dar acesso"/"Gerenciar"/"Reativar"/botão desabilitado em
  `ClientsPage.test.tsx`; removidos 2 testes de `clients.api.test.ts`; removido o mock
  `setClientCredentials` em `ClientsPage.test.tsx` e `ClientsPage.photo.test.tsx`.
  **Adicionados 2 testes** que provam a remoção (ver "Testes").

### Backend — removido

- `server/src/modules/Clients/routes/ClientRoutes.ts`: removida a rota
  `POST /:id/credentials` e o import do validator.
- `server/src/modules/Clients/controllers/ClientController.ts`: removido
  `setCredentials`.
- `server/src/modules/Clients/services/ClientService.ts`: removido `setCredentials` e os
  imports/fields que só ele usava (`SetClientCredentialsDto`, `PasswordProvider` +
  `passwordProvider`, `Role`).
- `server/src/modules/Clients/dto/SetClientCredentials.dto.ts` — **eliminado**.
- `server/src/modules/Clients/validators/set-client-credentials.validator.ts` —
  **eliminado**.
- `server/src/constants/http-messages.ts`: removida `CLIENT_CREDENTIALS_SET`; reescritas
  `CLIENT_EMAIL_REQUIRED` (→ "para receber o convite de acesso") e `CLIENT_ROLE_FORBIDDEN`
  (→ "pelo fluxo de convites").
- `server/src/modules/users/repositories/UserRepository.ts`: removido
  `updateIncludingDeleted`, cujo único consumidor de produção era `setCredentials`.
- `server/src/modules/users/types.ts`: `UpdateUserData` deixou de ter `deletedAt` (só
  existia para a restauração via `updateIncludingDeleted`).
- `server/src/modules/users/services/UserService.ts`: comentários que referenciavam
  `setCredentials` passaram a referir o fluxo de convite.
- `server/src/modules/client-invites/services/ClientInviteService.ts`: comentário do
  Cenário B deixou de referir "Dar acesso" (agora "outro convite aceite entretanto").
- Testes: **eliminado** `ClientService.credentials.test.ts` (6 testes); removido o
  `describe` de `setCredentials` e os mocks `PasswordProvider`/`updateIncludingDeleted`
  em `ClientService.sync.test.ts` e `ClientService.create-email.test.ts`; removido o
  teste de `updateIncludingDeleted` em `soft-delete.test.ts`; removido o stub
  `setCredentials` do mock de `ClientController` em `object-id.routes.test.ts`.

### Componentes partilhados preservados (não tocados)

- `portalAccess` (`ClientPortalAccess`, `ClientService.resolvePortalAccess`,
  `resolvePortalAccessMap`, `ClientMapper`) — continua a alimentar "Convidar"
  (esconder o botão quando já há conta) e a UI de estado.
- A **sincronização Client → User** em `ClientService.update` (nome/e-mail da conta
  vinculada) — preservada.
- `UserRepository.findByClientIdIncludingDeleted`, `findByEmailIncludingDeleted`,
  `findByClientIdsAndCompanyIncludingDeleted` — usados por convites, create/update e
  `resolvePortalAccess`.
- RBAC de "Convidar" (`authorize(OWNER, ADMIN)`), endpoints públicos de convite,
  rate-limit, token/hash/TTL, página pública de aceite, dispatcher/template de e-mail,
  Cenários A–D e proteções anti-takeover — **inalterados**.
- Fluxo de agendamento público (`public-booking`, `AvailableSlotsBuilder`) —
  **inalterado**.

## Endpoints, serviços e permissões afetados

| Item | Antes | Depois |
|---|---|---|
| `POST /api/clients/:id/credentials` | `CLIENT_UPDATE` (inclui MANAGER) | **removido** |
| `ClientController.setCredentials` | existia | **removido** |
| `ClientService.setCredentials` | existia | **removido** |
| `setClientCredentialsValidator` + DTO | existiam | **removidos** |
| `UserRepository.updateIncludingDeleted` | existia | **removido** |
| `POST /api/clients/:id/invite` ("Convidar") | `authorize(OWNER, ADMIN)` | **inalterado** |

Nenhuma permission existente foi renomeada ou alterada. Nenhum endpoint novo foi criado.

## Testes executados e resultados

Comandos: `npm run typecheck`, `npm test`, `npm run build` e cobertura em `client/` e
`server/` (o frontend usa `--coverage.reportOnFailure` por causa das falhas
preexistentes).

- **Backend:** 78 ficheiros, **1174 testes — 1168 passam**, 6 falham (preexistentes, ver
  abaixo). Removidos 8 testes exclusivos do fluxo antigo (6 + 1 + 1). Suítes focadas
  (`tests/unit/clients`, `soft-delete`, `object-id.routes`, `client-invites`,
  `AppointmentService.public`): **176/176**.
- **Frontend:** 108 ficheiros, **1229 testes — 1225 passam**, 4 falham (preexistentes).
  Removidos 16 testes exclusivos do fluxo antigo (10 do modal + 4 da Clients Page + 2 da
  API) e adicionados 2 novos. Suítes focadas (clients, components/clients,
  ClientInvitePage, clientPermissions, clients.api): **91/91**.

Evidência da remoção (exigidos pelos pontos 1, 2 e 9):

- `ClientService.create-email.test.ts` e a suite completa continuam verdes sem qualquer
  referência a `setCredentials`, `/credentials`, `SetClientCredentials`,
  `CLIENT_CREDENTIALS_SET` ou `updateIncludingDeleted`.
- `ClientsPage.test.tsx` → *"grants portal access only through Convidar — no legacy
  access action exists"*: com OWNER e cliente sem conta, o botão **Convidar** existe e
  `queryByRole` para `/dar acesso|gerenciar acesso|reativar acesso/` é `null`.
- `ClientsPage.test.tsx` → *"shows no access management action for a client that already
  has portal access"*: nenhuma ação de acesso (nem "Convidar") é renderizada.
- `grep` global confirma ausência de referências ativas/rotas órfãs.

Cobertura dos requisitos (5–10): a independência dos agendamentos públicos face à
criação de contas é coberta pelos testes existentes preservados —
`AppointmentService.public.test.ts` (incl. Cenário D: e-mail de User existente não
cria/altera User nem consulta a coleção User), `public-booking.routes.test.ts` e os
testes de convite (associação Client↔User, autenticação e email único).

## Cobertura

| | Stage 32 (baseline) | Stage 32.1 |
|---|---|---|
| Backend S / B / F / L | 81,98 / 80,43 / 71,84 / 82,19 | **82,05 / 80,35 / 72,00 / 82,26** |
| Frontend S / B / F / L | 96,22 / 91,40 / 96,37 / 96,42 | **96,31 / 91,36 / 96,56 / 96,51** |

A cobertura não desce em nenhuma dimensão relevante (a remoção de código morto sobe
S/F/L nos dois lados). Sem thresholds configurados (`exit 0`).

## Typecheck e build

- Backend: `tsc --noEmit` **passou**; `npm run build` **passou**.
- Frontend: `tsc -b --noEmit` **passou**; `npm run build` **passou** (aviso preexistente
  de chunk > 500 kB).

## Falhas preexistentes e limitações

- **6 falhas preexistentes**: `server/tests/integration/public-booking.routes.test.ts`
  (disponibilidade). Causa: o fixture usa `DATE = "2026-10-08"` fixo e
  `AvailableSlotsBuilder` devolve `[]` para datas anteriores ao dia corrente da empresa
  (`AvailableSlotsBuilder.ts:238`). São testes dependentes do relógio real (bomba-relógio
  de data), **não relacionadas com esta tarefa**. Provado com `git stash` do meu trabalho:
  as mesmas 6 falhas ocorrem sem as alterações do Stage 32.1.
- **4 falhas preexistentes** no frontend: `DashboardPage.test.tsx` (2) e
  `ReportsPage.test.tsx` (2) — idênticas à baseline Stage 32.
- `docs/reports/STAGE_30_IMAGES_REPORT.md`: menção histórica ao antigo endpoint de
  credenciais mantida intacta (é um relatório de uma stage anterior; reescrever histórico
  não é escopo).
- Validação manual do fluxo "Convidar" continua pendente (não afetada por esta remoção).

## Confirmações

- **"Convidar" é o único mecanismo oficial** de concessão de acesso ao portal; não existe
  qualquer outro botão, modal, chamada ou endpoint para o efeito.
- **Os agendamentos públicos continuam independentes da criação de contas**: um Cliente
  agenda sem `User`, o registo `Client` é criado/reutilizado pelas regras existentes e um
  e-mail igual ao de um `User` existente não provoca associação nem alteração de conta.
- Nenhum dado existente foi eliminado.

## CONTEXTO PARA A PRÓXIMA IA

- **Estado final:** "Dar acesso" totalmente removido (Frontend + Backend + testes);
  "Convidar" preservado como único mecanismo. Suítes: backend **1168/1174** (6 falhas
  preexistentes de data em `public-booking.routes.test.ts`), frontend **1225/1229** (4
  falhas preexistentes de Dashboard/Reports). Typecheck e build verdes nos dois lados.
  Cobertura backend 82,05/80,35/72,00/82,26; frontend 96,31/91,36/96,56/96,51.
- **Decisões:**
  - `UserRepository.updateIncludingDeleted` (e `UpdateUserData.deletedAt`) foram
    removidos por terem `setCredentials` como único consumidor de produção — não os
    reintroduzir sem um novo caso de uso real.
  - `CLIENT_EMAIL_REQUIRED` e `CLIENT_ROLE_FORBIDDEN` foram **reescritas** (não
    removidas) porque continuam a ser usadas pelo fluxo de convite e pela proibição de
    criar `User` CLIENT via `/users`; apenas deixaram de referir "credenciais".
  - Nenhuma permission foi alterada. "Convidar" mantém `authorize(Role.OWNER, Role.ADMIN)`
    em `POST /clients/:id/invite` (justificação no relatório do Stage 32).
  - `portalAccess` e a sincronização Client→User em `ClientService.update` são
    partilhados e **mantidos**.
- **Ficheiros-chave:** `client/src/pages/clients/ClientsPage.tsx` (única ação de acesso =
  Convidar), `client/src/components/clients/SendClientInviteModal.tsx`,
  `client/src/pages/public/ClientInvitePage.tsx`,
  `server/src/modules/client-invites/**`,
  `server/src/modules/Clients/{routes/ClientRoutes.ts,services/ClientService.ts,controllers/ClientController.ts}`,
  `server/src/middlewares/client-invite-rate-limit.middleware.ts`.
- **Testes de referência para regressões:** backend `tests/unit/client-invites/`,
  `tests/integration/client-invite*.test.ts`, `tests/integration/public-booking.routes.test.ts`
  (datas sensíveis), `tests/unit/appointments/AppointmentService.public.test.ts`;
  frontend `pages/clients/ClientsPage.test.tsx`, `pages/public/ClientInvitePage.test.tsx`,
  `components/clients/SendClientInviteModal.test.tsx`, `routes/AppRoutes.test.tsx`.
- **Pontos pendentes:** (1) as 6 falhas de `public-booking` por datas fixas
  (`DATE = "2026-10-08"`) devem ser tratadas numa tarefa separada (ex.: congelar o relógio
  ou gerar a data dinamicamente); (2) as 4 falhas de Dashboard/Reports continuam; (3)
  validação manual ponta-a-ponta do convite (e-mail real + aceite no browser).
- **Git:** nenhum commit/merge/push; alterações pendentes na branch
  `Stage-32.1-Remover-a-funcionalidade-obsoleta-“Dar-acesso”-ao-Cliente` para o
  desenvolvedor commitar.
