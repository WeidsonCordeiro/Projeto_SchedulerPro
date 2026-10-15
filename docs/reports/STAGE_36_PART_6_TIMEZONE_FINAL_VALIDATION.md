# Stage 36 — Parte 6: Validação final de timezone por empresa

Data: 14/10/2026.

## 1. Resumo executivo

Validação **parcial-completa** da Stage 36: inspeção de código alinhada aos relatórios das Partes 1–5, execução de suites focais backend/frontend, typecheck e build em ambos os pacotes.

- **Backend (pacote focal):** 13 ficheiros, **354** testes — todos passaram após correção de datas fixas em integração pública.
- **Frontend (pacote focal):** 14 ficheiros, **242** passaram, **4** falharam (`DashboardPage` ×2, `ReportsPage` ×2) — **pré-existentes**, não ligados a timezone (mocks/UI de receita e tabelas).
- **Correções Parte 6:** apenas testes [`public-booking.routes.test.ts`](../../server/tests/integration/public-booking.routes.test.ts) (`DATE` `2026-10-08` → `2027-10-07`) e comentário em [`appointmentTime.ts`](../../client/src/config/appointmentTime.ts).
- **Sem** migração de dados nem alteração a agendamentos históricos em MongoDB.

A Stage 36 **não** está declarada “100% validada” no critério 7 (suite frontend focal com 4 falhas documentadas) e critério 4 (lacunas DST de produto ainda abertas). Comportamento core de timezone, auth, instantes explícitos e fluxos Parte 3 está **consistente com evidência**.

## 2. Relatórios e partes consultadas

| Parte | Ficheiro |
|-------|----------|
| 1 | [`STAGE_36_AUTH_COMPANY_TIMEZONE_CONTRACT.md`](STAGE_36_AUTH_COMPANY_TIMEZONE_CONTRACT.md) |
| 2 | [`STAGE_36_PART_2_TIMEZONE_BACKEND.md`](STAGE_36_PART_2_TIMEZONE_BACKEND.md) |
| 3 | [`STAGE_36_PART_3_FRONTEND_TIMEZONE.md`](STAGE_36_PART_3_FRONTEND_TIMEZONE.md) |
| 4 | [`STAGE_36_PART_4_API_DATE_CONTRACT_AUDIT.md`](STAGE_36_PART_4_API_DATE_CONTRACT_AUDIT.md) |
| 5 | [`STAGE_36_PART_5_API_DATE_CONTRACT_IMPLEMENTATION.md`](STAGE_36_PART_5_API_DATE_CONTRACT_IMPLEMENTATION.md) |

## 3. Áreas inspecionadas

### 3.1 Autenticação e sessão

| Evidência | Conclusão |
|-----------|-----------|
| [`AuthService.ts`](../../server/src/modules/auth/services/AuthService.ts) `resolveCompanyTimezoneForUser` + [`AuthMapper`](../../server/src/modules/auth/mapper/AuthMapper.ts) | `companyTimezone` em login/register/refresh/me |
| [`timezone.ts`](../../server/src/utils/timezone.ts) `resolveCompanyTimezone` / `DEFAULT_TIMEZONE` | Fallback `Europe/Lisbon` |
| [`companySlice.ts`](../../client/src/store/slices/companySlice.ts) `selectCompanyTimezone` | Empresa carregada → sessão → fallback |
| [`SessionBootstrap.tsx`](../../client/src/app/SessionBootstrap.tsx) | `getMe` → `setCredentials` (sem novo endpoint empresa para MANAGER/EMPLOYEE/CLIENT) |
| RBAC | Nenhuma alteração de permissões por timezone |

### 3.2 Backend agendamentos e calendário

| Área | Ficheiros | Estado |
|------|-----------|--------|
| Instantes explícitos | [`iso-instant.ts`](../../server/src/utils/iso-instant.ts), validators create/update/list/reports/público | Parte 5 ativa |
| Serviços | `AppointmentService`, `PublicBookingService`, `AvailabilityService`, `AvailabilityExceptionService`, `ReminderService`, `NotificationDispatcher` | `resolveCompanyTimezone` / `toCompanyDateTime` (Parte 2) |
| Data civil | [`public-availability.validator.ts`](../../server/src/modules/public-booking/validators/public-availability.validator.ts) | `AAAA-MM-DD` + Luxon — inalterado |

### 3.3 DST — comportamento observado (sem nova política)

| Teste | Comportamento registado |
|-------|-------------------------|
| [`AvailabilityService.timezone.test.ts`](../../server/tests/unit/availability/AvailabilityService.timezone.test.ts) | Entrada DST 2026-03-29 (Lisboa); teste explícito “horário ambíguo” 2026-10-25 **aceita** `ensureEmployeeAvailable` no intervalo mockado — documenta comportamento atual, não política de produto |
| [`timezone.dst.test.ts`](../../server/tests/unit/timezone.dst.test.ts) | Conversões multi-zona; mesmo instante UTC preservado |
| [`ReminderService.test.ts`](../../server/tests/unit/reminders/ReminderService.test.ts) | Texto de e-mail com DST |
| [`appointmentTime.test.ts`](../../client/src/config/appointmentTime.test.ts) | `toIsoUtc` em 2026-03-29 (entrada DST Lisboa) |

**Lacunas / decisões pendentes (Stage 35 R8):** hora local **inexistente** no salto de primavera em `AvailableSlotsBuilder`; política formal para hora **ambígua** no outono; não definidas nesta etapa.

### 3.4 Frontend

Componentes Parte 3 usam `selectCompanyTimezone` e `toIsoUtc(..., timezone)` onde aplicável (`AppointmentForm`, `AppointmentsPage`, portal, modais, `PublicBookingPage`, `DashboardPage`/`ReportsPage` para bounds). Grep não encontrou `formatAppointment*` em fluxos de agendamento sem timezone no componente (defaults em testes de `appointmentTime.test.ts` são intencionais).

### 3.5 Contrato API Parte 5

[`api-contract.md`](../../docs/api-contract.md) exige offset explícito em instantes de agendamento; integração [`availability-appointment.routes.test.ts`](../../server/tests/integration/availability-appointment.routes.test.ts) rejeita `startAt` sem offset.

## 4. Testes executados

### 4.1 Backend (`server/`)

```bash
npm run test -- tests/unit/timezone.test.ts tests/unit/timezone.dst.test.ts \
  tests/unit/utils/iso-instant.test.ts \
  tests/unit/appointments/appointment-iso-instant.validators.test.ts \
  tests/unit/availability/AvailabilityService.timezone.test.ts \
  tests/unit/availability/AvailabilityExceptionService.test.ts \
  tests/unit/availability/AvailableSlotsBuilder.test.ts \
  tests/unit/reminders/ReminderService.test.ts \
  tests/unit/auth/AuthService.test.ts \
  tests/integration/availability-appointment.routes.test.ts \
  tests/integration/public-appointment.routes.test.ts \
  tests/integration/public-booking.routes.test.ts \
  tests/integration/routes/report.routes.test.ts
```

**Resultado:** 13 passed, **354** tests passed.

Subset com `TZ` (mesmos 2 ficheiros × 3 ambientes):

```bash
TZ=UTC|Europe/Lisbon|Pacific/Auckland npm run test -- \
  tests/unit/utils/iso-instant.test.ts \
  tests/integration/availability-appointment.routes.test.ts
```

**Resultado:** 3× **51** tests passed (Auckland aplicou no ambiente de execução).

```bash
npm run typecheck   # OK
npm run build       # OK
```

### 4.2 Frontend (`client/`)

```bash
npm run test -- src/store/slices/companySlice.test.ts ... \
  src/pages/dashboard/DashboardPage.test.tsx src/pages/reports/ReportsPage.test.tsx
```

**Resultado:** 12 ficheiros OK, **2 ficheiros falharam** — **246** tests, **242** passed, **4** failed.

```bash
TZ=UTC npm run test -- src/store/slices/companySlice.test.ts \
  src/components/appointments/AppointmentForm.test.tsx        # 38 passed
TZ=Europe/Lisbon npm run test -- <idem>                       # 38 passed
```

```bash
npm run typecheck   # OK
npm run build       # OK
```

**Não executado:** suite completa `npm run test` em server/client (opcional no plano).

## 5. Defeitos comprovados e correções (Parte 6)

| Defeito | Evidência | Correção |
|---------|-----------|----------|
| Integração pública com `DATE = 2026-10-08` no passado (14/10/2026) → `slots[0]` undefined | 6 falhas em `public-booking.routes.test.ts` antes do fix | `DATE`/`FRIDAY` e asserts correlacionados → **2027-10-07** / **2027-10-08**; janela UTC `2027-10-06T23:00:00.000Z`–`2027-10-07T22:59:59.999Z` |
| Comentário `appointmentTime.ts` contradiz Parte 3 | Inspeção | Atualizado para `selectCompanyTimezone` |

Nenhuma alteração em `AppointmentService`, RBAC ou política DST.

## 6. Falhas pré-existentes (fora de âmbito)

| Ficheiro | Teste | Nota |
|----------|-------|------|
| `DashboardPage.test.tsx` | `renders greeting, summary cards...` | Falha de render/assert de UI/dados mockados — não envolve `selectCompanyTimezone` |
| `DashboardPage.test.tsx` | `shows empty state when there are no appointments` | Idem |
| `ReportsPage.test.tsx` | `renderiza cards, receita e rankings do período` | Assert `revenue-estimated` / estrutura de página |
| `ReportsPage.test.tsx` | `continua exibindo o relatório quando um endpoint relacionado falha` | `getByTestId("revenue-estimated")` ausente no DOM |

Já referenciadas na Parte 3 (4 testes vermelhos). **Não corrigidas** nesta etapa por não serem regressões Stage 36 comprovadas.

## 7. Critérios de aceitação

| # | Estado | Justificação |
|---|--------|--------------|
| 1 | **OK** | Auth + selector + componentes inspecionados; testes `AuthService`, `companySlice`, portal, `AppointmentForm` passam |
| 2 | **OK** | `iso-instant` + integração; TZ UTC/Lisbon/Auckland no subset backend |
| 3 | **OK** | Testes availability/exception/slots + público booking; contrato civil intacto |
| 4 | **Parcial** | DST coberto em testes citados; lacunas R8 e política ambígua/inexistente **pendentes** |
| 5 | **OK** | Correção justificada (datas integração); sem regressão Parte 5 no pacote focal backend |
| 6 | **OK** | typecheck + build server e client |
| 7 | **Parcial** | Comandos reais acima; 4 testes frontend falhados documentados |
| 8 | **OK** | Sem migração nem escrita em agendamentos históricos |

## 8. Riscos residuais

- **R7:** alterar `timezone` da empresa muda exibição local sem mudar instantes guardados.
- **R8:** slots / horas locais em transições DST — decisão de produto em aberto.
- **Integrações API:** Parte 5 rejeita ISO sem offset (breaking change documentado na Parte 5).

## CONTEXTO PARA A PRÓXIMA IA

**Stage 36 — estado:** Partes 1–5 implementadas; Parte 6 validou com suites focais e corrigiu apenas datas de teste de `public-booking.routes.test.ts` + comentário client.

**Verde:** backend focal 354 testes; frontend timezone-critical (selector, form, portal, booking, calendar) no pacote focal exceto Dashboard/Reports UI.

**Vermelho conhecido:** 4 testes `DashboardPage` / `ReportsPage` — tratar em issue separada (mocks/`data-testid`).

**Sugerido:** PR com changelog (offset obrigatório API); smoke manual; opcional suite server/client completa; decisão de produto DST para `AvailableSlotsBuilder` e horas ambíguas.

**Não fazer sem decisão:** Opção B (parse `startAt` sem offset como hora local da empresa).
