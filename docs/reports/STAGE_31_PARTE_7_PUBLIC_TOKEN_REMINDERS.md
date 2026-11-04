# Stage 31 — Parte 7: token público e lembretes

## Objetivo

Enviar os lembretes de 24h e 2h com o mesmo link público já recebido pelo cliente, mantendo válidos os tokens existentes e preservando o scheduler e a infraestrutura de e-mail.

## Estado encontrado

`PublicAppointmentTokenProvider.generate()` cria 32 bytes aleatórios por CSPRNG (256 bits), codificados em base64url. `hash()` calcula SHA-256 para lookup. `Appointment.publicAccessTokenHash` é `select: false`, tem índice único parcial e continua sendo a fonte usada para resolver GET/PATCH/DELETE públicos. `AppointmentService.createPublic()` entrega o token ao cliente e ao e-mail de criação; atualização e cancelamento públicos reutilizam o token apresentado na URL. A Parte 6 já usa `buildPublicManageUrl()` nos três e-mails.

O `ReminderService` executa depois da criação e recebe os appointments futuros, antes de claim/lease, template, envio pelo dispatcher e marcação de enviado. Ele só tinha acesso ao hash, que não permite recuperar o token. Os templates de reminder compartilham layout. O scheduler roda a cada 60 segundos, tem catch-up após restart, claim/lease atômico, TTL de 10 minutos, janela de tolerância configurada e cálculo de datas no timezone da empresa.

Arquivos e evidências examinados: `PublicAppointmentTokenProvider.ts`, `Appointment.model.ts`, `AppointmentRepository.ts`, `AppointmentService.ts`, `ReminderService.ts`, `ReminderScheduler.ts`, `NotificationDispatcher.ts`, `public-manage-url.ts`, templates de appointment e reminder, testes de token/repository/appointments/reminder/dispatcher, `STAGE-31-PART-6-PUBLIC-BOOKING-EMAILS-REPORT.md`, e relatórios anteriores das Partes 2 e 5.

## Problema arquitetural

Um hash SHA-256 não pode reproduzir o token aleatório. Manter o token legado e, ao mesmo tempo, emitir exatamente a mesma URL em reminders após restart/múltiplas instâncias requer material recuperável. Foi adotado ciphertext autenticado, não plaintext. O hash continua sendo o valor de lookup e validação.

## ALTERNATIVAS AVALIADAS

### A — múltiplos hashes/tokens ativos

Um array de hashes requer schema, resolução por múltiplos valores, índice/garantia de unicidade e regras de revogação. Preservaria o hash antigo, mas um token adicional seria outra credencial e URL; não recupera o token original, então reminders divergiriam de created/updated/cancelled.

### B — token determinístico derivado de segredo

HMAC-SHA-256 com appointment id e segredo forte compartilhado pode produzir token reproduzível de alta entropia, não enumerável só com o id. Exige segredo externo ao banco, compartilhamento entre instâncias e plano de rotação. Não consegue derivar tokens aleatórios já emitidos; migrar novos appointments para esse formato ainda deixa legados sem o mesmo link.

### C — credencial específica para reminders

Um token adicional reutilizável nos dois reminders poderia ser resolvido pelo endpoint atual e persistido apenas como hash, se derivável sob segredo. Isso cria uma segunda superfície de credencial e links diferentes dos e-mails anteriores. Não satisfaz a identidade exigida.

### D — token cifrado/reversível

AES-256-GCM permite obter o token original, detecta alteração do ciphertext e funciona entre instâncias configuradas com o mesmo keyring. O banco contém ciphertext versionado, nunca o plaintext; a chave fica fora do banco. Um comprometimento combinado de banco e chave revela tokens, logo a proteção é inferior à atual contra esse cenário. Esta foi a única alternativa que satisfaz o mesmo-token para dados que tenham ciphertext.

## SOLUÇÃO ESCOLHIDA

O token continua a ser criado em `AppointmentService.createPublic()` por `PublicAppointmentTokenProvider.generate()`. Na mesma criação são persistidos:

- `publicAccessTokenHash`: SHA-256, usado pelo lookup público e índice único;
- `publicAccessTokenCiphertext`: envelope `versão.iv.tag.ciphertext` em AES-256-GCM, com AAD igual ao hash.

Ambos os campos são `select: false`. O ciphertext nunca contém token puro em texto claro. A configuração `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS` é um JSON keyring de versões para chaves base64 de 32 bytes; `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION` escolhe a chave de escrita. A configuração é obrigatória no backend.

O ReminderService lê explicitamente ciphertext e hash, descriptografa usando o hash como AAD, valida formato e hash, e recebe o token original. Em seguida usa `buildPublicManageUrl()`, inclui a URL no layout existente e envia o HTML pelo método de reminder do `NotificationDispatcher`, que usa o provider Resend já configurado. Os reminders de 24h e 2h recuperam o mesmo token armazenado. Só depois de o dispatcher/provider aceitar o envio o reminder é marcado como enviado. Se a credencial estiver ausente ou não puder ser descriptografada, não se envia e-mail inválido nem se consome lease; o job pode tentar de novo na próxima rodada.

O endpoint segue resolvendo o token por SHA-256 em `AppointmentRepository.findByPublicAccessTokenHash()`. O token legado continua aceito; GET/PATCH/DELETE não dependem do ciphertext e mantêm o contrato, tenant derivado do appointment, filtro de soft delete e resposta indistinguível para inválido/inexistente. Nenhum token anterior foi regenerado nem hash substituído.

Appointments públicos anteriores à Parte 7 têm hash mas não ciphertext. Não é possível recuperar o token deles; esses reminders são ignorados. Appointments administrativos também não têm credencial pública e são ignorados pelo reminder com link. Nenhum reminder altera status.

## Justificativa técnica

Um novo token aleatório ou derivado mudaria a URL e não pode substituir o hash antigo. Cifrar o token original junto com o hash preserva identidade, continuidade dos links, resolução atual e operação distribuída após restart. Vincular o envelope ao hash por AAD impede mover apenas o ciphertext para outro hash sem falha de autenticação.

## Segurança

- O token puro continua sem persistência em texto claro; somente hash e ciphertext são gravados.
- O hash e ciphertext ficam fora de leituras por omissão; os mappers não expõem nenhum deles.
- A chave não é guardada no MongoDB. Não registrar token, ciphertext ou chave. Logs de falha do provider no reminder agora usam mensagem genérica, sem copiar texto de erro potencialmente sensível.
- O token mantém 256 bits; não há redução de entropia. O endpoint continua tenant-safe porque a empresa vem do appointment localizado pelo hash; soft-deleted segue excluído.
- Risco aceito: exposição combinada do banco e da chave aplicável permite recuperar a credencial. Backups do banco carregam ciphertext e precisam proteção; keyring deve vir de secret manager/configuração segura, compartilhada entre instâncias.

## Compatibilidade com appointments antigos

Tokens antigos mantêm o hash, não são modificados e seguem válidos para GET/PATCH/DELETE. Como os antigos não têm ciphertext, seus reminders não são enviados com link. Tokens novos mantêm a emissão aleatória existente, geram hash e ciphertext na mesma escrita e funcionam nas mesmas rotas. Não foi criada migration nem índice novo.

## Alterações realizadas

- `PublicAppointmentTokenProvider`: AES-256-GCM versionado com AAD, recuperação genérica em caso de falha.
- `Appointment`: campo `publicAccessTokenCiphertext` nullable, `select: false`.
- Criação pública: persiste hash e envelope na mesma escrita.
- `AppointmentRepository`: seleciona explicitamente hash e envelope na consulta de reminders.
- `ReminderService`: descriptografa antes do claim, ignora sem credencial, monta URL pelo helper e mantém release/retry quando o provider falha.
- `NotificationDispatcher`: método de entrega para os templates de reminder pelo Resend existente.
- Layout dos reminders: botão “Gerenciar meu agendamento”.
- Configuração de chave e keyring de teste isolado.
- Rotas e frontend não alterados.

## Fluxo do token

Token aleatório → hash SHA-256 + envelope AES-GCM vinculado ao hash persistidos → token transitório é entregue ao cliente/e-mail created. PATCH/DELETE validam pelo hash e reutilizam o token da URL. Reminders leem envelope/hash explicitamente, autenticam/descriptografam para obter a mesma credencial e constroem a URL via helper. A criação nunca substitui tokens e updates não mexem na credencial.

## Fluxo do reminder

Consulta futura → valida companhia/cliente → sem ciphertext, ignora sem marcar; com ciphertext, descriptografa → monta template e URL → claim atômico/lease → dispatcher existente → Resend → marca enviado. Falha no envio libera lease, não marca enviado, registra erro genérico e permite retry. Os parâmetros de intervalo, janela, TTL, timezone/DST, idempotência, restart e comportamento de appointments passados não foram alterados.

## Testes

Foram adicionados/ajustados testes para round-trip e adulteração do AES-GCM, vínculo AAD ao hash, leitura por segunda instância e rotação, campo ciphertext `select: false`, persistência de hash+ciphertext sem plaintext, reminders 24h/2h contendo a URL do helper e texto do link, appointment legado sem credencial, falha de recuperação sem envio/claim/log de token. Testes de GET/PATCH/DELETE por token antigo e GET com token recém-criado validam compatibilidade das rotas.

## Coverage

`npm run test:coverage`: 81,64% statements, 80,41% branches, 72,05% functions e 81,86% lines (74 arquivos, 1130 testes).

## Typecheck

`npm run typecheck`: passou sem erros.

## Build

`npm run build`: passou sem erros.

## Arquivos criados

- `server/tests/setup.ts` — keyring determinístico apenas para testes.
- `docs/reports/STAGE_31_PARTE_7_PUBLIC_TOKEN_REMINDERS.md`.
- Nenhuma migration.

## Arquivos alterados

- `server/.env.example`
- `server/src/config/env.ts`, `server/src/config/validateEnv.ts`
- `server/src/providers/security/PublicAppointmentTokenProvider.ts`
- `server/src/modules/appointments/index.ts`, `models/Appointment.model.ts`, `repositories/AppointmentRepository.ts`, `services/AppointmentService.ts`
- `server/src/modules/notifications/services/NotificationDispatcher.ts`
- `server/src/modules/reminders/services/ReminderService.ts`
- `server/src/providers/mail/templates/reminder-email-layout.ts`
- `server/vitest.config.ts`
- `server/tests/integration/public-appointment.routes.test.ts`
- `server/tests/unit/appointments/AppointmentService.public.test.ts`
- `server/tests/unit/reminders/ReminderService.test.ts`
- `server/tests/unit/notifications/NotificationDispatcher.test.ts`
- `server/tests/unit/repositories/appointment-public-token.schema.test.ts`, `appointment-reminders.test.ts`
- `server/tests/unit/security/PublicAppointmentTokenProvider.test.ts`

## Limitações

- Appointments preexistentes sem ciphertext não recebem reminders com link, pois não é possível recuperar o token original sem invalidar/alterar o link. O token público continua funcionando normalmente.
- Appointments administrativos sem token público também não recebem esses reminders com link.
- Rotação: para escrever com nova versão, adicionar a chave nova ao JSON keyring e alterar a versão ativa, mantendo versões antigas para descriptografar envelopes existentes. Remover chave antiga somente depois de recriptografar/expirar todos os envelopes dessa versão; não existe job de recriptografia nesta etapa.
- As duas variáveis novas de keyring são obrigatórias e sua ausência impede startup. O keyring precisa conter versões válidas e chaves de 32 bytes em Base64 canônico; formato ou versão ativa inválidos impedem startup.

## O que NÃO foi alterado

- Contrato GET/PATCH/DELETE `/api/public/appointments/:token` e rota `/agendar/:token`.
- Frontend, criação de credenciais adicionais, semântica de cancelamento e eventos existentes.
- Scheduler de 60 segundos, catch-up, claim/lease, TTL de 10 min, tolerâncias, timezone/DST, idempotência ou política de appointments passados.
- Expiração, revogação, regeneração, rate limit, provider de e-mail adicional, analytics ou migration.
- Nenhum commit, merge ou push.

## CONTEXTO PARA A PRÓXIMA IA

Arquitetura final: token continua aleatório de 32 bytes; persistem `publicAccessTokenHash` (lookup) e `publicAccessTokenCiphertext` (AES-256-GCM versionado, AAD=hash), ambos `select: false`; token puro nunca é salvo em texto nem logado. A chave ativa e versões anteriores ficam em `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS` (JSON de versão para chave Base64 de 32 bytes), com `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION`; manter configuração igual em todas as instâncias e fora do banco.

Tokens antigos continuam funcionando em GET/PATCH/DELETE, mas seus reminders são ignorados porque não há ciphertext recuperável. Tokens novos têm hash+ciphertext na criação; os dois reminders recuperam o mesmo token e montam a URL por `buildPublicManageUrl()`. O endpoint permanece `GET/PATCH/DELETE /api/public/appointments/:token`, sem alteração de contrato/tenant/soft-delete. Reminder sem credencial não envia nem marca; falha de e-mail libera lease e permite retry.

Antes: relatório da Parte 6 registrava 1118 testes. Testes focados finais: 8 arquivos, 248 passaram. Suíte completa: `npm test`, 74 arquivos e 1130 testes passaram. `npm run test:coverage`: 81,64% statements, 80,41% branches, 72,05% functions, 81,86% lines. `npm run typecheck` e `npm run build` passaram. A primeira rodada completa encontrou uma falha no mock do repository devido ao novo encadeamento `.select().sort()`; o mock foi atualizado e as rodadas finais passaram. Antes de iniciar produção, configurar um keyring real via secret manager, com chave AES de 32 bytes em Base64, manter cópias de segurança da chave fora do banco e propagar o mesmo keyring/versionamento a todas as instâncias. Não fazer commit/merge/push.
