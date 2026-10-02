# STAGE 31 — PARTE 2: LINK PÚBLICO DE ACESSO AO AGENDAMENTO (GET / PATCH / DELETE POR TOKEN)

## CONTEXTO PARA A PRÓXIMA IA

- Objetivo desta etapa: dar ao cliente final, que acabou de marcar por um link público, um link próprio para **consultar, alterar e cancelar** o agendamento — sem conta, sem login e sem `_id`.
- Rotas: `GET`, `PATCH` e `DELETE /api/public/appointments/:token`. Sem `AuthMiddleware`, sem `authorize`, sem `hasPermission`: o **token é a credencial**.
- O token é aleatório (32 bytes CSPRNG, base64url, 43 caracteres). Só o hash SHA-256 é guardado; a base de dados nunca vê o valor puro.
- A empresa vem do próprio agendamento. `companyId`, `clientId` e `_id` **não** são alternativas de acesso.
- Token malformado, token inexistente e agendamento eliminado soft devolvem o **mesmo 404 com a mesma mensagem**.
- `PATCH` só aceita `serviceId`, `employeeId`, `startAt`, `notes`. Tudo o resto é `400`, incluindo `status` e `endAt`.
- `PATCH` só corre em `scheduled`/`confirmed` ainda por acontecer. `cancelled`, `completed`, `no-show` e históricos são `400`.
- `DELETE` reutiliza `cancel()` administrativo. Nunca apaga, nunca reativa. Corpo não vazio é `400`.
- As regras de agenda (disponibilidade, exceções, conflitos) **não** foram duplicadas: passaram para dois helpers privados usados pela criação, pelo update administrativo e pelo PATCH público.
- Nenhum endpoint envia o link por e-mail/SMS e não existe frontend público. O token é entregue apenas na resposta da criação.

## 1. O QUE FOI FEITO

### 1.1 Provider do token

`server/src/providers/security/PublicAppointmentTokenProvider.ts` (novo)

- `generate()`: `randomBytes(32).toString("base64url")` → 43 caracteres sem `=`.
- `hash(token)`: `sha256:<hex>`, determinístico.
- `hasValidFormat(token)`: só rejeita o que é estruturalmente impossível (tamanho e caracteres base64url).
- `toDiagnosticHint(hash)`: 14 caracteres do digest, sem o prefixo.

Porquê SHA-256 e não bcrypt/argon2: o token tem 256 bits de entropia, logo não há ataque de dicionário; e a procura tem de ser por **igualdade** (`findOne`), o que é impossível com KDF de sal aleatório. Um KDF lento custaria um hash por pedido público sem benefício.

### 1.2 Schema

`server/src/modules/appointments/models/Appointment.model.ts`

- Novo campo `publicAccessTokenHash: { type: String, default: null, select: false }`.
- Novo índice único parcial `{ publicAccessTokenHash: 1 }` com `partialFilterExpression: { publicAccessTokenHash: { $type: "string" } }`.

`select: false` obriga a pedir explicitamente o hash, o que torna cada leitura rastreável no código. O índice é parcial porque um índice único simples faria o **segundo** agendamento administrativo (`null`) colidir com o primeiro. Agendamentos antigos e administrativos ficam com `null` e não são alcançáveis por link.

### 1.3 Repositório

`AppointmentRepository.findByPublicAccessTokenHash(hash)` — único caminho de resolução pública. Filtra `deletedAt: null` e projeta `+publicAccessTokenHash`.

Não existe setter do hash: o hash é gravado na **mesma** escrita do agendamento (§1.5), por isso não há método de escrita de token no repositório.

### 1.4 Contrato público

- `UpdatePublicAppointment.dto.ts` (novo): `PUBLIC_APPOINTMENT_UPDATE_FIELDS` = `serviceId`, `employeeId`, `startAt`, `notes`.
- `update-public-appointment.validator.ts` (novo): lista fechada de campos, `startAt` ISO 8601 com offset explícito, `notes` até 500 caracteres e `null` para limpar. Exporta também `rejectCancelBodyValidator`.
- `PublicAppointmentMapper` / `PublicAppointmentResult`: acrescenta `employee.avatarUrl` (apenas a URL; o `publicId` do storage nunca sai do backend). O mapper desconhece o hash, portanto não o pode vazar.
- `CreatePublicAppointmentResult`: `{ appointment, publicAccessToken }`.

`clientName`, `clientEmail` e `clientPhone` são recusados no PATCH com `400` porque o `Client` é um cadastro partilhado pela empresa; um link público não pode reidentificar um cliente que a empresa gere.

### 1.5 Serviço

`AppointmentService.ts`

- `resolveByPublicToken(token)`: formato → hash → repositório. Regista `appointmentId` e o hint de 14 caracteres; **nunca** o token puro nem o hash completo.
- `publicAppointmentNotFound()`: um único `AppError` para todas as falhas de token.
- `findPublicByToken`, `updatePublicByToken`, `cancelPublicByToken`.
- `assertPublicAppointmentIsEditable`: estados finais e agendamentos já iniciados são imutáveis.
- `createPublic`: gera o token, agenda com `publicAccessTokenHash` e devolve `{ appointment, publicAccessToken }`.
- `updatePublicByToken`: revalida **sempre** o serviço e o profissional efetivos (mesmo sem os enviar), recalcula `endAt` pela duração, exclui o próprio agendamento dos conflitos e nunca toca em `status`, `clientId` nem `publicAccessTokenHash`.
- `cancelPublicByToken`: `cancelled` → `200` idempotente sem escrita; `completed`/`no-show` → `400`; `scheduled`/`confirmed` → `cancel()` administrativo.
- Regras partilhadas: `ensureSlotIsAvailable()` e `ensureClientHasNoConflict()`, agora usadas por `schedule()`, `update()` e `updatePublicByToken()`.

### 1.6 HTTP

`PublicAppointmentController.ts` e `PublicAppointmentRoutes.ts`

Ordem de middlewares, deliberadamente igual em todas as rotas por token: rate limit → validação do corpo → handler. O limitador vem primeiro para que tokens tentados a erro ou a adivinhar também contem para o limite.

Não há `validateObjectId` nestas rotas: o `:token` não é um ObjectId, e validar o formato do path revelaria a quem chama a diferença entre um token malformado e um `_id` inválido.

`HttpMessages`: `PUBLIC_APPOINTMENT_NOT_FOUND` e `PUBLIC_APPOINTMENT_NOT_EDITABLE`.

### 1.7 Rate limit

`server/src/middlewares/public-appointment-link-rate-limit.middleware.ts` (novo)

| Rota | Limite | Janela |
|---|---|---|
| `GET /public/appointments/:token` | 60 | 15 min |
| `PATCH /public/appointments/:token` | 10 | 15 min |
| `DELETE /public/appointments/:token` | 10 | 15 min |

Três limitadores independentes porque os três métodos têm perfis de abuso diferentes: leitura é repetida por um frontend normal, escrita dispara notificações e é o que interessa a quem quer vandalizar ou inundar os clientes da empresa. A chave é `rota + IP`, pelo que esgotar o PATCH não impede a leitura, e o orçamento de cancelamento é separado do de remarcação. O IP vem **apenas** de `req.ip`: sem `trust proxy` configurado, `X-Forwarded-For` é controlado por quem faz o pedido.

### 1.8 Testes

| Ficheiro | Testes | Foco |
|---|---|---|
| `tests/unit/security/PublicAppointmentTokenProvider.test.ts` | 19 | Geração, formato, hash determinístico, hint de diagnóstico |
| `tests/unit/appointments/AppointmentService.public-link.test.ts` | 56 | Resolução, estados, regras de agenda, exclusão do próprio agendamento, cancelamento idempotente, revalidação de serviço/profissional |
| `tests/unit/repositories/appointment-public-token.repository.test.ts` | 4 | Filtro, `deletedAt` e projeção explícita do hash |
| `tests/unit/repositories/appointment-public-token.schema.test.ts` | 6 | `select: false`, `default: null`, índice único parcial, ausência de índice único simples |
| `tests/integration/public-appointment-link.routes.test.ts` | 76 | Contrato HTTP, 404 indistinguível, campos recusados, estados não editáveis, DELETE sem soft delete, ausência de autenticação, `PUT` inexistente |
| `tests/integration/public-appointment-link.rate-limit.test.ts` | 15 | Limites por omissão, janela, cabeçalhos, chave por IP, `X-Forwarded-For` ignorado, buckets independentes |
| `tests/unit/appointments/AppointmentService.test.ts` | 14 | Criação administrativa grava `null` e não expõe o hash |

Suite total: **941 testes em 69 ficheiros** (era 761 em 63 depois da Parte 1).

Dois testes de integração usam contadores simples em vez de `vi.fn` porque `restoreMocks` apagaria a implementação de um mock de middleware.

## 2. VERIFICAÇÃO

| Comando | Resultado |
|---|---|
| `npm test` | 941/941, 69 ficheiros |
| `npm run typecheck` | sem erros |
| `npm run build` | sem erros |
| `npm run test:coverage` | 80.51% statements, 79.18% branches, 69.79% functions |

Cobertura de todos os ficheiros novos e alterados: **100%** (provider do token, modelo, repositório, DTO, validator, mapper, controller, rotas, limitador de link). `AppointmentService` fica em 93.09% statements / 76.62% branches; o que falta é código antigo e não relacionado.

## 3. DECISÕES E ALTERNATIVAS DESCARTADAS

**Hash em vez de token em claro.** Um dump da base de dados não dá acesso utilizável. O índice único garante que dois agendamentos nunca partilham um hash.

**SHA-256 determinista em vez de bcrypt/argon2.** Ver §1.1. Com sal aleatório seria impossível localizar o agendamento por token.

**Gravação do hash na mesma escrita da criação.** A primeira implementação gravava o hash numa segunda escrita depois de `schedule()`. Com duas escritas, um agendamento podia ficar sem token (link inacessível) ou, pior, com um token que o cliente nunca recebeu. O hash passou a entrar no `create()`; o método `setPublicAccessTokenHash` foi removido do repositório por deixar de ter callers.

**Corpo do DELETE recusado, não ignorado.** Ignorar `{"status": ...}` devolveria `200` e o cliente concluiria que escolheu o estado final, quando foi o servidor que o decidiu. Recusar com `400` é inequívoco e é coerente com o PATCH. `{}` (ou ausência de body) continua aceite.

**Serviço e profissionais sempre revalidados no PATCH.** A versão anterior só validava os recursos enviados; um serviço entretanto desativado deixava o cliente preso a algo que já não existe. Custa uma leitura extra em cada PATCH.

**Regras de agenda em helpers privados, não duplicadas.** `updatePublicByToken` tinha uma cópia das verificações de disponibilidade e conflito. Passou a chamar `ensureSlotIsAvailable()`/`ensureClientHasNoConflict()`, exatamente como `schedule()` e `update()`. Uma exceção de disponibilidade tem agora a mesma mensagem e o mesmo status nas três portas de entrada.

**Update administrativo mantido sem guarda de estado/histórico.** É uma inconsistência pré-existente (`update()` ainda move um agendamento concluído). Fora do âmbito desta parte; a regra pública é nova e não altera a administrativa.

**Token sem expiração nem revogação.** Não há campo de validade nem endpoint de regeneração. Decisão consciente: revogação sem canal de entrega do novo link seria mais perigosa do que útil. Registado como limitação.

**Três limitadores em vez de um.** Ver §1.7.

**`avatarUrl` em vez de um objeto `avatar`.** O storage tem `url` e `publicId`; expor o `publicId` daria ao público uma chave do storage.

## 4. LIMITES CONHECIDOS

- O token nunca expira. Um link vazado dá acesso ao agendamento enquanto o cliente o tiver; só um novo agendamento resolve.
- Não existe revogação/regeneração de link, nem envio do link por e-mail/SMS/WhatsApp.
- Rate limit em memória e por IP: reiniciar o processo zera os contadores; várias instâncias dão contadores independentes.
- Sem CAPTCHA, WAF ou verificação de e-mail.
- Logs de acesso público guardam `appointmentId` e 14 caracteres do digest. É suficiente para diagnóstico, mas não permite reconstruir o token.
- `Client.phone` continua a poder ser `null` para clientes públicos (limitação herdada da Parte 1; o frontend não foi alterado).
- O índice composto `{ companyId, clientId, startAt }` está declarado duas vezes no schema. É pré-existente e inofensivo; ficou registado em `docs/api-contract.md` (API-09) em vez de mexido.
- Nenhum frontend consome estas rotas. O `publicAccessToken` só existe na resposta da criação.

## 5. O QUE ESTÁ PRONTO PARA A PRÓXIMA ETAPA

O caminho completo do cliente final está fechado: marca, recebe o link, consulta, remarca e cancela. O contrato está documentado em `docs/api-contract.md`.

Próximos passos naturais, por ordem:

1. **Frontend da página pública** (`/agendar/:token`), que consuma as três rotas e trate o `404` como "link inválido ou agendamento não encontrado".
2. **Envio do link** por e-mail (reutilizando `NotificationDispatcher`) e, se fizer sentido, por WhatsApp, com decisão explícita sobre o telefone que hoje não é persistido.
3. **Revogação/regeneração** de link, com um campo de validade e um `POST` autenticado que regenere o hash.
4. **`Appointment.source`** (`public`/`admin`), agora que o token permite distinguir a origem sem ambiguidade.
5. **Limites distribuídos** quando houver mais do que uma instância.