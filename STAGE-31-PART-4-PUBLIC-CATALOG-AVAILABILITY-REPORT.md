# STAGE 31 — PARTE 4 — CATÁLOGO E DISPONIBILIDADE PÚBLICA

**Data:** 2026-10-02
**Âmbito:** Backend apenas. Nenhum ficheiro em `client/` foi criado, alterado ou removido.
**Comandos Git executados:** nenhum (`add`, `commit`, `merge`, `push`). Apenas `git status` de leitura.

---

## 1. Contexto encontrado

### 1.1 O que já existia

A Parte 1 deu o `POST /api/public/companies/:companyId/appointments`. A Parte 2 deu o acesso por
token (GET / PATCH / DELETE). Ambas partilham o mesmo princípio: a empresa vem da URL, o
visitador não autentica, e tudo o que é pedido é revalidado no momento da escrita.

**Não existia catálogo público.** Um visitante que recebia o linkvia para `/agendar/:token` e
encontrava a empresa, o serviço e o profissional **pré-preenchidos pelo token** — ou seja,
recebia um agendamento pronto a confirmar, sem poder escolher.

### 1.2 O backend nunca enumerou slots

Este é o achado que definiu a implementação.

O servidor tem apenas **validação** de um horário pedido, em `AvailabilityService.ensureEmployeeAvailable`
e `AppointmentRepository.hasEmployeeConflict`. Não havia nenhuma função que devolvesse "os horários
livres deste dia".

A enumeração existia **apenas no cliente**, em `client/src/config/appointmentSlots.ts`, usada como
previsão. As réplicas de fora do servidor duplicavam as regras e divergiam sempre que o servidor mudava.

**Decisão:** criar `AvailableSlotsBuilder`, uma função pura no servidor que implementa as mesmas
regras do validador, e usá-la como implementação de referência. O cliente continua com o seu
código — não foi tocado nesta parte — mas passa a ser o servidor a dizer o que está livre. E o
servidor continua a ser a autoridade: `schedule()` e `update()` revalidam tudo ao gravar.

### 1.3 Não existe relação serviço × profissional

Requirement explícito da parte 3 do enunciado. Verificado em todo o modelo:

| Onde se procurou | Resultado |
| --- | --- |
| `Service.model.ts` | Sem `employeeId`, sem `employees`, sem referência a profissional |
| `User.model.ts` | Sem `services`, sem lista de serviços |
| Coleções do projeto | Só `Service`, `User`, `Client` |
| `AppointmentRepository.hasEmployeeConflict` | Filtra por `employeeId` + tempo. Nunca por serviço |
| `AppointmentService.schedule` | Valida serviço e profissional de forma **independente** |
| Fluxo público de criação | Idem — aceita qualquer par ativo do tenant |

**Não existe relação, e não foi criada nenhuma.**

**Consequência, deliberada:** o endpoint de disponibilidade **não filtra profissionais por serviço**.
Filtrar exigiria inventar uma regra que o sistema não tem, e o resultado mentiria sobre o que é
possível marcar. Um serviço de 60 minutos simplesmente não tem slots num período de 30 minutos — é a
duração que limita, e a resposta a isso é uma lista vazia, não um erro.

Esta é a resposta ao requisito, e é a única que não inventa dados.

### 1.4 Services e Employees são Users e Companies

Confirmado antes de desenhar os mappers, porque muda o que é seguro expor:

- **Profissional** = `User` (`Role`). `EMPLOYEE` é o valor por omissão no schema; `OWNER`,
  `MANAGER` e `ADMIN` também atendem. `CLIENT` é conta de acesso ao portal, nunca prestador.
- **Empresa** = `Company`, tem `timezone` próprio. Não há um "tenant" separado: **o tenant é a empresa**.
- **Serviço** = `Service`. O campo de duração chama-se **`duration`**, não `durationMinutes`.

### 1.5 Regras existentes que a disponibilidade teve de reutilizar

Todas verificadas na fonte antes de escrever código:

| Regra | Onde vive |
| --- | --- |
| O slot cabe **inteiro** na manhã OU na tarde | `ensureEmployeeAvailable` |
| Período completo exige `inicio < fim` (comparação léxica de `"HH:mm"`) | `ensureEmployeeAvailable` |
| Slot não atravessa a meia-noite | `localStart.toISODate() !== localEnd.toISODate()` |
| Exceção de dia inteiro invalida o dia | `ensureNoException` |
| Exceção parcial bloqueia por **sobreposição** | `inicio < fimSlot && fim > inicioSlot` |
| Exceções têm prioridade sobre a recorrência | comentário explícito em `AvailabilityService` |
| Só `scheduled` e `confirmed` bloqueiam | `hasEmployeeConflict` |
| `completed`, `cancelled`, `no-show` não bloqueiam | `hasEmployeeConflict` |
| Sobreposição por instantes | `ocupado.inicio < slot.fim && ocupado.fim > slot.inicio` |
| `endAt = startAt + duration` | `AppointmentService.schedule` |
| `startAt <= now` é rejeitado | `AppointmentService.schedule` |

---

## 2. Decisões de arquitetura

### 2.1 `PublicBookingEligibility`: regras extraídas, não reescritas

O catálogo precisava das mesmas definições de "ativo e do tenant" que a marcação já usava.
**Copiá-las** teria criado uma segunda definição que poderia divergir — o catálogo acabaria a
oferecer um serviço que a marcação recusa.

Por isso foram **extraídas** de `AppointmentService` para `PublicBookingEligibility`, e o
`AppointmentService` passou a delegar. Comportamento idêntico, comprovado pelos 941 testes
pré-existentes, que continuam a passar sem alteração.

Distinção preservada de propósito:

- `requireActiveEmployee` — regra administrativa, **não** verifica `role`. É o que o código fazia.
- `requireBookableEmployee` — regra pública, acrescenta a exclusão de `CLIENT` (404).

Sem isto, o fluxo administrativo passaria a rejeitar contas `CLIENT`, o que seria uma alteração
de comportamento não pedida.

### 2.2 Mappers públicos novos

`ServiceMapper` e `UserMapper` **não** foram reutilizados, e é deliberado. Expõem `companyId`,
`isActive`, `deletedAt`, timestamps e — no caso do `UserMapper` — o `publicId` do storage, que é a
chave que permite apagar a imagem. Reutilizá-los seria exatamente o que o contrato não pode fazer.

| Mapper | Mapeamento |
| --- | --- |
| `duration` | → `durationMinutes` |
| `description` ausente | → `null` (o contrato tem forma fixa) |
| `avatar.url` | → `avatarUrl` |
| `avatar` ausente | → `null` (o frontend mostra as iniciais) |
| `avatar.publicId` | **descartado** |

### 2.3 Reutilização do rate limit

`createPublicLinkRateLimit` (criada na Parte 2) é usada tal como está. Nenhum mecanismo novo de
`express-rate-limit`. Herdam-se a janela de 15 minutos, a chave `rota + IP`, os cabeçalhos `draft-7`
e o envelope de erro 429 — **incluindo a mensagem global**, para não haver duas mensagens
concorrentes para o mesmo 429.

Duas orquestas, porque são duas intenções de abuso diferentes:

| Orquestra | Limite | Razão |
| --- | --- | --- |
| Catálogo (serviços + profissionais) | 60/15 min | Leitura barata e repetida ao abrir e recarregar a página |
| Disponibilidade | 120/15 min | Uma chamada por data experimentada; percorrer um mês dispara dezenas |

Sebbuckets separados significam que folquear as datas **não** esgota o orçamento do catálogo.

**Dívida registada, não paga:** a Parte 1 e a Parte 2 ficaram cada uma com a sua factory duplicada
(`createPublicBookingRateLimit` / `createPublicLinkRateLimit`). Consolidar as três numa só é uma
melhoria transversal e não cabia nesta parte.

### 2.4 Ordem de sequência dos dias fechados

A disponibilidade semanal é consultada **primeira**. Se não houver período configurado para o dia da
semana, o dia está fechado e as outras duas consultas não são feitas.

A alternativa seria `Promise.all` com as três, que poupa uma ida ao banco nos dias abertos ao custo
de pagar duas consultas nos dias fechados. Dia fechado é comum (fins de semana, folgas) num
endpoint público que qualquer visitante pode percorrer data a data, por isso a leitura sequencial
compensa. Exceções e agendamentos continuam em paralelo entre si.

### 2.5 Validação de data: o ponto mais difícil

`date` é uma data **calendárica**, não um instante. Recusado:

- `2026-1-1`, `08-10-2026` — formato;
- `2026-10-08T09:00`, `2026-10-08T09:00:00Z` — traz hora ou fuso, e a conversão passaria a ser ambígua;
- `2026-13-01`, `2026-02-30` — datas que não existem.

O último caso merece nota: `DateTime.fromISO("2026-02-30")` **não** devolve `isValid === false` — o
Luxon "corrige" para 1 de março. Por isso a validação compara `parsed.toISODate()` com o valor
recebido, o que apanha tanto a data inválida como a correção silenciosa.

O validator também **recusa qualquer parâmetro fora do contrato**, incluindo `companyId`. Não para o
usar, mas para que não seuggestione que influencia a consulta: o tenant vem da rota e nada mais.

---

## 3. Ficheiros criados e alterados

### 3.1 Criados — produção

| Ficheiro | Responsabilidade |
| --- | --- |
| `server/src/modules/availability/services/AvailableSlotsBuilder.ts` | Função pura de geração de slots |
| `server/src/modules/public-booking/index.ts` | Contratos TypeScript públicos |
| `server/src/modules/public-booking/dto/PublicAvailability.dto.ts` | Parâmetros da consulta |
| `server/src/modules/public-booking/mappers/PublicBookingMapper.ts` | Conversão para o contrato público |
| `server/src/modules/public-booking/services/PublicBookingEligibility.ts` | Resolvers partilhados de empresa/serviço/profissional |
| `server/src/modules/public-booking/services/PublicBookingService.ts` | Regras do catálogo público |
| `server/src/modules/public-booking/controllers/PublicBookingController.ts` | Adaptador HTTP |
| `server/src/modules/public-booking/validators/public-availability.validator.ts` | Validação dos parâmetros |
| `server/src/modules/public-booking/routes/PublicBookingRoutes.ts` | Rotas públicas |
| `server/src/middlewares/public-catalog-rate-limit.middleware.ts` | Duas orquestras de limite |

### 3.2 Criados — testes

| Ficheiro | Testes |
| --- | --- |
| `server/tests/unit/availability/AvailableSlotsBuilder.test.ts` | 46 |
| `server/tests/unit/repositories/public-catalog-filters.test.ts` | 15 |
| `server/tests/integration/public-booking.routes.test.ts` | 61 |
| `server/tests/integration/public-catalog-rate-limit.test.ts` | 10 |

**132 testes novos.**

### 3.3 Alterados

| Ficheiro | Alteração |
| --- | --- |
| `server/src/constants/http-messages.ts` | 5 mensagens |
| `server/src/modules/appointments/repositories/AppointmentRepository.ts` | `findBlockingForEmployee` |
| `server/src/modules/services/repositories/ServiceRepository.ts` | `findActiveByCompanyId` |
| `server/src/modules/users/repositories/UserRepository.ts` | `findActiveEmployeesByCompanyId` |
| `server/src/modules/appointments/services/AppointmentService.ts` | Delega nos resolvers extraídos |
| `server/src/routes/index.ts` | Montagem do router novo |
| `server/tests/integration/public-appointment-link.routes.test.ts` | Correção de um mock (ver 4.2) |

### 3.4 Contratos

```jsonc
// GET /api/public/companies/:companyId/services
[{ "id", "name", "description": string|null, "durationMinutes", "price" }]

// GET /api/public/companies/:companyId/employees
[{ "id", "name", "avatarUrl": string|null }]

// GET /api/public/companies/:companyId/availability
{ "date": "AAAA-MM-DD", "timezone": "Europe/Lisbon",
  "slots": [{ "startAt": "...+01:00", "endAt": "...+01:00" }] }
```

`startAt`/`endAt` são ISO 8601 **com o offset da empresa** (ver 4.1, bug 2).

---

## 4. Bugs reais encontrados durante a implementação

Nenhum destes era visível por leitura. Todos apareceram por os testes a falharem.

### 4.1 Dentro do código novo

**Bug 1 — o cursor do builder não avançava (grave).**

`cursor = slotEnd` estava depois do `push`. Qualquer `continue` — slot no passado, coberto por
exceção ou ocupado por outro agendamento — devolvia o cursor ao mesmo instante, e o mesmo candidato
era reavaliado até o limite de 300. Um período totalmente ocupado devolveria **300 cópias de um
único slot** em vez de uma lista vazia. Como os `break` saem do laço, o problema só se manifestava
nos caminhos de `continue`.

Corrigido movendo o avanço para **antes** de qualquer filtro: o passo é a duração do serviço e é
independente do que acontece ao candidato. Commentado no código para que a ordem não seja
"simplificada" de volta.

**Bug 2 — os slots saíam em UTC em vez do offset da empresa.**

O cursor aritmético vive em UTC (somar duração em UTC não depende de transições de DST), mas
`DateTime.toISO()` devolve `Z` quando o objeto está em UTC. Um horário de 09:00 em Lisboa chegava
ao cliente como `08:00Z`.

Não era cosmético: o browser do visitante pode estar noutro fuso, e o único lado que sabe converter
é a resposta. Corrigido com `setZone(timezone)` na serialização.

**Bug 3 — `service._id` passado onde devia ir o `employeeId`.**

Nas três consultas de `getPublicAvailability`. Teria consultado a agenda do **serviço** como se fosse
um profissional, devolvendo sempre zero conflitos. Pego por leitura, antes de correr.

### 4.2 Numa máquina de estados que já existia

**Bug 4 — mock de `createPublicLinkRateLimit` estava escrito como middleware.**

Em `public-appointment-link.routes.test.ts`, `createPublicLinkRateLimit: pass(counter)` — ou seja, a
"factory" era o próprio middleware. Funcionava só porque **nada a invocava como factory** até esta
parte. Corrigido para `() => pass(counter)`.

O mock vizinho, na mesma família, já estava escrito corretamente
(`createPublicBookingRateLimit: () => (_req,_res,next) => …`), o que confirma que era um erro
isolado e não um padrão do ficheiro. **Não é alteração de produção** — o código de produção está
correto: usa a factory como factory.

---

## 5. Verificação

### 5.1 Comandos

| Comando | Resultado |
| --- | --- |
| `npm test` | **1073 passaram**, 0 falharam, 73 ficheiros |
| `npm run typecheck` | Passou |
| `npm run build` | Passou |
| `npx vitest run --coverage` | Ver 5.3 |

Base antes desta parte: **941 testes em 69 ficheiros**. Delta: **+132 testes, +4 ficheiros**, sem
uma única alteração a testes pré-existentes para os fazer passar (a única alteração a um ficheiro
existente é a correção do mock do bug 4, que corrigia um falso positivo).

### 5.2 Cobertura global

| | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Global | 81.54% | 80.19% | 71.42% | 81.73% |

### 5.3 Cobertura dos ficheiros novos

| Ficheiro | Stmts | Branch | Funcs | Lines |
| --- | --- | --- | --- | --- |
| `public-booking/index.ts` | 100% | 100% | 100% | 100% |
| `public-booking/dto/PublicAvailability.dto.ts` | 100% | 100% | 100% | 100% |
| `public-booking/mappers/PublicBookingMapper.ts` | 100% | 100% | 100% | 100% |
| `public-booking/services/PublicBookingEligibility.ts` | 100% | 100% | 100% | 100% |
| `public-booking/services/PublicBookingService.ts` | 100% | 100% | 100% | 100% |
| `public-booking/controllers/PublicBookingController.ts` | 100% | 100% | 100% | 100% |
| `public-booking/validators/public-availability.validator.ts` | 100% | 100% | 100% | 100% |
| `public-booking/routes/PublicBookingRoutes.ts` | 100% | 100% | 100% | 100% |
| `availability/services/AvailableSlotsBuilder.ts` | 97.01% | 94.73% | 100% | 96.96% |

### 5.4 Branches não cobertos, e porquê

Apenas dois, ambos defensivos e deliberados:

| Local | Razão |
| --- | --- |
| `AvailableSlotsBuilder.ts:164` — `if (exception.allDay) return false` dentro de `exceptionBlocksSlot` | **Alcançável só se a função for usada isoladamente.** No fluxo real `hasAllDayException` já devolveu. Fica para o predicado estar correto por si só, em vez de depender da ordem de quem o chama |
| `AvailableSlotsBuilder.ts:281` — `if (!periodStartLocal.isValid) continue` | Exige um período `"HH:mm"` que o Luxon não consiga interpretar, com uma data e um fuso válidos. Não há forma de o construir a partir da entrada validada |

Um terceiro guard **inalcançável foi removido** em vez de testado: o validator fazia
`typeof value !== "object"` sobre `req.query`, que o Express garante ser sempre um objeto. Código
impossível é ruído.

### 5.5 O que os testes provam

Não apenas o caminho feliz. As asserções são sobre **consultas**, não só sobre retorno — porque um
filtro em falta não dá erro, dá uma fuga de dados.

- Contrato estreito: chaves exatas por recurso, `companyId`/`isActive`/`deletedAt`/`createdAt`/timestamps ausentes, `email` e `publicId` ausentes, `duration` reescrito como `durationMinutes`.
- Tenant isolation: serviço e profissional de outra empresa → 404 **e nenhuma consulta à agenda**.
- Soft-delete: os três `findById` filtram `deletedAt`, e o teste existe para fixar essa dependência — se alguém os alargar, o catálogo passa a responder 200 a recursos eliminados.
- Estados: empresa inativa 400, empresa eliminada 404, serviço inativo 400, profissional inativo 400, conta `CLIENT` 404.
- AvailableSlotsBuilder: passo = duração (30/45/60), manhã, tarde, ambos, período incompleto, invertido, serviço maior que o período, limites exatos, sobreposição parcial nos dois sentidos, toque nos limites (não bloqueia), todos os status bloqueantes, `BLOCK`/`VACATION`/`HOLIDAY`, `allDay`, exceção parcial, exceção sem ambos os horários, passado, hoje, o slot a decorrer, datas inexistentes, timezone de verão, fuso diferente do browser, fuso inválido, limite de 300.
- Rotas: `200`/`400`/`404`/`429`, parâmetros em falta, `date` com hora ou fuso, `companyId` na query recusado, limitador aplicado.

---

## 6. Segurança e isolamento multi-tenant

| Medida | Como |
| --- | --- |
| Tenant só da rota | `:companyId`. O controller nunca lê `companyId` do corpo ou da query, e o validator recusa-o explicitamente |
| Recurso de outro tenant | 404, e a agenda nem é consultada |
| Soft-delete | Herdado dos `findById`; a garantia é fixada por teste em vez de duplicada em memória |
| Inatividade | 400, só depois de o tenant estar provado |
| `CLIENT` | Excluído da lista e recusado (404) na disponibilidade |
| Rate limit | Por IP, três buckets independentes, herança da factory da Parte 2 |
| Autenticação | Inexistente nestas rotas, por desenho; os testes usam um `authenticate` instrumentado que devolveria 401, e o 200 prova que não é invocado |
| Rate limit antes da BD | Ordem: limitador → validação → controller. Um flood não chega à base de dados |

---

## 7. Limitações conhecidas

1. **Não há filtro serviço × profissional**, porque a relação não existe. Um profissional aparece
   para todos os serviços da empresa. A duração é o que restringe os slots.
2. **A disponibilidade é uma previsão, não uma reserva.** Dois visitantes podem receber o mesmo
   slot. `schedule()` revalida e o segundo recebe 409. É a arquiteturalmente correta num sistema sem
   bloqueio; implementar hold exigiria TTL e limpeza.
3. **O passo é a duração do serviço, ancorada no início do período.** Um serviço de 45 minutos dá
   slots 09:00, 09:45, 10:30, 11:15 — a última das 11:45 já não cabe em 12:00. É o mesmo
   comportamento do validador existente, pelo que catálogo e marcação concordam.
4. **Aritmética em UTC.** Somar duração em UTC não depende de DST, mas uma transição dentro do
   período deslocaria os horários locais seguintes. Na prática só afeta períodos que atravessem a
   transição (01:00–02:00 em Portugal), que não são períodos de trabalho. Coerente com o
   `ensureEmployeeAvailable` atual.
5. **Duas factories de rate limit duplicadas** entre as Partes 1, 2 e 4. Dívida transversal
   registada em 2.3.
6. **Sem validação de empresa para além do `isActive`.** `requireActiveCompany` não revalida a
   empresa no momento da marcação — comportamento herdado de `ensureEmployeeAvailable`, não
   introduzido aqui.

---

## 8. O que NÃO foi feito, por estar fora do âmbito

- Nada em `client/`. Não há ecrã de seleção de serviço/profissional/hora.
- Nada de e-mail, `NotificationDispatcher`, ou qualquer notificação.
- Nada de remarcação visual, nem de interface admin.
- Nenhum modelo novo, nenhuma relação nova, nenhuma migração.
- Nenhuma alteração às assinaturas das rotas públicas das Partes 1 e 2.
- Nenhuma alteração a `AppointmentRepository.hasEmployeeConflict` — o novo método é aditivo.

---

### CONTEXTO PARA A PRÓXIMA IA

**Estado:** a Parte 4 está concluída e verificada. 1073/1073 testes passam, typecheck e build
limpos, 100% de cobertura em todos os ficheiros novos do módulo `public-booking` e 97% no builder.

**O que existe agora, para o cliente consumir:**

```http
GET /api/public/companies/:companyId/services
GET /api/public/companies/:companyId/employees
GET /api/public/companies/:companyId/availability?serviceId=&employeeId=&date=AAAA-MM-DD
```

Sem autenticação. `startAt`/`endAt` em ISO 8601 com o offset da empresa; a resposta inclui
`timezone`. A data é uma data **calendárica** local da empresa, não um instante.

**Três decisões que a próxima parte tem de respeitar:**

1. **Não existe relação serviço × profissional.** Qualquer ecrã de seleção mostra todos os
   profissionais para todos os serviços, e a duração faz o resto. Se aparecer a necessidade de
   filtrar, é uma **decisão de produto** que exige mudar o modelo — não se resolve no frontend.
2. **O catálogo e a marcação partilham `PublicBookingEligibility`.** Qualquer regra nova de
   visibilidade tem de entrar aí, para que o catálogo nunca ofereça o que a marcação recusa.
3. **A disponibilidade é uma previsão.** O frontend deve tratar 409 ao confirmar como "já ocupado",
   não como erro.

**Fronteira em aberto:** o `client/src/config/appointmentSlots.ts` ainda calcula slots no browser,
com as mesmas regras mas duplicadas. Substituí-lo pela chamada ao servidor é o próximo passo natural
— e é a forma de a duplicação deixar de poder divergir. Enquanto não o fizer, o servidor é a
autoridade e a marcação revalida, o que torna a divergência um problema de *exibição* e não de
correção: o visitante pode ver um horário que já não está livre, mas nunca agendar sobre outro.