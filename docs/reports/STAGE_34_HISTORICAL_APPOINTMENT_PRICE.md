# Stage 34 — Preço Histórico dos Agendamentos

## 1. Objetivo

Implementar a preservação do preço do serviço no momento da reserva
(`priceAtTime`) para que alterações posteriores ao preço de um serviço não
alterem retroativamente agendamentos já existentes nem distorçam os
relatórios. Base: auditoria da Stage 33
(`docs/reports/STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md`).

## 2. Decisões de desenho

- **Nome/campo:** `priceAtTime`, `Number`, `default: null`, `min: 0`.
- **`null` = preço histórico desconhecido.** Distingue "sem informação"
  (agendamentos anteriores a esta stage) de um serviço **genuinamente
  gratuito** (`0`). Nunca é preenchido com o preço atual só por ausência.
- **Fonte do valor:** sempre o preço do `Service` validado do tenant —
  **nunca** um valor enviado pelo frontend. Os DTO validadores de
  agendamento não declaram qualquer campo de preço; o backend deriva
  `priceAtTime` de `service.price`.
- **Isolamento multiempresa:** o serviço é resolvido por
  `PublicBookingEligibility.requireActiveService(serviceId, companyId)`,
  pelo que um agendamento só pode fixar o preço de um serviço do **mesmo**
  tenant.
- **Regra de alteração:** `priceAtTime` só é recalculado quando o
  `serviceId` **muda efetivamente** (passa a valer `novo service.price`).
  Reenviar o **mesmo** `serviceId`, ou alterar notas/estado/cliente/
  colaborador/horário, **preserva** o snapshot original.
- **Contratos de API inalterados:** `priceAtTime` **não** é exposto pelos
  mappers (`AppointmentMapper`/`PublicAppointmentMapper`). É dado interno
  para relatórios.
- **Relatórios:** somam apenas agendamentos com preço histórico
  **conhecido** e expõem contagens `withoutPrice` (`completedWithoutPrice`,
  `forecastWithoutPrice`) para sinalizar que a receita estimada não inclui
  esses registos. `findRevenue` deixou de depender do preço **atual** do
  serviço (removido o `$lookup` a `services`); `findTopServices` mantém o
  `$lookup` apenas para o **nome** do serviço.
- **Registos antigos:** permanecem `null`, sem backfill — são contados em
  `withoutPrice` em vez de valorizados com dados históricos inexistentes.
- **Frontend:** novos campos dos tipos de relatório são **opcionais**
  (`?`) para não quebrar fixtures existentes; a página assume `?? 0` e
  mostra uma nota quando existem agendamentos sem preço.

## 3. Alterações por arquivo

**Backend**

- `server/src/modules/appointments/models/Appointment.model.ts` — campo
  `priceAtTime?: number | null` na interface e `priceAtTime: { type:
  Number, default: null, min: 0 }` no schema.
- `server/src/modules/appointments/index.ts` — `CreateAppointmentData`
  ganha `priceAtTime: number`; `UpdateAppointmentData` ganha
  `priceAtTime?: number | null`.
- `server/src/modules/appointments/services/AppointmentService.ts`
  - `ScheduleAppointmentInput` + `schedule()` persistem `priceAtTime`.
  - `create()` e `createPublic()` → `priceAtTime: service.price`.
  - `update()` e `updatePublicByToken()` → `let priceAtTime =
    appointment.priceAtTime ?? null;` e recálculo apenas quando
    `serviceId.toString() !== appointment.serviceId.toString()`.
- `server/src/modules/reports/index.ts` — contadores adicionados a
  `RevenueAggregateRow`/`ReportRevenue` (`completedWithoutPrice`,
  `forecastWithoutPrice`) e a `TopServiceRow`, `EmployeeRow`,
  `ClientTopRow`, `ReportTopService`, `ReportEmployee`, `ReportClientRank`
  (`completedWithoutPrice`).
- `server/src/modules/reports/repositories/ReportRepository.ts` —
  `HAS_PRICE_EXPRESSION` (via `$type` ∈ double/int/long/decimal);
  `findRevenue`, `findTopServices`, `findEmployeeMetrics`,
  `findClientMetrics` passam a somar `$priceAtTime` e a contar registos sem
  preço; removidos os `$lookup`/`$servicePrice` que usavam o preço atual
  (exceto o `$lookup` de nome em `findTopServices`).
- `server/src/modules/reports/services/ReportService.ts` — mapeamento dos
  novos campos com `?? 0`.

**Frontend**

- `client/src/types/report.ts` — campos `withoutPrice` opcionais.
- `client/src/pages/reports/ReportsPage.tsx` — `missingPriceCount` e nota
  `data-testid="missing-price-note"` quando há registos sem preço.

**Testes**

- `server/tests/unit/appointments/AppointmentPriceHistory.test.ts` (novo,
  13 testes): criação admin/pública grava `service.price`; ignora
  `priceAtTime`/`price` do cliente; serviço de outra empresa → 404;
  alteração de notas/serviço-igual preserva; mesmo `serviceId` não
  recalcula; outro serviço recalcula; alterar estado não toca no preço;
  fluxo público (preserva/recalcula/ignora valor enviado); metadados do
  schema.
- `server/tests/unit/reports/ReportRepository.test.ts` — `findRevenue`
  deixa de esperar `$lookup` a `services`; valida uso de `$priceAtTime` e
  ausência de `$servicePrice`; cobre contagem sem preço.
- `server/tests/unit/reports/ReportService.test.ts` — expectativas
  atualizadas com os novos campos (incl. defaults `0`).

## 4. Resultados de validação

- `server`: `npm run typecheck` OK; `npm run build` OK;
  `npm test` → **1183 passaram / 6 falhas preexistentes**
  (`public-booking.routes.test.ts` — disponibilidade para datas já
  passadas, sem relação com esta stage; reproduzidas em HEAD limpo).
- `client`: `npm run typecheck` OK; `npm run build` OK;
  `npm test` → **1225 passaram / 4 falhas preexistentes**
  (`DashboardPage.test.tsx` 2 + `ReportsPage.test.tsx` 2 — reproduzidas
  com as alterações guardadas em stash).

## 5. Limitações

- Sem backfill: agendamentos antigos têm `priceAtTime = null` e apenas
  aparecem nas contagens `withoutPrice`.
- `AppointmentPriceHistory.test.ts` cobre service + schema; não cobre
  chamadas HTTP de ponta a ponta (já cobertas pelo padrão de testes
  existentes).
- Relatórios continuam a ser **estimativas** (não faturação); a UI passa a
  dizê-lo explicitamente.

## 6. Validação manual (sugerida)

1. Criar serviço a 20 €, agendar com o cliente X.
2. Subir o preço do serviço para 30 € e criar novo agendamento.
3. Confirmar em `/reports` que a receita usa 20 € + 30 € (e não 30 € + 30 €).
4. Alterar apenas as notas de um agendamento → o valor mantém-se.
5. Trocar o serviço de um agendamento → passa a usar o preço atual do novo
   serviço.
6. Confirmar a nota de "agendamentos sem preço histórico" quando existirem.

## CONTEXTO PARA A PRÓXIMA IA

- **Estado do Stage 34:** implementação completa; `server` typecheck/build
  OK (1183/1189, 6 falhas preexistentes) e `client` typecheck/build OK
  (1225/1229, 4 falhas preexistentes).
- **Contrato interno:** `Appointment.priceAtTime: number | null`
  (`default: null`, `min: 0`); `null` = histórico desconhecido, `0` =
  serviço grátis conhecido. **Não** é exposto em nenhum mapper/response.
- **Oráculo de preço:** em `create`/`createPublic` → `service.price`; em
  `update`/`updatePublicByToken` → preserva `appointment.priceAtTime ??
  null` e só recálculo quando `serviceId.toString()` muda. Este oráculo é a
  única regra que define o valor; qualquer bug futuro deve ser corrigido
  aqui.
- **Relatórios:** `RevenueAggregateRow`/`ReportRevenue` têm
  `completedWithoutPrice`/`forecastWithoutPrice`; as linhas de ranking têm
  `completedWithoutPrice`. `ReportRepository.HAS_PRICE_EXPRESSION` é a
  expressão central de "tem preço". Somar SEMPRE `$priceAtTime` (nunca o
  preço atual do serviço). `findTopServices` ainda faz `$lookup` a
  `services` **apenas para o nome**.
- **Frontend:** campos `withoutPrice` são opcionais nos tipos; a página
  degrada para `0`. Manter essa opcionalidade evita rebentar fixtures.
- **Testes/como reproduzir:** `cd server && npm run typecheck && npm test
  && npm run build`; `cd client && npm run typecheck && npm test && npm run
  build`.
- **Armadilhas conhecidas:** (1) as falhas de `public-booking.routes.
  test.ts` são **date-dependent** (usam `2026-10-08`, já no passado) —
  ignorar; (2) as 4 falhas de `DashboardPage`/`ReportsPage` são
  preexistentes e reproduzem-se com o working tree em stash — não "corrigir"
  no âmbito de stages de preço; (3) o `_id` dos documentos mockados nos
  testes do fluxo público é um objeto `ref(...)` e não a string, por isso
  asserções de `update` devem usar `expect.anything()` para o id.
- **Pendências fora de âmbito:** faturação/pagamentos, descontos e
  backfill de preços históricos não foram implementados (não eram pedidos).
- **Git:** nenhum commit/merge/push realizado.
