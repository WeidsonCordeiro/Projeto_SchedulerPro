# SchedulerPro — Etapa 6.4: Auditoria UX mobile e padronização dos modais

**Data da auditoria:** 03/11/2026  
**Tipo:** Análise READ-ONLY (sem alterações de código, testes, dependências, Git ou branches)  
**Branch de referência:** `feature/appointments-mobile-calendar-step-6` (inclui Etapa 6.2 — agendas mobile Semana/Dia)

**Relacionado:**

- [`schedulerpro-mobile-calendar-step-6-audit.md`](schedulerpro-mobile-calendar-step-6-audit.md) (6.1)
- [`schedulerpro-mobile-calendar-step-6-implementation.md`](schedulerpro-mobile-calendar-step-6-implementation.md) (6.2)
- [`schedulerpro-mobile-calendar-step-6-diagnostic.md`](schedulerpro-mobile-calendar-step-6-diagnostic.md) (6.3 — calendário mobile validado; **não reabrir** nesta etapa)
- [`schedulerpro-company-page-step-4-audit.md`](schedulerpro-company-page-step-4-audit.md) (Empresa — estrutura e `CompanyForm`)

**Implementação de correções:** **Não autorizada** nesta etapa. Este documento destina-se a permitir implementação posterior sem repetir investigação.

Legenda: **Confirmado (código)** = dedutível do repositório; **Hipótese** = requer validação visual, DevTools ou teste manual nos viewports indicados.

---

## 1. Diagnóstico por área e página

### 1.1 Agendamentos — calendário (Mês, Semana, Dia)

| Aspecto | Estado actual | Severidade UX (mobile / desktop) |
|---------|---------------|----------------------------------|
| Clique num agendamento — **Mês** | Abre [`AppointmentForm`](../../client/src/components/appointments/AppointmentForm.tsx) (modal Bootstrap `modal-lg`): edição se futuro, só leitura se passado (`isInstantInPast`) | Consistente em todas as larguras |
| Clique — **Semana/Dia mobile** (≤767.98px) | Agenda vertical (`WeekMobileAgenda` / `DayMobileAgenda`) → **mesmo** fluxo que o mês (`handleCalendarAppointmentClick` → `AppointmentForm`) | **Confirmado** alinhado ao mês |
| Clique — **Semana/Dia desktop/tablet grelha** (≥768px) | Grelha → `openQuickDetails` → [`AppointmentQuickDetails`](../../client/src/components/appointments/AppointmentQuickDetails.tsx) (popover fixo ou painel modal se `isMobilePanel`; ver §3) | **Inconsistente** com mês: só consulta, sem editar / estados / excluir |
| Requisito de produto (Etapa 6.4) | «Mesmo modal que o mês» em Semana e Dia | **Gap principal:** viewport ≥768px nas vistas Semana/Dia |

**Nota terminológica:** No código, o «modal» do mês **não** é `AppointmentQuickDetails`; é **`AppointmentForm`**. O popover de detalhes rápidos foi desenhado para grelha Semana/Dia (comentário CSS «Stage 51.2»). A padronização pedida implica alinhar Semana/Dia (pelo menos desktop grelha) ao fluxo `AppointmentForm`, ou fundir UX num único componente com paridade de acções — sem alterar regras de negócio já existentes em `openEdit` / `openDetails` / permissões.

**Fora de âmbito:** layout da grelha/agenda mobile Semana/Dia (Etapa 6.2/6.3 — utilizador reportou resolvido).

### 1.2 Agendamentos — vista Lista

| Aspecto | Diagnóstico |
|---------|-------------|
| Componente | [`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx) |
| Layout mobile | Tabela dentro de `table-responsive` com **8 colunas** possíveis (Data, Hora, Cliente, Serviço, Funcionário, Status, Observações, Ações) |
| Scroll horizontal | **Confirmado** intencional via CSS global `min-width: 680px` em viewports ≤767.98px |
| Acções | Até vários botões por linha (`Visualizar`/`Editar`, acções de estado, `Excluir`) com `min-width` global em `.table-actions .btn` |
| Alternativa mobile | Não existe vista em cards; calendário mobile já usa [`AppointmentCalendarItem`](../../client/src/components/appointments/AppointmentCalendarItem.tsx) como referência visual |

### 1.3 Empresa (`/company`)

| Aspecto | Diagnóstico |
|---------|-------------|
| Estrutura | [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx): cards «Informações» + «Estado operacional»; formulário em [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) quando `canEditProfile` |
| Timezone | `<select class="form-select">` nativo, lista completa IANA (~418 entradas via `getIanaTimezones()`) |
| Mobile | Mesmas regras `@media (max-width: 767.98px)` que resto da app (`page-header` coluna, modais com padding); **sem** CSS específico para o dropdown de timezone |
| Problema reportado (screenshot) | Lista de fusos «vertical desproporcional» ao abrir seletor — **Hipótese:** comportamento do picker nativo do browser/SO com centenas de `<option>`, não um dropdown customizado com altura CSS fixa |

### 1.4 Sidebar mobile (todas as páginas autenticadas)

| Aspecto | Diagnóstico |
|---------|-------------|
| Comportamento | Drawer fixo abaixo da navbar; backdrop; fecha com botão, backdrop (se implementado no JSX), Escape, ou navegação (`onNavigate`) |
| Largura | `min(260px, 82vw)` em ≤991.98px vs **280px** fixo em desktop |
| Conteúdo | Contexto empresa + 3 grupos de menu ([`Sidebar.tsx`](../../client/src/components/layout/Sidebar.tsx)) |
| Espaço útil | Links com `margin-left: 2rem` reduzem largura útil para rótulos longos |
| Viewports 360–767 | Drawer ocupa até ~82% da largura (ex.: ~295px em 360px) — pode parecer «pesado» face ao conteúdo principal ainda visível no restante 18% |

### 1.5 Clientes (`/clients`)

| Aspecto | Diagnóstico |
|---------|-------------|
| Tabela | 5 colunas: Cliente (avatar + nome), Email (`text-nowrap`), Telefone, Status, Ações |
| Mobile | Mesmo padrão `table-card` + scroll horizontal (680px mín.) |
| Acções | Editar, Convidar (condicional), Excluir — densidade moderada |

### 1.6 Serviços (`/services`)

| Aspecto | Diagnóstico |
|---------|-------------|
| Tabela | Serviço (+ descrição em `table-subline`), Duração, Preço, Status, Ações |
| Mobile | Scroll horizontal; descrições longas em sublinha podem aumentar altura de linha |
| Acções | Editar, Ativar/Desativar, Excluir |

### 1.7 Funcionários (`/employees`)

| Aspecto | Diagnóstico |
|---------|-------------|
| Tabela | 6 colunas: Funcionário (`person-cell`), E-mail, Perfil, Status, Adicionado em, Ações |
| Mobile | Maior número de colunas + múltiplas acções (editar, desactivar, etc.) → compressão e scroll |
| Diferencial | `person-cell` + badges — boa legibilidade **se** houver largura; em 680px mín. ainda exige pan horizontal |

---

## 2. Componentes e ficheiros envolvidos

### 2.1 Agendamentos — modais e calendário

| Ficheiro | Papel |
|----------|--------|
| [`client/src/pages/appointments/AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | `handleCalendarAppointmentClick`, `openQuickDetails`, `openEdit`, `openDetails`, render `AppointmentForm` + `AppointmentQuickDetails` |
| [`client/src/components/appointments/CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) | Reparte `onAppointmentClick` vs `onTimeGridAppointmentClick`; props `month.*` e `timeGrid.*` |
| [`client/src/components/appointments/MonthView.tsx`](../../client/src/components/appointments/MonthView.tsx) | Mês: grelha + `MonthDayAgendaList` se mobile |
| [`client/src/components/appointments/MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx) | Clique chip → `onAppointmentClick` |
| [`client/src/components/appointments/MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx) | Lista dia mobile → `onAppointmentClick` |
| [`client/src/components/appointments/WeekView.tsx`](../../client/src/components/appointments/WeekView.tsx) | Mobile → `WeekMobileAgenda`; desktop → `WeekCalendar` + bifurcação quick details |
| [`client/src/components/appointments/DayView.tsx`](../../client/src/components/appointments/DayView.tsx) | Idem para dia |
| [`client/src/components/appointments/WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx) | Eventos → `(appointment, anchor)` |
| [`client/src/components/appointments/DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx) | Idem |
| [`client/src/components/appointments/WeekMobileAgenda.tsx`](../../client/src/components/appointments/WeekMobileAgenda.tsx) | Cards → `onAppointmentClick` |
| [`client/src/components/appointments/DayMobileAgenda.tsx`](../../client/src/components/appointments/DayMobileAgenda.tsx) | Idem |
| [`client/src/components/appointments/AppointmentForm.tsx`](../../client/src/components/appointments/AppointmentForm.tsx) | Modal principal create/edit/read-only |
| [`client/src/components/appointments/AppointmentQuickDetails.tsx`](../../client/src/components/appointments/AppointmentQuickDetails.tsx) | Popover / modal só leitura |
| [`client/src/components/appointments/computePopoverPosition.ts`](../../client/src/components/appointments/computePopoverPosition.ts) | Posicionamento popover desktop |
| [`client/src/config/appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts) | `isInstantInPast` (regra passado/futuro) |
| [`client/src/hooks/useAppointmentsNavigation.ts`](../../client/src/hooks/useAppointmentsNavigation.ts) | `isMobileCalendar` |
| [`client/src/hooks/useMatchMedia.ts`](../../client/src/hooks/useMatchMedia.ts) | `MOBILE_CALENDAR_MEDIA_QUERY` = `(max-width: 767.98px)` |
| [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) | `.appointment-quick-details-*`, agendas mobile |

### 2.2 Agendamentos — lista

| Ficheiro | Papel |
|----------|--------|
| [`client/src/components/appointments/AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx) | Tabela lista |
| [`client/src/config/appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts) | Labels e acções de estado na lista |

### 2.3 Empresa

| Ficheiro | Papel |
|----------|--------|
| [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | Layout cards, link público |
| [`client/src/components/company/CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) | Select timezone |
| [`client/src/config/timezones.ts`](../../client/src/config/timezones.ts) | `getIanaTimezones`, validação Luxon |
| [`client/src/pages/RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx) | Registo — mesmo padrão `<select>` timezone |

### 2.4 Layout e listagens CRUD

| Ficheiro | Papel |
|----------|--------|
| [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) | Sidebar open/close, backdrop |
| [`client/src/components/layout/Sidebar.tsx`](../../client/src/components/layout/Sidebar.tsx) | Grupos e itens |
| [`client/src/components/layout/Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) | Toggle menu (≤lg) |
| [`client/src/index.css`](../../client/src/index.css) | `.app-sidebar*`, `.table-card`, `.table-responsive`, breakpoints mobile |
| [`client/src/pages/clients/ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx) | Tabela clientes |
| [`client/src/pages/services/ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx) | Tabela serviços |
| [`client/src/pages/employees/EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx) | Tabela funcionários |

### 2.5 Árvore de composição actual (pós–6.2)

```text
AppointmentsPage
├── AppointmentsViewSwitcher + AppointmentScheduleFilters
├── CalendarView (se não lista)
│   ├── month  → MonthView → MonthCalendar + MonthDayAgendaList (mobile)
│   ├── week   → WeekView → WeekMobileAgenda (mobile) | WeekCalendar (≥768)
│   └── day    → DayView   → DayMobileAgenda (mobile) | DayCalendar (≥768)
├── AppointmentsListView (viewType === list)
├── AppointmentForm (formOpen)
├── DeleteAppointmentModal
└── AppointmentQuickDetails (quickDetails state)
```

---

## 3. Causas identificadas e evidências

### 3.1 Dois fluxos de clique no calendário

**Confirmado** — [`AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx):

- `onAppointmentClick={handleCalendarAppointmentClick}` (L309)
- `onTimeGridAppointmentClick={openQuickDetails}` (L310)

`handleCalendarAppointmentClick` (L225–230):

```typescript
function handleCalendarAppointmentClick(appointment: Appointment) {
  if (isInstantInPast(appointment.startAt)) {
    openDetails(appointment);
  } else {
    openEdit(appointment);
  }
}
```

`openQuickDetails` (L233–240) apenas define estado `quickDetails` com `anchorRect` — **sem** abrir `AppointmentForm`.

**Confirmado** — [`WeekView.tsx`](../../client/src/components/appointments/WeekView.tsx) L63–68: na grelha, se `onTimeGridAppointmentClick` existir, **não** chama `onAppointmentClick`.

**Confirmado** — Mês: [`MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx) e [`MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx) só usam `onAppointmentClick` — **nunca** `AppointmentQuickDetails`.

**Confirmado** — `AppointmentQuickDetails` não expõe botões Editar, acções de estado ou Excluir; apenas `QuickDetailsBody` + fechar ([`AppointmentQuickDetails.tsx`](../../client/src/components/appointments/AppointmentQuickDetails.tsx)).

**Nota** — `isMobilePanel={isMobileCalendar}` (AppointmentsPage ~L449): o layout modal Bootstrap de quick details só aparece quando `quickDetails` está activo **e** viewport ≤767.98px. Com Etapa 6.2, Semana/Dia mobile **não** montam grelha, logo **`openQuickDetails` não é disparado em mobile** nas vistas Semana/Dia. O ramo `isMobilePanel` fica **latente** para essas vistas (possível limpeza futura).

### 3.2 Timezone — select nativo longo

**Confirmado** — [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) L159–169: `<select>` sem `size`, sem componente de pesquisa.

**Confirmado** — [`timezones.ts`](../../client/src/config/timezones.ts): `Intl.supportedValuesOf("timeZone")` devolve lista completa (comentário: ~418 em Node moderno).

**Confirmado** — [`index.css`](../../client/src/index.css) L79–84: `.form-select { min-height: 2.75rem }` — afecta altura do **campo fechado**, não a lista aberta.

**Hipótese** — Em mobile, Chrome/Safari/Firefox abrem UI nativa (sheet ou lista fullscreen) que ocupa grande parte do ecrã; em desktop estreito (~767px), alguns browsers desenham lista drop-down longa sem `max-height` aplicável a `<select>` nativo.

### 3.3 Sidebar — largura e indentação

**Confirmado** — [`index.css`](../../client/src/index.css) L1103–1114:

```css
@media (max-width: 991.98px) {
  .app-sidebar {
    width: min(260px, 82vw);
    transform: translateX(-100%);
    /* ... */
  }
}
```

**Confirmado** — L476–485: `.app-sidebar .nav-link { margin-left: 2rem; ... }` em **todos** os breakpoints.

**Confirmado** — [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx): cabeçalho «Menu» + `btn-close` com `d-lg-none`; scroll em `.app-sidebar-scroll`.

| Viewport | Largura drawer (aprox.) | Conteúdo principal visível (drawer aberto) |
|----------|---------------------------|-----------------------------------------------|
| 360px | min(260, 295) → **260px** | ~100px + backdrop |
| 390px | **260px** | ~130px |
| 420px | **260px** | ~160px |
| 767px | **260px** | ~507px |
| 768–991 | **260px** | restante área (tablet) |

Em 360px, 260/360 ≈ **72%** da largura — coerente com queixa de menu «grande».

### 3.4 Tabelas — `min-width: 680px`

**Confirmado** — [`index.css`](../../client/src/index.css) L1286–1291:

```css
@media (max-width: 767.98px) {
  .table-responsive .table {
    min-width: 680px;
  }
}
```

Comentário no CSS (L134–136): intencional manter scroll **dentro** do contentor, não na página.

**Confirmado** — `.table-compact` (relatórios) usa `min-width: 0` (L1300–1301); páginas Clientes/Serviços/Funcionários/Agendamentos lista **não** usam essa classe.

**Confirmado** — `.table-actions .btn { min-width: var(--sp-btn-action-min-width) }` (6.75rem) — agrava largura da coluna Ações em Agendamentos.

### 3.5 Breakpoints cruzados

| Query | Fonte | Efeito UX relevante |
|-------|--------|---------------------|
| `max-width: 575.98px` | `index.css` | Navbar mais baixa; oculta `user-summary` |
| `max-width: 767.98px` | `index.css`, `MOBILE_CALENDAR_MEDIA_QUERY` | Header coluna; tabelas 680px; modais padding; calendário mobile |
| `min-width: 768px` | `appointments-calendar.css` | Grelha Semana/Dia (quick details activos) |
| `max-width: 991.98px` | `index.css` | Sidebar drawer; painel notificações |
| `min-width: 992px` | Bootstrap `lg`, time grid desktop | Sidebar inline 280px |

**Confirmado** — Calendário mobile e regra de tabela mobile partilham **767.98px**. Sidebar drawer usa **991.98px** — tablet 768–991 vê drawer **e** grelha calendário com popover quick details.

---

## 4. Problemas confirmados e hipóteses

| ID | Problema | Tipo | Notas |
|----|----------|------|-------|
| P1 | Semana/Dia **≥768px**: clique abre quick details, não `AppointmentForm` | **Confirmado** | Contradiz requisito «mesmo modal que Mês» |
| P2 | Quick details **sem** acções de gestão (editar, estado, excluir) | **Confirmado** | Lista e mês/form oferecem mais capacidade |
| P3 | Vista Lista Agendamentos: muitas colunas + scroll horizontal | **Confirmado** | CSS 680px + coluna Observações + Ações |
| P4 | Clientes / Serviços / Funcionários: scroll horizontal mobile | **Confirmado** | Mesmo CSS global |
| P5 | Timezone: experiência de selecção pesada em mobile | **Hipótese** (forte) | Lista IANA nativa; validar por browser |
| P6 | Sidebar ocupa largura elevada em telemóveis estreitos | **Confirmado** (métrica) | 260px + indentação links; conforto = **Hipótese** subjetiva |
| P7 | `AppointmentQuickDetails` mobile panel pouco usado pós-6.2 | **Confirmado** | Sem grelha mobile → sem `openQuickDetails` |
| H1 | Screenshot timezone = picker OS, não bug CSS | **Hipótese** | Sem `size` no markup |
| H2 | Textos partidos na lista = `table-layout` auto + colunas estreitas | **Hipótese** | Reforçada por P3 |

**Não problemas (registo):**

- Semana/Dia **mobile** já alinhados ao mês para clique (`AppointmentForm`).
- Calendário mobile Semana/Dia (layout agenda) — **fora de âmbito** 6.4.

---

## 5. Componentes reutilizáveis

| Componente / padrão | Onde já existe | Reutilização sugerida |
|---------------------|----------------|------------------------|
| `AppointmentForm` | Mês, mobile Semana/Dia, lista, create toolbar | **Destino** da padronização de clique calendário |
| `AppointmentQuickDetails` | Só Semana/Dia grelha | Depreciar **ou** fundir corpo com form/modal único |
| `AppointmentCalendarItem` | Mês mobile, Week/Day mobile agenda | Modelo visual para **cards** na vista Lista |
| `DeleteAppointmentModal` | Página agendamentos | Manter; acionado a partir do form/lista |
| `DestructiveConfirmModal` | Empresa, outros | Padrão modal confirmação |
| `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState` | Todas as páginas | Manter |
| `DashboardCard` | Dashboard | Inspiração para cards empilhados (não tabela) |
| `ImageAvatar` + `person-cell` | Clientes, Funcionários | Cards mobile com avatar |
| `table-subline`, `table-actions` | Várias tabelas | Manter em desktop; ocultar/reorganizar em mobile |
| Novo (futuro) `ResponsiveDataList` ou `@media` split table/cards | — | Evitar duplicar 4 páginas sem abstração mínima |

**Permissões (não duplicar lógica):** [`appointmentPermissions.ts`](../../client/src/config/appointmentPermissions.ts), [`clientPermissions.ts`](../../client/src/config/clientPermissions.ts), etc. — qualquer UI mobile deve **chamar os mesmos handlers** já passados às páginas.

---

## 6. Recomendações específicas por página

### 6.1 Agendamentos — calendário (padronização modal)

1. **Opção recomendada (menor surpresa vs mês):** Remover uso de `onTimeGridAppointmentClick` para consulta isolada; encaminhar **todos** os cliques em eventos (Mês, Semana, Dia, todas as larguras) para `handleCalendarAppointmentClick`.
2. **Alternativa:** Manter popover desktop como **preview** opcional (clique secundário / ícone «i») — **não** cumpre literalmente «mesmo modal»; só considerar se produto aceitar.
3. Fechar `quickDetails` ao mudar vista/período (já parcialmente tratado quando appointment deixa de ser visível — L140–144 AppointmentsPage).
4. Actualizar testes [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx) que expectam `onTimeGridAppointmentClick` sem `onAppointmentClick`.

**Preservar:** `isInstantInPast` → read-only vs edit; permissões `canUpdate` dentro do form; sem alterar API.

### 6.2 Agendamentos — vista Lista

1. Em ≤767.98px, renderizar **lista de cards** (reutilizar estilo `AppointmentCalendarItem` + secção acções compacta ou menu «⋯»).
2. Campos prioritários no card: data/hora, cliente, serviço (swatch), estado; funcionário e observações secundários (expandir ou segunda linha).
3. Acções: espelhar botões actuais; agrupar estados num `<select>` ou dropdown Bootstrap se excesso de botões.
4. Desktop: **manter** tabela actual.

**Alternativa de menor esforço:** Ocultar colunas Observações e Funcionário em `<th>`/`<td>` via CSS + `data-label` — ainda pode exigir scroll por Ações; cards são preferíveis.

### 6.3 Empresa

1. Substituir `<select>` de timezone por **combobox com pesquisa** (modal full-screen em mobile ou bottom sheet): filtrar por substring; mostrar valor actual; lista completa preservada.
2. Implementação **partilhada** com [`RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx).
3. Manter validação `isValidIanaTimezone` e opção legacy (`CompanyForm` já injecta timezone actual se ausente da lista).
4. **Sem** reduzir lista de fusos.

### 6.4 Sidebar

1. Reduzir largura mobile para `min(240px, 78vw)` ou similar — validar 360px.
2. Reduzir `margin-left` dos `.nav-link` em drawer (ex.: `0.75rem` só em `@media max-width 991.98px`).
3. Backdrop clicável já implementado ([`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) L94–101, `data-testid="sidebar-backdrop"`); manter ao ajustar larguras.
4. Manter scroll interno e fecho ao navegar.

### 6.5 Clientes

1. Card mobile: avatar, nome, email, telefone, badge status; acções numa fila ou menu.
2. Email: permitir quebra (`overflow-wrap`) em card; manter `text-nowrap` só em desktop se desejado.

### 6.6 Serviços

1. Card: nome, preço, duração, badge; descrição truncada com «ver mais» ou tooltip.
2. Acções Ativar/Desativar + Editar visíveis.

### 6.7 Funcionários

1. Card: `person-cell`, email, role badge, status, data (opcional footer).
2. Acções múltiplas → menu dropdown para evitar 680px só por botões.

---

## 7. Impacto esperado em desktop e tablet

| Alteração | Desktop (≥992) | Tablet (768–991) | Mobile (≤767) |
|-----------|----------------|------------------|---------------|
| 6.4a Unificar modal calendário | Semana/Dia: popover → **form modal** (mudança visível) | Idem | **Sem mudança** (já form) |
| 6.4b Timezone searchable | Melhor UX em janela estreita | Idem | Melhor selecção IANA |
| 6.4c Sidebar | **Sem alteração** (sidebar inline) | Drawer mais estreito / links | Drawer mais confortável |
| 6.4d–e Listagens cards | Tabelas **inalteradas** | Tabelas até 767; abaixo cards | Sem scroll horizontal obrigatório |
| Remover quick details | Código/CSS simplificável | — | — |

**Risco:** Utilizadores desktop habituados ao popover leve na grelha passam a modal maior — trade-off explícito a favor de consistência com Mês.

---

## 8. Proposta de implementação em sub-etapas

| Sub-etapa | Escopo | Ficheiros principais | Dependências |
|-----------|--------|----------------------|--------------|
| **6.4a** | Unificar clique agendamento → `handleCalendarAppointmentClick`; remover ou redireccionar `openQuickDetails` | `AppointmentsPage`, `WeekView`, `DayView`, `CalendarView`, testes | Nenhuma |
| **6.4a.1** | (Opcional) Remover `AppointmentQuickDetails` morto ou documentar uso futuro | `AppointmentQuickDetails*`, `appointments-calendar.css` | 6.4a |
| **6.4b** | Componente `TimezonePicker` + Empresa + Registo | `CompanyForm`, `RegisterPage`, `config/timezones.ts` | Decisão: sem nova dep vs combobox leve |
| **6.4c** | Ajustes CSS/UX sidebar drawer | `index.css`, poss. `AppLayout` | Nenhuma |
| **6.4d** | Vista Lista Agendamentos mobile em cards | `AppointmentsListView`, `index.css` | 6.4a recomendado antes (mesmos handlers) |
| **6.4e** | Cards mobile Clientes, Serviços, Funcionários | Respetivas `*Page.tsx` ou componente partilhado | Padrão definido em 6.4d |
| **6.4f** | Regressão: Vitest + checklist manual viewports | Suite completa | Todas |

Ordem sugerida: **6.4a → 6.4c → 6.4b → 6.4d → 6.4e → 6.4f** (sidebar e modal desbloqueiam QA mobile cedo; timezone independente).

---

## 9. Testes necessários e critérios de aceitação

### 9.1 Testes automatizados existentes a actualizar

| Área | Ficheiros |
|------|-----------|
| Calendário routing cliques | [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx), [`WeekView.test.tsx`](../../client/src/components/appointments/WeekView.test.tsx), [`DayView.test.tsx`](../../client/src/components/appointments/DayView.test.tsx) |
| Quick details | [`AppointmentQuickDetails.test.tsx`](../../client/src/components/appointments/AppointmentQuickDetails.test.tsx) |
| Empresa timezone | [`CompanyForm.test.tsx`](../../client/src/components/company/CompanyForm.test.tsx) |
| Tabelas | [`ClientsPage.test.tsx`](../../client/src/pages/clients/ClientsPage.test.tsx) (`.table-responsive`) |

Novos testes sugeridos (implementação):

- `AppointmentsListView`: em viewport mock ≤767, assert cards visíveis e tabela oculta (ou role/testid).
- `TimezonePicker`: filtra lista; preserva valor legacy.

### 9.2 Checklist manual (viewports 360, 390, 420, 767, 768, 1024)

**Modais agendamento (6.4a)**

- [ ] Mês: clique chip/lista → `AppointmentForm` (edit ou read-only).
- [ ] Semana desktop: clique evento grelha → **mesmo** modal que mês (não popover só leitura).
- [ ] Dia desktop: idem.
- [ ] Semana/Dia mobile: clique card → form (regressão).
- [ ] Permissões: utilizador sem `canUpdate` vê comportamento actual do form (read-only onde aplicável).

**Empresa (6.4b)**

- [ ] Abrir seletor timezone: área de lista proporcional; pesquisa encontra `Europe/Lisbon`; valor guardado correcto.
- [ ] Timezone legacy do backend continua seleccionável.

**Sidebar (6.4c)**

- [ ] 360px: drawer não oculta navegação essencial; fecha com X, backdrop, Escape, link.
- [ ] 768px: comportamento tablet drawer unchanged ou melhorado.

**Listagens (6.4d–e)**

- [ ] Agendamentos lista: informação principal legível **sem** scroll horizontal obrigatório.
- [ ] Clientes, Serviços, Funcionários: acções acessíveis; nenhuma informação crítica só em desktop sem alternativa documentada.
- [ ] Desktop 1024px: tabelas mantêm layout actual.

### 9.3 Critérios de aceitação (produto)

1. **Paridade modal:** Qualquer clique num agendamento nas vistas Mês, Semana e Dia abre a mesma experiência de consulta/gestão (`AppointmentForm` com mesmas regras passado/futuro e permissões).
2. **Listagens mobile:** Prioridade à legibilidade; scroll horizontal não é o único meio de ler cliente/serviço/data principal.
3. **Timezone:** Todos os fusos IANA disponíveis; valor seleccionado preservado; UX de selecção adequada a ecrã pequeno.
4. **Sidebar:** Todas as opções e funcionalidades preservadas; navegação mobile mais confortável (largura/indentação).
5. **Desktop:** Comportamento de tabela e sidebar inline mantido salvo melhorias explicitamente aprovadas.

---

## 10. Resumo executivo (para o utilizador)

| Tema | Conclusão |
|------|-----------|
| **Modal agendamento** | O mês usa **`AppointmentForm`**; Semana/Dia **mobile** já igual; Semana/Dia **desktop (≥768px)** usa **`AppointmentQuickDetails`** (só leitura) — **principal inconsistência**. |
| **Timezone Empresa** | `<select>` nativo com ~418 opções — UX mobile limitada pelo picker nativo; recomendado combobox pesquisável partilhado com Registo. |
| **Sidebar** | Drawer `260px` / `82vw` + links indentados `2rem` — ocupa muito em 360px. |
| **Tabelas** | Regra global **`min-width: 680px`** em mobile explica scroll horizontal em Agendamentos lista, Clientes, Serviços, Funcionários. |
| **Próximo passo** | Implementação em sub-etapas **6.4a–f** após autorização explícita; **não** reabrir calendário mobile 6.2/6.3. |

---

*Fim do relatório — Etapa 6.4 auditoria READ-ONLY.*
