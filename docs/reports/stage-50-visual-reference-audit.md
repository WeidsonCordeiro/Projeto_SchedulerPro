# Stage 50 — Auditoria visual de referências (Origem vs Destino)

Data: 21/10/2026  
Âmbito: análise **read-only** — confronto das 12 imagens em `image/` com a arquitetura pós-Stage 49; **sem alterações** em `client/`, `server/`, configs, dependências, BD ou commits Git (exceto este relatório).

Relacionado: [stage-49-appointments-refactor-audit.md](./stage-49-appointments-refactor-audit.md), [stage-49-8-overflow-and-list-validation.md](./stage-49-8-overflow-and-list-validation.md), [stage-37-frontend-audit-setmore-comparison.md](./stage-37-frontend-audit-setmore-comparison.md).

---

## 1. Contexto e objetivo

O SchedulerPro concluiu o refactor da agenda (Stages 49.x): quatro vistas (`month | week | day | list`), toolbar unificada, overflow mensal, painel mobile `#month-day-agenda-panel`, cores por **estado** do agendamento e RBAC preservado.

Este Stage 50 documenta:

1. Inventário das capturas **Origem** (produto actual) e **Destino** (mockups de referência SaaS).
2. Mapeamento para componentes/hooks/CSS existentes.
3. Matriz de viabilidade (Fácil / Moderada / Complexa) para aproximar o visual **sem** assumir novas integrações (IA, billing, etc.).
4. Fases recomendadas e riscos para uma eventual implementação futura.

**Pasta de imagens (não versionada no Git):** `image/` na raiz do repositório  
Caminho absoluto: `C:\Users\Weidson Cordeiro\Desktop\Front-End\Projetos\Projeto_SchedulerPro\image\`

---

## 2. Inventário das 12 imagens

Legenda: **O** = observado na imagem; **I** = inferido (comportamento ou dados não confirmados no código).

| # | Ficheiro | Tipo | Vista / conteúdo | Observado (O) | Inferido (I) |
|---|----------|------|------------------|---------------|--------------|
| 1 | `Sistema_Origem_desktop_mes.png` | Origem | Mês desktop | Grelha 7 colunas; pills coloridas por estado (verde/vermelho/azul); hora + cliente truncado; link `+N mais` | Serviço pode existir no DOM mas pouco visível na captura |
| 2 | `Sistema_Origem_desktop_semana.png` | Origem | Semana desktop | Grelha horária; blocos sobretudo com **intervalo** de horas | Cliente/serviço podem estar em CSS mínimo ou altura de bloco |
| 3 | `Sistema_Origem_desktop_dia.png` | Origem | Dia desktop | Faixa única do dia; blocos hora–hora | Mesma legibilidade limitada que semana |
| 4 | `Sistema_Origem_desktop_lista.png` | Origem | Lista desktop | Tabela Bootstrap: Data, Hora, Cliente, Serviço, Funcionário, Status, Observações, Ações (Visualizar / Excluir) | Scroll horizontal depende da largura (validado 49.8) |
| 5 | `Sistema_Origem_mobile_mes.png` | Origem | Mês mobile | Toolbar empilhada; células compactas; painel do dia abaixo da grelha | Corresponde a `#month-day-agenda-panel` |
| 6 | `Sistema_Origem_mobile_semana.png` | Origem | Semana mobile | Grelha com scroll horizontal da semana | Toolbar em coluna (regra `index.css`) |
| 7 | `Sistema_Origem_mobile_dia.png` | Origem | Dia mobile | Blocos com ênfase no horário | Cliente/serviço pouco legíveis na captura |
| 8 | `Sistema_Origem_mobile_lista.png` | Origem | Lista mobile | Tabela dentro de card; colunas cortadas / scroll | Mesmo componente que desktop com `.table-responsive` |
| 9 | `Sistema_Destino_Exemplo_mes.jfif` | Destino | **Semana** (nome do ficheiro enganoso) | KPIs (7 dias); filtros status/staff; vista **Staff**; colunas por colaborador; blocos por **tipo de serviço** (paleta); cliente + serviço; overlaps lado a lado; sidebar larga com search | Integrações no menu (QuickBooks, etc.) são marketing |
| 10 | `Sistema_Destino_Exemplo_mes_2.jfif` | Destino | Mês desktop | Painel esquerdo: mini-calendário, filtros accordion, share; pills cliente+hora; popover detalhe; header com search, Add, “Ask AI” | Popover “See details” vs modal — interação inferida |
| 11 | `Sistema_Destino_Mobile.png` | Destino | Composição marketing | Desktop semana + telemóvel: strip de dias, timeline, FAB, bottom nav | Bottom nav global não existe no SchedulerPro |
| 12 | `Sistema_Destino_Mobile_Exemplo.jfif` | Destino | Mobile app-like | Header roxo; lista de cards; FAB; fluxo “New Appointment” com grelha de slots | Paleta roxa e copy em inglês — referência visual, não spec funcional |

**Nota:** dois ficheiros Destino com `mes` no nome cobrem vistas diferentes (semana staff vs mês com painel lateral). Registar no versionamento ou anexar ao relatório evita perda das referências.

---

## 3. Estado actual do SchedulerPro (pós-Stage 49)

### 3.1 Orquestração e dados

| Peça | Ficheiro | Função |
|------|----------|--------|
| Página | [`client/src/pages/appointments/AppointmentsPage.tsx`](../../client/src/pages/appointments/AppointmentsPage.tsx) | `PageHeader`, toolbar, `CalendarView` ou `AppointmentsListView`, modais |
| Navegação | [`client/src/hooks/useAppointmentsNavigation.ts`](../../client/src/hooks/useAppointmentsNavigation.ts) | `viewType`, `currentDateKey`, overflow → dia, foco mês mobile |
| Carga | [`client/src/hooks/useAppointmentsSchedule.ts`](../../client/src/hooks/useAppointmentsSchedule.ts) | `GET /appointments` por intervalo (`computeAppointmentsRange`); clientes/serviços/colaboradores |
| Tipos vista | [`client/src/config/appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts) | `CalendarViewType` = `month \| week \| day \| list` — **sem `staff`** |
| Layout overlaps | `appointmentCalendar.ts` → `computeDayLayout` | Colunas temporais no mesmo recurso (dia/semana) |

### 3.2 Componentes de vista

| Vista | Componentes |
|-------|-------------|
| Mês | [`MonthView.tsx`](../../client/src/components/appointments/MonthView.tsx), [`MonthCalendar.tsx`](../../client/src/components/appointments/MonthCalendar.tsx), [`MonthDayAgendaList.tsx`](../../client/src/components/appointments/MonthDayAgendaList.tsx) |
| Semana / Dia | [`WeekCalendar.tsx`](../../client/src/components/appointments/WeekCalendar.tsx), [`DayCalendar.tsx`](../../client/src/components/appointments/DayCalendar.tsx), [`CalendarTimeGridEvent.tsx`](../../client/src/components/appointments/CalendarTimeGridEvent.tsx) |
| Lista | [`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx) |
| Facade | [`CalendarView.tsx`](../../client/src/components/appointments/CalendarView.tsx) |
| Toolbar | [`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx) (alias `CalendarToolbar`) |
| Item mês | [`AppointmentCalendarItem.tsx`](../../client/src/components/appointments/AppointmentCalendarItem.tsx) — hora, cliente, serviço, status; classe por **status** |

### 3.3 Estilos e shell

- Agenda: [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css)
- Global / toolbar mobile / tabelas: [`client/src/index.css`](../../client/src/index.css)
- Layout app: [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx), menu [`client/src/config/menu.ts`](../../client/src/config/menu.ts) — sidebar sem search global nem KPIs na rota agenda

### 3.4 KPIs hoje

- **Dashboard** ([`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx)): cards “Hoje”, pendentes (`scheduled`), confirmados — via `appointmentsApi.getAppointments()` (lista completa, agregação client-side).
- **Relatórios** ([`reports.api.ts`](../../client/src/api/endpoints/reports.api.ts)): `getOverview`, revenue, etc. — período configurável; **não** usados na página de agendamentos.

---

## 4. Análise visual Origem vs Destino

### 4.1 O que a Origem já alinha com o Destino

- Quatro modos de vista e navegação período (anterior / hoje / seguinte).
- Mês com densidade de eventos e overflow (`+N mais` desktop → dia; mobile → painel ou “ver todas”).
- Semana/dia com grelha temporal e tratamento de sobreposição (código).
- Lista administrativa rica em colunas (alinhada a uso B2B, não a cards mobile do Destino).

### 4.2 Lacunas visuais principais (Destino − Origem)

| Área | Origem | Destino |
|------|--------|---------|
| Cor semântica | Estado (`appointmentStatus`) | Serviço / tipo (paleta fixa por serviço) |
| Topo da agenda | Só título + botão criar | KPIs 7 dias + filtros + search |
| Layout mês desktop | Grelha full-width | Coluna lateral (mini-mês, filtros, share) |
| Semana | Uma timeline para todos | Vista **Staff** (coluna por colaborador) |
| Detalhe rápido | Modal formulário / detalhes | Popover read-only “See details” |
| Blocos semana/dia | Horário dominante na captura | Nome cliente + serviço + ícones |
| Mobile shell | Hamburger + mesma sidebar | Bottom nav + FAB dedicado + tema roxo |
| Marca | Bootstrap azul | Roxo + “Ask AI” |

### 4.3 Elementos Destino fora de paridade mínima

- **Ask AI**, integrações de faturação, onboarding marketing.
- **Bottom navigation** global (impacto em todas as rotas, não só agenda).
- Copy e ícones específicos do produto de referência (substituir por equivalentes SchedulerPro).

---

## 5. Mapeamento Destino → código actual

| Elemento Destino | Existe hoje? | Onde / notas |
|------------------|--------------|--------------|
| Grelha mês 7×6 | Sim | `MonthCalendar`, `buildMonthGrid` |
| Pills / eventos mês | Sim | `AppointmentCalendarItem` + `APPOINTMENT_STATUS_*` |
| Popover detalhe | Não | Hoje: clique → modal (`AppointmentsPage` handlers) |
| Mini-calendário lateral | Não | Reutilizar `MonthCalendar` em escala menor + estado de data |
| Filtros status/staff na toolbar | Não | Dados: `appointments` + `employees` já carregados em `useAppointmentsSchedule` — filtro **client-side** |
| KPI cards (7 dias) | Parcial | Padrão em `DashboardPage`; na agenda seria composição nova ou `reportsApi.getOverview` com período |
| Vista Staff (colunas) | Não | Novo layout; possível extensão de `computeDayLayout` **por** `employeeId` |
| Cores por serviço | Parcial | `serviceNames` Map existe; CSS hoje amarra a status |
| Semana/dia cliente+serviço | Sim (código) | `CalendarTimeGridEvent` — polish CSS/altura |
| Lista tabela admin | Sim | `AppointmentsListView` |
| Lista mobile cards | Não | Pendência já citada em 49.8 |
| Search global header | Não | `AppLayout` / novo componente |
| FAB mobile criar | Parcial | Botão no `PageHeader`; não FAB flutuante |
| Bottom nav | Não | `AppLayout` |

---

## 6. Matriz de viabilidade

Escala: **Fácil** (CSS/composição local), **Moderada** (vários ficheiros, estado UI, testes), **Complexa** (nova vista ou shell global).

| # | Tema | Aspeto Destino | Comportamento actual | Mudança proposta | Ficheiros principais | Viabilidade | Riscos | Testes |
|---|------|----------------|----------------------|------------------|----------------------|-------------|--------|--------|
| 1 | Cores eventos | Por serviço/tipo | Por status | Mapa `serviceId` → classe CSS; legenda dual ou toggle “colorir por” | `appointmentStatus.ts` (não remover), `AppointmentCalendarItem`, `CalendarTimeGridEvent`, CSS | **Moderada** | Confusão status vs serviço; acessibilidade contraste | Vitest render classes; smoke manual legenda |
| 2 | Densidade mês + popover | Cliente+hora, “N more”, popover | Hora+cliente+overflow; clique abre modal | Reordenar spans; Bootstrap popover read-only no pill | `MonthCalendar`, `AppointmentCalendarItem`, `AppointmentsPage` | **Moderada** | Popover vs modal RBAC; foco teclado | `MonthView.test.tsx`, a11y |
| 3 | Blocos semana/dia | Cliente + serviço visíveis | Código tem campos; UI mínima em capturas | `min-height`, tipografia, ícones opcionais status | `CalendarTimeGridEvent`, `appointments-calendar.css` | **Fácil–Moderada** | Blocos curtos ainda ilegíveis | `CalendarView.test.tsx` |
| 4 | Filtros toolbar | Status + staff chips | Só 4 vistas + período | Estado filtro em `AppointmentsPage`; filtrar array antes de `CalendarView` | `AppointmentsViewSwitcher`, `AppointmentsPage`, hooks | **Moderada** | Lista vazia enganosa se filtro activo; URL deep-link | Novos testes filtro; `aria-pressed` |
| 5 | KPIs topo agenda | 3 cards últimos 7 dias | KPIs só no dashboard | Componente partilhado ou fetch overview 7d | `DashboardPage` (extrair card), `AppointmentsPage`, opcional `reports.api` | **Moderada** | Performance se `getAppointments()` completo; duplicar lógica dashboard | `DashboardPage.test` pattern; contract overview |
| 6 | Painel lateral mês | Mini-cal + filtros | Mobile: painel abaixo; desktop full width | Grid Bootstrap 3+9 em `MonthView` desktop | `MonthView`, CSS, poss. subcomponente `MonthSidebar` | **Moderada** | MQ: não quebrar 49.8 mobile | Manual 1280 + 390; `MonthView.test` |
| 7 | Vista Staff | Colunas por colaborador | `week`/`day` single resource | Novo `viewType` ou submodo; layout por employee | `appointmentCalendar.ts`, novo `StaffWeekCalendar`, `useAppointmentsNavigation` | **Complexa** | O(n×staff) DOM; overlaps entre staff na mesma hora irrelevantes | Testes layout unitários + e2e manual |
| 8 | Detalhe rápido | Popover | Modal | Popover com mesmas permissões que “visualizar” | `appointmentPermissions.ts`, popover component | **Moderada** | Não expor acções sem RBAC | Permissões em teste |
| 9 | Lista mobile cards | Cards em vez de tabela | Tabela scroll | Vista cards `@media` ou modo lista mobile | `AppointmentsListView`, `index.css` | **Moderada** | Paridade acções com tabela | 49.8 lista + novos snapshots |
| 10 | Tema roxo / tokens | Brand Destino | Tema azul Bootstrap | Variables CSS `--bs-primary` ou tema empresa | `index.css`, tokens existentes | **Fácil** | Regressão contraste global | Visual smoke |
| 11 | Ask AI | Botão header | Inexistente | Fora de escopo produto | — | **Complexa** (produto) | — | — |
| 12 | Bottom nav + FAB global | Shell mobile Destino | Sidebar hamburger | Novo layout mobile `AppLayout` | `AppLayout`, `menu.ts` | **Complexa** | Todas as rotas; conflito com modais | Testes layout cross-page |
| 13 | Search global | Header search | Não | Campo busca clientes/agenda (rota ou global) | `AppLayout` ou header agenda | **Moderada–Complexa** | Escopo busca (só agenda vs app) | Integração API listagens |

**Backend:** para itens 1–6 e 9–10, **zero** alterações de API assumidas (filtros e cores locais). Item 5 pode usar `reports/overview` já existente. Item 7 usa `employeeId` já presente em `Appointment`.

---

## 7. Preservação (checklist)

Qualquer implementação futura deve manter:

- [ ] RBAC — [`client/src/config/appointmentPermissions.ts`](../../client/src/config/appointmentPermissions.ts)
- [ ] Timezone empresa (Luxon) — `companySlice`, `appointmentTime`
- [ ] Estados e acções (`confirm`, `cancel`, …) e modais existentes
- [ ] Navegação Stage 49.3 (overflow → dia, foco mês mobile)
- [ ] `MAX_VISIBLE_ITEMS` / overflow 49.8
- [ ] Media queries toolbar e calendário mobile
- [ ] Testes Vitest: `MonthView.test.tsx`, `CalendarView.test.tsx`, `AppointmentsPage.test.tsx`, `appointmentCalendar` (grid/overlap)

---

## 8. Riscos e testes

| Risco | Mitigação |
|-------|-----------|
| Regressão `computeDayLayout` ao introduzir staff columns | Testes unitários existentes + fixture multi-employee |
| Filtros reduzem conjunto mas toolbar ainda mostra período antigo | Label “X resultados (filtrado)” |
| KPIs duplicam fetch pesado (`getAppointments` full) | Intervalo 7d dedicado ou `reports/overview` |
| Popover acessível vs modal | `focus trap` só no modal; popover com Escape |
| Cores por serviço sem legenda | Componente legenda + tooltip status |
| Shell mobile altera outras páginas | Feature flag ou fase E isolada |

**Testes a planear:** extensão de testes de componente para filtros/popover; smoke visual manual (protocolo 49.7–49.8); opcional Playwright para staff view.

---

## 9. Limitações desta análise

- Referências Destino são **mockups** (comportamento inferido onde não há Origem equivalente).
- Imagens em `image/` **não estão no Git** (`git status`: `?? image/`); risco de perda sem backup.
- Capturas Origem podem estar ligeiramente desactualizadas face ao código (ex.: `AppointmentCalendarItem` já expõe serviço no mês).
- Comparação ampla com Setmore já documentada em Stage 37 — não repetida aqui.
- Não foi executado browser neste Stage 50; validação visual baseia-se nas imagens e leitura de código.

---

## 10. Abordagem faseada recomendada

| Fase | Conteúdo | Viabilidade agregada |
|------|----------|----------------------|
| **A — Polish** | Cores opcionais por serviço; blocos semana/dia legíveis; popover read-only; filtros client-side status/colaborador | Fácil–Moderada |
| **B — Mês desktop** | Mini-calendário + filtros laterais (reutilizar `MonthCalendar`) | Moderada |
| **C — KPIs agenda** | Cards 7 dias (dashboard ou `reports/overview`) | Moderada |
| **D — Vista staff** | Novo modo colunas por colaborador | Complexa |
| **E — Shell mobile** | FAB global + bottom nav | Complexa (app-wide) |

Ordem sugerida: **A → B → C** entregam maior paridade visual com menor risco; **D** e **E** apenas se requisito de produto explícito.

---

## 11. Conclusões de viabilidade

- **É viável aproximar** o SchedulerPro do Destino em **grau variável** mantendo Bootstrap 5 e stack actual.
- **Sem backend:** filtros, cores, composição lateral, popover, polish semana/dia e tema.
- **Moderado:** KPIs na agenda (reutilizar padrões dashboard/API relatórios), lista mobile em cards, search limitado à agenda.
- **Complexo:** vista Staff multi-coluna, bottom navigation global, funcionalidades SaaS (IA, integrações).
- A **Origem** já cobre o núcleo funcional; o **Destino** acrescenta camada SaaS (densidade de informação, filtros, KPIs, vista por recurso humano e shell mobile).

---

## 12. Confirmação de escopo Stage 50

| Item | Estado |
|------|--------|
| Código `client/` / `server/` | **Não alterado** |
| Configs / dependências / BD | **Não alterados** |
| Commits Git | **Nenhum** (apenas ficheiro de relatório criado localmente) |
| Plano `.cursor/plans/stage_50_visual_audit_e9abad51.plan.md` | **Não editado** |
| Entregável | Este ficheiro: `docs/reports/stage-50-visual-reference-audit.md` |

---

## CONTEXTO PARA A PRÓXIMA IA

- **Objetivo cumprido:** auditoria visual read-only Stage 50; implementação de layout **não** iniciada.
- **Imagens:** 12 ficheiros em `image/` (8 Origem PNG + 4 Destino JFIF/PNG); não versionados — citar caminhos relativos `image/...` em futuros relatórios.
- **Arquitetura agenda:** `AppointmentsPage` + `useAppointmentsNavigation` + `useAppointmentsSchedule` + `CalendarView` / vistas filhas; `CalendarViewType` sem `staff`.
- **Cores:** hoje por `appointment.status`; Destino pede ênfase em **serviço** — implementar como toggle ou legenda dual na Fase A.
- **Prioridade UX:** Fase A (polish + filtros locais + popover) antes de vista Staff ou shell mobile.
- **Testes críticos:** `MonthView`, overflow 49.8, `aria-pressed` toolbar, `computeDayLayout` se Fase D.
- **Relatórios irmãos:** 49.8 overflow/lista; 37 Setmore; 49 refactor audit para mapa completo de ficheiros.
- **Se o utilizador pedir implementação:** começar por Fase A, um PR pequeno, sem Tailwind; preservar checklist secção 7.
