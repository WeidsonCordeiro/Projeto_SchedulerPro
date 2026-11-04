# Stage 35 — Auditoria do fuso horário por empresa

Data da auditoria: 2026-10-12/13. Tipo: **somente leitura** (nenhum código, teste, configuração ou dado alterado).

## 1. Resumo executivo

- O **backend já usa `company.timezone`** como fonte de verdade para disponibilidade, exceções, slots públicos, validação "mesmo dia", e-mails e lembretes. Os instantes são guardados como `Date` (UTC) e comparados como instantes. **Não há problemas confirmados de lógica temporal no backend**; há apenas **inconsistência na estratégia de fallback** quando `timezone` está ausente/inválido (5 estratégias diferentes).
- O **problema real está no frontend**: `selectCompanyTimezone` devolve `"Europe/Lisbon"` quando a empresa não está no estado Redux. A empresa só é carregada por `SessionBootstrap` (montagem da app) e por `CompanyPage`, e só para `OWNER`/`ADMIN` (`COMPANY_READ`). Consequências confirmadas:
  1. Empresa não-Lisboa + `MANAGER`/`EMPLOYEE`/`CLIENT` ⇒ calendário, formulário, dashboard, relatórios e portal mostram/enviam horas em Lisboa.
  2. Mesmo `OWNER`/`ADMIN`: após **login/registo/refresh sem reload**, a empresa não é carregada ⇒ fallback Lisboa até recarregar a página.
  3. `AppointmentForm` ignora a prop `timezone` em 4 chamadas (`toIsoUtc(startAt)` / `toLocalDateTimeInputValue(appointment.startAt)`), usando Lisboa **ao submeter** — risco de gravar a hora errada numa empresa não-Lisboa.
  4. Portal do cliente e alguns modais chamam `formatAppointment*` sem timezone.
- `/auth/me` e as respostas autenticadas de agendamentos **não incluem timezone**. Esta é a lacuna de contrato central.
- Testes: server unit (851) passaram com `TZ=Pacific/Auckland`; no client, 4 testes falham (Dashboard/Reports), **também com `TZ=Europe/Lisbon`** — falhas pré-existentes, independentes do fuso da máquina (causa não investigada).

## 2. Comportamento atual confirmado

### 2.1 Configuração da empresa
| Item | Evidência |
|---|---|
| Modelo | `server/src/modules/companies/models/Company.model.ts` l.62-71: `timezone: { type: String, required: true, default: DEFAULT_TIMEZONE, trim: true, validate: isValidIanaTimezone }` |
| Default | `server/src/utils/timezone.ts` l.4: `DEFAULT_TIMEZONE = "Europe/Lisbon"` |
| Validação IANA | `isValidIanaTimezone` = `IANAZone.isValidZone` (Luxon), l.6-8. Aceita também `"UTC"` etc. |
| DTO | `CreateCompany.dto.ts` l.9 e `UpdateCompany.dto.ts` l.15: `timezone?: string` |
| Validators | `create-company.validator.ts` l.20-25, `update-company.validator.ts` l.19-24 (opcional, string, IANA); `register.validator.ts` l.45+ (`company.timezone`) |
| Service | `CompanyService.update` l.86-88 revalida (→ `TIMEZONE_INVALID` 400) e grava l.97; `AuthService` l.86 valida e l.437 grava `dto.company.timezone ?? DEFAULT_TIMEZONE` |
| Endpoints | `GET /companies`, `GET /companies/:id` (`COMPANY_READ`: **só OWNER e ADMIN**, `rbac.ts` l.23, l.55), `PATCH /companies/:id` (`COMPANY_UPDATE`) |
| Mapper | `CompanyMapper.toResponse` l.26 devolve `timezone` |
| Obtenção no frontend (autenticado) | `SessionBootstrap.tsx` l.27-33: só se `getCompanyAbilities(role).canView` (OWNER/ADMIN). **`GET /auth/me` (`AuthService.me`, l.350-368) não devolve timezone.** |
| Obtenção no fluxo público | Não existe endpoint público de empresa. `timezone` vem apenas em `GET /public/.../availability` (`PublicAvailabilityResult.timezone`) e na resposta pública do agendamento (`PublicAppointmentMapper`, l.39/49). Catálogo (serviços/profissionais) não o traz. |

**Valor ausente/inválido:** com documentos Mongoose hidratados (não existe `.lean()` nos repositórios inspecionados), o `default` do schema é aplicado a campos ausentes na leitura ⇒ empresas antigas aparecem como `Europe/Lisbon` sem migração *(inferência do comportamento Mongoose, não executada contra dados reais)*. Valor inválido gravado diretamente na base não é re-validado na leitura.

**Fallbacks no backend (inconsistentes):**
| Local | Comportamento |
|---|---|
| `PublicBookingService.resolveTimezone` l.77-83; `AppointmentService` l.592-594 e l.985-987 | inválido/ausente → `DEFAULT_TIMEZONE` (correto) |
| `AvailabilityService.ensureEmployeeAvailable` l.364-366 | **sem fallback**: `toCompanyDateTime(date, company.timezone)`; zona inválida → `DateTime` inválido → `EMPLOYEE_NOT_AVAILABLE` (409) |
| `AvailabilityExceptionService` l.93 | `company.timezone ?? "UTC"` (**UTC, não Lisboa**) |
| `NotificationDispatcher` l.188 | `company?.timezone ?? DEFAULT_TIMEZONE` (sem validar IANA; inválido → "Invalid DateTime" no e-mail) |
| `ReminderService` l.190 | `company.timezone \|\| DEFAULT_TIMEZONE` (idem) |

### 2.2 Backend — por fluxo
Legenda: **I** = instante absoluto, **L** = data/hora local introduzida, **D** = dia de calendário, **F** = formatação.

| Fluxo | Estado | Notas |
|---|---|---|
| Criar/alterar agendamento (autenticado) | OK (I) | `startAt` ISO8601 → `new Date()` (`AppointmentService` l.415, l.812); validator `create-appointment.validator.ts` l.35-39 e `update-appointment.validator.ts` l.32-35 aceitam ISO **sem exigir offset** (risco R3) |
| Criar/alterar agendamento público | OK (I) | validator exige offset (`create-public-appointment.validator.ts` l.76-95); `update-public` só nas regras de valor |
| Passado | OK (I) | `startAt.getTime() <= now.getTime()` (l.~259, l.~816, l.~1157); independente de zona |
| Disponibilidade semanal / "dentro do período" | OK (L) | `AvailabilityService` l.364-420: converte para a zona da empresa, compara `HH:mm` e exige mesmo dia local |
| Exceções (bloqueio/dia inteiro) | OK (D+L) | `exceptions` guardam `date`+`HH:mm` locais; `AvailabilityExceptionService` l.93-130 converte com a zona da empresa para detetar conflito com agendamentos |
| Slots públicos | OK (D+L→I) | `AvailableSlotsBuilder` l.216-364: dia, "hoje" e período na zona da empresa; devolve ISO com offset da empresa |
| Janela do dia em conflitos | OK | `PublicBookingService` l.~244 usa `day.startOf("day")/endOf("day")` na zona da empresa |
| Listagens por intervalo / reports | OK (I) | Recebem `startAt/endAt` UTC calculados no frontend (`AppointmentRepository` l.109-113; `ReportRepository` l.72-80; `ReportController.buildRange`). **A correção depende 100% do timezone usado no frontend.** Sem `$dateToString`/agrupamento por dia no backend. |
| Lembretes 24h/2h | OK (I) | `ReminderService.processAppointment` usa só aritmética de instantes (`startAt - offset`); timezone só para o texto do e-mail (l.225-233). Catch-up no arranque e em `setInterval` (`ReminderScheduler.start` l.~45-55); idempotência por `reminder*SentAt` + lease. "24h" = 24 h decorridas, não "mesma hora de ontem" (difere uma hora em dias de DST — comportamento aceitável, a documentar). |
| E-mails/notificações | OK (F) | `NotificationDispatcher` l.206-212 e l.329 usam `toCompanyDateTime(.., timezone)`. Nota fora de âmbito: a hora de fim usa `service.duration` atual e não `appointment.endAt`. |
| Dashboard | Sem lógica backend | Frontend filtra "hoje". |
| Relatórios | OK (I) | ver acima |
| Hora do processo (`TZ`) | Sem dependência encontrada | Não se encontrou `getHours/getDate/setHours/toLocale*` em `server/src`. Todos os `new Date()` são instantes. |

### 2.3 Frontend — por fluxo
| Fluxo | Estado | Evidência |
|---|---|---|
| Calendário (mês/semana/dia) | Usa timezone do Redux | `CalendarView`, `DayCalendar`, `WeekCalendar`, `MonthCalendar`, `AppointmentCalendarItem` usam `selectCompanyTimezone` (fallback Lisboa) |
| Formulário criar/editar | **BUG parcial** | `AppointmentForm.tsx` l.96 `toIsoUtc(startAt)`, l.142 e l.155 `toLocalDateTimeInputValue(appointment!.startAt)`, l.360 `startAt: toIsoUtc(startAt)` — sem passar `timezone` (default `APPOINTMENT_TIMEZONE`). Em contraste l.165, l.309, l.502 passam a zona. |
| `AppointmentsPage` | Risco | l.85 `useState(todayKey)`: dia inicial fixado na montagem; se a empresa carregar depois (ou o fallback mudar), `currentDateKey` mantém o dia de Lisboa. `isInstantInPast(startAt)` l.308/l.499: compara instantes (OK). |
| Dashboard | Usa timezone do Redux | `DashboardPage` l.141-170; `getAppointments()` sem intervalo (carrega tudo) — fora de âmbito |
| Relatórios | Usa timezone do Redux | `reportPeriod.buildReportRange` (OK, zona explícita); `ReportsPage` l.112/115 `customMonthBounds(timezone)` calculado só na montagem (mesmo problema do ponto acima) |
| Portal do cliente | **Confirmado: sempre Lisboa** | `PortalHomePage` l.109-110, `PortalAppointmentsPage` l.134-135 chamam `formatAppointment*` sem zona. CLIENT não tem `COMPANY_READ` nem timezone no payload. |
| Modais | **Confirmado: sempre Lisboa** | `DeleteAppointmentModal.tsx` l.51-52; `PublicAppointmentCancelDialog.tsx` l.107-114 (tem `appointment.timezone` disponível mas não o usa) |
| Público — booking | Maioritariamente OK | Slots/confirmações usam `availability.timezone`. Exceção: `PublicBookingPage` l.84 e l.371 `getTodayDateKey()` sem zona (usa o browser) até chegar a 1.ª resposta de disponibilidade; `minDate` l.104. É corrigido depois (l.240-247) se o utilizador ainda não escolheu data. |
| Público — gestão por token | OK | `PublicAppointmentSummary`, `getPublicAppointmentPeriod` usam `appointment.timezone`. A UI só edita notas. |
| Formatação do browser | Risco menor | `NotificationBell.tsx` l.7-10 (`Intl.DateTimeFormat` sem `timeZone`), `EmployeesPage.tsx` l.16 (`toLocaleDateString`). Mostram instantes de criação/notificação na zona do browser. |
| Registo | Aceitável | `RegisterPage.tsx` l.25-32: default = zona do browser (se IANA válida) senão `"Europe/Lisbon"`; o utilizador escolhe. |

## 3. Lista dos usos fixos de `Europe/Lisbon` / defaults

| Ficheiro:linha | Uso | Classificação |
|---|---|---|
| `server/src/utils/timezone.ts:4` | `DEFAULT_TIMEZONE` | Intencional (fallback) |
| `server/src/modules/companies/models/Company.model.ts:65` | default do schema | Intencional (compatibilidade) |
| `server/src/modules/auth/services/AuthService.ts:437` | default no registo | Intencional |
| `server/.../NotificationDispatcher.ts:188`, `ReminderService.ts:190`, `PublicBookingService.ts:82`, `AppointmentService.ts:594,987` | fallback | Intencional, mas **inconsistente** (ver 2.1) |
| `server/.../AvailabilityExceptionService.ts:93` | fallback `"UTC"` | **Risco confirmado de inconsistência** |
| `client/src/config/appointmentTime.ts:20` | `APPOINTMENT_TIMEZONE` + defaults em 7 funções (l.30, 47, 61, 75, 95, 116, 132) | **Confirmado** — origem de todos os usos silenciosos |
| `client/src/config/appointmentCalendar.ts` l.37,95,120,139,154,169,188,200,212,228,250,284,381 | defaults de parâmetro | Risco: esquecer o argumento ⇒ Lisboa |
| `client/src/config/appointmentSlots.ts` l.118,183 | idem | idem |
| `client/src/components/appointments/AppointmentCalendar.tsx:40`, `AppointmentForm.tsx:130` | default de prop | idem |
| `client/src/store/slices/companySlice.ts:57` | `selectCompanyTimezone` → `APPOINTMENT_TIMEZONE` | **Confirmado** — fallback para roles sem acesso à empresa |
| `client/src/pages/RegisterPage.tsx:32` | fallback do formulário | Aceitável |
| `client/src/config/timezones.ts:75` | lista de zonas | Não é uso fixo |

Chamadas que **omitem** o timezone (confirmadas): `AppointmentForm.tsx` l.96/142/155/360; `PortalHomePage.tsx` l.109-110; `PortalAppointmentsPage.tsx` l.134-135; `DeleteAppointmentModal.tsx` l.51-52; `PublicAppointmentCancelDialog.tsx` l.107-114; `PublicBookingPage.tsx` l.84/371.

## 4. Riscos e compatibilidade com empresas existentes

| ID | Tipo | Descrição | Recomendação |
|---|---|---|---|
| R1 | **Confirmado** | Frontend usa Lisboa para roles sem `COMPANY_READ` (MANAGER, EMPLOYEE, CLIENT) | Expor timezone num endpoint legível por todos os autenticados (ver Parte 1) |
| R2 | **Confirmado** | Empresa não carregada após login/registo/refresh sem reload | Carregar timezone a partir da sessão, não só no bootstrap |
| R3 | **Confirmado** (código) / cenário de falha deduzido | `AppointmentForm` submete com Lisboa; empresa em `America/Sao_Paulo` marcando 09:00 enviaria `09:00 Lisboa`=`05:00 São Paulo` | Passar `timezone` nas 4 chamadas |
| R4 | Risco | Endpoints autenticados aceitam `startAt` sem offset ⇒ interpretado pelo `new Date()` na zona do **processo Node**. O frontend atual envia sempre ISO UTC; clientes de API de terceiros não | Exigir offset (como no público) **ou** interpretar na zona da empresa — decisão de contrato, ver Parte 4 |
| R5 | Risco | Estados iniciais (`todayKey`, `customMonthBounds`) calculados uma vez; mudar de timezone depois mostra o dia errado | Recalcular/reiniciar quando o timezone muda |
| R6 | Risco | Fallbacks divergentes no backend (UTC vs Lisboa vs nenhum) | Um único helper `resolveCompanyTimezone` |
| R7 | Risco | Empresa muda `timezone` no `PATCH`: agendamentos existentes **não mudam** (instantes), mas a hora local exibida muda; disponibilidade semanal/exceções (`HH:mm`/`date` locais) passam a significar outro instante | Documentar; avaliar aviso na UI/ bloqueio se existirem agendamentos futuros (decisão de negócio — não proposta aqui) |
| R8 | Risco | DST: slot cuja hora local não existe (salto de primavera) — `AvailableSlotsBuilder` l.~277 `fromISO(..., zone)` desloca a hora e a comparação `localStart < periodStart` pode descartar o período | Teste dedicado (Parte 5); não confirmado |
| R9 | Risco menor | `NotificationBell`/`EmployeesPage` usam zona do browser | Aceitável (instantes de sistema, não agendamentos); decidir |
| R10 | Risco | Falhas de 4 testes client pré-existentes mascaram regressões em Dashboard/Reports | Resolver antes de alterar essas páginas |

**Risco de alterar a hora visual de agendamentos existentes:** nenhum dado muda (são instantes). Para empresas **em Lisboa** ou sem timezone explícito (default Lisboa) a apresentação mantém-se idêntica. Só empresas com timezone ≠ Lisboa **verão a hora corrigir-se** (hoje mostram Lisboa para roles sem acesso/sem reload) — é a correção pretendida, mas deve ser comunicada.

**Estratégia para empresas sem timezone explícito (sem alterar dados):** tratar ausente/inválido como `Europe/Lisbon` em **leitura**, através de um único helper no backend (`resolveCompanyTimezone(company)`), e expor sempre o valor **efetivo** na API. Nenhum backfill: o default do schema já cobre documentos hidratados.

## 5. Plano de implementação (partes pequenas e sequenciais)

### Parte 1 — Contrato: expor o timezone efetivo a todos os autenticados
- **Ficheiros:** `server/src/modules/auth/services/AuthService.ts` (`me`, + login/refresh se devolverem user), `server/src/modules/auth/*` DTO/tipos de resposta, `docs/api-contract.md`, `client/src/types/auth.ts`, `client/src/store/slices/authSlice.ts` ou `companySlice.ts`.
- **Proposta:** adicionar `companyTimezone: string` (aditivo, opcional para compatibilidade) à resposta de `me`/sessão, calculado com o helper efetivo. Alternativa: `GET /companies/current` com permissão mais ampla — **exige alterar permissões**, por isso não é recomendada.
- **Contrato:** aditivo (campo novo); sem remover campos.
- **Dependências:** nenhuma.
- **Regressão:** testes de `AuthService.me`, de empresa sem timezone/ inválido, e que utilizadores `CLIENT/EMPLOYEE/MANAGER` recebem o campo e não recebem outros dados da empresa.
- **Aceitação:** `GET /auth/me` devolve `companyTimezone` para todas as roles; empresa sem campo ⇒ `Europe/Lisbon`; nenhum dado de empresa adicional exposto.

### Parte 2 — Backend: helper único de timezone efetivo
- **Ficheiros:** `server/src/utils/timezone.ts` (novo `resolveCompanyTimezone`), substituir fallbacks em `AvailabilityService` (l.364-366), `AvailabilityExceptionService` (l.93), `NotificationDispatcher` (l.188), `ReminderService` (l.190), `PublicBookingService` (l.77-83), `AppointmentService` (l.592, l.985).
- **Dependência:** nenhuma (pode correr em paralelo à Parte 1, mas depois dela é mais simples reutilizar).
- **Regressão:** testes existentes `AvailabilityService.timezone`, `AvailabilityException.timezone`, `ReminderService`, `NotificationDispatcher`, `public-booking.routes` continuam a passar; novos casos: ausente/inválido ⇒ Lisboa em todos os módulos.
- **Aceitação:** `rg 'DEFAULT_TIMEZONE|\?\? "UTC"' server/src` só mostra o helper e o schema; comportamento de empresas válidas inalterado.

### Parte 3 — Frontend: fonte única do timezone na sessão
- **Ficheiros:** `client/src/store/slices/companySlice.ts` (`selectCompanyTimezone` passa a ler o timezone da sessão/`me`, com `company.timezone` a ter prioridade quando existir), `SessionBootstrap.tsx`, `LoginPage.tsx`/`RegisterPage.tsx`/`apiClient.ts` (refresh) se necessário para preencher o timezone em todos os pontos que fazem `setCredentials`, `CompanyPage` (atualizar após `PATCH`).
- **Dependência:** Parte 1.
- **Regressão:** `companySlice.test`, `SessionBootstrap.test`, `LoginPage.test`, `CompanyPage.test`.
- **Aceitação:** após login **sem reload**, qualquer role obtém o timezone correto; `APPOINTMENT_TIMEZONE` deixa de ser lido fora do fallback final.

### Parte 4 — Frontend: eliminar usos implícitos de Lisboa
- **Ficheiros:** `AppointmentForm.tsx` (l.96, 142, 155, 360), `PortalHomePage.tsx`, `PortalAppointmentsPage.tsx`, `DeleteAppointmentModal.tsx`, `PublicAppointmentCancelDialog.tsx` (usar `appointment.timezone`), `AppointmentsPage.tsx` l.85 e `ReportsPage.tsx` l.112/115 (reagir à mudança de timezone), opcional: tornar o parâmetro `timezone` **obrigatório** em `config/appointmentTime.ts`, `appointmentCalendar.ts`, `appointmentSlots.ts` para o compilador apanhar omissões.
- **Dependência:** Parte 3.
- **Regressão:** `AppointmentForm.test`, `AppointmentsPage.test`, `appointmentTime.test`, `PortalAppointmentsPage.test`, testes de modais; novos testes com empresa `America/Sao_Paulo` e `Pacific/Auckland`.
- **Aceitação:** `rg 'APPOINTMENT_TIMEZONE' client/src --glob '!*.test.*'` só mostra o fallback final; criar agendamento às 09:00 numa empresa São Paulo envia `12:00Z`.

### Parte 5 — Público e contrato de `startAt` autenticado
- **Ficheiros:** `PublicBookingPage.tsx` l.84/104/371 (`getTodayDateKey()` — preferir esperar pela 1.ª resposta ou aceitar a imprecisão documentada); `create-appointment.validator.ts` / `update-appointment.validator.ts` (R4).
- **Decisão pendente do dono do produto:** exigir offset em `startAt` autenticado (alteração de contrato, pode quebrar clientes) **ou** manter e documentar. Recomendação: exigir offset só se se confirmar que nenhum cliente externo o omite.
- **Dependência:** Partes 2-4.
- **Regressão:** `public-booking.routes`, `PublicBookingPage.test`, `availability-appointment.routes`.
- **Aceitação:** nenhum caminho interpreta `startAt` na zona do processo/browser.

### Parte 6 — Testes de DST/meia-noite e independência da máquina
Ver secção 6. Pode ser feita em paralelo a qualquer parte depois da Parte 2.

## 6. Testes

### 6.1 Existentes (identificados)
- Server: `unit/timezone.test.ts`, `unit/timezone.dst.test.ts` (Lisbon, New_York, Tokyo, São Paulo; DST e meia-noite), `unit/availability/AvailabilityService.timezone.test.ts`, `AvailabilityException.timezone.test.ts`, `AvailableSlotsBuilder.test.ts` (inclui `Pacific/Kiritimati`, `America/New_York`), `unit/reminders/ReminderService.test.ts` (São Paulo), `unit/auth/register-timezone.validator.test.ts`, `integration/public-booking.routes.test.ts`, `availability-appointment.routes.test.ts`.
- Client: `config/appointmentTime.test.ts` (DST 2026-03-29), `appointmentSlots.test.ts` (casos 10/10b), `reportPeriod.test.ts`, `publicBooking.test.ts`, `companySlice.test.ts`, `CompanyForm.test.tsx`.
- Lacunas: reports no servidor sem teste por zona (a lógica está no frontend); DST do **outono** e do **salto de primavera** em `AvailableSlotsBuilder`; `AppointmentForm` com zona ≠ Lisboa no submit; portal/modais com zona ≠ Lisboa; relatórios (`buildReportRange`) em semana com DST.

### 6.2 Testes a criar (não criados nesta etapa)
1. Empresas em `Europe/Lisbon`, `America/Sao_Paulo`, `America/New_York`, `Asia/Tokyo`, `Pacific/Auckland`: mesma `startAt` UTC, disponibilidade e dia local diferentes.
2. DST: `Europe/Lisbon` 2026-03-29 (01:00→02:00) e 2026-10-25; `America/New_York` 2026-03-08 e 2026-11-01 — slots, `ensureEmployeeAvailable`, lembretes 24h (hora de e-mail) e `buildReportRange` de semana/mês.
3. Meia-noite: slot 23:30–00:30 (rejeitado), agendamento às 00:00 local vs 23:00Z, "hoje" a 23:30 Lisboa vs UTC.
4. Sem timezone / inválido ⇒ Lisboa em todos os módulos (Parte 2).
5. `/auth/me` devolve `companyTimezone` por role (Parte 1).
6. Frontend: `AppointmentForm` em `America/Sao_Paulo` envia `startAt` correto e abre edição com a hora local correta; Portal/modais usam o timezone correto.

### 6.3 Dependência do timezone da máquina
- Executado (apenas leitura): `server`: `TZ=Pacific/Auckland npx vitest run tests/unit` ⇒ **65 ficheiros / 851 testes passaram**. Testes de integração do servidor **não foram executados**.
- Executado: `client`: `TZ=Pacific/Auckland` em `src/config src/store src/components/appointments src/components/public src/pages` ⇒ 786 passaram, **4 falharam** (`DashboardPage.test.tsx` ×2, `ReportsPage.test.tsx` ×2). Reexecutado só com Dashboard+Reports: as mesmas 4 falham com `TZ=Europe/Lisbon`, logo **não são causadas pelo fuso**; a causa não foi investigada (os asserts mostram contagens de cards em falta e `revenue-estimated` ausente — provável desatualização face ao Stage 33/34).
- Não executados: restante suite do client fora das pastas acima (ex.: `src/api`, `src/app`, `src/routes`), testes de integração do servidor, execução com `TZ=UTC` e `America/Los_Angeles` (a tentativa foi interrompida por falta de memória na VM).
- Observação estática: a maioria dos testes usa ISO com `Z`/offset e zona explícita; vários testes de client usam o default Lisboa implicitamente (não detetam o bug R3).

## 7. Critérios de aceitação globais
- Empresa `America/Sao_Paulo`: um `EMPLOYEE` vê no calendário, no formulário, no dashboard, no portal e nos relatórios as mesmas horas que o `OWNER` e que o e-mail enviado.
- Criar às 09:00 locais grava o instante equivalente a 09:00 na zona da empresa, qualquer que seja o fuso do browser/máquina.
- Empresas sem timezone explícito continuam a funcionar como Lisboa; nenhum dado migrado.
- Nenhum teste novo depende do `TZ` da máquina (verificado com pelo menos `UTC` e `Pacific/Auckland`).

## 8. Limitações / não confirmado
- Não foi feito teste manual no browser nem E2E; não foi consultada base de dados real (comportamento do default Mongoose para documentos antigos é inferido).
- Não foram lidos integralmente: templates de e-mail (`appointment-email-layout.ts`, `reminder-email-layout.ts` — apenas os comentários que indicam receber texto já formatado), `docs/api-contract.md`, `ClientInvite`, módulos Users/Clients/Services (sem lógica temporal encontrada por pesquisa de `Date`/`toISOString`, mas não lidos linha a linha), componentes `BookingDateTimePicker`/`BookingReview` além das referências a `timezone`.
- Não verificado se `/auth/login` e `/auth/refresh` devolvem exatamente o mesmo payload que `me` (relevante para a Parte 1).
- R8 (salto de primavera em `AvailableSlotsBuilder`) é uma hipótese não testada.
- Causa das 4 falhas de testes client não investigada; não se sabe se existem outras falhas nas pastas de testes do client não executadas.
- Pesquisa de usos por `rg` pode não detetar construções dinâmicas.

## 9. Confirmação
Nenhum código funcional, teste, configuração ou dado foi alterado. Não foram feitos commits, merges, pushes, migrações nem backfills. O único ficheiro criado é este relatório. (`git status` estava limpo antes da escrita deste ficheiro; os comandos de teste executados são só de leitura.)

## CONTEXTO PARA A PRÓXIMA IA

Objetivo da Parte 1: expor o timezone efetivo da empresa a **todas** as roles autenticadas, de forma aditiva, sem alterar permissões.

Factos técnicos:
- `server/src/utils/timezone.ts`: `DEFAULT_TIMEZONE = "Europe/Lisbon"`, `isValidIanaTimezone`, `toCompanyDateTime`. **Ainda não existe** `resolveCompanyTimezone` (criar aqui; a lógica correta é a de `PublicBookingService.resolveTimezone` l.77-83: válido → valor; senão `DEFAULT_TIMEZONE`).
- `AuthService.me(userId)` (`server/src/modules/auth/services/AuthService.ts` l.350-368) devolve `{id,name,email,avatar,role,companyId,isActive,mustChangePassword,clientId?}` — **sem timezone**. É aqui (e em quaisquer respostas de login/refresh que montem o mesmo user — verificar) que se deve acrescentar `companyTimezone`. Precisa de `CompanyRepository.findById(user.companyId)` (hidratado; o default do schema cobre documentos antigos). O `AuthService` já importa `DEFAULT_TIMEZONE`/`isValidIanaTimezone` (l.68).
- `GET /companies*` exige `COMPANY_READ` (só OWNER/ADMIN, `server/src/constants/rbac.ts` l.23, l.55) — **não alterar**.
- Frontend: `client/src/store/slices/companySlice.ts` `selectCompanyTimezone` (l.54-58) lê `state.company.company.timezone ?? APPOINTMENT_TIMEZONE`. `SessionBootstrap.tsx` só carrega a empresa na montagem e só para OWNER/ADMIN; `LoginPage.tsx` l.67, `RegisterPage.tsx` l.130 e `api/apiClient.ts` l.67 fazem `setCredentials` sem carregar empresa. Tipo de auth em `client/src/types/auth.ts` (AuthUser) e `authSlice.ts`.
- Todos os consumidores do frontend já recebem o timezone via `selectCompanyTimezone`, por isso a Parte 3 pode alterar apenas o selector (ex.: `company.timezone ?? auth.user.companyTimezone ?? APPOINTMENT_TIMEZONE`).
- Testes relevantes a manter verdes: `server/tests/unit/auth/AuthService.test.ts`, `client/src/store/slices/companySlice.test.ts`, `client/src/app/SessionBootstrap.test.tsx`, `client/src/pages/LoginPage.test.tsx`. Os testes de integração/`routes` de auth devem ser verificados para ver se comparam o payload de `me` com `toEqual` exato (poderá exigir atualização).
- Falhas pré-existentes (não relacionadas): `DashboardPage.test.tsx` (2) e `ReportsPage.test.tsx` (2) no client — falham também com `TZ=Europe/Lisbon`.
- Cuidados de execução: a VM ficou sem memória ao executar suites completas em paralelo; correr `vitest` por pasta, com `--pool=forks --maxWorkers=1`.
- Atualizar `docs/api-contract.md` com o novo campo (aditivo, opcional para clientes antigos).
