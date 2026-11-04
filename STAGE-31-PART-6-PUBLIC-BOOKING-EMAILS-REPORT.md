# Stage 31 — Parte 6: Emails do Agendamento Público

## Objetivo

Permitir que quem agenda pela Internet receba o link de gestão do agendamento por email, em vez de depender de o copiar da tela.

O objetivo declarado na prompt era "implementar a comunicação por email do agendamento público" nos três eventos (criação, alteração, cancelamento). **A investigação mostrou que os três emails já existiam e já eram enviados pelo fluxo público.** O que não existia era o link. Esta etapa, por isso, não acrescenta um sistema de email: acrescenta o link a um sistema que já estava lá e que estava a ser aproveitado a 100% — apenas sem a peça que torna o email útil.

## Escopo

Implementado:

- Bloco "Gerenciar meu agendamento" nos emails de agendamento, com link absoluto para `/agendar/:token`.
- Encaminhamento do token público puro desde o serviço de agendamentos até ao template, nos três eventos do fluxo público.
- Utilitário único que constrói a URL a partir de `FRONTEND_URL`.

 Deliberadamente **não** implementado:

- Segundo provider de email, novo template engine, novo sistema de notificações.
- Lembretes, SMS, WhatsApp, push, fila, tracking, unsubscribe, marketing, i18n.
- Alterações ao frontend. O e-mail **não** é indicado no ecrã de confirmação: o backend não devolve um estado confiável de envio, e afirmar "email enviado" sem isso seria mentira.
- Novas rotas, novos campos, novo modelo de dados, migrações.
- Email de acompanhamento para quem chegou a `/agendar/empresa/:companyId` mas não conclude: não é um evento de agendamento e não há nada a notificar.

## Infraestrutura de email encontrada

O projeto já tinha **tudo** o necessário. Nada foi criado do zero.

| Peça | Localização | Estado |
| --- | --- | --- |
| Provider | `src/providers/mail/ResendProvider.ts` | Já existia. Singleton, `new Resend(env.email.RESEND_API_KEY)`, `from` = `MAIL_FROM`. Lança `AppError` se a API devolver `error` (o SDK não lança). |
| Abstração | `src/providers/mail/EmailProvider.ts` + `types.ts` | Já existia. `IEmailProvider.send({to, subject, html})`. |
| Orquestrador | `src/modules/notifications/services/NotificationDispatcher.ts` | **Já era o serviço de email.** Não existe `EmailService` nem `modules/email`. |
| Templates | `src/providers/mail/templates/appointment-{created,updated,cancelled}.template.ts` | **Já existiam os três**, todos delegando em `appointment-email-layout.ts`. |
| Config | `src/config/env.ts` → `env.email.{RESEND_API_KEY, MAIL_FROM}`, `env.frontend.FRONTEND_URL` | **Já existia `FRONTEND_URL`.** |
| Logger | `src/providers/logger/Logger.ts` → `.email()` / `.error()` | Já existia, com categoria `[EMAIL]`. |

### Descoberta determinante

Os três emails de agendamento **já eram disparados pelo fluxo público**, porque `AppointmentService` partilha o mesmo funil de notificações:

| Evento | Ponto de disparo | Email já enviado? |
| --- | --- | --- |
| Criação pública | `createPublic` → `schedule()` → `APPOINTMENT_CREATED` | **Sim** |
| Alteração pública | `updatePublicByToken` → `APPOINTMENT_UPDATED` | **Sim** |
| Cancelamento público | `cancelPublicByToken` → `cancel()` → `changeStatus()` → `APPOINTMENT_CANCELLED` | **Sim** |

Consequência: **qualquer implementação que adicionasse um "email público" novo teria produzido dois emails para o mesmo evento** — o existente e o novo. Toda a prevenção de duplicação passou a ser requisito de desenho, não de teste.

## Arquitetura implementada

Nenhum novo módulo. Foi preciso **encaminhar um valor em memória** de `AppointmentService` até ao template, por três camadas que já existiam.

```
AppointmentService                    (fluxo público: tem o token puro)
  └─> NotificationDispatcher          (monta o link, chama o template)
        └─> appointmentEmailLayout    (bloco opcional)
              └─> ResendProvider      (inalterado)
```

Fluxo de dados do token:

1. `AppointmentService` obtém o token puro de uma de três fontes, todas em memória.
2. Passa-o como `publicAccessToken` no `AppointmentNotificationInput`.
3. O `NotificationDispatcher` transforma-o em URL com `buildPublicManageUrl`.
4. O template recebe a **URL**, nunca o token: a camada de apresentação não conhece o formato da credencial.

O domínio não conhece a Resend; o controller não conhece o Resend; o repository não sends nada.

### Como o token puro é obtido em cada evento

| Evento | Origem do token puro |
| --- | --- |
| Criação | Gerado em `createPublic` (`publicTokenProvider.generate()`), **antes** de `schedule()`. |
| Alteração | O token que o cliente apresentou na URL — `updatePublicByToken(token, …)`. |
| Cancelamento | O token que o cliente apresentou na URL — `cancelPublicByToken(token)`. |

Este é o ponto que a prompt sinalizava como de risco, e a resposta é melhor do que o pior caso temido: **os três eventos têm o token puro em memória, sem alterar o modelo de dados.** A criação tem-no porque acabou de o gerar; alteração e cancelamento têm-no porque o cliente o está a usar neste preciso instante para se autenticar. Não é preciso persistir nada, nem derivar nada, nem guardar uma segunda cópia.

O hash continua a ser a única coisa na base de dados, na mesma escrita de sempre.

## Email de criação

`POST /api/public/companies/:companyId/appointments` → já disparava `APPOINTMENT_CREATED`. Passa agora a incluir o link.

O bloco entra no e-mail de confirmação partilhado com `appointmentEmailLayout`:

```html
<p>
  Pode consultar, alterar ou cancelar este agendamento através
  do link abaixo:
</p>

<div style="margin: 32px 0;">
  <a href="https://<FRONTEND_URL>/agendar/<token>" …>
    Gerenciar meu agendamento
  </a>
</div>
```

Não foi criado um template novo para o fluxo público: o layout existente já mostrava serviço, profissional, data e horário corretamente. Um template "public-created" seria uma cópia divergente.

## Email de alteração

`PATCH /api/public/appointments/:token` → já disparava `APPOINTMENT_UPDATED`, agora com link.

Comportamento herdado e mantido: **notifica sempre**, mesmo quando só as observações mudam. A prompt diz explicitamente para não comparar campos para decidir. `updatePublicByToken` substitui `notes` sem condição, pelo que qualquer alteração gera um e-mail — sem abusing, porque alterar o próprio agendamento é uma ação deliberada.

O link continua válido: o `publicAccessTokenHash` não entra no update, pelo que o hash — e portanto o link — é o mesmo antes e depois.

## Email de cancelamento

`DELETE /api/public/appointments/:token` → já disparava `APPOINTMENT_CANCELLED`, agora com link.

O token atravessa `cancelPublicByToken` → `cancel()` → `changeStatus()` até ao dispatcher. Isto obrigou a um parâmetro opcional novo em `cancel(id, companyId, publicManageToken?)`. A rota administrativa continua a chamar com dois argumentos e a não enviar token.

**Não** se oferece link para nova marcação: o e-mail de cancelamento não tem contexto de onde extrair um link de booking, e inventar um (por e-mail, ou por empresa) seria inventar um identificador que a prompt não autorizou.

## Templates

Nenhum ficheiro de template novo. `appointment-email-layout.ts` ganhou um campo opcional:

```ts
publicManageUrl?: string | null;
```

O bloco é renderizado por guarda de veracidade. Três decisões:

1. **Opcional, não obrigatório.** O template é partilhado com o fluxo administrativo, onde o agendamento não tem token público. Um campo obrigatório forçaria `null` em todo o lado e um botão partido em todo o lado.
2. **Ausência de link não é erro.** É o caso normal e mais frequente: todo o agendamento criado pela administração. O bloco desaparece e o e-mail fica igual ao que era.
3. **O template recebe a URL, não o token.** A camada de apresentação não conhece nem o comprimento, nem o formato, nem o encoding da credencial. Se o mecanismo de token mudar, o template não muda.

Não há escape de HTML em nenhum template do projeto (já era assim antes desta etapa). Não introduzi um padrão diferente num ficheiro que os outros não seguem — mas também não ampliei a exposição: o campo novo é uma URL construída pelo servidor, nunca texto do cliente. As `notes` já interpoladas raw são pré-existentes.

## Provider

**Nenhum provider novo.** `ResendProvider` continua a ser o único, inalterado, sem sequer uma linha de modificação. Não existe `EmailProvider` novo nem interface nova: `IEmailProvider` já era exatamente a abstração pedida.

A abstração não foi ampliada (`cc`, `text`, `replyTo`, anexos) porque nada nesta etapa precisa dela e o destinatário é único.

## Configuração

**Nenhuma variável nova.** `env.frontend.FRONTEND_URL` já existia e era usada por `AuthService`/`UserService` para `/login`, `/reset-password` e `/verify-email`.

A única fonte de URL do frontend para e-mails continua a ser essa. Não há domínio hardcoded em lado nenhum.

A configuração tem duas propriedades relevantes:

- **Obrigatória?** Não. `FRONTEND_URL || "http://localhost:5173"` e não está na lista de `validateEnv()` (`MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET`).
- **Efeito de a faltar:** não há crash. O agendamento é criado e o e-mail vai com o link a apontar para `localhost`, que é o comportamento correto em desenvolvimento e uma falha de configuração visível, não silenciosa.

`RESEND_API_KEY` também é opcional e não está na validação: `new Resend("")` não rebenta no arranque, e a falha só aparece no envio — onde é apanhada e registada.

## Tratamento de falha

O requisito descrito como crítico na prompt **já estava satisfeito** e não foi alterado:

```
Appointment criado → Resend falha → Appointment continua criado
```

A cadeia que garante isto, toda pré-existente e agora com testes próprios:

1. `NotificationDispatcher.dispatchClientEmail` envolve `resendProvider.send()` num `try/catch` local e regista com `logFailure`. **Não relança.**
2. `NotificationDispatcher.dispatchAppointmentEvent` envolve tudo noutro `try/catch` e também não relança.
3. `AppointmentService.dispatchAppointmentNotification` tem um terceiro `try/catch`.

Um cliente nunca recebe "Agendamento não criado" por causa de email. Três testes novos fixam-no explicitamente, incluindo o caso que mais importa: **se o email de criação falhar, o cliente continua a receber o `publicAccessToken` na resposta** — porque é a única cópia que ele terá, e perdê-la por causa de um email seria catastrophicamente errado.

## Segurança

**Multi-tenant.** O destinatário é `clientRepository.findByIdAndCompany(clientId, companyId)`, onde `companyId` vem do próprio agendamento. O `companyId` do corpo nunca entra: o `CreatePublicAppointmentDto` recusa campos desconhecidos e `createPublic` recebe o tenant da URL. Um cliente não consegue provocar envio para outra empresa — se o `clientId` não pertencer à empresa, o dispatcher aborta **antes** de enviar (return em `if (!client)`). Teste próprio.

**Token não persistido.** `publicManageToken` nunca entra numa escrita. O `appointmentRepository.create` recebe o hash, na mesma escrita de sempre. Teste de integração afirma que o token puro não aparece em nenhum sítio do objeto persistido.

**Token não registado.** Nem em sucesso nem em falha. O `meta` dos logs leva `appointmentId`, `companyId` e `type` — nunca o token. Dois testes verificam, serializando todos os argumentos de logger, que o token não aparece.

**Hash nunca usado como token.** `buildPublicManageUrl` só recebe token puro; o hash `sha256:...` não produz link. Teste em três camadas.

**Token com formato inválido.** O dispatcher nunca o vê: `resolveByPublicToken` devolve 404 antes de qualquer notificação. Teste afirma que um token inválido não notifica.

**Falha sem notificar.** 404, transição de status inválida, agendamento já cancelado (idempotente) — nenhum chega ao dispatcher. Três testes.

**Escape do link.** `encodeURIComponent` é aplicado. O token gerado é base64url e não precisa, mas um token com `?`, `#` ou `&` não consegue escapar do atributo `href` nem transformar o path em query. Teste próprio.

## Privacidade

Não foi acrescentado nenhum log. O que já existia mantém-se:

- `Logger.email` escreve o e-mail do destinatário na mensagem (`E-mail de agendamento enviado para …`) e `to:` no `meta`. **Pré-existente**, não introduzido aqui, e fora do âmbito desta etapa mexer.
- `Logger.error` na falha de envio também leva `to:`. Idem.
- O `meta` **não** inclui token, hash, telefone nem observações.

A URL do link **não** é registada. Só o HTML a contém, e o HTML vai para o Resend, não para os logs.

## Timezone

**Não foi alterado** — e não tinha de ser. `NotificationDispatcher` já formatava com `toCompanyDateTime(startAt, timezone)`, com `timezone = company.timezone` (fallback `DEFAULT_TIMEZONE`).

Nenhum `Europe/Lisbon` hardcoded foi introduzido: o meu único utilitário novo (`public-manage-url`) não toca em datas. As datas e horas que aparecem no e-mail com o link são as mesmas que já apareciam, com a mesma origem de timezone.

Testes existentes de timezone e DST no dispatcher e no `ReminderService` continuam a passar sem alteração.

## Logs

Nenhum log novo. Reutiliza-se o existente:

| Situação | Nível | Mensagem | Meta |
| --- | --- | --- | --- |
| Sucesso | `Logger.email` | `E-mail de agendamento enviado para <email>` | `appointmentId`, `companyId`, `type` |
| Falha | `Logger.error` | `Falha ao notificar o e-mail de <tipo do evento>` | + `error` |

Ambos são pré-existentes. O `meta` **não** ganhou o token — decisão deliberada e coberta por teste.

## Testes

**45 testes novos** em 6 ficheiros (dos quais 1 novo). Nenhum teste pré-existente foi alterado para passar; o único ajuste a ficheiro existente foi acrescentar `vi.mock` de `config/env` ao teste do dispatcher, para tornar `FRONTEND_URL` determinístico.

| Ficheiro | Testes | Cobre |
| --- | --- | --- |
| `tests/unit/utils/public-manage-url.test.ts` **(novo)** | 7 | URL absoluta, barra final, barras múltiplas, caminho base, esquema/porta, base64url preservado, escape de caracteres hostis |
| `tests/unit/providers/mail-templates.test.ts` | +8 | Link nos 3 templates, omissão sem link, omissão com `null`, ausência de `undefined`/`null`/`[object Object]`/`NaN`, hash ausente, dados preservados |
| `tests/unit/notifications/NotificationDispatcher.test.ts` | +13 | Link em criação/alteração/cancelamento (`it.each`), omissão nos mesmos 3 no administrativo, token nulo, **exatamente 1 e-mail**, token ausente dos logs de sucesso e de falha, destinatário de outra empresa bloqueado, cliente sem e-mail |
| `tests/unit/notifications/AppointmentNotificationDispatch.test.ts` | +11 | Token na criação/alteração/cancelamento públicos, **token == o devolvido na resposta**, ausência de token no administrativo, 404 não notifica, transição inválida não notifica, idempotência, **email falhado não desfaz criação/alteração/cancelamento** |
| `tests/integration/public-appointment.routes.test.ts` | +2 | Token no dispatcher == `response.body.data.publicAccessToken`; hash persistido e token puro ausente do objeto gravado |
| `tests/integration/public-appointment-link.routes.test.ts` | +4 | Token da URL no PATCH e no DELETE, nunca o hash |

Sobre os testes de segurança pedidos na prompt:

| Requisito | Onde |
| --- | --- |
| Token não aparece em logs | `NotificationDispatcher.test.ts` (sucesso + falha) |
| Hash não usado como token público | 3 ficheiros |
| Email não enviado a Client de outra empresa | `NotificationDispatcher.test.ts` |
| Operações falhadas não enviam email | `AppointmentNotificationDispatch.test.ts` (404, transição inválida) |
| 404 não envia email | `AppointmentNotificationDispatch.test.ts` |
| 409 não envia email | Coberto pela arquitetura: o 409 é lançado por `ensureSlotIsAvailable` / `ensureClientHasNoConflict` **antes** do `update` e portanto antes de `dispatchAppointmentNotification`. Não havia teste específico e não adicionei um, para não duplicar a cobertura das Partes 1/4. |

## Cobertura

**Global** (comparado com o registado no relatório da Parte 4):

| | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Parte 4 (baseline) | 81.54% | 80.19% | 71.42% | 81.73% |
| **Parte 6** | **81.61%** | **80.31%** | **71.73%** | **81.81%** |

**Ficheiros tocados:**

| Ficheiro | Stmts | Branch | Funcs | Lines |
| --- | --- | --- | --- | --- |
| `src/utils/public-manage-url.ts` **(novo)** | 100% | 100% | 100% | 100% |
| `src/providers/mail/templates/appointment-email-layout.ts` | 100% | 100% | 100% | 100% |
| `src/modules/notifications/services/NotificationDispatcher.ts` | 100% | 92.30% | 100% | 100% |
| `src/modules/appointments/services/AppointmentService.ts` | 92.21% | 82.81% | 93.33% | 92.21% |

As branches por cobrir no dispatcher são as defensivas para empresa, serviço, profissional ou cliente em falta — código pré-existente. As de `AppointmentService` são de rotas não relacionadas com token (filtros, paginação, auto-expiração).

## Typecheck

```
$ npm run typecheck
> tsc --noEmit
```

**Sem erros.**

Durante a implementação o compilador apanhou um problema real: o type guard `hasValidFormat(token): token is string` é avaliado **dentro** de `resolveByPublicToken`, logo não estreita `token` no chamador, que continuava `unknown`. Resolvido com um helper privado explícito em vez de um `as string`, que teria desligado a verificação.

## Build

```
$ npm run build
> tsc
```

**Sem erros.**

## Lint

**Não existe.** Nem `server/package.json` nem `client/package.json` têm script de lint. Não criei um — está fora do âmbito e obrigaria a decidir e a pagar a configuração de um linter em todo o repositório.

## Arquivos criados

- `server/src/utils/public-manage-url.ts` — `buildPublicManageUrl(token)`.
- `server/tests/unit/utils/public-manage-url.test.ts`.

## Arquivos alterados

- `server/src/providers/mail/templates/appointment-email-layout.ts` — campo `publicManageUrl` opcional + bloco do link.
- `server/src/modules/notifications/services/NotificationDispatcher.ts` — campo `publicAccessToken` no input + composição da URL.
- `server/src/modules/appointments/services/AppointmentService.ts` — encaminhamento do token em `schedule()`, helper `publicManageToken()`, e os parâmetros opcionais de `cancel()`/`changeStatus()`/`dispatchAppointmentNotification()`.
- `server/tests/unit/providers/mail-templates.test.ts`
- `server/tests/unit/notifications/NotificationDispatcher.test.ts`
- `server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts`
- `server/tests/integration/public-appointment.routes.test.ts`
- `server/tests/integration/public-appointment-link.routes.test.ts`

## Arquivos não alterados deliberadamente

- **`ResendProvider.ts`, `EmailProvider.ts`, `types.ts`** — nada a fazer; mais provider seria duplicação.
- **`appointment-created/updated/cancelled.template.ts`** — delegam no layout; link resolvido num só sítio.
- **`env.ts`, `.env.example`** — `FRONTEND_URL` e `RESEND_API_KEY` já existiam.
- **`AppointmentRepository`** — o hash continua a ser a única persistência.
- **Rotas e controllers** (`PublicAppointmentController`, etc.) — nenhum contrato mudou.
- **DTOs** — `CreatePublicAppointmentDto` continua a recusar campos desconhecidos; `companyId` nunca entra pelo corpo.
- **Modelos** — `Client`, `Company`, `Service`, `Appointment` intactos. O destinatário é o `Client.email` que já existia; nada foi duplicado no `Appointment`.
- **`AppointmentMapper` / `PublicAppointmentMapper`** — nenhuma resposta mudou de forma.
- **`ReminderService` e `ReminderScheduler`** — fora de âmbito; os lembretes automaticamente **não** ganharam link público (ver Limitações).
- **Frontend** — nada. `/agendar/empresa/:companyId` e `/agendar/:token` intactos; nenhum SDK de email no cliente.
- **Rate limits** — nenhum alterado, nenhum novo.

## Limitações

1. **Sem lembrete com link.** Continua a ser um bloco separado, como a prompt определя. `ReminderService` envia `reminder24hEmail`/`reminder2hEmail` e não tem o token puro (só o hash na base de dados), pelo que **não** lhes pode ser adicionado link sem resolver o mesmo problema do §8 da prompt. É a limitação estrutural que fica para a etapa do lembrete.
2. **A cópia do e-mail de criação não foi reescrita.** A prompt descrevia um corpo com "Local: [empresa]" e um link para gerir o agendamento. O template existente é mais fiel ao estilo original do projeto e a empresa já aparece no fim ("Obrigado por escolher X"). Reescrever os textos seria churn visual sem ganho funcional. O requisito — incluir o link — está cumprido.
3. **Sem texto alternativo (`text/plain`).** O `SendMailDto` só aceita `html`. Haria falta ampliar a abstração do provider para HTML + texto. Não o fiz: é uma alteração transversal que afeta todos os emails do projeto e nada no âmbito o exige.
4. **Sem URL de tracking nem confirmação de entrega.** Fora de âmbito por instrução, e o `ResendProvider` atual não expõe o ID do envio (`result.data` é descartado), portanto nem sequer seria possível reportar esse estado ao cliente.
5. **`FRONTEND_URL` mal configurada em produção produz link morto** sem qualquer erro visível. Uma validação no arranque foi considerada e rejeitada: `validateEnv()` é deliberadamente minimal (3 variáveis) e tornar o frontend obrigatório quebraria o arranque de qualquer ambiente que não use emails.
6. **Um e-mail, um token.** Se o cliente perder o email, perde o link. Não há segundo canal de recuperação — e adicionar um exigiria decidir como provar a identidade do cliente sem autenticação, que é explicitamente fora de âmbito.
7. **`notes` continua interpolado sem escape.** Pré-existente em todos os templates; não ampliado, mas é uma dívida de segurança real do projeto.

## Decisões técnicas

1. **Não criar um segundo caminho de email.** Teria duplicado os três emails. Em vez de "email público", o link entra no email que já saía.
2. **O token atravessa três camadas, não é lido da base de dados.** Persistir o token puro para recuperar o link seria uma regressão de segurança que a prompt proíbe explicitamente. Ele foi empurrado por parâmetros opcionais, que é a única forma segura.
3. **O link é montado no dispatcher, não no serviço.** O serviço de agendamentos não sabe nada sobre `FRONTEND_URL` nem sobre a forma de uma URL de e-mail; o dispatcher é o dono do conteúdo do e-mail.
4. **O template recebe a URL, não o token.** Separação de responsabilidade: a apresentação conhece o link, não a credencial.
5. **Ausência de link é o caso normal.** O agendamento administrativo é a maioria do volume. Um botão que aparecesse sempre e só partisse para parte dos clientes seria pior do que nenhum botão.
6. **`publicManageToken` opcional em `cancel()`.** Vazamento mínimo de conhecimento: só o parâmetro opcional que o fluxo público precisa. A alternativa — duplicar `cancelPublicByToken` — violaria a reutilização deliberada de `changeStatus` documentada no código.
7. **Helper `publicManageToken()` em vez de `as string`.** Narrowing verificável, e o ponto onde o link é montado declara o seu próprio invariante.
8. **Barra final de `FRONTEND_URL` normalizada.** Só aqui, ao contrário do resto do projeto. Motivo: um `//` num link de e-mail é um beco sem saída visível ao cliente final, e denuncia logo um erro de configuração.
9. **`it.each` para os 3 eventos.** Criação, alteração e cancelamento partilham exatamente o mesmo caminho de link; seis testes quase idênticos seriam ruído.

## Problemas encontrados

1. **Os três emails já existiam.** A prompt assumia que não existiam. Implementá-los de novo teria produzido duplicação — o oposto do requisito §16. Detectado por investigação antes de escrever código.
2. **`hasValidFormat` não estreita no chamador.** Apanhado pelo compilador, não por teste. `token` continuava `unknown` em `updatePublicByToken` e `cancelPublicByToken`.
3. **Um token de teste com 41 caracteres.** O meu token inicial não passava no `hasValidFormat` (exige exactamente 43), e os testes falhavam com 404 — um teste que passaria a medir outra coisa. Corrigido para 43 e comentado no ficheiro para que não se repita.
4. **`response.body.publicAccessToken` devolve `undefined`.** A resposta real é `response.body.data.publicAccessToken`. O teste chegou a passar por estar a comparar `undefined` com um valor — um erro silencioso. Corrigido.
5. **`NotificationDispatcher.test.ts` lia a configuração real.** Sem mock de `config/env`, o teste passava a depender do `.env` da máquina. Adicionado mock com `FRONTEND_URL` fixo.
6. **Ausência de escape de HTML em todos os templates.** Não introduzida, não ampliada, mas registada como dívida (§7 das Limitações).

## CONTEXTO PARA A PRÓXIMA IA

### Emails já enviados e em que operações

Seis tipos de e-mail transacional no total. **Nenhum foi criado nesta etapa.**

| E-mail | Operação | Templates |
| --- | --- | --- |
| Agendamento criado | `AppointmentService.schedule()` — fluxo **administrativo E público** | `appointmentCreatedEmail` |
| Agendamento atualizado | `update()` (admin) e `updatePublicByToken()` (público) | `appointmentUpdatedEmail` |
| Agendamento cancelado | `cancel()` (admin, via rota) e `cancelPublicByToken()` (público) | `appointmentCancelledEmail` |
| Lembrete 24 h / 2 h | `ReminderService.processDueReminders()`, cron de 60 s | `reminder24hEmail` / `reminder2hEmail` |
| Boas-vindas | `AuthService.register()`, `UserService.create()` | `welcomeTemplate` |
| Recuperação de password | `AuthService.forgotPassword()` | `resetPasswordTemplate` |

**O link `/agendar/:token` é incluído apenas nos três primeiros e só quando o evento nasceu do fluxo público.**

### Provider

`ResendProvider` (`src/providers/mail/ResendProvider.ts`), singleton, único provider. Abstração `IEmailProvider`. Configurado por `RESEND_API_KEY` e `MAIL_FROM`. Lança `AppError` se a Resend devolver `error`. Não emite logs — quem regista é o chamador.

### Como o token é tratado

- **Persistência:** só `publicAccessTokenHash` (`sha256:` + digest). O token puro nunca entra em escrita.
- **Criação:** gerado em `createPublic`, repassado a `schedule()` como `publicManageToken` (só para o link), e devolvido na resposta. O cliente tem uma cópia, o servidor outra temporária.
- **Alteração/cancelamento:** o token puro é o que o cliente apresentou na URL. É a fonte, não uma leitura.
- **Logs:** o token não é registado, nem em sucesso nem em falha. Coberto por teste.
- **Hash:** nunca usado como token. Um hash não abre link nenhum.

### Como o link é montado

`buildPublicManageUrl(token)` em `src/utils/public-manage-url.ts`:

```
env.frontend.FRONTEND_URL  (sem barras finais)  +  "/agendar/"  +  encodeURIComponent(token)
```

`FRONTEND_URL` **já existia** e é a mesma fonte de `/login`, `/reset-password` e `/verify-email`. Nenhuma variável nova. `public-manage-url.test.ts` fixa o comportamento.

### Comportamento quando o email falha

A mutação **nunca** é desfeita. Três `try/catch` encadeados (`dispatchClientEmail`, `dispatchAppointmentEvent`, `AppointmentService.dispatchAppointmentNotification`) garantem que a falha é registada e engolida. Na criação pública isso significa que o cliente **continua a receber o `publicAccessToken`** mesmo sem email. Nenhum erro técnico chega ao cliente.

### Testes e cobertura

`npm test` → **1118 passed, 74 ficheiros, zero falhas**. Baseline era 1073/73: **+45 testes, +1 ficheiro**, sem regressões. `npm run typecheck` e `npm run build` sem erros. Cobertura global subiu de 81.54% para 81.61%; o ficheiro novo e o template alterado estão ambos a 100%.

Padrões a seguir: `vi.hoisted()` + `vi.mock` do caminho exato do módulo (`providers/mail/ResendProvider` **ou** `providers/logger/Logger`, nunca o barrel, quando é esse o import). `vitest.config.ts` tem `globals: false` — importar `describe`/`it`/`expect`/`vi` sempre. Sem `setupFiles` e sem mock global de email.

### Limitações

Ver a secção Limitações. As duas que condicionam trabalho futuro:

- **Lembretes não têm link público** — falta o token puro. Qualquer etapa do lembrete tem de resolver isto primeiro.
- **Sem `text/plain`** — exige ampliar `SendMailDto` e afeta todos os emails do projeto.

### O que falta na Stage 31

- **Lembrete automático**, explicitamente diferido. Depende de resolver o acesso ao token puro fora do momento da criação.
- **Email para o agendamento feito pela administração**, se algum dia for pretendido: hoje o cliente recebe o email de criação mas **sem** link (não tem token público). É uma decisão de produto, não uma falta.

### Decisões que não devem ser revertidas sem análise

1. **Não criar um caminho de email paralelo ao `NotificationDispatcher`.** Os emails de agendamento são um só funil para admin e público; só o link distingue os dois.
2. **Não persistir o token puro para recuperar o link.** Se alguém precisar do link num evento em que o cliente não apresenta o token (o lembrete é o caso), a solução é uma decisão de segurança explícita, não um campo novo no modelo.
3. **Não tornar `publicManageUrl` obrigatório** no `AppointmentEmailData`. O fluxo administrativo não tem token e não pode ter.
4. **Não meter o token no `meta` do logger**, por mais útil que pareça para diagnosticar. Já existe `toDiagnosticHint` para correlacionar acessos sem expor a credencial.
5. **Não normalizar a barra final em todo o projeto só por causa desta etapa.** O `public-manage-url` normaliza porque o link vai para um e-mail; alterar `AuthService` seria scope creep.
6. **Não ampliar `IEmailProvider`** sem necessidade real. Um campo por vez.
7. **Não tocar no rate limit** — o envio é consequência de uma operação já protegida.
