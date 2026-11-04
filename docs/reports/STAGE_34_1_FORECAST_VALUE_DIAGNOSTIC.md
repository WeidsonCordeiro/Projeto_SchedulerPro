# Stage 34.1 — Diagnóstico do Valor Previsto dos Agendamentos Históricos

> **Natureza:** diagnóstico apenas leitura. Nenhum ficheiro de produção, teste,
> modelo, DTO, API ou configuração foi alterado. Nenhum documento da base de
> dados foi modificado. Nenhum backfill, commit, merge ou push foi feito.

## 1. Resumo executivo

**Causa raiz confirmada (situação 1 do enunciado, com contributo parcial da
situação 2):** os agendamentos criados **antes** da Stage 34 não possuem o campo
`priceAtTime` — o campo está **ausente** (`$type = "missing"`), não `null`, porque
o schema só passou a declará-lo na Stage 34 e **não houve backfill**. A expressão
`HAS_PRICE_EXPRESSION` (`$type` numérico) devolve `false` para esses documentos,
pelo que são **excluídos da soma** do valor previsto e apenas contabilizados em
`forecastWithoutPrice`. Como consequência, apenas os 2 agendamentos novos (com
`priceAtTime` = 15 e 20) somam, produzindo exatamente `35,00 €`.

Foram **descartadas** as hipóteses de bug nos estados, datas/timezone, filtro de
empresa, agregação/mapeamento e apresentação. Os números reais obtidos por
consulta de leitura à base de dados confirmam-no (§5).

## 2. Contexto reproduzido

1. Existiam agendamentos em outubro de 2026 criados antes da Stage 34.
2. O indicador «Valor previsto (agendados e confirmados)» mostrava `0,00 €`.
3. Criou-se um agendamento com preço de `15,00 €`.
4. O preço do serviço foi alterado para `20,00 €`.
5. Criou-se outro agendamento para o mesmo serviço.
6. O indicador passou a mostrar `35,00 €`.

Os dados reais (§5) encaixam integralmente: os 2 únicos documentos com
`priceAtTime` numérico foram criados em `2026-10-12` e valem `15` e `20`;
os restantes (criados entre `2026-09-11` e `2026-10-09`) não têm o campo.

## 3. Ficheiros inspecionados

**Backend**
- `server/src/modules/appointments/models/Appointment.model.ts` (`priceAtTime:152-156`;
  interface `:49`)
- `server/src/modules/appointments/index.ts` (`CreateAppointmentData:33-45`,
  `UpdateAppointmentData:65-73`)
- `server/src/modules/appointments/services/AppointmentService.ts`
  (`schedule:230-329`; `create:414`; `createPublic:569`; `update:756,791,878`;
  `updatePublicByToken:1126,1129,1214`)
- `server/src/modules/appointments/repositories/AppointmentRepository.ts`
  (`create:127-131`, `update:139-147`)
- `server/src/modules/reports/repositories/ReportRepository.ts`
  (`HAS_PRICE_EXPRESSION:47-54`; `buildBaseMatch:63-84`; `findRevenue:125-240`;
  `findTopServices:247-332`; `findEmployeeMetrics:341-441`;
  `findClientMetrics:452-559`)
- `server/src/modules/reports/services/ReportService.ts` (`getRevenue:91-105`;
  `getTopServices`/`getEmployees`/`getClients:112-189`)
- `server/src/modules/reports/index.ts` (`RevenueAggregateRow:42-55`;
  `ReportRevenue:100-107`; restantes tipos `:57-135`)
- `server/src/modules/reports/controllers/ReportController.ts`
  (`buildRange:33-45`; `getRevenue:81-95`)
- `server/src/modules/reports/validators/list-reports.validator.ts`

**Frontend**
- `client/src/pages/reports/ReportsPage.tsx` (`EMPTY_REVENUE:54-59`;
  `missingPriceCount:263-265`; cartão receita + nota `:415-441`)
- `client/src/config/reportPeriod.ts` (`buildReportRange:39-73`)
- `client/src/api/endpoints/reports.api.ts` (`getRevenue:38-45`)
- `client/src/types/report.ts` (`ReportRevenue` com campos opcionais)

## 4. Percurso do cálculo (MongoDB → frontend)

1. **Escrita (criação):** `AppointmentService.create`/`createPublic` resolvem o
   serviço no tenant e passam `priceAtTime: service.price` para `schedule()`
   (`AppointmentService.ts:414`, `:569`), que persiste o campo em
   `AppointmentRepository.create` (`:316` → `Appointment.create`,
   `AppointmentRepository.ts:130`).
2. **Escrita (alteração):** `update`/`updatePublicByToken` fazem
   `let priceAtTime = appointment.priceAtTime ?? null` e só recalculam quando o
   `serviceId` muda (`:756-791`, `:1126-1129`).
3. **Consulta:** `ReportController.getRevenue` deriva `companyId` da sessão
   (`:82`), valida/parseia `startAt`/`endAt` e chama `ReportService.getRevenue`.
4. **Agregação:** `ReportRepository.findRevenue` faz `$match` por
   `{ companyId, deletedAt: null, startAt ∈ [start,end) }`, calcula
   `hasPrice = HAS_PRICE_EXPRESSION`, e em `$group` soma `$priceAtTime` apenas
   para `status = completed` (`estimatedRevenue`) ou `scheduled`/`confirmed`
   (`forecastRevenue`), contando separadamente `*WithoutPrice`.
5. **Serviço:** `ReportService.getRevenue` mapeia com `?? 0`
   (`ReportRevenue` inclui `completedWithoutPrice`/`forecastWithoutPrice`).
6. **HTTP:** `GET /reports/revenue` via `reports.api.getRevenue`.
7. **UI:** `ReportsPage` mostra `revenue.forecastRevenue` no cartão «Valor
   previsto (agendados e confirmados)» e, se
   `completedWithoutPrice + forecastWithoutPrice > 0`, a nota
   `data-testid="missing-price-note"`.

**`HAS_PRICE_EXPRESSION` (`ReportRepository.ts:47-54`)**
`{ $in: [{ $type: "$priceAtTime" }, ["double","int","long","decimal"]] }` →
`true` só para valores **numéricos**; `false` para `missing`, `null` ou qualquer
outro tipo (e `0` numérico é **conhecido**, não desconhecido).

## 5. Resultados das consultas de leitura

Consultas **read-only** via `mongoose` (nenhuma escrita), em `appointments`,
sem extrair dados pessoais (agregados/contagens). Período «Este mês» =
outubro 2026 no timezone `Europe/Lisbon` → UTC
`[2026-09-30T23:00Z, 2026-11-01T00:00Z)`.

- Agendamentos em outubro 2026 (`deletedAt: null`): **11**, todos de **uma única
  empresa**.
- Distribuição de `priceAtTime`: **`missing` = 9**, **`int` = 2**.
  (Global, todo o histórico: `missing = 20`, `int = 2`; `priceAtTime === 0`: 0.)
- Por estado: `cancelled = 5`, `scheduled = 5`, `confirmed = 1`; `completed = 0`.
- Elegíveis ao previsto (`scheduled`+`confirmed`) = **6**: **2 com preço**
  (`priceAtTime` = **15** e **20**) e **4 sem preço** (3 `scheduled`, 1
  `confirmed`).
- **`forecastRevenue` = 15 + 20 = 35** — exatamente o valor mostrado na UI.
- `forecastWithoutPrice` esperado = **4** (nº que a nota da UI deve comunicar).
- `estimatedRevenue` = 0 (não há `completed`).
- Datas de criação: os 2 com preço foram criados em `2026-10-12`; os 9 sem preço
  entre `2026-09-11` e `2026-10-09` (anteriores à Stage 34).
- Verificação de fronteira de data: 2 documentos caem em
  `[2026-09-30T00:00Z, 2026-09-30T23:00Z)` (= 30/set em Lisboa), corretamente
  **fora** de outubro; 0 em `[2026-11-01T00:00Z, 2026-11-02T00:00Z)`.

## 6. Verificação das hipóteses

- **A — Sem preço histórico: CONFIRMADO (causa raiz).** Os 9 agendamentos antigos
  têm o campo **ausente** (`missing`), não `null`. `HAS_PRICE_EXPRESSION` é
  `false` e os cálculos `forecastRevenue`/`estimatedRevenue` só somam
  `$priceAtTime` quando `hasPrice` é verdadeiro (`ReportRepository.ts:144-209`).
  `forecastWithoutPrice` conta-os corretamente (`:211-232`).
- **B — Estados: contributo secundário, regra correta.** 5 dos 9 antigos são
  `cancelled`; por regra de negócio não entram no previsto (nem em `completed`),
  independentemente do preço. Os 4 restantes são `scheduled`/`confirmed` e
  seriam contados **se** tivessem preço — não são por causa de A. Nenhuma
  alteração de regra é devida.
- **C — Datas/timezone: SEM BUG.** O intervalo é `[startAt, endAt)` calculado no
  timezone da empresa (`reportPeriod.ts:39-73`); o backend valida e converte
  (`list-reports.validator.ts`, `ReportController.buildRange`). Fronteiras
  verificadas: os 2 documentos fora de outubro pertencem a 30/set e a contagem
  exata bate com o filtro.
- **D — Empresa: SEM BUG.** `companyId` vem exclusivamente da sessão
  (`ReportController.ts:61,82`) e é aplicado em `buildBaseMatch`
  (`ReportRepository.ts:68`). Não é aceite `companyId` do query.
- **E — Agregação/mapeamento/apresentação: SEM BUG.** `forecastWithoutPrice` é
  agregado, devolvido (`ReportService.ts:97-104`), tipado
  (`reports/index.ts:100-107`) e consumido na UI
  (`ReportsPage.tsx:263-265,432-441`). O valor `35` chega corretamente; a nota de
  aviso aparece quando há registos sem preço. Não há perda silenciosa de
  informação.
- **F — Dependência do preço atual do serviço: ELIMINADA.** No módulo de
  relatórios, o único `$lookup` a `services` que resta serve **apenas o nome**
  em `findTopServices` (`ReportRepository.ts:256`); nenhum cálculo usa
  `service.price`. Prova numérica: o preço atual do serviço é `20`; se o
  relatório usasse o preço atual, o previsto seria `6 × 20 = 120` (ou, no
  mínimo, `40` para os 2 novos) — o valor real é `35 = 15 + 20`, logo usa
  `priceAtTime`.

## 7. Exemplo numérico

- **Total atual:** `35,00 €` = `priceAtTime(15) + priceAtTime(20)` dos 2
  agendamentos novos. Os 4 `scheduled`/`confirmed` antigos contribuem `0,00 €`.
- **Total esperado se os antigos tivessem preço histórico conhecido:**
  `35,00 € + Σ(preços históricos dos 4 agendamentos antigos)`.
- **Esse Σ é indeterminado a partir dos dados atuais** e **não deve** ser
  estimado pelo preço atual do serviço (`20 €`): fazê-lo daria um número sem
  base histórica. Sem backfill nem registo do preço no momento da reserva, o
  valor original desses 4 agendamentos é irrecuperável.
- Os 5 agendamentos `cancelled` antigos também não têm preço, mas estão fora do
  âmbito do «Valor previsto» por regra de estado.

## 8. Causa raiz e classificação

- **Situação 1 (confirmada, principal):** os agendamentos antigos não têm preço
  histórico (`priceAtTime` **ausente**) e, por isso, são excluídos da soma.
- **Situação 2 (contributo parcial):** parte dos antigos está `cancelled` e é
  excluída por estado — comportamento previsto, não é defeito.
- Situações 3, 4 e 5 (empresa, agregação/mapeamento, frontend): **descartadas**.
- Equivalente a “sem causa raiz 6/7”: não há bug; é o comportamento documentado
  da Stage 34 sem backfill.

**Limitações:** as consultas refletem o estado **atual** da BD; a contagem de
estado no momento exato da observação original não é reconstituível (parte dos
`cancelled` atuais pode ter sido `scheduled` vencido, auto-cancelado por
`expireOverdueScheduled`), mas isso não altera a causa raiz, que é a ausência de
`priceAtTime`.

## 9. Impacto

- O «Valor previsto» e a «Receita estimada» **subvalorizam** qualquer período que
  contenha agendamentos anteriores à Stage 34, na medida exata do valor desses
  agendamentos (aqui, 4 no previsto com valor desconhecido).
- A UI **comunica** a limitação via nota «N agendamento(s) sem preço histórico…»
  (aqui N = 4), pelo que não há engano silencioso.
- Nenhum agendamento antigo é valorizado pelo preço atual do serviço — o que era
  o risco crítico da Stage 33 e ficou resolvido.

## 10. Correção recomendada (NÃO implementada)

Proposta para etapa posterior, sem executar agora:

1. **Backfill único e auditável** de `priceAtTime` nos agendamentos existentes,
   apenas onde o valor histórico puder ser determinado com rigor (ex.: preço do
   serviço no momento da reserva, se recuperável por log/histórico). Onde não for
   determinável, **manter ausente** — nunca assumir o preço atual.
2. Alternativa/realce: manter a nota da UI permanente para períodos com dados
   anteriores à Stage 34 e explicitar no rótulo que o valor é «estimado por preço
   de reserva (desde 2026-10-12)».
3. Opcional: permitir ao utilizador filtrar/ver quantos agendamentos do período
   não têm preço (o backend já fornece `forecastWithoutPrice`/
   `completedWithoutPrice`).

Restrições que a próxima etapa deve respeitar: manter isolamento multiempresa,
não valorizar com preço atual, não alterar filtros de estado/data, e não expor
`priceAtTime` nos contratos de API.

## 11. Testes e verificações realizados

- **Leitura de código:** percurso completo de §4 (sem alterações).
- **Consultas de leitura à BD** (read-only, agregadas, sem PII): total global,
  contagem no mês de outubro/2026 em `Europe/Lisbon`, distribuição por
  `$type` de `priceAtTime`, por estado, valores de `priceAtTime`, datas de
  criação por grupo, e verificação de fronteiras de data. Nenhuma escrita,
  migração ou backfill.
- **Nenhum teste** foi criado/alterado/executado; a tarefa não o exigia.

## 12. Confirmação de não-alteração

Nenhum ficheiro de código de produção, teste, modelo, DTO, API ou configuração
foi criado, editado ou removido. Nenhum documento da base de dados foi
modificado (apenas consultas de leitura). Não houve backfill, commits, merges
ou pushes. A única alteração ao repositório é **este relatório**
(`docs/reports/STAGE_34_1_FORECAST_VALUE_DIAGNOSTIC.md`).

## CONTEXTO PARA A PRÓXIMA IA

- **Causa raiz (confirmada por dados):** agendamentos anteriores à Stage 34 têm
  `priceAtTime` **ausente** (`$type = "missing"`), não `null` — 20 de 22
  documentos globalmente; 9 dos 11 de outubro/2026. Por isso
  `HAS_PRICE_EXPRESSION` (`ReportRepository.ts:47-54`) é `false` e eles são
  excluídos das somas e contados em `forecastWithoutPrice`/`completedWithoutPrice`.
  Só os 2 criados em 2026-10-12 têm preço (`15` e `20`) → previsto = `35 €`.
- **Prova de que o fix funciona:** preço atual do serviço = `20`; se ainda usasse
  `Service.price` o total seria `120/40`, mas é `35 = 15 + 20`.
- **Não-bugs verificados:** empresa (sessão), datas/timezone (fronteiras
  confirmadas), estados (5 antigos `cancelled` fora do previsto por regra),
  mapeamento e frontend (nota `missing-price-note` reflete
  `forecastWithoutPrice = 4`).
- **Ficheiros-chave:** `server/src/modules/reports/repositories/ReportRepository.ts`
  (expressão `$type` e somas), `.../reports/services/ReportService.ts`,
  `.../appointments/models/Appointment.model.ts:152-156`,
  `.../appointments/services/AppointmentService.ts:414,569,756-791,1126-1129`,
  `client/src/pages/reports/ReportsPage.tsx`.
- **Correção proposta (não feita):** backfill auditável de `priceAtTime` apenas
  onde o preço histórico for comprovável; caso contrário manter ausente. Nunca
  valorizar com o preço atual. Alternativa: nota permanente na UI para períodos
  com dados pré-2026-10-12.
- **Restrições para a próxima etapa:** respeitar isolamento multiempresa e os
  filtros de estado/data; não expor `priceAtTime` na API; não executar backfill
  sem evidência de preço histórico.
- **Estado do repositório:** apenas o relatório `STAGE_34_1_…md` foi adicionado;
  sem commits/merges/pushes; base da Stage 34 intacta.
