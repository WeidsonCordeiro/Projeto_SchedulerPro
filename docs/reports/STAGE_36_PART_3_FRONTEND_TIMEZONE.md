# Stage 36 — Parte 3: Frontend — timezone efetivo da empresa

Data: 2026-10-13. Âmbito: apenas frontend React/TypeScript; backend inalterado.

## 1. Resumo

O frontend passa a resolver o timezone IANA efetivo da empresa através de `selectCompanyTimezone`, com prioridade: registo de empresa carregado (OWNER/ADMIN) → `auth.user.companyTimezone` (sessão) → `Europe/Lisbon`. Formulários, portal, modais, calendário, relatórios e marcação pública utilizam esse timezone nos pontos identificados na Stage 35. Não foram adicionadas permissões nem chamadas extra a `GET /companies`.

## 2. Ficheiros alterados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`client/src/store/slices/companySlice.ts`](../../client/src/store/slices/companySlice.ts) | `resolveEffectiveCompanyTimezone`, `selectCompanyTimezone` com validação IANA |
| [`client/src/store/slices/companySlice.test.ts`](../../client/src/store/slices/companySlice.test.ts) | Cobertura de prioridade e fallbacks |
| [`client/src/components/appointments/AppointmentForm.tsx`](../../client/src/components/appointments/AppointmentForm.tsx) | `timezone` em validação, estado inicial de edição e submit |
| [`client/src/pages/appointments/AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | Sincroniza `currentDateKey` quando o “hoje” da empresa muda |
| [`client/src/pages/reports/ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) | Atualiza bounds do mês custom quando timezone muda (se o utilizador não editou datas) |
| [`client/src/pages/portal/PortalHomePage.tsx`](../../client/src/pages/portal/PortalHomePage.tsx) | Formatação com `selectCompanyTimezone` |
| [`client/src/pages/portal/PortalAppointmentsPage.tsx`](../../client/src/pages/portal/PortalAppointmentsPage.tsx) | Idem |
| [`client/src/components/appointments/DeleteAppointmentModal.tsx`](../../client/src/components/appointments/DeleteAppointmentModal.tsx) | Resumo com timezone efetivo |
| [`client/src/components/public/PublicAppointmentCancelDialog.tsx`](../../client/src/components/public/PublicAppointmentCancelDialog.tsx) | Usa `appointment.timezone` (IANA válido) |
| [`client/src/pages/public/PublicBookingPage.tsx`](../../client/src/pages/public/PublicBookingPage.tsx) | Data inicial/restart com `APPOINTMENT_TIMEZONE` até resposta da API |
| [`client/src/config/publicBooking.ts`](../../client/src/config/publicBooking.ts) | Comentário do contrato de `getTodayDateKey` |
| Testes: `AppointmentForm.test.tsx`, `PortalHomePage.test.tsx`, `PortalAppointmentsPage.test.tsx`, `PublicBookingPage.test.tsx`, `DeleteAppointmentModal.test.tsx` | Regressão e casos de timezone |

## 3. Selector — antes e depois

| Prioridade | Antes | Depois |
|------------|--------|--------|
| 1 | `company.company.timezone` (sem validar IANA) | `company.company.timezone` se IANA válido |
| 2 | — | `auth.user.companyTimezone` se IANA válido |
| 3 | `APPOINTMENT_TIMEZONE` | `APPOINTMENT_TIMEZONE` |

Com `company === null` e `companyTimezone: "America/Sao_Paulo"` na sessão, MANAGER/EMPLOYEE/CLIENT obtêm o fuso sem `COMPANY_READ`.

## 4. Fluxos de sessão verificados

- `setCredentials` em login, registo, refresh (`apiClient`) e `SessionBootstrap` (`getMe`) preserva `companyTimezone` no objeto `user` (já suportado na Parte 1).
- `SessionBootstrap` continua a carregar empresa completa só para OWNER/ADMIN; o timezone efetivo não depende desse fetch.
- Respostas antigas sem `companyTimezone` continuam a usar `Europe/Lisbon`.

## 5. Componentes e helpers corrigidos

- **AppointmentForm:** `toIsoUtc` / `toLocalDateTimeInputValue` com `timezone` em validação, edição e payload.
- **Portal:** formatação com selector da sessão.
- **DeleteAppointmentModal:** `selectCompanyTimezone` via Redux.
- **PublicAppointmentCancelDialog:** timezone do agendamento público.
- **AppointmentsPage:** efeito que avança o calendário para o novo “hoje” apenas se o utilizador ainda estava no dia anterior efetivo.
- **ReportsPage:** `customInput` / `appliedCustom` realinhados ao mudar timezone, exceto se o utilizador editou ou aplicou datas custom manualmente.
- **PublicBookingPage:** data inicial alinhada a Lisboa (fallback backend) antes da disponibilidade; efeito existente corrige quando a API devolve outro fuso.

**Não alterados de propósito:** defaults em `appointmentCalendar.ts` / `appointmentSlots.ts` (callers autenticados já passam timezone); `NotificationBell`, timestamps de criação em listagens administrativas.

## 6. Testes executados

### Focados (lista do plano)

```bash
cd client
npm run test -- src/store/slices/companySlice.test.ts src/store/slices/authSlice.test.ts \
  src/config/appointmentTime.test.ts src/components/appointments/AppointmentForm.test.tsx \
  src/pages/portal/PortalHomePage.test.tsx src/pages/portal/PortalAppointmentsPage.test.tsx \
  src/pages/appointments/AppointmentsPage.test.tsx src/pages/reports/ReportsPage.test.tsx \
  src/pages/public/PublicBookingPage.test.tsx src/config/publicBooking.test.ts \
  src/components/appointments/DeleteAppointmentModal.test.tsx
```

### Ambientes `TZ` (críticos)

```bash
TZ=UTC npm run test -- src/store/slices/companySlice.test.ts src/components/appointments/AppointmentForm.test.tsx
TZ=Pacific/Auckland npm run test -- src/store/slices/companySlice.test.ts src/components/appointments/AppointmentForm.test.tsx
```

Resultado: **38/38** em ambos os ambientes.

### Suite completa

```bash
npm run test
```

| Métrica | Resultado |
|---------|-----------|
| Test files | 106 passed, **2 failed** |
| Tests | **1235 passed**, **4 failed** |

### Falhas pré-existentes (não introduzidas nesta etapa)

| Ficheiro | Testes |
|----------|--------|
| [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | 2 (já referenciados na Stage 35) |
| [`ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) | 2 (já referenciados na Stage 35) |

Nenhuma outra falha na suite completa após correção dos testes de `DeleteAppointmentModal` (Provider Redux).

### Novas regressões corrigidas durante a etapa

- `DeleteAppointmentModal.test.tsx`: falhava após `useAppSelector` — resolvido com `Provider` + store nos testes.

## 7. Typecheck e build

```bash
cd client
npm run typecheck   # OK
npm run build       # OK
```

## 8. Limitações e riscos residuais

- **R4 (Stage 35):** API autenticada de agendamentos aceita `startAt` sem offset; o frontend envia UTC correto, mas clientes de API terceiros podem interpretar mal.
- **R7:** Alterar `timezone` da empresa no PATCH muda a hora local exibida sem mudar instantes guardados.
- **Relatórios/Dashboard:** 4 testes de UI continuam vermelhos por causas anteriores a esta parte — investigar separadamente.
- **Backend integração public-booking:** testes com `DATE` fixa no passado (Parte 2) — fora do âmbito frontend.

## 9. Confirmação de âmbito

- [x] Sem alterações no backend, contrato auth, RBAC ou migrações
- [x] Selector empresa → sessão → fallback
- [x] Formulário, portal, modais, calendário, relatórios, booking público
- [x] Testes documentados; typecheck e build OK
- [x] Falhas pré-existentes identificadas (4), sem sucesso total da suite

## CONTEXTO PARA A PRÓXIMA IA

**Concluído na Stage 36 (visão geral):**

- Parte 1: `companyTimezone` no contrato de autenticação.
- Parte 2: `resolveCompanyTimezone` unificado no backend.
- Parte 3: frontend consome timezone via `selectCompanyTimezone` e correções nos fluxos listados acima.

**Não assumir concluído sem evidência:**

- Partes 4–6 do plano macro da Stage 35/36 (ex.: exigir offset em `startAt` autenticado, avisos ao mudar timezone da empresa, testes E2E, correção dos 4 testes Dashboard/Reports).
- Atualizar datas fixas em testes de integração backend (`public-booking.routes.test.ts`) quando o relógio do CI ultrapassa `2026-10-08`.
- Revisão pontual de `AppointmentForm` se ainda existirem caminhos com `timezone` default sem prop do pai em outros entrypoints além de `AppointmentsPage`.
- Portal público e fluxos não autenticados continuam a depender de `appointment.timezone` ou `APPOINTMENT_TIMEZONE` onde não há sessão.

**Riscos a monitorizar:** empresas com timezone alterado após agendamentos futuros; DST em slots públicos (R8 Stage 35); suite frontend com 4 testes vermelhos que podem mascarar regressões em Dashboard/Relatórios.
