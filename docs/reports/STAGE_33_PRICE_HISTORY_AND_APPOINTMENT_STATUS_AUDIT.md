# Stage 33 — Auditoria da Precisão Financeira e dos Estados dos Agendamentos

> **Natureza:** auditoria apenas. Nenhum ficheiro de produção, teste, modelo, DTO, API
> ou contrato foi alterado. Nenhum commit/merge/push foi feito.

## 1. Resumo executivo

A auditoria confirma que o SchedulerPro **não guarda qualquer cópia do preço no momento
da reserva**. O agendamento (`appointments`) referencia o serviço (`serviceId`) mas não
armazena `price`, `priceAtTime` nem qualquer outro snapshot. **Todos os valores
financeiros dos relatórios são calculados em tempo de consulta**, fazendo `$lookup` ao
documento de serviço atual e usando `service.price` vigente nesse instante.

Consequência direta e comprovada: **alterar o preço de um serviço altera
retroativamente a receita estimada de agendamentos já concluídos** — não há preservação
de valor histórico. Este é o principal problema confirmado (prioridade crítica).

Os **estados dos agendamentos** estão, em contrapartida, tratados de forma consistente
nos indicadores: `completed` conta como realizado; `scheduled`/`confirmed` alimentam a
previsão; `cancelled` e `no-show` nunca entram na receita. Não existe, porém, nenhum
conceito de **valor final do atendimento**, **desconto** ou **valor recebido**: o único
valor é uma estimativa baseada no preço do serviço. Não existe entidade de pagamento,
faturação ou recibo em todo o backend.

## 2. Âmbito da auditoria

- Rastreio do preço desde a criação do agendamento (admin e público) até aos relatórios.
- Rastreio de cada estado de agendamento até aos indicadores (relatórios e dashboard).
- Verificação da existência de valor final, desconto e receita efetivamente recebida.
- Verificação de integridade histórica face a alterações de preço.
- Isolamento multiempresa e tratamento de soft-delete.
- Execução dos testes relevantes e identificação de lacunas de cobertura.

Ficaram fora do âmbito: alterações de comportamento, correções, migrações e novas
funcionalidades (explicitamente proibidas).

## 3. Ficheiros e módulos inspecionados

**Backend — agendamentos**
- `server/src/modules/appointments/models/Appointment.model.ts`
- `server/src/modules/appointments/mappers/AppointmentMapper.ts`
- `server/src/modules/appointments/mappers/PublicAppointmentMapper.ts`
- `server/src/modules/appointments/dto/{Create,Update,CreatePublic,UpdatePublic}Appointment.dto.ts`
- `server/src/modules/appointments/index.ts`
- `server/src/modules/appointments/services/AppointmentService.ts`
- `server/src/modules/appointments/repositories/AppointmentRepository.ts`
- `server/src/modules/appointments/routes/AppointmentRoutes.ts`
- `server/src/constants/appointment-status.ts`

**Backend — serviços**
- `server/src/modules/services/models/Service.model.ts`
- `server/src/modules/services/services/ServiceService.ts`
- `server/src/modules/services/repositories/ServiceRepository.ts`
- `server/src/modules/services/mappers/ServiceMapper.ts`

**Backend — relatórios**
- `server/src/modules/reports/repositories/ReportRepository.ts`
- `server/src/modules/reports/services/ReportService.ts`
- `server/src/modules/reports/controllers/ReportController.ts`
- `server/src/modules/reports/routes/ReportRoutes.ts`
- `server/src/modules/reports/validators/list-reports.validator.ts`
- `server/src/modules/reports/index.ts`

**Backend — público**
- `server/src/modules/public-booking/mappers/PublicBookingMapper.ts`
- `server/src/modules/appointments/services/AppointmentService.createPublic`

**Frontend**
- `client/src/pages/reports/ReportsPage.tsx` (+ `.test.tsx`)
- `client/src/pages/dashboard/DashboardPage.tsx` (+ `.test.tsx`)
- `client/src/types/{appointment,service,report}.ts`

**Testes**
- `server/tests/unit/reports/{ReportService,ReportRepository}.test.ts`
- `server/tests/integration/routes/report.routes.test.ts`
- `server/tests/unit/appointments/{AppointmentService,AppointmentService.public,AppointmentService.public-link}.test.ts`
- `server/tests/integration/availability-appointment.routes.test.ts`
- `server/tests/integration/public-appointment.routes.test.ts`
- `server/tests/integration/public-booking.routes.test.ts`
- `server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts`

## 4. Funcionamento atual do histórico de preços

### 4.1 Onde o preço é definido

O preço existe **apenas** no modelo de serviço:
`Service.model.ts:24` (`price: number`) e `Service.model.ts:90-94` (`required`, `min: 0`).
É devolvido ao frontend por `ServiceMapper.ts:28` (admin) e por
`PublicBookingMapper.ts:40` (catálogo público). É criado/editado em
`ServiceService.create:42-48` e `ServiceService.update:109-115`.

### 4.2 O agendamento NÃO guarda preço

O documento de agendamento **não tem campo de preço**:
`Appointment.model.ts:28-65` lista todos os campos (`companyId`, `clientId`,
`serviceId`, `employeeId`, `startAt`, `endAt`, `status`, `notes`, `deletedAt`, token
público e marcas de lembrete). Não existe `price`, `priceAtTime` nem `priceSnapshot`.

Os DTOs de criação/atualização também não aceitam preço:
`CreateAppointment.dto.ts:14-20`, `UpdateAppointment.dto.ts:14-20`,
`CreatePublicAppointment.dto.ts:22-30`. O fluxo público **rejeita explicitamente** um
`price` enviado (`CreatePublicAppointment.dto.ts:17-18`): "`status`, `endAt`, `price` e
`duration` nunca são enviados; são determinados pelo backend."

No `schedule()` (`AppointmentService.ts:299-314`), o payload persistido contém
`companyId, clientId, serviceId, employeeId, startAt, endAt, status, notes` e os campos
de token — nenhum preço.

`AppointmentMapper.toResponse` (`AppointmentMapper.ts:24-36`) e
`PublicAppointmentMapper.toResponse` (`PublicAppointmentMapper.ts:44-58`) também não
expõem preço. O frontend espelha isto em `client/src/types/appointment.ts:17-29`.

> Nota: existem dois comentários que mencionam `price` apenas para dizer que ele **não**
> é controlável pelo cliente: `AppointmentService.ts:1043` e
> `UpdatePublicAppointment.dto.ts:19-20`. Não indicam qualquer armazenamento.

### 4.3 Como o valor histórico é calculado

É calculado **a partir do preço atual do serviço**, em tempo de consulta, no
`ReportRepository`:

- `findRevenue` (`ReportRepository.ts:101-184`): `$lookup` de `services` (108-114),
  `servicePrice = $ifNull[$arrayElemAt["$service.price",0], 0]` (116-121) e depois
  `estimatedRevenue` soma `servicePrice` dos `status == completed` (134-142);
  `forecastRevenue` soma `servicePrice` dos `scheduled`/`confirmed` (160-176).
- `findTopServices` (`ReportRepository.ts:211-214, 230-238`): mesma lógica.
- `findEmployeeMetrics` (`ReportRepository.ts:297-299, 326-334`): mesma lógica.
- `findClientMetrics` (`ReportRepository.ts:407-409, 426-434`): mesma lógica.

O comentário do próprio repositório assume a estimativa:
`ReportRepository.ts:88-99` e `ReportService.ts:83-89` ("Os valores são estimativas
baseadas no preço dos serviços, nunca pagamentos efetivos").

### 4.4 Alteração posterior do preço

Como não há snapshot, alterar `service.price` (`ServiceService.update`) faz com que
**as consultas seguintes devolvam valores diferentes para os mesmos agendamentos
passados**. Não existe qualquer barreira que preserve o valor da reserva. Isto é
confirmado por construção: os testes de `ReportRepository` verificam precisamente que o
valor vem do `$lookup` a `services` (`ReportRepository.test.ts:65-84`, assert
`lookup.from === "services"`).

### 4.5 Agendamentos públicos

Passam pelo mesmo caminho de escrita (`AppointmentService.createPublic`,
`AppointmentService.ts:545-576`) e não gravam preço. Logo, são indistinguíveis de um
agendamento administrativo nos relatórios: ambos derivam o valor do preço atual do
serviço.

### 4.6 Agendamentos antigos/importados

Como **nenhum** agendamento tem preço, o cenário "sem preço histórico" aplica-se a todos.
Se o serviço referenciado existir (mesmo soft-deleted, pois o `$lookup` não filtra
`deletedAt`), o preço atual é usado. Se o serviço não for encontrado no `$lookup`, o
`$ifNull` devolve `0` (`ReportRepository.ts:118`), **zerando a receita silenciosamente**.
Não há aviso nem campo de fallback.

### 4.7 Cobertura de testes sobre preço

**Não existe** qualquer teste que altere o preço de um serviço e verifique preservação
de valores históricos. Os testes de relatórios usam `aggregate` mockado
(`ReportRepository.test.ts:8-10`) ou `ReportRepository` mockado
(`ReportService.test.ts:3-15`), pelo que nunca executam a agregação real contra dados
com preços diferentes ao longo do tempo.

### 4.8 Valor final, desconto e valor recebido

- **Desconto/ajuste:** não existe (nenhum campo, DTO ou teste).
- **Valor final do atendimento:** não existe; só há estimativa por preço de tabela.
- **Valor recebido / pagamento:** não existe. `grep` por
  `payment|pagamento|stripe|mercadopago|pagseguro|gateway|checkout|invoice|fatura|receipt|recibo`
  não devolveu resultados em `server/src` nem em `client/src`. Os modelos existentes
  são apenas `User`, `Session`, `PasswordReset`, `Service`, `Appointment`, `ClientInvite`,
  `EmployeeAvailability`, `AvailabilityException`, `Notification`, `Company`, `Client`.

## 5. Funcionamento atual dos estados dos agendamentos

Estados (`appointment-status.ts:13-19`): `scheduled`, `confirmed`, `completed`,
`cancelled`, `no-show`. O schema valida-os por `enum` com default `scheduled`
(`Appointment.model.ts:113-119`).

Transições implementadas em `AppointmentService`:

| Ação | De | Para | Função |
|---|---|---|---|
| confirmar | `scheduled` | `confirmed` | `confirm:1313-1320` |
| concluir | `confirmed` | `completed` | `complete:1327-1334` |
| cancelar | `scheduled`/`confirmed` | `cancelled` | `cancel:1347-1359` |
| falta | `confirmed` | `no-show` | `markAsNoShow:1366-1373` |
| automático | `scheduled` vencido | `cancelled` | `expireOverdueScheduled:639-644` → `AppointmentRepository.cancelOverdueScheduled:412-427` |

Observações:
- `completed` **exige** passar por `confirmed`; não há `scheduled → completed` direto.
- O cancelamento automático de `scheduled` vencido **converte faltas não confirmadas em
  `cancelled`** (não em `no-show`), o que afeta os indicadores (ver §6/§9).
- O comportamento das transições tem cobertura: `availability-appointment.routes.test.ts:305-321`
  e `AppointmentService.test.ts:22`.

## 6. Regras e cálculos dos relatórios

Rotas (`ReportRoutes.ts:32-38, 45-88`), todas protegidas por
`AuthMiddleware.authenticate` + `authorize(OWNER, ADMIN, MANAGER)`. A empresa vem sempre
da sessão (`ReportController.ts:61` e seguintes), nunca do query.

Filtro base (`ReportRepository.buildBaseMatch:45-66`): `companyId` (sessão) +
`deletedAt: null` + intervalo opcional sobre `startAt` (`$gte startAt`, `$lt endAt`).
Sem filtro por funcionário. Sem filtro por status na base.

| Indicador | Origem | Estados incluídos | Estados excluídos | Cálculo financeiro |
|---|---|---|---|---|
| `overview.byStatus` / `total` | `findStatusCounts` (`ReportRepository.ts:73-84`) | todos | — | N/A (contagens) |
| `revenue.estimatedRevenue` / `completedCount` | `findRevenue` | `completed` | restantes | `Σ service.price` (atual) |
| `revenue.forecastRevenue` / `forecastCount` | `findRevenue` | `scheduled`, `confirmed` | restantes | `Σ service.price` (atual) |
| `top-services` | `findTopServices` | todos p/ `count`; `completed` p/ valor | — | `Σ service.price` (atual) |
| `employees` | `findEmployeeMetrics` | todos; `completedCount`, `cancelledCount` | exclui `role CLIENT` | `Σ service.price` (atual) |
| `clients` | `findClientMetrics` | todos; `completedCount` | — | `Σ service.price` (atual) |
| `cancellations` | `findStatusCounts` + `ReportService.getCancellations:194-214` | todos p/ `total`; `cancelled` p/ contagem | — | `cancellationRate = cancelled/total` (arredondado a 2 casas) |

`no-show` aparece **apenas** em `overview.byStatus`. Não há indicador dedicado de faltas
nem coluna de faltas no ranking de funcionários (só `cancelledCount`).

O dashboard (`DashboardPage.tsx`) **não apresenta valores financeiros**. Mostra "Hoje"
(exclui `cancelled`, `DashboardPage.tsx:147-157`), "Pendentes" (`scheduled`, 243) e
"Confirmados" (`confirmed`, 250). Não calcula receita nem valores.

**Divergências backend/frontend:** o frontend apenas formata (`formatMoney`,
`formatPercent`) os valores que o backend envia; não recalcula receita. A única
divergência encontrada é de **teste vs. implementação**: `ReportsPage.test.tsx:200,329`
espera `data-testid="revenue-estimated"`, que a página não renderiza (usa `DashboardCard`,
`ReportsPage.tsx:414-419`). Não é divergência de cálculo financeiro.

## 7. Resultados dos cenários analisados

Legenda: **[T]** comprovado por teste; **[C]** comprovado por leitura de código;
**[I]** inferido.

1. **Serviço aumenta de preço após agendamento criado** — o relatório passa a usar o
   preço novo para o agendamento antigo. **[C]**(`ReportRepository.ts:116-142`,
   inexistência de snapshot em `Appointment.model.ts`).
2. **Serviço diminui de preço** — idem, receita histórica diminui retroativamente. **[C]**.
3. **Agendamento antigo em relatório mensal** — incluído pelo filtro de período sobre
   `startAt`; valor pelo preço atual. **[T]** para o filtro
   (`ReportService.test.ts`, `report.routes.test.ts:123-136`); **[C]** para o valor.
4. **Agendamento concluído após alteração de preço** — `completed` não snapshotiza;
   valor final = preço atual. **[C]**.
5. **Agendamento cancelado** — excluído de receita e previsão; contado em `cancelled`.
   **[T]**(`ReportService.test.ts:59-75, 250-287`).
6. **Cliente não comparece (`no-show`)** — excluído da receita (não é `completed`),
   contado em `byStatus["no-show"]`. **[T]** parcial (`ReportService.test.ts:35-57`);
   não há indicador dedicado. **[C]**.
7. **Agendamento público sem conta** — criado sem `User`
   (`AppointmentService.public.test.ts:304-377, 386-455`); entra nos relatórios como
   qualquer outro, sem preço próprio. **[T]** para "sem conta"; **[C]** para o relatório.
8. **Mesmo cliente com vários agendamentos** — agrupados por `clientId` em
   `findClientMetrics`; `recurringCount` = clientes com ≥ 2. **[T]**
   (`ReportService.test.ts:199-247`, `ReportRepository.test.ts:132-173`).
9. **Agendamento sem preço histórico** — aplica-se a **todos**; serviço ausente → valor
   `0` silencioso. **[C]**(`ReportRepository.ts:118`).
10. **Isolamento entre empresas** — filtro `companyId` em `buildBaseMatch`; o query
    param `companyId` é ignorado. **[T]**(`report.routes.test.ts:148-161`); **sem** teste
    de agregação real cruzando duas empresas. **[C]** para o isolamento efetivo.

## 8. Testes executados e resultados

Execução focada (backend, sequencial):
`npx vitest run tests/unit/reports tests/unit/appointments tests/integration/routes/report.routes.test.ts tests/integration/public-appointment.routes.test.ts`
→ **7 ficheiros, 192 testes, 192 passaram.**

Execução frontend relevante (isolada, para evitar o timeout de workers):
- `client/src/pages/reports/ReportsPage.test.tsx` → **11 testes, 2 falham** (ambos por
  `Unable to find [data-testid="revenue-estimated"]`).
- `client/src/pages/dashboard/DashboardPage.test.tsx` → **10 testes, 2 falham**
  (contagem de cards esperada `[1,2,1,1,1,1]` vs. renderizada `[1,2,1]`; não financeiro).

Baseline conhecida (Stage 32.1, sem alterações desde então): backend **1174 testes, 6
falhas preexistentes** em `public-booking.routes.test.ts` (datas fixas `2026-10-08`);
frontend **1229 testes, 4 falhas preexistentes** (2 em `DashboardPage`, 2 em
`ReportsPage`). As 4 falhas frontend agora observadas são exatamente as da baseline; as
6 do backend não foram reconfirmadas nesta sessão por não serem afetadas por esta
auditoria e por já estarem documentadas. **Nenhuma falha nova foi introduzida.**

## 9. Problemas confirmados e lacunas

### P-I.1 — Preço histórico não preservado (CRÍTICO)

- **Descrição:** o agendamento não guarda o preço aplicável na reserva; os relatórios
  usam o preço atual do serviço.
- **Ficheiros/funções:** `Appointment.model.ts:28-65`;
  `AppointmentService.ts:299-314`; `ReportRepository.ts:108-121, 134-142, 160-176,
  211-214, 297-299, 407-409`.
- **Evidência:** ausência de campo de preço + `$lookup` a `services` confirmado por
  `ReportRepository.test.ts:65-84`.
- **Impacto:** alterar preços distorce retroativamente receita de meses já fechados;
  risco de relatórios não auditáveis.
- **Testes existentes:** nenhum cobre alteração de preço.
- **Testes em falta:** cenário "cria agendamento a 20 → conclui → altera preço para 30 →
  relatório continua a 20".
- **Recomendação:** introduzir snapshot de preço na escrita do agendamento (tarefa
  futura, fora desta auditoria) e passar os relatórios a somar esse campo.
- **Prioridade:** crítica.

### P-I.2 — Sem valor final, desconto ou valor recebido (LACUNA FUNCIONAL)

- **Descrição:** não existe distinção entre preço reservado, desconto, valor final e
  valor recebido; não há entidade de pagamento.
- **Ficheiros:** todo o `server/src` (grep sem resultados), `ReportService.ts:83-103`.
- **Evidência:** "estimativas baseadas no preço dos serviços, nunca pagamentos efetivos".
- **Impacto:** qualquer indicador rotulado "receita" **não** é dinheiro recebido.
- **Testes:** inexistentes.
- **Recomendação:** clarificar rótulos na UI (já o faz: "Receita estimada") e, se se
  pretender receita real, criar entidade de pagamento numa fase dedicada.
- **Prioridade:** alta (conceptual/negócio).

### P-I.3 — Serviço ausente zera receita silenciosamente (MÉDIA)

- **Descrição:** se o `$lookup` não encontrar o serviço, `$ifNull` devolve `0` sem
  qualquer sinalização.
- **Ficheiros:** `ReportRepository.ts:118, 212, 298, 408`.
- **Impacto:** receita subestimada sem erros nem testes.
- **Recomendação:** quando existir snapshot (P-I.1), usar o valor gravado como
  fallback; caso contrário, assinalar agendamentos sem serviço resolvível.
- **Prioridade:** média.

### P-I.4 — Faltas não confirmadas tornam-se cancelamentos (MÉDIA)

- **Descrição:** `cancelOverdueScheduled` (`AppointmentRepository.ts:412-427`) converte
  `scheduled` vencido em `cancelled`, inflacionando cancelamentos e não registando a
  falta real.
- **Ficheiros:** `AppointmentService.ts:639-644`; `AppointmentRepository.ts:412-427`.
- **Testes:** `AppointmentService.test.ts:25` confirma o comportamento (sem avaliar
  semântica de negócio).
- **Impacto:** indicador de cancelamentos e de faltas potencialmente enganador.
- **Recomendação:** decidir regra de negócio (auto-`no-show` vs. auto-`cancelled`) numa
  tarefa futura.
- **Prioridade:** média.

### P-I.5 — `no-show` pouco visível nos relatórios (BAIXA)

- **Descrição:** só aparece em `overview.byStatus`; não há indicador dedicado nem coluna
  nas tabelas de funcionários/serviços/clientes.
- **Ficheiros:** `reports/index.ts:84-131`; `ReportRepository.findEmployeeMetrics`.
- **Prioridade:** baixa.

### P-I.6 — Semântica de período diferente entre relatórios e listagem (BAIXA)

- **Descrição:** relatórios filtram por `startAt ∈ [início, fim)`
  (`ReportRepository.ts:54-63`); a listagem de agendamentos filtra por **sobreposição**
  (`AppointmentRepository.ts:109-114`).
- **Impacto:** um agendamento que começa antes do período e termina dentro dele entra na
  agenda mas não no relatório.
- **Prioridade:** baixa (documentar/decisão de produto).

### Lacunas de teste transversais

- Sem teste de integração de agregação real (Mongo) para os relatórios — tudo é mock.
- Sem teste de alteração de preço ao longo do tempo.
- Sem teste de isolamento multiempresa na agregação real (só ignora o query param).
- Sem teste autenticado de CRUD de agendamentos a validar ausência de preço no payload
  (existe apenas para o fluxo público: `public-appointment.routes.test.ts:287-289`).
- Sem teste de `no-show` excluído de `estimatedRevenue` explicitamente.

## 10. Recomendações ordenadas por prioridade

1. **[Crítica] Snapshot de preço no agendamento.** Gravar o preço vigente na criação
   (`priceAtTime`) e consumir esse campo em todos os cálculos de relatório. Inclui
   migração/backfill para agendamentos existentes (não executada nesta auditoria).
2. **[Alta] Definir e separar valor final vs. recebido.** Rever rótulos e, se aplicável,
   introduzir desconto/valor final/pagamento em fase própria.
3. **[Média] Fallback explícito para serviço ausente** em vez de `0` silencioso.
4. **[Média] Decidir a regra de faltas não confirmadas** (auto-cancel vs. auto-no-show).
5. **[Baixa] Enriquecer indicadores de faltas** (contagem dedicada, coluna por
   funcionário).
6. **[Baixa] Alinhar semântica de período** entre relatórios e listagem, ou documentar
   a diferença.
7. **[Baixa] Reparar os testes frontend preexistentes** (`revenue-estimated` testid;
   contagem de cards do dashboard) numa tarefa de housekeeping — não faz parte desta
   auditoria.

## 11. Limitações da auditoria

- A agregação real do MongoDB não foi executada contra dados de teste com preços
  variáveis; as conclusões de receita baseiam-se na leitura do pipeline e no facto
  comprovado de não existir campo de preço no agendamento.
- As 6 falhas preexistentes do backend (`public-booking`, datas fixas) não foram
  reconfirmadas nesta sessão por não serem afetadas pela auditoria.
- Não foram inspecionados scripts de seed/migração de dados legados (não referenciados
  pelo domínio).

## 12. Confirmação de que não foram feitas alterações funcionais

Nenhum ficheiro de produção ou de teste foi criado, editado ou removido. Não foram
alterados modelos, DTOs, APIs, contratos, regras de negócio, nem introduzidos campos
(`priceAtTime`, `finalPrice`, etc.), pagamentos, migrações, commits, merges ou pushes.
A única alteração ao repositório é **este relatório** (`git status` deve mostrar apenas
`docs/reports/STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md`).

## CONTEXTO PARA A PRÓXIMA IA

**Estado atual comprovado.** O preço existe só em `Service` (`Service.model.ts:24`). O
agendamento não tem preço de qualquer tipo (`Appointment.model.ts:28-65`) e os DTOs/mappers
não o expõem. Os relatórios calculam `estimatedRevenue`/`forecastRevenue` e os valores
dos rankings em tempo de consulta, via `$lookup` a `services` e `service.price` atual
(`ReportRepository.ts:108-142, 211-214, 297-299, 407-409`). Logo, alterações de preço
distorcem valores históricos e não há valor final, desconto nem recebido (sem entidade de
pagamento em todo o backend).

**Estados.** `scheduled`/`confirmed` → previsão; `completed` → receita estimada;
`cancelled`/`no-show` → nunca receita; `overview.byStatus` conta os cinco; `cancellations`
calcula `cancelled/total`. Transições em `AppointmentService` (confirm/complete/cancel/
no-show) e auto-cancel de `scheduled` vencido. O dashboard não tem valores financeiros.

**Ficheiros-chave.** `server/src/modules/reports/repositories/ReportRepository.ts`,
`.../reports/services/ReportService.ts`, `.../appointments/models/Appointment.model.ts`,
`.../appointments/services/AppointmentService.ts`,
`.../appointments/repositories/AppointmentRepository.ts`,
`.../services/models/Service.model.ts`, `.../services/services/ServiceService.ts`,
`client/src/pages/reports/ReportsPage.tsx`.

**Decisões de negócio a preservar.** (1) `estimatedRevenue`/`forecastRevenue` são
estimativas, não dinheiro recebido — não os rotular como receita efetiva. (2) O fluxo
público nunca cria `User` nem aceita `price`/`status`/`companyId`. (3) A empresa vem
sempre da sessão. (4) `deletedAt: null` exclui soft-deleted dos relatórios. (5) RBAC de
relatórios = OWNER/ADMIN/MANAGER.

**Problemas identificados.** P-I.1 (crítico) ausência de snapshot de preço; P-I.2 (alto)
ausência de valor final/desconto/recebido; P-I.3 (médio) `$ifNull 0` silencioso;
P-I.4 (médio) faltas não confirmadas viram cancelamentos; P-I.5 (baixo) `no-show` pouco
visível; P-I.6 (baixo) semântica de período diferente.

**Sequência recomendada.** 1) snapshot de preço na escrita + backfill + consumo nos
relatórios; 2) decidir/rever valor final vs. recebido; 3) fallback explícito para serviço
ausente; 4) política de faltas vencidas; 5) indicadores de faltas; 6) alinhar semântica
de período; 7) housekeeping dos testes frontend preexistentes. Introduzir, ao mesmo
tempo, um teste de integração de agregação real que prove preservação de valor histórico.
