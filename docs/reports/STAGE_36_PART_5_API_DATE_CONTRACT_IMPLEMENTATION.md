# Stage 36 — Parte 5: Implementação do contrato de instantes na API

Data: 14/10/2026.

## 1. Resumo

Implementada a **Opção A** da auditoria ([`STAGE_36_PART_4_API_DATE_CONTRACT_AUDIT.md`](STAGE_36_PART_4_API_DATE_CONTRACT_AUDIT.md)): instantes ISO 8601 com `Z` ou offset explícito nos endpoints autenticados de agendamento e nos filtros de listagem/relatórios. Criado util partilhado [`server/src/utils/iso-instant.ts`](../../server/src/utils/iso-instant.ts) (regex + Luxon) reutilizado pelos validators públicos.

**Sem** migração de dados, **sem** alteração a `AppointmentService`/repositório, **sem** reinterpretação por `company.timezone`. Contratos de data civil (disponibilidade, exceções) inalterados.

## 2. Contrato final

| Superfície | Regra |
|------------|--------|
| `POST` / `PATCH` `/api/appointments` (`startAt`) | ISO 8601 + `Z` ou `±HH:MM`; datas impossíveis rejeitadas (Luxon) |
| `GET /api/appointments` (`startAt`, `endAt` query) | Idem quando presentes |
| Relatórios (`startAt`, `endAt` query) | Idem quando presentes |
| Público create/update appointment | Mesma regra (refatorado para o util; comportamento mantido) |
| Disponibilidade / exceções | `AAAA-MM-DD` e `HH:mm` locais (Opção C) — **não alterado** |

Entrada sem offset (ex. `2027-08-29T08:00:00`) → **HTTP 400** com mensagem de fuso horário explícito.

## 3. Decisões técnicas

1. **Luxon `DateTime.fromISO(..., { setZone: true })`** em vez de só `new Date().getTime()` para rejeitar `2026-02-30T09:00:00Z` (ECMAScript normalizaria para março).
2. **`withIsoInstantRules`** encadeia offset + validação Luxon após `isISO8601()`.
3. Mensagens distintas para períodos (listagens/relatórios) vs corpo de agendamento.
4. Validators públicos deixam de duplicar regex/`new Date` — importam o util.

## 4. Ficheiros alterados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`server/src/utils/iso-instant.ts`](../../server/src/utils/iso-instant.ts) | Contrato partilhado de instante |
| [`create-appointment.validator.ts`](../../server/src/modules/appointments/validators/create-appointment.validator.ts) | `startAt` com instante explícito |
| [`update-appointment.validator.ts`](../../server/src/modules/appointments/validators/update-appointment.validator.ts) | Idem (opcional) |
| [`list-appointments.validator.ts`](../../server/src/modules/appointments/validators/list-appointments.validator.ts) | Query `startAt`/`endAt` |
| [`list-reports.validator.ts`](../../server/src/modules/reports/validators/list-reports.validator.ts) | Query `startAt`/`endAt` |
| [`create-public-appointment.validator.ts`](../../server/src/modules/appointments/validators/create-public-appointment.validator.ts) | Refactor para util |
| [`update-public-appointment.validator.ts`](../../server/src/modules/appointments/validators/update-public-appointment.validator.ts) | Refactor `startAtRules` |
| [`docs/api-contract.md`](../../docs/api-contract.md) | Contrato documentado (global + Appointments) |
| Testes unitários/integração | Ver secção 5 |

## 5. Testes executados e resultados

Comandos (diretório `server/`):

```text
npm run test -- tests/unit/utils/iso-instant.test.ts \
  tests/unit/appointments/appointment-iso-instant.validators.test.ts \
  tests/integration/availability-appointment.routes.test.ts \
  tests/integration/public-appointment.routes.test.ts \
  tests/integration/routes/report.routes.test.ts
→ 5 ficheiros, 127 testes passaram

TZ=UTC npm run test -- tests/unit/utils/iso-instant.test.ts \
  tests/integration/availability-appointment.routes.test.ts
→ passou

TZ=Europe/Lisbon npm run test -- tests/unit/utils/iso-instant.test.ts \
  tests/integration/availability-appointment.routes.test.ts
→ passou

npm run typecheck → OK
npm run build → OK
```

Cobertura adicionada inclui: offset `Z`, `+01:00`, `-03:00`; rejeição sem offset em POST/PATCH/GET listagem; `2026-02-30T09:00:00Z`; regressão pública (`startAt sem fuso horário`); relatórios com `startAt` sem offset.

## 6. Compatibilidade e riscos

- **Breaking change controlado:** integrações que enviavam ISO sem offset em agendamentos autenticados ou filtros de período passam a receber 400.
- **Frontend oficial (Parte 3):** já envia `Z` — compatível.
- **Agendamentos históricos em MongoDB:** não foram alterados nem migrados; só o contrato de **entrada** mudou.

## 7. Falhas pré-existentes

A suite completa do servidor **não** foi executada nesta etapa. Falhas conhecidas de outras stages (ex. `public-booking.routes.test.ts` com datas fixas no passado) não foram investigadas nem corrigidas aqui.

## 8. Limitações

- Validação de instante não cobre todos os edge cases DST no body (offset explícito fixa o instante).
- `Pacific/Auckland` não foi usado nos testes TZ desta etapa (apenas `UTC` e `Europe/Lisbon`).

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 36 Parte 5 concluída no backend — contrato de instantes explícitos alinhado entre autenticado, público, listagens e relatórios.

**Não feito / opcional futuro:**

- Extrair testes de query validators para ficheiro unitário dedicado.
- Executar suite server completa e tratar falhas de datas fixas em public-booking se ainda relevantes.
- Atualizar comentário desatualizado em `client/src/config/appointmentTime.ts` (fora do âmbito Parte 5).

**Critérios já cumpridos:** Opção A; Opção C intacta; sem migração; `api-contract.md` atualizado; testes focais + typecheck + build OK.

**Próximos passos sugeridos:** commit/PR com nota de breaking change para API consumers; smoke test manual com cliente que envia offset; considerar changelog de API.
