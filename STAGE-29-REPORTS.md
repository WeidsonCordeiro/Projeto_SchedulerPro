# STAGE-29-REPORTS.md

## Objetivo

Implementar os **lembretes automáticos de agendamento**: envio de um e-mail ao **cliente** do agendamento em **24 horas** e em **2 horas** antes do horário de início (`startAt`), com o sistema operando de forma **persistente e periódica** (sobrevive a reinicialização do servidor), respeitando o **fuso horário da empresa** e **horário de verão (DST)**, com **idempotência**, **concorrência segura** e **janela de tolerância** bem definida.

### Pré-requisitos que NÃO fazem parte deste estágio (fora de escopo)

Durante a validação manual foi confirmado que a constante de RBAC em `server/src/constants/rbac.ts` (linha 76) já contém `[Role.MANAGER]: [Permission.USER_READ, ...]`. **Este ajuste já existe no código-fonte, foi validado manualmente e NÃO foi alterado neste estágio.** Ele é pré-requisito de produto: o perfil MANAGER precisa listar funcionários para escolher um profissional ao criar/editar agendamentos.

Nenhuma alteração de frontend foi necessária neste estágio (nenhuma tela/interação foi modificada).

## Arquitetura da solução

### Contexto investigado

- **Sem infraestrutura de jobs existente**: não há BullMQ, node-cron, agenda, Redis pub/sub nem fila no projeto.
- `ioredis` está declarado em `server/package.json`, porém **não é utilizado** em nenhum ponto do código (apenas uma referência comentada em `server/src/utils/env.ts`). **Não foi introduzido** como dependência operacional.
- Dependência `dayjs` existe no projeto, mas o padrão de datas já é **Luxon** (`luxon` + `@types/luxon`) — foi aproveitado, coeso com o restante.

### Decisão: processamento periódico persistente (sem Redis/cron externo)

Para manter a solução **mínima e sem novas dependências**, foi implementado um **agendador em memória com recuperação por estado no banco**:

- Ao subir o servidor (`server.ts`, logo após `Database.connect()`), o `ReminderScheduler.start()` executa:
  1. **Uma rodada imediata de recuperação** (catch-up) — lida com períodos em que o servidor ficou offline dentro da janela de tolerância;
  2. **Uma rodada a cada 60 segundos** (`setInterval`).
- O estado de "já enviado" vive **no próprio documento Appointment** (campos `reminder2hSentAt`/`reminder24hSentAt`), então reiniciar o processo não perde progresso e nunca duplica envios.
- Em shutdown (`before shutdown` no `server.ts`) o `ReminderScheduler.stop()` encerra o intervalo.

### Módulos criados

| Arquivo | Responsabilidade |
| --- | --- |
| `server/src/modules/reminders/index.ts` | Enum `ReminderType`, constantes de janela/lease/intervalo, interface `ReminderRunSummary`. |
| `server/src/modules/reminders/services/ReminderService.ts` | Lógica principal: busca candidatos, janela de tolerância, timezone, elegibilidade (empresa ativa, cliente com e-mail, status ativo), envio, contabilidade do resumo. |
| `server/src/modules/reminders/scheduler/ReminderScheduler.ts` | Loop periódico com execução imediata, guarda anti-sobreposição e captura de erros (nunca lança). |
| `server/src/providers/mail/templates/reminder-email-layout.ts` | Layout compartilhado dos e-mails de lembrete. |
| `server/src/providers/mail/templates/reminder-24h.template.ts` | E-mail "em 24 horas". |
| `server/src/providers/mail/templates/reminder-2h.template.ts` | E-mail "em 2 horas". |

### Arquivos alterados (Stage 29)

| Arquivo | Alteração |
| --- | --- |
| `server/src/modules/appointments/models/Appointment.model.ts` | +4 campos de lembrete no schema/interface. |
| `server/src/modules/appointments/repositories/AppointmentRepository.ts` | +`ReminderFields`, `findUpcomingForReminders`, `claimReminder`, `markReminderSent`, `releaseReminderLease`. |
| `server/src/server.ts` | `ReminderScheduler.start()` após conectar no banco; `await ReminderScheduler.stop()` no shutdown. |

## Campos do modelo (Appointment)

Novos campos, todos `Date | null` (padrão `null`):

| Campo | Uso |
| --- | --- |
| `reminder24hSentAt` | Quando o lembrete de 24h foi realmente enviado (idempotência). |
| `reminder2hSentAt` | Quando o lembrete de 2h foi realmente enviado. |
| `reminder24hLeaseUntil` | Trava de concorrência do lembrete de 24h. |
| `reminder2hLeaseUntil` | Trava de concorrência do lembrete de 2h. |

Campos separados por tipo (em vez de um `reminder` embutido) mantêm as consultas e os índices simples.

## Estratégia do job e frequência

- Frequência: **60.000 ms (1 minuto)** — `REMINDER_JOB_INTERVAL_MS`.
- **Rodada imediata no boot** (catch-up): se o servidor ficou offline dentro da janela de tolerância, o lembrete ainda é enviado.
- O scheduler tem **guarda de sobreposição** (`running`): se uma rodada demorar mais que o intervalo, a próxima é ignorada.
- **Nunca lança exceção**: falhas no processamento são registradas com `Logger.error` e não derrubam o servidor nem o loop.
- Como as travas expiram (`REMINDER_LEASE_TTL_MINUTES = 10`), se o processo morrer durante um envio, uma próxima execução retoma o lembrete sem espera manual.

## Janela de tolerância

O job não roda exatamente no instante `startAt - offset`. Cada lembrete é enviado quando:

```
now ∈ [ startAt − offset , startAt − offset + tolerância ]
```

| Lembrete | Offset | Tolerância | Lookahead da query |
| --- | --- | --- | --- |
| 24h | 24h (1440 min) | 3h (180 min) | 27h |
| 2h | 2h (120 min) | 1h (60 min) | 27h (mesma query do 24h) |

**Fora da janela (muito cedo ou tarde demais) o lembrete NÃO é enviado** — evita envios atrasados de forma indiscriminada. Agendamentos passados sempre ficam fora da janela.

## Cálculo de 24h/2h, timezone e DST

- Todos os cálculos usam **Luxon** com o fuso da empresa (`company.timezone`). Se a empresa não tiver `timezone`, o fallback é `DEFAULT_TIMEZONE = "Europe/Lisbon"` (centralizado em `server/src/utils/timezone.ts`, via `toCompanyDateTime`).
- **Datas/horas são exibidas no fuso da empresa**, embora o vencimento seja calculado em UTC absoluto (`startAt` armazenado como Date). Isso torna a solução **independente do fuso do servidor** e **correta para DST** — a conversão acontece no instante do processamento, então mudanças de relógio (Europa/Lisboa, America/Sao_Paulo etc.) são respeitadas automaticamente.
- O e-mail mostra data (`dd/MM/yyyy`), hora de início e de fim no fuso da empresa. O fim é calculado como `startAt + duração do serviço`.
- **Evidência em teste (DST)**, Lisboa: `2026-03-27T10:00:00.000Z` → "10:00 às 10:30" (UTC+0, antes do DST); `2026-03-30T10:00:00.000Z` → "11:00 às 11:30" (UTC+1, após o DST).
- **Evidência em teste (fuso)**: `America/Sao_Paulo` → "31/08/2026, 07:00 às 07:30"; `Europe/Lisbon` → "31/08/2026, 11:00 às 11:30" para o mesmo instante UTC.

## Idempotência e concorrência (claim → envio → mark-as-sent)

Fluxo para cada candidato:

1. **`claimReminder`** (query atômica `updateOne` do Mongo):
   - só troca a trava para o documento onde `sentField: null` E (`leaseField: null` OU `leaseField <= now`), `deletedAt: null` e `status ∈ [scheduled, confirmed]` — **revalida o estado no momento exato da execução**;
   - se `modifiedCount !== 1`, outro worker/execução venceu ou o estado mudou → **skip**.
2. **Envia o e-mail** via `ResendProvider` (mesma infra do Stage 28).
3. **`markReminderSent`**: seta `sentField = now` e limpa a trava (**idempotência** — nunca reenvia).

- Se o envio **falhar**: a trava é liberada (`releaseReminderLease`), a falha é registrada, o lembrete **NÃO é marcado como enviado** e será tentado de novo na próxima rodada (dentro da janela).
- **Reagendamento**: o cálculo do 2h parte sempre do `startAt` atual; se o lembrete de 24h já foi enviado, ele não é reenviado (`reminder24hSentAt` já preenchido) — e o de 2h usa o novo horário.
- **Cancelamento/no-show/completo entre a busca e o envio**: o claim revalida `status` e `deletedAt`, então o envio é bloqueado.

## Falha de e-mail

- `send()` de `ResendProvider` lançou → `releaseReminderLease` (com proteção contra falha da própria liberação), `Logger.error` com contexto (appointment, company, client, e-mail, erro), e a falha é contabilizada em `summary.failed`. O lembrete fica **não-marcado** e é tentado novamente em rodada posterior — o processo **nunca** derruba a API.

## Elegibilidade (filtro)

Um agendamento é candidato quando:
- `deletedAt: null` (não soft-deleted);
- `status ∈ [scheduled, confirmed]` — **excluídos** `cancelled`, `no-show` e `completed`;
- `startAt > now` (futuro) e dentro do lookahead (27h);
- a empresa associada **existe e `isActive === true`**;
- o cliente existe (busca através do método de cliente por empresa) e **possui `email`**.

`completed`/`no-show` são excluídos porque não são mais agendamentos ativos/futuros. A exclusão acontece de forma dupla: no filtro da query e novamente no claim (proteção contra corrida).

OBSERVAÇÃO (validação manual): nenhuma notificação in-app ao cliente foi gerada neste estágio; o canal de lembrete é exclusivamente e-mail.

## E-mails

| Lembrete | Assunto | Destaque (headline) |
| --- | --- | --- |
| 24h | `SchedulerPro — Lembrete em 24 horas` | "Seu agendamento é em 24 horas" |
| 2h | `SchedulerPro — Lembrete em 2 horas` | "Seu agendamento é em 2 horas" |

- Destinatário: **apenas o cliente** (e-mail do documento Client). **Não** há notificação in-app para o cliente.
- Layout compartilhado (`reminder-email-layout.ts`) com os dados: nome do cliente, nome da empresa, serviço, profissional, data e horários (início/fim) no fuso da empresa. Serviço/profissional ausente → exibido "-".

## Testes

Comandos:
- `npm test` no `server`.
- `npx vitest run tests/unit/reminders tests/unit/repositories/appointment-reminders.test.ts tests/unit/providers/reminder-templates.test.ts`.

### Resultado

- **Server — suíte completa**: `48 files / 503 tests` **PASS** (antes do estágio: 44/467).
- Testes novos: `ReminderService.test.ts`, `ReminderScheduler.test.ts`, `tests/unit/repositories/appointment-reminders.test.ts`, `tests/unit/providers/reminder-templates.test.ts`.

### Cobertura dos testes (casos cobertos)

**Lembrete 24h**:
- envia quando o agendamento está dentro da janela (e-mail com data/hora locais corretos);
- não envia quando já foi enviado (`reminder24hSentAt` preenchido);
- não envia quando ainda é muito cedo (fora da janela);
- não envia quando já passou da janela (e agendamento passado);
- não envia para cancelado (claim rejeita no banco);
- não envia para `no-show` e `completed` (claim rejeita no banco);
- falha no envio → não marca como enviado, libera trava, contabiliza `failed`;
- execuções repetidas não duplicam o envio.

**Lembrete 2h**:
- envia quando está dentro da janela;
- não envia quando já foi enviado;
- não envia para cancelado;
- não envia quando foi removido da janela (agendamento passado);
- falha no envio → não marca, contabiliza `failed`;
- recalcula o envio quando o agendamento é reagendado (startAt novo, `reminder24hSentAt` já preenchido não reenvia o 24h).

**Timezones e DST**:
- `Europe/Lisbon` (UTC+1 no verão) e `America/Sao_Paulo` (UTC−3) para o mesmo instante UTC → horários locais distintos e corretos;
- antes/depois do DST em Lisboa → 10:00 vs 11:00 no mesmo instante UTC (evidência de correção de relógio).

**Isolamento e destinatário**:
- isolamento entre empresas: duas empresas com agendamentos simultâneos → cada uma busca/recebe seu candidato e envia para o cliente certo da respectiva empresa;
- usa o e-mail do cliente do agendamento;
- não envia quando a empresa está inativa;
- não envia quando o cliente não possui e-mail;
- claim perdido (outra execução venceu) → skip sem envio.

**Scheduler**:
- roda uma rodada e registra o resumo via `Logger.system`;
- falha no processamento → registrada, nunca lança;
- falha sem instância de `Error` é normalizada antes de logar;
- execuções sobrepostas são ignoradas;
- `start()` faz rodada imediata + repete no intervalo; `stop()` encerra;
- `start()` duplicado não duplica o intervalo; `stop()` sem `start()` é no-op.

**Repository**:
- busca apenas futuros/ativos/sem soft delete, com `status $in [scheduled, confirmed]` e lookahead 27h;
- claim com trava livre/expirada e `sentField: null`;
- claim revalida status ativo;
- `markReminderSent` seta o sent e limpa a trava;
- `releaseReminderLease` libera a trava sem marcar como enviado.

**Templates**:
- 24h e 2h renderizados com dados do agendamento;
- valores neutros ("-") quando serviço/profissional ausentes.

## Cobertura de código

### Módulo de lembretes (`src/modules/reminders/**`)

| Métrica | Valor |
| --- | --- |
| Statements | 100% |
| Branches | 88,88% |
| Functions | 100% |
| Lines | 100% |

Templates de lembrete cobertos 100% por `reminder-templates.test.ts` (todas as funções exportadas exercitadas).

### Server — suíte completa (`npm run test:coverage`)

| Métrica | Antes (Stage 28) | Depois (Stage 29) |
| --- | --- | --- |
| Statements | 74,25% | **76,24%** |
| Branches | 72,49% | **74,84%** |
| Functions | 59,37% | **62,59%** |
| Lines | 74,52% | **76,52%** |

Sem regressão — todos os índices subiram.

## Typecheck / Build

- `npm run build` no `server` (compila com `tsc`): **OK, sem erros**.
- Nenhuma alteração de frontend neste estágio (build/js do cliente não rodado porque nada mudou).

## Decisões importantes

1. **Sem novas dependências**: a solução usa apenas Mongo (travas atômicas) + `setInterval` em memória. `ioredis` continua **não utilizado** (analisado e descartado para estoque mínimo de infra).
2. **Estado no documento**: `sentAt`/`leaseUntil` vivem no Appointment → persiste reinício, idempotente, sem fila externa.
3. **Travas atômicas (`updateOne`)**: corretas para concorrência dentro do Mongo; o lease com TTL de 10 min cobre crash do processo durante o envio.
4. **Janela de tolerância explícita**: 3h (24h) e 1h (2h) evitam envios atrasados indiscriminados quando o servidor fica offline, mas limitam o retardo.
5. **Cálculo em UTC + exibição no fuso da empresa** (Luxon): robusto a DST, sem depender do fuso do servidor.
6. **Revalidação de status no claim**: fecha a corrida entre "buscou candidato" e "envia", mesmo com cancelamento/no-show/completion intermediário.
7. **Reaproveitamento total** de `ResendProvider`, `Logger`, `toCompanyDateTime` e `DEFAULT_TIMEZONE` — zero duplicação de infra de e-mail/timezone.

## Limitações conhecidas

- O scheduler roda **em memória por processo**: em um deploy multi-instância, cada instância executaria o job — porém o **claim atômico previne envios duplicados** mesmo neste cenário (as travas expiram e a janela limita o retardo).
- O job tem janela **fixa de 1 minuto**; emails são enviados sequencialmente, sem batching paralelo.
- Não há queue de retry de e-mail além da própria janela (se o e-mail falhar até o fim da janela, o lembrete é perdido por design — tolerância limitada).

## Melhorias futuras identificadas

- Mover o job para um **worker dedicado/Cron externo** (ou fila tipo BullMQ/BullMQ + Redis) quando houver multi-instância real, mantendo a lógica de claim.
- Adicionar **índices** em `{ startAt: 1 }` e nos campos `reminder*LeaseUntil` para escalar a query de candidatos.
- Permitir **configuração de tolerâncias por empresa/tipo de serviço** (hoje as constantes são globais do módulo).
- Batch/paralelizar envios em lotes dentro da rodada.
- **Métricas/observabilidade** do job (contadores `checked/sent/skipped/failed`) em Sentry ou métricas de aplicação.
- Notificação in-app para cliente como evolução futura (hoje a regra é **apenas e-mail**).
- Considerar reenvio tardio com aviso ("lembre que você não recebeu...") se a janela for furada — hoje a decisão é **nunca** enviar fora da janela.

## CONTEXTO PARA A PRÓXIMA IA

O contexto a seguir deve ser preservado e repassado em resumos futuros.

### Estado: STAGES 28 E 29 CONCLUÍDOS

- **Stage 28 (notificações in-app)** e **Stage 29 (lembretes automáticos)** estão implementados, testados e cobertos. Todo o projeto passa na suíte (`server`: 48 files / 503 tests; cliente: 79 files / 846 tests).
- Contratos e lógica das notificações do Stage 28 permanecem **intactos e não alterados** pelo Stage 29 (módulos separados; o Stage 29 adiciona apenas envio de e-mail).

### O que foi implementado no Stage 29 (resumo executivo)

- Lembretes por e-mail para o **cliente** em **24h** e **2h** antes do horário, com janelas de tolerância de 3h e 1h respectivamente, respeitando o fuso da empresa e DST (Luxon), idempotência via `reminder24hSentAt`/`reminder2hSentAt` e concorrência via trava atômica (`reminder24hLeaseUntil`/`reminder2hLeaseUntil`) com TTL de 10 minutos.
- Processamento **persistente**: rodada imediata no boot + intervalo de 1 min, sobrevive a reinício, nunca lança exceção.
- É o primeiro consumidor produtivo do `ResendProvider` além das notificações.

### ONDE ESTÁ A REGRA DE RBAC DO MANAGER (IMPORTANTE — NÃO REMOVER)

- `server/src/constants/rbac.ts` **linha 76** já contém `[Role.MANAGER]: [Permission.USER_READ, ...]`.
- Essa permissão é **pré-existente e foi validada manualmente** neste estágio; o MANAGER **não possui** `USER_CREATE`/`USER_UPDATE`/`USER_DELETE`.
- **Motivo do negócio**: o perfil MANAGER precisa **listar funcionários** (leitura de usuários/empregados) para **escolher um profissional ao criar/editar agendamentos**. Remover ou restringir essa constante pode quebrar o fluxo de criação/edição de agendamentos pelo gerente.
- Não tocar nessa constante em estágios futuros a menos que o produto peça explicitamente.

### Arquivos-chave do Stage 29

- Constantes/tipos: `server/src/modules/reminders/index.ts`
- Regras de entrega: `server/src/modules/reminders/services/ReminderService.ts`
- Loop periódico: `server/src/modules/reminders/scheduler/ReminderScheduler.ts` (classe exportada + singleton padrão)
- Campos de modelo e acesso a dados: `server/src/modules/appointments/models/Appointment.model.ts` e `server/src/modules/appointments/repositories/AppointmentRepository.ts`
- Templates de e-mail: `server/src/providers/mail/templates/reminder-email-layout.ts`, `reminder-24h.template.ts`, `reminder-2h.template.ts`
- Wiring: `server/src/server.ts` (start imediato após connect; stop no shutdown)
- Testes: `server/tests/unit/reminders/…`, `server/tests/unit/repositories/appointment-reminders.test.ts`, `server/tests/unit/providers/reminder-templates.test.ts`

### Decisões de design consideradas "fechadas"

- Janelas de tolerância **3h (24h)** e **1h (2h)**; lookahead de consulta de **27h**.
- Destinatário: **apenas cliente**, **apenas e-mail** (sem notificação in-app ao cliente).
- Sem Redis/cron externos por enquanto (`ioredis` permanece não utilizada).
- Depois deste lembrete, o gap de pré-requisito de produto do MANAGER está apenas na **interface** (falta o frontend usar a listagem de funcionários no formulário de agendamento) — nada de backend pendente.