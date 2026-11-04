# Stage 37 — Auditoria frontend (React) e comparação Setmore

| Campo | Valor |
|-------|--------|
| Data do relatório | 15/10/2026 |
| Branch analisada | `develop` (HEAD `f1beda0`) |
| Âmbito | `client/` (read-only) |
| Artefacto único criado | Este ficheiro |
| Verificação visual no browser | **Não realizada** (análise estática + inventário de testes) |
| Setmore (fontes oficiais) | https://www.setmore.com/ e https://www.setmore.com/features — acesso 15/10/2026 |

## 1. Resumo executivo

Auditoria read-only do frontend SchedulerPro: **20 rotas** registadas em [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx), **21** módulos de página (incl. subcomponente `DashboardAppointments`), **~48** componentes de produção em `components/` (**85** ficheiros `.tsx` incluindo testes), **108** ficheiros de teste Vitest no client (**68** `*.test.tsx` + **40** `*.test.ts`). Stack: React 19, Vite 7, Redux Toolkit (auth + company), React Router 7, Bootstrap 5, Luxon, Axios com cookies e refresh de sessão.

**Principais conclusões:** o produto cobre bem o núcleo B2B (CRUD, agenda, disponibilidade, relatórios, booking público multi-step, portal cliente, convites). Padrões de UI **divergem** entre fluxos públicos (`LoadingState` / `ErrorState` / `EmptyState`) e área autenticada (spinner Bootstrap + `alert-danger` inline). Não há integrações de pagamento, calendário externo, SMS ou apps nativas no frontend. **16 achados** catalogados (`FE-001`–`FE-016`); nenhum S0/S1 de segurança identificado na camada UI (RBAC espelhado em `config/*Permissions.ts`).

**Top prioridades sugeridas (não executadas):** P1 unificar estados de carregamento/erro no admin (FE-001); P1 alinhar cabeçalhos de acesso negado com `PageHeader` (FE-002); P2 rota catch-all `*` → `/` (FE-003); P2 estados vazios em dashboard/relatórios/disponibilidade (FE-004).

---

## 2. Objetivo e restrições

- Inventariar rotas, páginas, componentes partilhados e APIs consumidas.
- Matriz de consistência visual/comportamental (evidência em ficheiros).
- Auditoria técnica (estado, API, permissões UI, testes, tipagem).
- Comparação com capacidades **anunciadas** no site Setmore (sem assumir paridade como meta).
- Plano incremental futuro; **zero** alterações de código, configs ou outros docs; sem commit/push.

---

## 3. Stack e bootstrap da aplicação

| Camada | Evidência |
|--------|-----------|
| Entrada | [`client/src/main.tsx`](../../client/src/main.tsx) — `Provider` Redux, Bootstrap CSS, `index.css` |
| App shell | [`client/src/app/App.tsx`](../../client/src/app/App.tsx) — `BrowserRouter` + `SessionBootstrap` + `AppRoutes` |
| Build | [`client/package.json`](../../client/package.json) — `tsc -b`, Vite, Vitest |
| Estado global | [`client/src/store/index.ts`](../../client/src/store/index.ts) — `auth`, `company` |
| Sessão | [`SessionBootstrap.tsx`](../../client/src/app/SessionBootstrap.tsx) — `getMe`, `getCompany` para OWNER/ADMIN |
| HTTP | [`apiClient.ts`](../../client/src/api/apiClient.ts) — `withCredentials`, refresh anti-loop, logout em 401 definitivo |
| Menu RBAC | [`config/menu.ts`](../../client/src/config/menu.ts) — 11 itens; CLIENT só portal |
| Layout | [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) — sidebar mobile (`open`, backdrop, Escape), redirect CLIENT ↔ portal |

### 3.1 Etapas anteriores relevantes (não repropostas)

| Relatório | Tema |
|-----------|------|
| [`STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md`](STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md) | KPIs dashboard, status, preço em relatórios |
| [`STAGE_36_PART_3_FRONTEND_TIMEZONE.md`](STAGE_36_PART_3_FRONTEND_TIMEZONE.md) | Timezone por empresa no client |
| [`STAGE_36_1_DASHBOARD_REPORTS_TESTS.md`](STAGE_36_1_DASHBOARD_REPORTS_TESTS.md) | Testes Dashboard/Reports alinhados à UI |
| [`STAGE_36_PART_4/5/6`](.) | Contrato de datas API + validação timezone |

---

## 4. Rotas e guards

Fonte: [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx).

| Rota | Página | Guard / layout | Notas |
|------|--------|----------------|-------|
| `/agendar/empresa/:companyId` | `PublicBookingPage` | Público | Multi-step booking |
| `/agendar/:token`, `/agendar` | `PublicAppointmentPage` | Público | Token legado / vazio → UX 404 na página |
| `/convite/cliente/:token` | `ClientInvitePage` | Público | Fora de Guest/Protected |
| `/login`, `/register`, `/forgot-password` | Auth | `GuestRoute` | |
| `/reset-password`, `/verify-email` | Auth | Sem guest (link email) | |
| `/change-password` | `ChangePasswordPage` | `ChangePasswordRoute` | |
| `/`, `/clients`, … `/company` | Admin | `ProtectedRoute` + `AppLayout` | |
| `/portal`, `/portal/agendamentos`, `/portal/perfil` | Portal CLIENT | Idem | `AppLayout` redireciona roles |
| `*` | `Navigate` → `/` | — | Ver FE-003 |

**Lacunas documentadas:** não existe `/users` (equipa em `/employees`). Multi-empresa: UI limitada ao tenant da sessão (`companyId` implícito via API).

---

## 5. Inventário de páginas (APIs, estados UI, testes)

Legenda estados: **PH** = `PageHeader`; **L** = loading; **E** = erro; **V** = vazio.

| Rota | Ficheiro | API(s) `endpoints/` | PH | L | E | V | Ficheiro(s) teste |
|------|----------|---------------------|----|----|----|----|-------------------|
| `/` | `dashboard/DashboardPage.tsx` | appointments, clients, services, employees | ✓ | spinner | alert | — | `DashboardPage.test.tsx` |
| `/clients` | `clients/ClientsPage.tsx` | clients | ✓ | spinner | alert | `EmptyState` | `ClientsPage.test.tsx`, `.photo.test.tsx` |
| `/services` | `services/ServicesPage.tsx` | services | ✓ | spinner | alert | `EmptyState` | `ServicesPage.test.tsx` |
| `/employees` | `employees/EmployeesPage.tsx` | employees | ✓ | spinner | alert | `EmptyState` | `EmployeesPage.test.tsx`, `.photo.test.tsx` |
| `/availability` | `availability/AvailabilityPage.tsx` | availability, employees | ✓ | spinner | alert | inline* | `AvailabilityPage.test.tsx` |
| `/appointments` | `appointments/AppointmentsPage.tsx` | appointments, clients, services, employees | ✓ | spinner | alert | `EmptyState` | `AppointmentsPage.test.tsx` |
| `/reports` | `reports/ReportsPage.tsx` | reports | ✓† | spinner | alert | — | `ReportsPage.test.tsx` |
| `/company` | `company/CompanyPage.tsx` | company | ✓ | spinner | alert | — | `CompanyPage.test.tsx`, `.logo.test.tsx` |
| `/portal` | `portal/PortalHomePage.tsx` | appointments | ✓ | spinner | alert | — | `PortalHomePage.test.tsx` |
| `/portal/agendamentos` | `portal/PortalAppointmentsPage.tsx` | appointments | ✓ | spinner | alert | `EmptyState` | `PortalAppointmentsPage.test.tsx` |
| `/portal/perfil` | `portal/PortalProfilePage.tsx` | clients (perfil) | ✓ | spinner | alert | — | `PortalProfilePage.test.tsx` |
| `/agendar/empresa/:id` | `public/PublicBookingPage.tsx` | publicBooking | ✓ | `LoadingState` | `ErrorState` | `EmptyState` | `PublicBookingPage.test.tsx` |
| `/agendar/:token` | `public/PublicAppointmentPage.tsx` | publicAppointments | ✓ | `LoadingState` | `ErrorState` | `EmptyState` | `PublicAppointmentPage.test.tsx` |
| `/convite/cliente/:token` | `public/ClientInvitePage.tsx` | clientInvites | ✓ | spinner | alert | — | `ClientInvitePage.test.tsx` |
| `/login` | `LoginPage.tsx` | auth | — | btn spinner | alert | — | `LoginPage.test.tsx` |
| `/register` | `RegisterPage.tsx` | auth | — | Redux loading | alert | — | `RegisterPage.test.tsx` |
| `/forgot-password` | `ForgotPasswordPage.tsx` | auth | — | — | alert | — | `ForgotPasswordPage.test.tsx` |
| `/reset-password` | `ResetPasswordPage.tsx` | auth | — | — | alert | — | `ResetPasswordPage.test.tsx` |
| `/verify-email` | `VerifyEmailPage.tsx` | auth | — | `FullPageLoader` | alert | — | `VerifyEmailPage.test.tsx` |
| `/change-password` | `ChangePasswordPage.tsx` | auth | — | Redux loading | alert | — | `ChangePasswordPage.test.tsx` |

† `ReportsPage`: sem `PageHeader` no ramo `!canView` (h1 manual) — FE-002.  
\* `AvailabilityPage`: mensagens de lista vazia sem componente `EmptyState` partilhado.

Subcomponente: [`dashboard/DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) — tabela de próximos agendamentos; coberto indiretamente por `DashboardPage.test.tsx`.

---

## 6. Inventário de componentes (`client/src/components/`)

### 6.1 `layout/`

| Componente | Responsabilidade | Testes |
|------------|------------------|--------|
| `AppLayout` | Shell autenticado, sidebar mobile | `AppLayout.test.tsx` |
| `Navbar` | Brand, toggle menu, `NotificationBell` | `Navbar.test.tsx` |
| `Sidebar` / `SidebarItem` | Menu por role (`menu.ts`) | `Sidebar.test.tsx`, `Sidebar.logo.test.tsx` |
| `NotificationBell` | Notificações in-app (não CLIENT) | `NotificationBell.test.tsx` |

### 6.2 `common/`

| Componente | Props relevantes | Consumidores (grep) |
|------------|------------------|---------------------|
| `PageHeader` | `title`, `description`, `actions`, `eyebrow` | 14 páginas (todas áreas exceto auth) |
| `DashboardCard` | KPI cards | `DashboardPage`, `ReportsPage` |
| `EmptyState` | `title`, `description`, `action` | clients, services, employees, appointments, portal agendamentos, public flows, `BookingDateTimePicker` |
| `ErrorState` | `message`, `onRetry?` | **apenas** `PublicBookingPage`, `PublicAppointmentPage`, `BookingDateTimePicker` |
| `LoadingState` | `label` | Idem ErrorState |
| `FullPageLoader` | — | `ProtectedRoute`, `VerifyEmailPage` |
| `ImageUploader` / `ImageAvatar` | Fotos/logo | forms empresa, cliente, funcionário |

### 6.3 Domínio (resumo)

| Pasta | Ficheiros produção (aprox.) | Notas |
|-------|----------------------------|--------|
| `appointments/` | 14 | Calendário (`CalendarView`, Week/Month/Day, `AppointmentForm`, modais) |
| `availability/` | 6 | Editor semanal, exceções, 2 modais delete |
| `clients/` | 4 | `ClientForm`, `DeleteClientModal`, `SendClientInviteModal` |
| `employees/` | 3 | Form + delete modal |
| `services/` | 3 | Form + delete modal |
| `company/` | 1 | `CompanyForm` |
| `public/` + `public/booking/` | 13 | Booking wizard + edição/cancelamento token |

### 6.4 Duplicações investigadas

| Padrão | Instâncias | Evidência |
|--------|-----------|-----------|
| `Delete*Modal` | client, service, employee, appointment, availability day/exception | Markup Bootstrap modal repetido; `PublicAppointmentCancelDialog` documenta cópia de `DeleteAppointmentModal` |
| Tabelas admin | Inline `<table className="table">` em CRUD pages | `RankingTable` **local** em `ReportsPage.tsx` (não extraído) |
| Formulários | `*Form.tsx` por entidade | Convenção consistente; validação mista (HTML5 + lógica em `config/`) |

### 6.5 Componentes sem ficheiro `*.test.tsx` dedicado

`WeekCalendar`, `MonthCalendar`, `DayCalendar`, `CalendarToolbar`, `AppointmentCalendarItem`, `SidebarItem`, `DeleteAvailabilityExceptionModal` (parcialmente coberto por `AvailabilityExceptionsSection.test.tsx`).

---

## 7. Matriz de consistência

| Padrão | Estado | Evidência |
|--------|--------|-----------|
| Cabeçalho de página | **Inconsistente** | `PageHeader` na maioria; auth sem PH; `ReportsPage` negação sem PH (FE-002) |
| Sidebar vs rotas | **Consistente** | Itens em `menu.ts` alinhados às rotas protegidas; rotas públicas/auth fora do menu |
| Botões primários | **Consistente** | `btn btn-primary`; ações destrutivas `btn-outline-danger` nos modais delete |
| Submit loading | **Contexto** | Auth: `spinner-border-sm` no botão; CRUD: estados locais `isSaving` por formulário |
| Formulários | **Consistente** | Um `*Form` por domínio; mensagens de erro via `getFriendlyErrorMessage` / `getApiError` |
| Tabelas | **Consistente** | `table-responsive` nas listagens principais; rankings só em Reports |
| Modais | **Inconsistente** | Mesmo padrão Bootstrap, mas 6+ variantes copy-paste (FE-005) |
| Badges de status | **Consistente** | [`appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts) — listas, calendário, público |
| Alertas de erro | **Inconsistente** | Admin: `alert-danger`; público: `ErrorState` com retry (FE-001) |
| Loading | **Inconsistente** | Admin: `spinner-border`; público: `LoadingState` (FE-001) |
| Datas / TZ | **Consistente** | `selectCompanyTimezone`, `appointmentTime.ts`, booking público com `APPOINTMENT_TIMEZONE` / empresa |
| Responsividade | **Consistente** | `AppLayout` sidebar mobile; grids Bootstrap; **não verificado** em viewport real |
| A11y (amostra) | **Parcial** | `role="status"` / `role="alert"` frequentes; labels em forms nos testes de auth/CRUD; sem auditoria WCAG |

---

## 8. Auditoria técnica

### 8.1 Estado (Redux vs local)

| Área | Padrão |
|------|--------|
| Auth, company, timezone | Redux (`authSlice`, `companySlice`) |
| CRUD pages | Estado local (`useState` + `useEffect` fetch) |
| `AppointmentsPage`, `PublicBookingPage`, `ReportsPage` | Estado local volumoso (orquestração, filtros, períodos) |

### 8.2 API

- **13** módulos em [`client/src/api/endpoints/`](../../client/src/api/endpoints/).
- Erros: [`api/errors`](../../client/src/api/errors) — `getApiError`, `getFriendlyErrorMessage`, mensagens de sessão.
- `companyId` não enviado nos payloads (testes de contrato em vários `*.api.test.ts`).

### 8.3 Permissões UI (espelho backend)

| Módulo | Config |
|--------|--------|
| Empresa | `companyPermissions.ts` — OWNER/ADMIN |
| Agendamentos | `appointmentPermissions.ts` — delete só OWNER |
| Relatórios | `reportPermissions.ts` — OWNER/ADMIN/MANAGER |
| Clientes, serviços, funcionários, disponibilidade | `clientPermissions`, `servicePermissions`, `employeePermissions`, `availabilityPermissions` |

`ReportsPage` bloqueia UI com `alert-warning` se `!canView` (EMPLOYEE não vê item de menu, mas URL direta ainda monta a página).

### 8.4 Testes

- **108** ficheiros de teste (**68** `*.test.tsx`, **40** `*.test.ts`).
- Cobertura forte: booking público, appointments, auth, permissions config, rotas, APIs e `config/`.
- Lacunas: subcalendários, alguns modais, `SidebarItem`.
- Suite completa (15/10/2026): `npm run test -- --pool=forks --maxWorkers=1` → **108** ficheiros, **1239** testes passados, ~**471 s**, exit 0. Pacote focal Stage 36.1: **21/21** em Dashboard + Reports.

### 8.5 Tipagem

- Grep `: any` / `as any` em `client/src` (**excl.** strings em testes): **0 ocorrências** em produção.
- `expect.any` apenas em testes.

### 8.6 CSS

- Bootstrap 5 + [`index.css`](../../client/src/index.css) (classes `page-header`, `dashboard-kpis`, `app-sidebar`, tokens `--sp-*`).
- CSS morto: **não auditado** (baixa confiança; inferência omitida).

### 8.7 Integrações ausentes no frontend (grep)

`stripe`, `google`, `payment`, `paypal` em `client/src`: **sem matches**.

---

## 9. Setmore — fontes e método

Conteúdo obtido read-only das páginas oficiais (marketing/feature list). SchedulerPro avaliado pelo código em `client/`. Estados: **Implementado** | **Parcial** | **Ausente** | **Não confirmado** | **Não comparável** (SaaS vs self-hosted).

---

## 10. Comparação — 18 dimensões

| # | Dimensão | Setmore (fonte) | SchedulerPro | Estado |
|---|----------|-----------------|--------------|--------|
| 1 | Booking Page 24/7 | Booking Page custom URL, self-schedule | `PublicBookingPage` + link em `CompanyPage` (`getPublicBookingUrl`) | **Implementado** |
| 2 | Calendário equipa | All-in-one calendar, staff | `AppointmentsPage` + `CalendarView` | **Implementado** |
| 3 | Catálogo de serviços | Service menu on Booking Page | `ServicesPage` + pickers públicos | **Implementado** |
| 4 | Gestão de staff | Staff logins, branches | `EmployeesPage`, roles RBAC | **Parcial** (sem multi-filial UI) |
| 5 | CRM / clientes | Customer details storage | `ClientsPage`, convites, portal perfil | **Implementado** |
| 6 | Disponibilidade | Real-time availability on Booking Page | `AvailabilityPage` + API pública slots | **Implementado** |
| 7 | Confirmações email | Automatic email confirmations | Não exposto no FE (provável backend/email) | **Não confirmado** no FE |
| 8 | Lembretes email/SMS | Email + text reminders | Sem UI de lembretes/SMS | **Ausente** no FE |
| 9 | Pagamentos online | Stripe, Square, PayPal on Booking Page | Sem UI/API no client | **Ausente** |
| 10 | Sync calendário externo | Google / Office 365 2-way | Sem integração | **Ausente** |
| 11 | Video meetings | Zoom / Google Meet links | Sem integração | **Ausente** |
| 12 | Apps móveis nativas | iOS / Android / desktop apps | SPA web responsiva | **Parcial** |
| 13 | Portal do cliente | Branded app / self-service | `/portal/*` | **Implementado** |
| 14 | Relatórios / receita | Revenue on mobile apps | `ReportsPage` (KPIs, rankings) | **Implementado** |
| 15 | Branding | Logo, Instagram stream, reviews | Logo empresa (`CompanyForm`, avatars); sem reviews/Instagram | **Parcial** |
| 16 | Integrações sociais | Facebook, Instagram book buttons | Apenas cópia de link booking | **Ausente** |
| 17 | Agendamentos recorrentes | Recurring appointments series | Métrica `recurringCount` em relatórios; sem wizard de série | **Parcial** |
| 18 | Aulas / grupo | Class booking, seat reservations | Agendamentos 1:1; sem capacidade de turma | **Ausente** |

---

## 11. Posicionamento pré-lançamento (vs Setmore)

| Categoria | Capacidades |
|-----------|-------------|
| **Essencial (já alinhado)** | Booking público, agenda interna, clientes/serviços/equipa, disponibilidade, portal cliente, relatórios básicos, RBAC, timezone empresa (Stage 36) |
| **Validar com clientes** | Notificações email/SMS, pagamento antecipado, sync Google Calendar, lembretes automáticos |
| **Opcional / pós-MVP** | Apps nativas, Zoom, Facebook/Instagram, QR marketing, class booking, reviews na booking page |
| **Não recomendado agora** | Paridade total com Setmore Pro/Enterprise sem demanda clara |

---

## 12. Achados (`FE-xxx`)

| ID | Título | S | P | Esforço | Ficheiros / área | Critério de aceitação (futuro) |
|----|--------|---|---|---------|------------------|--------------------------------|
| FE-001 | Estados loading/erro divergentes (admin vs público) | S3 | P1 | M | Páginas admin vs `common/LoadingState`, `ErrorState` | Admin CRUD usa os mesmos 3 componentes ou wrapper documentado; retry onde há refetch |
| FE-002 | Cabeçalho inconsistente em acesso negado a relatórios | S4 | P1 | L | `ReportsPage.tsx` L253–263 | `PageHeader` + mensagem padrão de permissão |
| FE-003 | Catch-all `*` redireciona para `/` | S3 | P2 | L | `AppRoutes.tsx` L92 | 404 dedicado ou redirect para login/portal conforme política |
| FE-004 | Sem `EmptyState` em dashboard, relatórios, disponibilidade | S4 | P2 | M | `DashboardPage`, `ReportsPage`, `AvailabilityPage` | Listas/KPIs vazios com mensagem acionável |
| FE-005 | Modais delete duplicados | S4 | P3 | M | `Delete*Modal`, `PublicAppointmentCancelDialog` | `ConfirmDialog` genérico ou composição única |
| FE-006 | `RankingTable` não reutilizável | S4 | P3 | L | `ReportsPage.tsx` | Extrair para `components/reports/` se segunda tabela surgir |
| FE-007 | URL `/reports` para role sem permissão ainda monta página | S4 | P2 | L | `ReportsPage`, rotas | Redirect ou guard de rota por role (opcional; backend já protege API) |
| FE-008 | Notificações: só staff, sem preferências UI | S4 | P3 | M | `NotificationBell.tsx` | Documentado; settings futuros se produto exigir |
| FE-009 | Multi-empresa / troca de tenant | S4 | P3 | H | Global | Fora de escopo MVP; documentar limitação |
| FE-010 | Pagamentos Setmore-like | S4 | P3 | H | N/A client | Feature de produto; backend + FE novos |
| FE-011 | Sync calendário externo | S4 | P3 | H | N/A | Integração futura |
| FE-012 | Verificação visual/responsiva não feita nesta stage | S4 | P2 | M | — | Passagem manual ou Percy em onda P2 |
| FE-013 | `ErrorState` subutilizado (sem retry no admin) | S4 | P2 | M | CRUD pages | Erros de carga inicial com botão "Tentar novamente" |
| FE-014 | Auth pages sem padrão `PageHeader` | — | P3 | L | `LoginPage`, etc. | **Contexto específico** — aceitável; documentado |
| FE-015 | Tipagem forte sem `any` em src | — | — | — | `client/src` | Manter; sem ação |
| FE-016 | Testes: subcalendários sem teste direto | S4 | P3 | M | `WeekCalendar`, etc. | Testes de integração via `CalendarView` ou unitários |

Severidade: S0 crítico … S4 baixo. Prioridade: P0 imediato … P3 opcional.

---

## 13. Plano incremental (não executar sem aprovação)

| Onda | Foco | Achados |
|------|------|---------|
| 1 | P1 transversal UI | FE-001, FE-002, FE-013 |
| 2 | P2 UX rotas e vazios | FE-003, FE-004, FE-007, FE-012 |
| 3 | P3 consolidação | FE-005, FE-006, FE-016 |
| 4 | Produto / paridade opcional | FE-010, FE-011, FE-008, dimensões Setmore 8–11, 16–18 |
| 5 | Escala | FE-009 |

**Decisão visual pendente:** manter identidade Bootstrap custom (`index.css`) vs inspirar-se no marketing Setmore — **sem escolha nesta stage**; próxima IA deve implementar **uma onda** aprovada pelo utilizador, reutilizando `PageHeader` / `EmptyState`, sem refactor global.

---

## 14. Riscos e limitações da auditoria

- Sem validação manual no browser (breakpoints, foco, leitores de ecrã).
- Setmore descrito por site marketing; capacidades reais do concorrente podem diferir dos planos.
- Email/SMS/pagamentos podem existir no **server** sem superfície no client — marcados "Não confirmado" onde aplicável.
- Suite Vitest completa confirmada após encerramento inicial do relatório (ver secção 15).

---

## 15. Comandos executados

```bash
git status -sb
git log -3 --oneline
# rg / leitura de ficheiros em client/src (inventário)
cd client && npm run test -- --pool=forks --maxWorkers=1
# → Test Files 108 passed | Tests 1239 passed | Duration ~471s | exit 0
```

Fetch read-only: https://www.setmore.com/ , https://www.setmore.com/features .

---

## 16. Confirmação read-only

- Nenhum ficheiro de código, teste ou config alterado.
- Nenhum commit, merge ou push.
- Único ficheiro criado: `docs/reports/stage-37-frontend-audit-setmore-comparison.md`.

---

## 17. Métricas de encerramento

| Métrica | Valor |
|---------|-------|
| Rotas mapeadas | 20 |
| Páginas (default export) | 21 |
| Ficheiros `.tsx` em `components/` | 85 |
| Ficheiros de teste Vitest (client) | 108 (1239 testes, verde) |
| Endpoints API (módulos) | 13 |
| Achados FE | 16 (FE-001–FE-016) |
| P0/P1 destacados | FE-001, FE-002 (P1); nenhum P0 |

---

## 18. CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 37 concluída em modo read-only. O frontend está funcionalmente maduro para MVP B2B; a maior oportunidade de melhoria **aprovável** é **consistência de estados** (onda 1: FE-001, FE-002, FE-013), não redesign Setmore.

**Não fazer sem pedido:** paridade pagamentos/calendário externo; refactor massivo de modais; alterar contrato API datas (Stage 36 fechado).

**Referências rápidas:** rotas [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx); booking [`PublicBookingPage.tsx`](../../client/src/pages/public/PublicBookingPage.tsx); permissões `client/src/config/*Permissions.ts`; testes Dashboard/Reports verdes em Stage 36.1.

**Próximo passo sugerido:** utilizador escolhe **uma onda** da secção 13; implementar com dif mínimo e testes existentes.
