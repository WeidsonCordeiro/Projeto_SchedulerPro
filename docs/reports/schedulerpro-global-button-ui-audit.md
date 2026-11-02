# SchedulerPro — Auditoria global de botões e ações do frontend

**Data:** 02/11/2026  
**Tipo:** Análise técnica e visual — READ-ONLY (sem alterações de código)  
**Stack:** React, TypeScript, Vite, Bootstrap 5, CSS em [`client/src/index.css`](../../client/src/index.css) e [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css)

---

## 1. Objetivo da auditoria

Identificar padrões, inconsistências de dimensões, alinhamento, espaçamento e responsividade dos botões em todo o frontend SchedulerPro; classificar acções por finalidade; mapear ficheiros de estilo; propor um sistema global de padronização **sem implementar alterações** nesta fase.

Contexto adicional:

- Foi corrigida previamente a **altura** do botão «Salvar {dia}» e o alinhamento do **Header** (ver [`schedulerpro-header-availability-layout-fix.md`](./schedulerpro-header-availability-layout-fix.md)).
- Os prints de referência do utilizador evidenciam: larguras variáveis em «Salvar {dia}», «Nova exceção» pequeno no mobile, «Editar» das exceções desalinhado no mobile, e coluna **Ações** irregular em **Serviços** (e padrão equivalente em outras tabelas).

---

## 2. Páginas e componentes analisados

### 2.1 Metodologia

- Varredura em `client/src/**/*.tsx` por `className` contendo `btn`, `btn-close`, `table-actions`, `page-actions`.
- Leitura dirigida de páginas de negócio, layout, modais, formulários e fluxos públicos/portal/auth.
- Análise de CSS global e de calendário; confirmação de ausência de `style=` em elementos `<button>`.

### 2.2 Contagens

| Métrica | Valor |
|--------|------:|
| Ficheiros TSX com botões Bootstrap (`btn*`) | **47** |
| Páginas (`pages/`) com botões | **22** |
| Componentes (`components/`) com botões | **25** |
| Ficheiros CSS com regras de botão | **2** (+ Bootstrap base importado em [`main.tsx`](../../client/src/main.tsx)) |
| Componente React `Button` dedicado | **0** |
| `<button style={...}>` | **0** |

### 2.3 Áreas funcionais cobertas

| Área | Ficheiros principais |
|------|----------------------|
| Dashboard | [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) |
| Clientes | [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx), [`ClientForm.tsx`](../../client/src/components/clients/ClientForm.tsx), [`SendClientInviteModal.tsx`](../../client/src/components/clients/SendClientInviteModal.tsx), [`DeleteClientModal.tsx`](../../client/src/components/clients/DeleteClientModal.tsx) |
| Serviços | [`ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx), [`ServiceForm.tsx`](../../client/src/components/services/ServiceForm.tsx), [`DeleteServiceModal.tsx`](../../client/src/components/services/DeleteServiceModal.tsx) |
| Disponibilidade | [`AvailabilityPage.tsx`](../../client/src/pages/availability/AvailabilityPage.tsx), [`AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx), [`AvailabilityExceptionsSection.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.tsx), modais de exceção/dia |
| Agendamentos | [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx), [`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx), [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) / [`CalendarToolbar.tsx`](../../client/src/components/appointments/CalendarToolbar.tsx), [`AppointmentForm.tsx`](../../client/src/components/appointments/AppointmentForm.tsx), calendário e filtros |
| Funcionários | [`EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx), [`EmployeeForm.tsx`](../../client/src/components/employees/EmployeeForm.tsx) |
| Empresa | [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx), [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) |
| Relatórios | [`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) |
| Portal cliente | [`PortalHomePage.tsx`](../../client/src/pages/portal/PortalHomePage.tsx), [`PortalAppointmentsPage.tsx`](../../client/src/pages/portal/PortalAppointmentsPage.tsx) |
| Público / convite | [`PublicBookingPage.tsx`](../../client/src/pages/public/PublicBookingPage.tsx), [`PublicAppointmentPage.tsx`](../../client/src/pages/public/PublicAppointmentPage.tsx), [`ClientInvitePage.tsx`](../../client/src/pages/public/ClientInvitePage.tsx), componentes `booking/*` |
| Auth | Login, Register, Forgot/Reset/Change password, Verify email |
| Layout | [`Navbar.tsx`](../../client/src/components/layout/Navbar.tsx), [`NotificationBell.tsx`](../../client/src/components/layout/NotificationBell.tsx), [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) |
| Partilhados | [`PageHeader.tsx`](../../client/src/components/common/PageHeader.tsx), [`DestructiveConfirmModal.tsx`](../../client/src/components/common/DestructiveConfirmModal.tsx), [`ErrorState.tsx`](../../client/src/components/common/ErrorState.tsx), [`ImageUploader.tsx`](../../client/src/components/common/ImageUploader.tsx) |

**Nota:** [`Sidebar.tsx`](../../client/src/components/layout/Sidebar.tsx) usa navegação por links (`SidebarItem`), não botões `btn` — fora do inventário principal, mas relevante para hierarquia de acções de navegação.

---

## 3. Inventário dos botões encontrados

### 3.1 Padrões de markup

| Padrão | Uso típico | Exemplo de classes |
|--------|------------|-------------------|
| CTA de página | `PageHeader` → `.page-actions` | `btn btn-primary` |
| CTA em empty state | Dentro de `EmptyState` | `btn btn-primary` (texto longo variável) |
| Acções de tabela | `.table-actions` | `btn btn-sm btn-outline-primary|secondary|success|danger` |
| Formulário modal | `.modal-footer` | `btn btn-secondary` + `btn btn-primary` |
| Confirmação destrutiva | `DestructiveConfirmModal` | `btn btn-secondary` + `btn btn-danger` |
| Secção in-card | `d-flex justify-content-between` | `btn btn-sm btn-primary` (ex.: Nova exceção) |
| Salvar por entidade | Contentor dedicado | `btn btn-sm btn-primary` + label dinâmico |
| Auth submit | Formulário full width | `btn btn-primary w-100` |
| Booking / wizard | Par primary + outline | `btn btn-primary flex-grow-1`, `btn btn-outline-secondary` |
| Navbar | Compacto | `btn btn-outline-light btn-sm` |
| Segmentados | `btn-group` / `.filter-bar` | `btn btn-sm` ou `btn` (ver inconsistência) |
| Fechar modal | Header | `btn-close` (Bootstrap) |
| Link como botão | `<Link className="btn ...">` | Mesmas variantes |
| Ícone-only | Calendário nav | `btn btn-sm btn-outline-secondary` (setas) |

### 3.2 Inventário por rótulo (PT) e localização

#### Ações principais (amostra representativa)

| Rótulo | Classe(s) | Componente / página |
|--------|-----------|---------------------|
| Novo serviço / cliente / funcionário / agendamento | `btn btn-primary` | `PageHeader` em Services, Clients, Employees, Appointments |
| Cadastrar primeiro … | `btn btn-primary` | Empty states (Employees, Services, Clients) |
| Ver agendamentos | `btn btn-primary` (Link) | Dashboard |
| Salvar {dia da semana} | `btn btn-sm btn-primary` | `AvailabilityDayEditor` |
| Nova exceção | `btn btn-sm btn-primary` | `AvailabilityExceptionsSection` |
| Salvar / Criar serviço / Criar … | `btn btn-primary` | `ServiceForm`, `ClientForm`, `EmployeeForm`, `CompanyForm`, `AppointmentForm` |
| Entrar / Registar / Enviar … | `btn btn-primary w-100` | Páginas auth |
| Confirmar agendamento | `btn btn-primary flex-grow-1` | Booking público |
| Ativar empresa / Suspender … | `btn btn-primary` | `CompanyPage` (estado operacional) |

#### Ações de gestão (tabelas e listas)

| Rótulo | Classe(s) | Páginas |
|--------|-----------|---------|
| Editar | `btn btn-sm btn-outline-primary` | Services, Clients, Employees, AppointmentsListView |
| Ativar / Desativar | `btn btn-sm btn-outline-success` ou `btn-outline-secondary` | Services, Employees |
| Excluir | `btn btn-sm btn-outline-danger` | Services, Clients, Employees, AppointmentsListView, exceções |
| Convidar | `btn btn-sm btn-outline-primary` | Clients |
| Aguarde… | Mesmas classes (disabled) | Services (toggle) |

#### Ações secundárias

| Rótulo | Classe(s) | Contexto |
|--------|-----------|----------|
| Cancelar | `btn btn-secondary` | Modais de formulário |
| Voltar | `btn btn-outline-secondary` | Booking, PublicAppointmentEditForm |
| Tentar novamente | `btn btn-outline-danger btn-sm` | `ErrorState`, exceções (load error) |
| Limpar filtros | `btn btn-sm btn-outline-secondary` | `AppointmentScheduleFilters` |
| Copiar link / Abrir link | `btn btn-outline-primary` / `btn-outline-secondary` | `CompanyPage` (`input-group`) |
| Fechar | `btn-close` | Modais |

#### Navegação e contexto

| Rótulo | Classe(s) | Contexto |
|--------|-----------|----------|
| Logout | `btn btn-outline-light btn-sm` | Navbar |
| Abrir menu | `btn btn-outline-light btn-sm` | Navbar (mobile) |
| Notificações | `btn btn-outline-light btn-sm` | NotificationBell |
| Marcar todas como lidas | `btn btn-link btn-sm p-0` | NotificationBell (menu) |
| Filtros portal / relatório | `btn btn-sm` + primary/outline | PortalAppointmentsPage, ReportsPage |
| Mês / Semana / Dia / Lista | `btn` ou `btn-primary` / `btn-outline-primary` | AppointmentsViewSwitcher |
| Hoje / ‹ / › | `btn btn-sm btn-outline-*` | AppointmentsViewSwitcher |
| Slots de horário | `btn btn-sm btn-outline-primary` / `btn-primary` | AvailableTimeSlots |
| Ir para início | `btn btn-primary` (Link) | NotFoundPage |

#### Modais de eliminação (todos via `DestructiveConfirmModal`)

`DeleteServiceModal`, `DeleteClientModal`, `DeleteEmployeeModal`, `DeleteAppointmentModal`, `DeleteAvailabilityDayModal`, `DeleteAvailabilityExceptionModal` — confirmar com `btn btn-danger`, cancelar `btn btn-secondary` (ou variant configurável).

---

## 4. Classificação por finalidade

| Categoria | Descrição | Quantidade aprox. de contextos |
|-----------|-----------|-------------------------------|
| **A — Principais** | Criar, salvar, submeter, CTAs de página | ~15 padrões distintos de rótulo |
| **B — Gestão** | Editar, ativar/desativar, excluir, convidar | 4–5 rótulos × 4 tabelas/listas |
| **C — Secundárias** | Cancelar, voltar, retry, limpar, copiar | ~10 contextos |
| **D — Navegação/contexto** | Logout, menu, notificações, links portal | ~8 contextos |
| **E — Controles segmentados** (extensão útil) | `btn-group`, filter-bar, toolbar calendário, toggles de vista | Reports, Portal, Appointments, calendário mensal |

Não foi identificada outra família que exija categoria separada além de **E** (controles que se comportam como botões mas funcionam como filtro/segmentação).

---

## 5. Ficheiros responsáveis pelos estilos

### 5.1 Bootstrap base

Import: [`client/src/main.tsx`](../../client/src/main.tsx) — `bootstrap/dist/css/bootstrap.min.css`.

Fornece variantes `btn-outline-*`, `btn-group`, `btn-close`, estados disabled, etc. O projecto **não** sobrescreve larguras por variante outline.

### 5.2 [`client/src/index.css`](../../client/src/index.css)

| Secção / selector | Efeito em botões |
|-------------------|------------------|
| L37–46 | `button`, `.btn` — `min-height: 2.5rem` |
| L48–52 | `.btn` — `border-radius: 0.6rem`, `font-weight: 600`, `padding-inline: 1rem` |
| L53–56 | `.btn-sm` — `min-height: 2.25rem`, `padding-inline: 0.75rem` |
| L57–65 | `.btn-primary` — cores `--sp-primary` |
| L137–144 | `.table-actions` — flex wrap, gap 0.5rem; filhos `flex: 0 0 auto` (**largura = conteúdo**) |
| L180–190 | `.modal.show .modal-footer` — gap uniforme |
| L218–226 | `.page-actions` — flex; filhos com `overflow-wrap: anywhere` |
| L229–242 | `.filter-bar .btn-group .btn` — `white-space: nowrap`, `flex-shrink: 0` |
| L486–491 | `.app-navbar .navbar-actions > .btn` — inline-flex, alinhamento (pós-correcção header) |
| L794–805 | `.availability-day-save .btn` — `width: auto`, `height: auto` (**largura por texto**) |
| L689–706 | `.exception-item` — layout lista timeline |
| L1077–1093 | `@media (max-width: 767.98px)` — `.page-actions` e filhos **width: 100%** |
| L1125–1130 | `@media (max-width: 767.98px)` — `.modal-footer .btn` — `flex: 1 1 8rem` |
| L1198–1205 | `@media (max-width: 575.98px)` — `.exception-item > .d-flex` — `margin-left: 4rem; width: 100%` |
| L1307–1316 | `.image-uploader-actions .btn` — flex grow no mobile |

**Ausência relevante:** não existe `min-width` global para acções de tabela ou CTAs de secção.

### 5.3 [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css)

- Células/dias como `.calendar-day.btn-*` (cores de estado).
- Toolbar: regras responsivas para `.calendar-toolbar .btn-group .btn` (L599–604).
- **Risco:** regras globais tipo `.btn-action { min-width: … }` não devem aplicar-se a `.calendar-grid .calendar-day`.

### 5.4 Estilos inline

Nenhum botão usa `style=` para dimensões. Alguns `<Link>`/contentores usam utilitários Bootstrap (`w-100`, `flex-grow-1`, `p-0` no `btn-link` do NotificationBell).

---

## 6. Inconsistências identificadas

Legenda: **Confirmado** = código e/ou CSS e prints; **Hipótese** = requer validação visual no browser.

| ID | Problema | Estado | Ficheiro / classe |
|----|----------|--------|-------------------|
| I1 | Largura «Salvar Segunda-feira» ≠ «Salvar Sábado» | **Confirmado** | [`AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx) (`Salvar ${label}`); CSS L801–805 `width: auto` |
| I2 | «Nova exceção» permanece `btn-sm` compacto no mobile | **Confirmado** | [`AvailabilityExceptionsSection.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.tsx) L101–107; regra full-width só em `.page-actions` (L1087–1092), não no header do card |
| I3 | «Editar» / «Excluir» exceções desalinhados no mobile | **Confirmado (CSS)** | [`index.css`](../../client/src/index.css) L1198–1205; markup L166–184 em `AvailabilityExceptionsSection` |
| I4 | Coluna Ações: «Editar» &lt; «Desativar» &lt; «Ativar» em largura | **Confirmado** | `.table-actions` L137–144; [`ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx) L241–279; equivalente Clients/Employees/ListView |
| I5 | CTAs principais: página usa `btn-primary`, disponibilidade usa `btn-sm btn-primary` | **Confirmado** | `PageHeader` vs `AvailabilityDayEditor` / `AvailabilityExceptionsSection` |
| I6 | View switcher: navegação `btn-sm`, grupo Mês–Lista usa `btn` sem `sm` | **Confirmado** | [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) L33–76 |
| I7 | Portal home: mistura `btn-sm` e `btn` no mesmo cartão | **Confirmado** | [`PortalHomePage.tsx`](../../client/src/pages/portal/PortalHomePage.tsx) |
| I8 | Empty state CTA com textos muito longos («Cadastrar primeiro funcionário») vs CTAs curtos no header | **Confirmado** | Larguras diferentes por copy, mesma classe `btn btn-primary` |
| I9 | «Convidar» mais largo que «Editar» na mesma linha | **Confirmado** | [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx) |
| I10 | Tabelas em mobile: scroll horizontal (`min-width: 680px`) antes de ver acções | **Confirmado (comportamento)** | [`index.css`](../../client/src/index.css) L1104–1106 — intencional para colunas |
| I11 | Touch target das setas ‹ › do calendário | **Hipótese** | Ícones unicode em `btn-sm`; min-height 2.25rem pode ser aceitável — validar WCAG 2.5.5 |
| I12 | Alinhamento vertical entre linhas de `.table-actions` após wrap | **Hipótese** | Flex wrap sem grid — colunas não alinham entre rows |
| I13 | `input-group` em CompanyPage: botões «Copiar»/«Abrir» com larguras distintas | **Confirmado** | [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) L242–256 |

---

## 7. Problemas de responsividade

### Desktop (≥992px)

- Disponibilidade: grelha por dia; botão Salvar alinhado à direita (`justify-content-end`) com largura variável (I1).
- Tabelas: acções em linha; desalinhamento vertical **entre** botões da mesma célula é baixo, mas **entre linhas** da coluna Ações fica irregular (I4).

### Tablet (768px–991px)

- `PageHeader` mantém flex row até 767.98px; CTAs de página ainda não full-width.
- Tabelas: frequentemente dentro de `.table-responsive` com scroll.

### Mobile (≤767.98px)

- **Benefício:** CTAs em `PageHeader` → largura 100% (`.page-actions`).
- **Gap:** CTAs inside cards (Nova exceção, Salvar dia) **não** entram em `.page-actions` (I2).
- Modais: footer com botões `flex: 1 1 8rem` — boa distribuição tátil.
- Exceções: wrap + `margin-left: 4rem` empurra acções (I3).
- Image uploader: botões expandem (`flex: 1 1 auto`) — padrão positivo a replicar em secções similares.

### Mobile estreito (≤575.98px)

- Navbar oculta `.user-summary`; Logout e sino permanecem compactos (`btn-sm`).
- `.exception-item` regras adicionais (I3).

---

## 8. Exemplos concretos de dimensões diferentes

1. **Salvar dia:** `Salvar Segunda-feira` vs `Salvar Sábado` — mesma classe `btn btn-sm btn-primary`, larguras proporcionais ao comprimento do `label` ([`AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx) L183).
2. **Serviços (print utilizador):** na mesma coluna, «Desativar» mais largo que «Editar»; linha com serviço inactivo mostra «Ativar» mais estreito que «Desativar» noutras linhas — efeito «zigzag» na coluna Excluir ([`ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx)).
3. **Clientes:** três acções possíveis (Editar, Convidar, Excluir) — «Convidar» define largura intermédia distinta de «Editar».
4. **CTA principal:** «Novo serviço» (header, ~12 caracteres) vs «Cadastrar primeiro funcionário» (empty state, ~28 caracteres) — ambos `btn btn-primary`, altura igual (`min-height 2.5rem`), largura distinta.
5. **Toolbar agendamentos:** botões «Hoje» (`btn-sm`) vs «Mês» (`btn` default height 2.5rem) no mesmo toolbar — alturas potencialmente diferentes no mesmo eixo ([`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx)).

---

## 9. Componentes e estilos partilhados

| Artefacto | Papel |
|-----------|--------|
| [`PageHeader`](../../client/src/components/common/PageHeader.tsx) + `.page-actions` | Único wrapper standard para CTAs de página + responsivo mobile |
| `.table-actions` | Contrato visual das acções em tabelas (4 páginas/listas) |
| [`DestructiveConfirmModal`](../../client/src/components/common/DestructiveConfirmModal.tsx) | Padrão destrutivo sólido (`btn-danger`) vs inline outline-danger |
| Formulários `*Form.tsx` | Padrão modal-footer: secondary + primary (tamanho default `.btn`) |
| [`ErrorState`](../../client/src/components/common/ErrorState.tsx) | Retry compacto `btn-sm` |
| [`ImageUploader`](../../client/src/components/common/ImageUploader.tsx) | Acções `btn-sm` + CSS mobile dedicado |
| Tokens `:root` + `.btn` / `.btn-sm` | Altura e padding horizontal globais |
| `.filter-bar` | Segmentação com nowrap — referência para outros toggles |

Não existe camada React reutilizável; a consistência depende de **convenção de classes** e de **selectores de contexto** em CSS.

---

## 10. Proposta de padronização global

Objectivo: uniformizar **métricas** e **comportamento responsivo** sem forçar a mesma largura em todos os botões do produto.

### 10.1 Tokens CSS (extensão de `:root`)

Sugestão de variáveis explícitas (valores actuais já implícitos):

```css
--sp-btn-min-height: 2.5rem;
--sp-btn-sm-min-height: 2.25rem;
--sp-btn-padding-x: 1rem;
--sp-btn-sm-padding-x: 0.75rem;
--sp-btn-action-min-width: 6rem; /* calibrar para «Desativar» em PT */
--sp-btn-action-gap: 0.5rem;
```

### 10.2 Classes utilitárias por contexto (sem novo componente React na fase 1)

| Classe proposta | Aplicação | Comportamento |
|-----------------|-----------|---------------|
| `.table-actions .btn-sm` ou `.btn-action` | Editar, Ativar, Desativar, Excluir, Convidar | `min-width: var(--sp-btn-action-min-width)`; `white-space: nowrap` onde couber |
| `.section-actions` | Header de card (Nova exceção) | Espelhar `@767` de `.page-actions`: stack + full width opcional |
| `.availability-day-save .btn` | Salvar dia | `min-width` fixo (ex. 11rem) **ou** label curto no mobile («Salvar») — decisão de produto |
| Manter exclusão | `.calendar-grid .calendar-day` | Não aplicar `.btn-action` global |

### 10.3 Regras de uso (convenção)

1. **CTA de página:** sempre `btn btn-primary` dentro de [`PageHeader`](../../client/src/components/common/PageHeader.tsx) / `.page-actions`.
2. **CTA in-card equivalente a «Novo …»:** preferir `btn btn-primary` (não `btn-sm`) **ou** envolver em `.section-actions` com as mesmas regras mobile que `.page-actions`.
3. **Acções repetíveis em tabela/lista:** sempre `btn btn-sm` + outline semântico + **largura mínima partilhada**.
4. **Destrutivo:** outline-danger inline; `btn-danger` sólido apenas em confirmação modal (já adoptado).
5. **Segmentados:** unificar tamanho — ou tudo `btn-sm` dentro de `btn-group-sm`, ou tudo `btn` default; evitar mistura no mesmo toolbar ([`AppointmentsViewSwitcher`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx), [`PortalHomePage`](../../client/src/pages/portal/PortalHomePage.tsx)).
6. **Auth:** manter `w-100` — padrão correcto para mobile.

### 10.4 Responsivo

- Estender padrão `.page-actions` a `.section-actions` em `@media (max-width: 767.98px)`.
- Reescrever `.exception-item > .d-flex` (L1202–1205): preferir `flex-basis: 100%`, `justify-content: flex-end`, **sem** `margin-left: 4rem` fixo; alinhar com timeline via grid ou `align-self: stretch`.

### 10.5 Compatibilidade Bootstrap

Manter variantes Bootstrap; customização via tokens e selectores de contexto (`.table-actions`, `.section-actions`) evita fork de componentes e preserva `btn-group`, `disabled`, spinners.

---

## 11. Riscos de regressão

| Risco | Mitigação |
|-------|-----------|
| `min-width` em acções aumenta largura mínima da tabela / scroll horizontal | Calibrar `--sp-btn-action-min-width`; testar Clients com «Convidar» |
| Full-width CTAs in-card quebram headers `justify-content-between` com títulos longos | Stack vertical do header no mobile (flex-wrap + `flex-basis: 100%` no título ou no botão) |
| Regras globais `.btn` afectam células de calendário | Escopar selectores; excluir `.calendar-day` |
| Testes que assertam classes | [`ServicesPage.test.tsx`](../../client/src/pages/services/ServicesPage.test.tsx), [`ClientsPage.test.tsx`](../../client/src/pages/clients/ClientsPage.test.tsx), [`AppointmentsPage.test.tsx`](../../client/src/pages/appointments/AppointmentsPage.test.tsx), [`AppointmentsViewSwitcher.test.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.test.tsx) — alterações CSS puras não devem quebrar; mudanças de classe sim |
| Tradução futura (rótulos mais longos) | `min-width` + nowrap pode forçar overflow — preferir min-width moderado ou grid de acções |
| Regressão Header/Salvar altura | Não alterar blocos corrigidos em [`schedulerpro-header-availability-layout-fix.md`](./schedulerpro-header-availability-layout-fix.md) sem teste visual dedicado |

---

## 12. Plano recomendado de implementação por etapas

| Etapa | Objectivo | Ficheiros prováveis | Esforço |
|-------|-----------|---------------------|---------|
| **1** | Tokens + `min-width` em `.table-actions` | [`index.css`](../../client/src/index.css) | Baixo |
| **2** | `.section-actions` + Nova exceção (CSS e/ou markup mínimo) | `index.css`, [`AvailabilityExceptionsSection.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.tsx) | Baixo |
| **3** | Layout mobile exceções (remover `margin-left: 4rem`) | `index.css` | Baixo |
| **4** | Salvar dia — `min-width` ou copy responsiva | `index.css`, opcional `AvailabilityDayEditor.tsx` | Médio |
| **5** | Harmonizar `btn` vs `btn-sm` em toolbars | `AppointmentsViewSwitcher.tsx`, `PortalHomePage.tsx`, `ReportsPage.tsx` | Médio |
| **6** | Revisão `input-group` Company (opcional min-width simétrico) | `CompanyPage.tsx` / CSS | Baixo |
| **7** | Validação manual + `npm test` + `npm run build` | — | Obrigatório |

Implementação **fora do âmbito** desta auditoria; aguardar aprovação da proposta.

---

## 13. Testes que deverão ser realizados posteriormente

### Automatizados

- Suite completa client: `npm test -- --run` (regressão funcional).
- `npm run build` (TypeScript + bundle).
- Testes que referem `table-actions` ou classes `btn-*`: Services, Clients, Appointments, ViewSwitcher — reexecutar após mudanças de markup.

### Checklist manual (breakpoints 575 / 768 / 992)

- [ ] Disponibilidade — Salvar todos os dias; Nova exceção; lista exceções Editar/Excluir
- [ ] Serviços / Clientes / Funcionários — coluna Ações alinhada verticalmente entre linhas
- [ ] Agendamentos — toolbar Mês/Semana/Dia/Lista + lista de agendamentos
- [ ] Modais criar/editar/excluir — footer responsivo
- [ ] Navbar — Logout, sino, menu hamburger
- [ ] Portal e booking público — CTAs primary + voltar
- [ ] Empresa — Copiar/Abrir link

### Visual / E2E

- **Playwright / Cypress:** não encontrada infraestrutura no repositório (pesquisa por `playwright*` vazia). Regressão visual permanece manual ou futura adopção de tooling.

---

## Anexo A — Lista agregada de ficheiros TSX com botões

`AppLayout.tsx`, `AppointmentCalendar.tsx`, `AppointmentCalendarItem.tsx`, `AppointmentForm.tsx`, `AppointmentQuickDetails.tsx`, `AppointmentScheduleFilters.tsx`, `AppointmentsListView.tsx`, `AppointmentsViewSwitcher.tsx`, `AvailableTimeSlots.tsx`, `AvailabilityDayEditor.tsx`, `AvailabilityExceptionFormModal.tsx`, `AvailabilityExceptionsSection.tsx`, `BookingClientDetailsForm.tsx`, `BookingConfirmation.tsx`, `BookingReview.tsx`, `ChangePasswordPage.tsx`, `ClientForm.tsx`, `ClientsPage.tsx`, `CompanyForm.tsx`, `CompanyPage.tsx`, `DashboardPage.tsx`, `DestructiveConfirmModal.tsx`, `EmployeeForm.tsx`, `EmployeesPage.tsx`, `ErrorState.tsx`, `ForgotPasswordPage.tsx`, `ImageUploader.tsx`, `LoginPage.tsx`, `MonthDayAgendaList.tsx`, `Navbar.tsx`, `NotFoundPage.tsx`, `NotificationBell.tsx`, `PortalAppointmentsPage.tsx`, `PortalHomePage.tsx`, `PublicAppointmentEditForm.tsx`, `PublicAppointmentPage.tsx`, `PublicBookingPage.tsx`, `ClientInvitePage.tsx`, `RegisterPage.tsx`, `ReportsPage.tsx`, `ResetPasswordPage.tsx`, `SendClientInviteModal.tsx`, `ServiceForm.tsx`, `ServicesPage.tsx`, `StaffCompanySuspendedView.tsx`, `VerifyEmailPage.tsx`, `AppointmentsPage.tsx`.

Modais Delete* delegam botões a `DestructiveConfirmModal` (sem classes próprias adicionais além do wrapper).

---

## Anexo B — Referência cruzada com correcção anterior

| Item | Estado após correcção header/disponibilidade |
|------|---------------------------------------------|
| Altura «Salvar {dia}» | Corrigido |
| Alinhamento Header (avatar, nome, logout) | Corrigido |
| Largura «Salvar {dia}» | **Pendente** (I1) |
| Nova exceção mobile | **Pendente** (I2) |
| Exceções Editar mobile | **Pendente** (I3) |
| Tabelas Ações | **Pendente** (I4) |

---

*Fim do relatório — auditoria READ-ONLY; nenhum ficheiro de código foi modificado.*
