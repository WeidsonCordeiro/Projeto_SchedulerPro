# STAGE 28 — Notificações de agendamento (e-mail CLIENT + notificações in-app)

> Notificações de agendamento: e-mail transacional ao CLIENT e notificações
> in-app aos utilizadores internos (OWNER/ADMIN/MANAGER/EMPLOYEE) quando um
> agendamento é **criado**, **atualizado** ou **cancelado**. Fechamento no
> frontend com sino de notificações no Navbar (badge de não lidas, lista,
> marcar uma/todas como lidas).

---

## 1. OBJETIVO

Implementar o módulo de **notificações** do SchedulerPro:

- **Backend**: tabela `notifications` + endpoints sob `/api/notifications`
  (`GET /`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`) somente
  para utilizadores internos ativos (CLIENT → 403), sempre escopados por
  `companyId`/`userId` da sessão.
- **E-mail transacional ao CLIENT** (via ResendProvider já existente) quando o
  agendamento é criado/atualizado/cancelado, com data/hora no timezone da
  empresa.
- **Notificações in-app** para todos os utilizadores internos da empresa no
  mesmo evento, persistidas como documentos `Notification`.
- **Frontend**: ícone de sino no Navbar com badge de não lidas, dropdown com a
  lista e ações de marcar como lida (individual e todas).

Restrições: nada de lembretes automáticos (24h/2h), nenhuma fila/job (BullMQ),
sem WhatsApp/SMS/push, sem WebSocket — apenas os 3 eventos transacionais.

---

## 2. CONTEXTO ANTERIOR

O backend já possuía:

- RBAC `authorize(...roles)` (`server/src/middlewares/role.middleware.ts`) com
  403 e `PasswordChangeMiddleware.requirePasswordChangeCompleted`.
- `ResendProvider` (`server/src/providers/mail/ResendProvider.ts`) e
  `Logger.email` para o envio de e-mails transacionais.
- `server/src/utils/timezone.ts` com `toCompanyDateTime` e
  `DEFAULT_TIMEZONE = "Europe/Lisbon"` (usado pelo Stage 27 para relatórios).
- Models/constantes relevantes: `Appointment` (com `status`, `notes`,
  `serviceId`/`employeeId`/`clientId`, `startAt`), `Client` (com `email`),
  `Service` (com `duration`), `User` (`role`, `companyId`, `isActive`).
- Padrão de módulos `server/src/modules/<modulo>/` com `repositories/`,
  `services/`, `validators/`, `controllers/`, `routes/`; mensagens em
  `server/src/constants/http-messages.ts`; `ResponseHandler`
  (`server/src/core/response.ts`); `AppointmentService` criado/atualizado no
  Stage 26.
- Frontend: padrão de páginas com Redux Toolkit, `auth`/`company` slices,
  Bootstrap 5, `session.user.role` para gating, `Navbar.tsx` com área
  autenticada e menu p/ `getXAbilities`.

---

## 3. PROBLEMA ENCONTRADO

1. **Não existia nenhum conceito de notificação** no domínio (tabela, serviço
   ou UI) — apenas e-mails transacionais da Stage 21/26 (boas-vindas, reset),
   sem padrão de templates de agendamento.
2. **Não havia onde encaixar o envio do e-mail/envelope do cancelamento sem
   duplicar lógica**: o cancelamento passa por `AppointmentService.changeStatus`
   (que também trata confirmar/completar/no-show) e por `delete`/expiração.
   Precisou de uma decisão explícita de onde disparar.
3. **Vitest v4 (`--pool`/`--poolOptions`)**: ao rodar vários arquivos de teste
   jsdom de uma vez no Windows, os workers travam com *"Timeout waiting for
   worker to respond"*; `--poolOptions` nem é opção CLI (CACError). Mitigado
   rodando arquivos individualmente (o full-suite funciona).
4. **`NotificationMapper`/`NotificationRepository`/`Dispatcher` tinham ramos
   sem cobertura** no primeiro levantamento (ex.: metadados ausentes, lista de
   destinatários vazia, serviço/funcionário inexistentes) — cobertos com testes.

---

## 4. IMPLEMENTAÇÃO

### Backend — módulo `notifications`

Novo módulo `server/src/modules/notifications/`:

| Arquivo | Responsabilidade |
|---------|------------------|
| `models/Notification.model.ts` | Schema/índice composto `{companyId, createdAt}`; campos `userId`, `type`, `title`, `message`, `metadata` (ids de appointment/client/service/employee), `readAt` |
| `repositories/NotificationRepository.ts` | `findById`, `createMany` (guarda lista vazia), `findByUser` (sort `createdAt: -1`, limit default 50), `countUnread`, `markAsRead`, `markAllAsRead` (`modifiedCount ?? 0`) |
| `mappers/NotificationMapper.ts` | Documento → resposta JSON (metadados/readAt nulos; `createdAt`/`updatedAt`/`readAt` como ISO string) |
| `index.ts` | `NotificationType` enum (`APPOINTMENT_CREATED \| APPOINTMENT_UPDATED \| APPOINTMENT_CANCELLED`), tipos `CreateNotificationData`, `NotificationResponse`, `ListNotificationsResult` etc. |
| `validators/list-notifications.validator.ts` | `limit` int opcional 1..50 (default 50); `validateObjectId("id")` nas rotas `:id` |
| `services/NotificationService.ts` | Lista, contagem de não lidas, marcar uma (404 `NOTIFICATION_NOT_FOUND`), marcar todas |
| `services/NotificationDispatcher.ts` | Orquestra o evento → notificações internas + e-mail CLIENT (best effort) |
| `controllers/NotificationController.ts` | Handlers com `ResponseHandler.success` |
| `routes/NotificationRoutes.ts` | Rotas + guards |

Rotas:

```
GET    /api/notifications                 → lista (limit 1..50, default 50)
GET    /api/notifications/unread-count    → { unreadCount }
PATCH  /api/notifications/read-all        → { markedRead }
PATCH  /api/notifications/:id/read        → notificação atualizada (404 se não existe/não pertence)
```

Guards das rotas (mesma cadeia do restante da API):

```
AuthMiddleware.authenticate
  → PasswordChangeMiddleware.requirePasswordChangeCompleted
  → authorize(Role.OWNER, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)   // CLIENT → 403
  → listNotificationsValidator().validate() / validateObjectId("id")
  → validateRequest
```

`read-all` é registrada **antes** de `:id` para não colidir. `companyId`/`userId`
vêm **sempre** de `req.user`.

### Dispatcher (`NotificationDispatcher.ts`)

`dispatchAppointmentEvent(input)` — fluxo best effort (nunca lança; tudo em
try/catch com `Logger.error`):

1. `EVENT_CONTEXT[input.type]` mapeia tipo → `{ title, emailSubject,
   emailTemplate }`; tipo desconhecido → sai.
2. Busca empresa (fallback `timezone`/nome), cliente, serviço e funcionário.
3. Cliente inexistente na empresa → sai sem e-mail e sem notificações.
4. `dispatchInternalNotifications`: `UserRepository.findByCompanyId` filtrado
   por `role !== CLIENT && isActive`; cria `Notification` para cada um (título
   e mensagem montados com data/hora no timezone da empresa, ex.:
   `Maria — Corte de cabelo em 30/08/2026 às 18:00.`); sem destinatários → sai
   (e-mail ainda segue).
5. `dispatchClientEmail`: só quando `Client.email` existe; endTime =
   `startAt + service.duration*120000→min` no timezone da empresa; envia via
   `resendProvider.send` com `subject: "SchedulerPro — Seu agendamento foi
   ..."` e o template correspondente; registra `logger.email` (ou erro).

`AppointmentService` chama `dispatchAppointmentNotification` **após** a
mutação persistida, envolvendo a chamada em try/catch (dupla proteção):

- `create` → `APPOINTMENT_CREATED`
- `update` → `APPOINTMENT_UPDATED`
- `changeStatus` quando `newStatus === CANCELLED` → `APPOINTMENT_CANCELLED`
- **Não** dispara para confirmar/completar/no-show/`delete`/expiração
  automática (`cancelOverdueScheduled`).

### Templates de e-mail

`server/src/providers/mail/templates/`:

| Arquivo | Conteúdo |
|---------|----------|
| `appointment-email-layout.ts` | Layout base + `AppointmentEmailData` (clientName, companyName, serviceName, employeeName, dateLabel, timeLabel, endTimeLabel, notes) |
| `appointment-created.template.ts` | `statusLabel: "Agendamento confirmado"` |
| `appointment-updated.template.ts` | `statusLabel: "Agendamento atualizado"` |
| `appointment-cancelled.template.ts` | `statusLabel: "Agendamento cancelado"` |

Alterações em arquivos existentes:

- `server/src/constants/http-messages.ts`: seção `/*Notificações*/`
  (`NOTIFICATIONS_FOUND`, `NOTIFICATION_NOT_FOUND`, `NOTIFICATION_READ`,
  `NOTIFICATIONS_READ`, `NOTIFICATION_UNREAD_COUNT_FOUND`).
- `server/src/routes/index.ts`: `router.use("/notifications",
  notificationRoutes)`.
- `server/src/modules/appointments/services/AppointmentService.ts`: método
  privado `dispatchAppointmentNotification(appointment, type)` + chamadas nos
  3 pontos (create/update/changeStatus-cancel).

### Frontend

| Arquivo | Conteúdo |
|---------|----------|
| `client/src/types/notification.ts` | `Notification`, `NotificationType`, `NotificationMetadata` |
| `client/src/api/endpoints/notifications.api.ts` | `notificationsApi` (default): `getNotifications({limit?})`, `getUnreadCount()`, `markAsRead(id)`, `markAllAsRead()` |
| `client/src/components/layout/NotificationBell.tsx` | Sino com badge de não lidas, dropdown com lista (loading/empty/error), marcar uma e marcar todas, fecha ao clicar fora |
| `client/src/components/layout/Navbar.tsx` | Renderiza `<NotificationBell />` na área autenticada (antes do bloco do usuário) |

`NotificationBell.tsx` detalhes:

- `user.role === "CLIENT"` → renderiza `null` (never p/ CLIENT).
- Estado local (`useState`) — **sem** novo global no Redux (decisão documentada).
- `getUnreadCount` no mount (falha ignorada), `getNotifications` ao abrir;
  badge some com 0 não lidas.
- Marcar individual: otimista (atualiza lista + badge); falha → reverte e
  restaura a contagem; cliques em itens já lidos são ignorados.
- Marcar todas: estado "A marcar...", falha → erro inline mantendo a lista.

---

## 5. DECISÕES TÉCNICAS

1. **Notificação interna = todos os utilizadores internos ativos (role ≠
   CLIENT), incluindo quem executou a ação**: o ator **não** é excluído —
   acompanhar a agenda em família (e o próprio staff precisa do rastro).
2. **E-mail apenas para `Client.email` persistido**: cliente sem e-mail não
   gera erro nem e-mail; cliente não encontrado → não há notificações **nem**
   e-mail.
3. **Disparo do cancelamento dentro de `changeStatus`** (`newStatus ===
   CANCELLED`): garante documento já atualizado; confirmar/completar/no-show/
   delete/expiração automática **não** notificam.
4. **Best effort em duas camadas**: `NotificationDispatcher` nunca lança (todo
   try/catch + `Logger.error`), e `AppointmentService` ainda envolve a chamada
   em try/catch — o agendamento nunca falha por causa de notificação.
5. **`limit` default 50, validado 1..50** (sem paginação por cursor — mesmo
   racional do Stage 27; superfície pequena).
6. **`read-all` antes de `:id`** nas rotas; `validateObjectId("id")` aplicada
   nas ações por id; `companyId`/`userId` sempre de `req.user` (nunca do body).
7. **Frontend com estado local** (sem fatia Redux nova): necessidade de
   notificações é pontual (Navbar) — evita invalidar `React.Context`/sagas.
8. **Data/hora no timezone da empresa** (mesma util `toCompanyDateTime` do
   Stage 27); o e-mail recebe rótulos já formatados em pt-PT.

---

## 6. O QUE NÃO FOI ALTERADO

- **RBAC/roles/permissões existentes**; nada de permissão nova.
- **Política de sessão** (cookies/refresh/idle) — apenas guards reutilizados.
- **Agendamentos**: `AppointmentRepository`/modelos **não** mudaram (só o
  `AppointmentService` ganhou a chamada ao dispatcher).
- **Portal CLIENT, dashboard, calendário, relatórios** — intocados.
- **Não implementado** (conscientemente, fora do escopo): lembretes automáticos
  24h/2h, cron/scheduler/BullMQ/Redis, WhatsApp/SMS/push, preferências de
  notificação por utilizador, exclusão/limpeza de notificações antigas, centro
  de notificações avançado, WebSocket/Socket.IO (tempo real), redesign do sino,
  integração de calendário (ICS), links de confirmação/cancelamento público,
  configuração por empresa (sender, templates customizados).

---

## 7. TESTES

### Backend — 44 arquivos / 467 testes: PASS

(antes: 41 arquivos / 449 testes → +18 testes: 3 arquivos novos + 3 casos
adicionados ao `NotificationDispatcher.test.ts`)

- `server/tests/unit/notifications/NotificationService.test.ts` (7) — listar
  com limit/default, limite 0/>50 normalizados, umread-count, marcar uma (ok e
  404), marcar todas.
- `server/tests/unit/notifications/NotificationDispatcher.test.ts` (11) —
  destinatários internos ativos (exclui inative/CLIENT), título/mensagem no
  timezone da empresa, e-mail ao cliente, sem e-mail (email ausente / cliente
  inexistente), falhas de envio/persistência não propagadas, assunto/título por
  tipo, tipo desconhecido, sem destinatários internos (e-mail continua),
  fallback de serviço/funcionário com duração 0.
- `server/tests/unit/notifications/NotificationMapper.test.ts` (2) —
  notificação completa (metadata/readAt presentes) e ausentes (null).
- `server/tests/unit/notifications/NotificationRepository.test.ts` (9) —
  findById, createMany (vazio e com itens), findByUser (sort/limit 25/default
  50), countUnread, markAsRead (filtro companyId/userId + `new:true`),
  markAllAsRead (modifiedCount e `?? 0`).
- `server/tests/unit/providers/mail-templates.test.ts` (4) — os 3 templates +
  layout (dados ausentes e "Serviço"/"Profissional" com hífen).
- `server/tests/integration/routes/notification.routes.test.ts` (11) — auth +
  repos mockados: 200 listar/unread-count/marcar, 404 individual, read-all,
  CLIENT 403, escopo por sessão, limit inválido 400, id inválido 400.
- `server/tests/unit/appointments/AppointmentService.test.ts` — atualizado com
  mock do `NotificationDispatcher` (create/update/changeStatus-cancel) sem
  regressão.

### Frontend — 79 arquivos / 846 testes: PASS

(antes: 77 arquivos / 826 testes → +20 testes: 2 arquivos novos +
`App.test.tsx` e `Navbar`/`AppLayout` atualizados)

- `client/src/api/endpoints/notifications.api.test.ts` (6) — URLs, params e
  propagação de erro dos 4 métodos.
- `client/src/components/layout/NotificationBell.test.tsx` (14) — CLIENT oculto;
  badge com/sem não lidas; falha na contagem ignorada; dropdown abre (marcando
  0 como não lidas no load inicial); lista vazia/eerro; marcar uma (e clique em
  já lida ignorado); rollback quando a API falha; marcar todas (êxito, erro,
  estado "A marcar..."); fechar ao clicar fora.
- `client/src/components/layout/Navbar.test.tsx` (6) e `AppLayout.test.tsx`
  (9) — mock de `notifications.api`; sino presente na área autenticada.
- `client/src/app/App.test.tsx` — agora mocka `notifications.api`.

---

## 8. COVERAGE

### Backend — módulo `notifications` (filtrado com
`--coverage.include=src/modules/notifications/**`)

| Métrica | Resultado |
|---------|-----------|
| Statements | 97.32% |
| Branches | 93.61% |
| Functions | 100% |
| Lines | 97.29% |

`NotificationDispatcher.ts`: Statements 100% | Branches 87.50% | Funcs 100% |
Lines 100% (ramos restantes: fallbacks de nome/timezone da empresa). O model e
o repository são mockados nos testes (mesmo padrão das stages anteriores).

### Backend — suite completa (`npm run test:coverage`)

| Métrica | Stage 27 | Stage 28 |
|---------|----------|----------|
| Statements | 74.19% | **74.25%** |
| Branches | 72.18% | **72.49%** |
| Functions | 59.11% | **59.37%** |
| Lines | 74.46% | **74.52%** |

### Frontend (`npm run test:coverage`)

| Métrica | Stage 27 | Stage 28 |
|---------|----------|----------|
| Statements | 95.94% | **96.07%** |
| Branches | 90.78% | **90.64%** |
| Functions | 96.45% | **96.62%** |
| Lines | 96.16% | **96.27%** |

`NotificationBell.tsx`: Lines 100% | Statements 100% | Functions 100% |
Branches 85.18%.

---

## 9. TYPECHECK

- Frontend: `npm run typecheck` (tsc -b --noEmit) **sem erros**.
- Backend: `npm run build` (tsc) **sem erros**.

---

## 10. BUILD

- Frontend: `npm run build` **OK**. Aviso pré-existente (já reportado, fora de
  escopo): chunk `index--CTN6vljz.js` 531.55 kB (> 500 kB, sem code-splitting
  solicitado — ver Stage 27 §10/§12).
- Backend: `npm run build` **OK**.

---

## 11. PROBLEMAS ENCONTRADOS

1. **Vitest worker timeout no Windows**: vários arquivos jsdom em paralelo →
   *"Timeout waiting for worker to respond"*. Rodar os arquivos
   individualmente ou o full-suite resolve; a flag `--poolOptions` nem é
   suportada no CLI (CACError: Unknown option).
2. **Typecheck frontend**: fixture de `NotificationBell.test.tsx` ampliava o
   literal `type` para `string` (incompatível com `NotificationType`) →
   tipada a factory com `Partial<Notification>` e cast do tipo.
3. **Asserção incorreta no dispatcher**: "sem utilizadores internos" **ainda
   envia o e-mail** ao CLIENT (comportamento intencional) — teste corrigido.
4. **Templates sem cobertura inicialmente** (0%): os arquivos novos de
   template não eram importados por nenhum teste além do dispatcher (que usa o
   template real, mas o mapeamento só apareceu filtrado ao adicionar
   `mail-templates.test.ts`).
5. **`App.test.tsx`** renderiza Navbar → sino dispara `getUnreadCount`; sem
   mock a chamada real falhava (o bell ignora, mas o teste ganhou o mock para
   determinismo).

---

## 12. ESTADO FINAL

- Implementação concluída: **sim** (backend + frontend + testes + docs).
- Testes backend: 44 arquivos / **467** testes PASS.
- Testes frontend: 79 arquivos / **846** testes PASS.
- Coverage frontend: Lines **96.27%** | Statements 96.07% | Branches 90.64% |
  Functions 96.62% (acima da Stage 27).
- Coverage module notificações (backend): Lines **97.29%** | Funcs 100%.
- Typecheck frontend: **OK**.
- Build frontend e backend: **OK** (warning de chunk pré-existente).
- **Commit / merge / push: NÃO realizados** (conforme regra da task).

---

## CONTEXTO PARA A PRÓXIMA IA

Estado deixado pela Stage 28:

- Módulo de notificações em `server/src/modules/notifications/` + rotas
  `/api/notifications`; e-mails CLIENT com templates em
  `server/src/providers/mail/templates/appointment-*.template.ts`; sino de
  notificações em `client/src/components/layout/NotificationBell.tsx`
  renderizado no `Navbar.tsx`.

Pontos de atenção antes de modificar:

1. **Há arquivos não commitados de stages anteriores (ex.: Stage 26.6)** — o
   utilizador gerencia git manualmente. **Não fazer commit/merge/push.**
2. **Nada de lembretes/agendamentos automáticos foi implementado.** Se uma
   stage futura os adicionar (24h/2h, cron/BullMQ/Redis), os pontos de
   entrada são: novo `dispatchAppointmentEvent` (ou novo tipo de evento), o
   `EVENT_CONTEXT` em `NotificationDispatcher.ts` e a disponibilização do
   `AppointmentRepository` para consultas futuras (ex.: "scheduled nas
   próximas 2h"). O disparo `rebote` hoje acontece **somente** em
   `AppointmentService.create/update/changeStatus`.
3. **O ator não é excluído dos destinatários** (decisão deliberada) e o e-mail
   sai **antes/independentemente** das notificações internas; sem destinatários
   internos o e-mail ainda é enviado. Se alterar, atualizar
   `NotificationDispatcher.test.ts`.
4. **`changeStatus` com `CANCELLED` notifica; confirmar/completar/no-show/
   delete/expiração automática não.** Se uma stage quiser notificar
   confirmação, avaliar onde notificar (hoje o status confirmado é definido no
   mesmo método) e acrescentar testes de regressão.
5. **Frontend sem Redux para notificações** (estado local do
   `NotificationBell`). Se for criar um centro de notificações, recomeçar por
   uma fatia Redux e migrar o sino (mantendo `NotificationBell.test.tsx`).
6. **`read-all` está antes de `:id`** em `NotificationRoutes.ts` e
   `validateObjectId("id")` protege as rotas `:id` — não reordenar sem
   atualizar `notification.routes.test.ts` (senão `/read-all` colide com `:id`).
7. **Chunk do build cresceu** (531.55 kB): considerar `React.lazy` na rota de
   notificações futuro — não introduzido por decisão de não fazer
   code-splitting nesta etapa.