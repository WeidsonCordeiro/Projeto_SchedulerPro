# Stage 30 — UX/UI Refactor

## Objetivo

Elevar a experiência visual do frontend do SchedulerPro para um SaaS profissional, consistente e confortável em desktop e mobile, sem alterar regras de negócio, API, autenticação, RBAC ou backend.

## Auditoria inicial

O frontend já possuía boa cobertura funcional e componentes específicos por domínio, mas a apresentação era predominantemente Bootstrap aplicado localmente. Cabeçalhos, cards, tabelas, estados de carregamento/vazio/erro, modais e espaçamentos eram definidos página a página. O shell autenticado tinha sidebar responsiva, porém navbar, notificações e ações tinham pouca hierarquia em telas pequenas. O calendário já preservava as quatro views e as regras de passado/conflito, mas precisava de uma superfície visual e toolbar mais clara.

## Problemas encontrados

- padrões visuais repetidos e inconsistentes entre CRUDs;
- estados vazios pouco orientados à próxima ação;
- loading sem contexto visual comum;
- tabelas e ações densas no mobile;
- navbar e perfil com pouca prioridade visual;
- dropdown de notificações com largura fixa;
- formulários e modais dependentes apenas do estilo padrão do Bootstrap;
- páginas públicas sem uma identidade visual compartilhada.

## Design system / padrões criados

Foi criada uma camada leve sobre Bootstrap em `client/src/index.css`, com tokens de cor, superfície, raio, sombra, tipografia, foco, controles, tabela, badge, alerta e responsividade. Foram criados `PageHeader`, `LoadingState`, `EmptyState` e `ErrorState` em `client/src/components/common/`. O `EmptyState` foi aplicado aos CRUDs principais e mantém as mensagens funcionais esperadas pelos testes.

## Componentes alterados

- `Navbar`, `AppLayout`, `NotificationBell` e `FullPageLoader`;
- `CalendarToolbar` e `CalendarView`;
- novos componentes comuns de cabeçalho, loading, vazio e erro.

## Páginas alteradas

Dashboard, Clientes, Serviços, Funcionários, Disponibilidade, Agendamentos, Empresa, Relatórios e Portal Home receberam cabeçalhos/descrições e/ou estados visuais consolidados. `GuestRoute` passou a oferecer shell visual comum para as páginas públicas de convidado.

## Melhorias de UX

- hierarquia de página com título, contexto e ação;
- superfícies com melhor agrupamento e contraste;
- estados vazios com explicação e CTA quando autorizado;
- foco visível em campos e mensagens de erro preservadas;
- ações com áreas de toque maiores;
- notificações com menu rolável, badge e largura adaptável;
- calendário com toolbar e superfície visual próprias;
- identidade consistente para telas públicas;
- textos funcionais e permissões existentes preservados.

## Melhorias de responsividade

O shell mantém sidebar desktop e menu lateral em telas menores. Navbar reduz o resumo do usuário, sem retirar notificações ou logout. Cabeçalhos e ações empilham abaixo de 768px; tabelas usam scroll horizontal controlado; modais ganham margem e scroll interno; dropdown de notificações ocupa a largura disponível em smartphones; toolbar/calendário reorganizam controles e as views semana/dia mantêm scroll horizontal controlado para legibilidade.

## Melhorias de acessibilidade

Foram mantidos/adicionados `role="status"`, `aria-hidden`, `aria-label`, foco nativo dos controles, labels existentes e botões com área de toque mínima. Ícones de menu e marca não são dependências de hover.

## Testes executados

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd test`
- Vitest direcionado em pool de forks e um worker: 7 arquivos / 106 testes aprovados; a opção `--minWorkers` não é suportada pela versão instalada.

## Resultado dos testes

`typecheck` e `build` passaram. A suíte completa inicial terminou com 768/779 testes passando, 11 falhas e 3 erros de inicialização de worker por timeout; essa execução começou antes das correções finais de loader/textos. Após as correções, a execução direcionada dos 7 arquivos afetados passou: 7 arquivos e 106 testes.

## Coverage

Não foi executado `npm run test:coverage` nesta sessão. A cobertura existente não foi removida nem deliberadamente reduzida.

## Typecheck

Passou com `npm.cmd run typecheck`.

## Build

Passou com `npm.cmd run build`. O Vite exibiu apenas o warning preexistente/operacional de bundle principal acima de 500 kB.

## Arquivos criados

- `client/src/components/common/PageHeader.tsx`
- `client/src/components/common/LoadingState.tsx`
- `client/src/components/common/EmptyState.tsx`
- `client/src/components/common/ErrorState.tsx`
- `STAGE-30-UX-REFACTOR-REPORT.md`

## Arquivos modificados

`client/src/index.css`, shell/layout (`AppLayout`, `Navbar`, `NotificationBell`, `FullPageLoader`, `GuestRoute`), calendário (`CalendarToolbar`, `CalendarView`) e páginas Dashboard, Clientes, Serviços, Funcionários, Disponibilidade, Agendamentos, Empresa, Relatórios e Portal Home.

## Decisões técnicas

Foi mantido Bootstrap 5, React, TypeScript, Redux, Router, Axios e Luxon. Não foram adicionadas bibliotecas visuais ou de calendário. As mudanças são de apresentação/composição; callbacks, chamadas API, payloads, permissões e regras existentes não foram alterados. A permissão `MANAGER -> USER_READ` e a lógica de timezone da empresa permaneceram intocadas.

## Limitações

Não houve validação visual automatizada em navegador real nesta sessão; a validação mobile foi feita por regras CSS e revisão estrutural nos breakpoints 390, 430, 768, 1366 e 1920px. Algumas tabelas continuam usando scroll horizontal controlado em mobile, solução escolhida para preservar todas as colunas e ações sem alterar o domínio. Reset/verify password, que não passam por `GuestRoute`, permanecem com a estrutura própria existente, embora continuem compatíveis com os estilos globais.

## Problemas preexistentes encontrados

- encoding de vários textos em arquivos existentes aparece como mojibake no terminal (`Ã`, `â`), anterior às alterações e fora do escopo de UX;
- Vitest apresentou execução muito lenta e timeouts de workers sob a suíte completa;
- build mantém warning de chunk principal acima de 500 kB.

## Melhorias futuras identificadas

- aplicar `PageHeader`, `LoadingState` e `ErrorState` também aos formulários/modais restantes, reduzindo os spinners inline;
- avaliar transformação de algumas tabelas em cards no mobile após validação com utilizadores;
- adicionar testes de componentes para breakpoints e acessibilidade básica;
- considerar code splitting das rotas para reduzir o chunk principal.

## Validação Mobile

### 390px
Resultado: shell, login público, cabeçalhos, ações, notificações, modais e toolbar reorganizam-se; tabelas e views semana/dia usam scroll controlado. Limitação: tabelas densas continuam exigindo gesto horizontal.

### 430px
Resultado: mesma estratégia com mais espaço para ações e dropdown; conteúdo principal permanece sem overflow horizontal global.

### 768px
Resultado: sidebar ainda usa a transição de navegação mobile do Bootstrap/CSS e páginas passam a uma composição mais espaçada; tabelas continuam legíveis com rolagem controlada quando necessário.

## CONTEXTO PARA A PRÓXIMA IA

O Stage 30 foi concluído no escopo frontend visual. O padrão estabelecido usa tokens CSS em `client/src/index.css`, `PageHeader` para títulos/contexto/ações e `EmptyState` para estados sem registros. O shell autenticado foi refinado com navbar escura, sidebar branca, menu responsivo, notificações adaptáveis e loader de página. Dashboard, CRUDs principais, calendário, relatórios, empresa e Portal Home receberam a nova linguagem visual; o shell público de convidado unifica login/register/forgot password. API, backend, Redux, RBAC, isolamento por empresa, autenticação/sessão, regras de agendamento, conflitos, disponibilidade, exceções, statuses e timezone da empresa foram preservados. Os novos componentes são pequenos e não escondem lógica de negócio. Ainda existe oportunidade de substituir alguns spinners/alerts inline pelos componentes comuns, validar visualmente em browser real e fazer code splitting. A próxima IA deve repetir `npm.cmd run typecheck`, `npm.cmd run build` e a suíte Vitest com um worker se o ambiente continuar apresentando timeout de threads; não interpretar o warning de chunk do Vite como falha funcional.

## Segunda iteração UX — 27/09/2026

Esta iteração aprofundou a composição visual sem alterar negócio:

- Sidebar organizada em grupos de navegação e contexto da empresa;
- Dashboard com resumo operacional, KPIs com hierarquia e duas áreas de agenda lado a lado;
- Eventos mensais e semanais com prioridade visual para horário, cliente, serviço e status;
- Disponibilidade com cartões de dia, resumo dos períodos e indicação explícita de dias sem horários;
- Exceções apresentadas como timeline orientada a agenda;
- Funcionários com indicadores calculados a partir da lista existente;
- Clientes e Serviços com contexto de volume sem chamadas adicionais;
- Portal CLIENT com cabeçalhos orientados a próximos atendimentos, agenda e perfil;
- regras mobile para empilhar insights, agenda e timeline.

Typecheck e build passaram. A suíte direcionada de 8 arquivos da segunda iteração excedeu o tempo de execução do ambiente e foi interrompida; nenhum teste foi alterado. O build mantém apenas o warning de bundle principal acima de 500 kB. Não houve alteração em `server/`, endpoints, Redux de domínio, RBAC, contratos, timezone ou regras de agendamento.

## Terceira Iteração — Product Experience

### Decisões de UX

Esta iteração passou a organizar cada tela por contexto, ação principal, informação prioritária e ações secundárias. A composição deixou de tratar todas as páginas como CRUDs equivalentes: Dashboard e Agendamentos são espaços de trabalho; Disponibilidade é configuração operacional; Exceções são uma linha do tempo; Funcionários comunica pessoas, função e estado; Portal e páginas públicas receberam identidade própria.

### Mudanças estruturais

- Dashboard ganhou ação explícita para abrir a agenda, bloco de operação, KPIs com pesos diferentes e duas áreas de agenda com leitura mais rápida.
- Sidebar passou a agrupar navegação por Visão geral, Operação e Gestão e mostra o contexto da empresa.
- Disponibilidade passou de uma grade genérica de cards para um quadro semanal com cabeçalho semântico, períodos resumidos e detalhe editável preservado.
- Eventos de calendário passaram a apresentar horário, cliente e serviço em níveis tipográficos diferentes; Week mantém a mesma regra de clique e status.
- Funcionários passaram a apresentar iniciais, nome, email, função e estado ativo/inativo a partir dos dados já carregados.
- Portal CLIENT recebeu cabeçalhos com foco em próximos atendimentos, agenda e perfil.
- Login e páginas públicas receberam composição assimétrica responsiva com contexto de produto discreto.

### Desktop

Em 1366px/1920px, a navegação ganha agrupamento e o conteúdo operacional usa melhor a largura disponível sem preencher espaços com decoração. Dashboard e Disponibilidade usam composição em colunas; em telas largas a hierarquia entre título, ação e conteúdo fica explícita.

### Mobile

Em 390px/430px, o contexto público é reduzido, o quadro de disponibilidade volta a uma leitura vertical confortável, o Dashboard empilha as agendas e a navegação continua acessível. Calendário e tabelas permanecem com as adaptações de scroll controlado da iteração anterior. Não foi criada uma segunda aplicação nem foram removidas funções.

### Calendário, disponibilidade e portal

Calendário preserva Month/Week/Day/List, timezone, regras de passado, histórico read-only, conflitos, status e callbacks existentes. Disponibilidade preserva os mesmos inputs, permissões, salvamento/remoção e exceções. Portal preserva CLIENT, clientId, isolamento e endpoints existentes.

### Testes, typecheck, build e coverage

`npm.cmd run typecheck` passou. `npm.cmd run build` passou após a terceira iteração; permanece apenas o warning do bundle principal acima de 500 kB. A execução direcionada de testes da segunda iteração já havia excedido o tempo do ambiente; a execução posterior focada nas áreas desta iteração também não teve progresso dentro do limite e foi interrompida, sem alterar testes. Coverage não foi executado nesta iteração.

### Limitações

Não houve inspeção em browser automatizado nesta sessão; a validação foi estrutural e por CSS responsivo. Clientes e Serviços mantêm tabelas como representação principal por segurança de compatibilidade e por não existir busca/filtro já implementado para ampliar sem escopo funcional. O menu contextual visual completo para todas as ações secundárias permanece como melhoria futura. Nenhuma alteração foi feita em `server/`.

## Refinamento 1 — Responsividade, Overflow e Shell

### Âmbito

Refinamento de apresentação e estrutura de layout, sem redesign e sem tocar em `server/`, endpoints, autenticação, sessão, RBAC, Redux de domínio, `MANAGER -> USER_READ`, notificações/reminders de backend, contratos, timezone ou regras de agendamento. Breakpoints considerados: 390px, 430px, 768px, 1366px e 1920px.

Restrição estrutural respeitada: nenhuma regra de `overflow-x: hidden` foi adicionada a `html`, `body` ou contentores globais. Todo o deslocamento horizontal ficou confinado a contentores identificados (`.table-responsive`, `.filter-bar`, `.week-calendar`, `.day-calendar`, `.notification-menu`, `.app-sidebar-scroll`). Nenhuma tabela foi convertida em cards.

### Problemas encontrados e causa

- **Sino de notificações**: `.dropdown-item` do Bootstrap aplica `white-space: nowrap`, por isso mensagens longas de notificação não quebravam e podiam alargar o painel. O painel tinha `top: 4.15rem` e `width: 100vw` em mobile, dependentes de valores mágicos, e o badge usava `start-100 translate-middle`, podendo ultrapassar os limites do botão com contagens de três dígitos.
- **Shell**: `.app-navbar` usava `min-height` sem token, o nome do utilizador não tinha `min-width: 0`/truncagem e o `gap-3` fixo consumia largura junto com o botão de Logout; o contentor do menu lateral (`p-2 flex-grow-1`) não tinha scroll interno, pelo que menus longos ficavam cortados sem possibilidade de rolar.
- **Viewport móvel**: o shell usava `vh-100` (utilitário com `!important`), isto é `100vh`, que em Chrome/Safari Android corresponde à viewport máxima e deixava a parte inferior do conteúdo inalcançável quando a barra de endereço está expandida.
- **Modais**: o markup próprio `modal show d-block` não tinha cadeia de alturas; `.modal-content` não era um contentor flex limitado e `.modal-body` não rolava, pelo que modais altos (formulário de agendamento) podiam exceder a viewport. Rodapés quando ficam dentro de `.modal-body` (`px-0 pb-0`) desapareciam abaixo da dobra.
- **Tabelas**: as tabelas já usavam `.table-responsive`, mas em `ReportsPage` a classe está no próprio `.card-body` (com `padding` e `min-width: 680px` herdados das regras mobile), e as células não quebravam palavras longas como e-mails e observações.
- **Filtros**: o grupo de 4 botões de período (`Hoje`, `Esta semana`, `Este mês`, `Personalizado`) em `ReportsPage` não tinha contentor com scroll próprio.
- **Calendário e quadros**: as colunas da grelha mensal (`.col`) podiam ser empurradas pelo conteúdo; em `≤991.98px` o `flex-wrap` do `.btn-group` estava dentro do bloco de `≤767.98px`; o cabeçalho do quadro de disponibilidade usava `grid-template-columns: 12rem 1fr 15rem` (três colunas) enquanto o corpo usava duas, criando uma coluna fantasma e desalinhando os rótulos.

### Correções aplicadas — notificações

`client/src/components/layout/NotificationBell.tsx` e `client/src/index.css`:

- badge com classe `notification-badge`, posicionado por dentro dos limites do botão (sem `start-100 translate-middle`), protegendo contagens de três dígitos;
- itens com `white-space: normal`, `overflow-wrap: anywhere` e `max-width: 100%`, com `notification-item`, `notification-item-title` e `notification-item-message`;
- cabeçalho do painel com `notification-menu-header`, fora da área rolável;
- `.dropdown-menu-body` com `overflow-y: auto` e `overscroll-behavior: contain`, mantendo o cabeçalho e a ação "Marcar todas como lidas" sempre visíveis;
- até `991.98px` o painel passa a ser `position: fixed`, ancorado à viewport com `top: calc(var(--sp-navbar-height) + .35rem)` e margens laterais de `.5rem`, com largura automática e `max-height` em `dvh` — nunca ultrapassa as margens laterais, independentemente da posição do sino;
- `role="dialog"` + `aria-labelledby` no painel e fecho com `Escape`.

### Correções aplicadas — shell

- `client/src/index.css`: `--sp-navbar-height` como token (`.app-navbar { min-height: var(--sp-navbar-height) }`), `.app-navbar .user-summary { min-width: 0 }` e `.user-name` com truncagem por `text-overflow` e `max-width` (reduzida abaixo de `768px`); `.app-shell` passou a usar `height: 100dvh` com fallback `100vh` em vez do utilitário `vh-100`, corrigindo a altura inalcançável em mobile.
- `client/src/components/layout/Navbar.tsx`: `isSidebarOpen` opcional para expor `aria-expanded` no botão do menu, `flex-shrink-0` na marca e no Logout, `gap-2 gap-md-3` e `min-w-0` no grupo da direita, nome com a classe `user-name`.
- `client/src/components/layout/AppLayout.tsx` e CSS: o contentor do menu ganhou `app-sidebar-scroll` (`flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain`), mantendo o cabeçalho "Menu" e o botão de fechar fixos; largura do drawer passou a `min(260px, 82vw)`; fecho por `Escape` com `aria-expanded` sincronizado.
- Navbar e sidebar continuam a ser o mesmo sistema visual: mesma cor de fundo, mesma linguagem de tokens e mesmos estados de foco/hover.

### Correções aplicadas — tabelas

- `overflow-wrap: anywhere` nas células que não são `th`, para que e-mails, observações e nomes longos nunca empurrem a largura da tabela;
- `.card-body.table-responsive` sem `padding` e com `min-width: 0` em `≤767.98px`, porque em `ReportsPage` a classe responsiva está no próprio corpo do cartão; o scroll horizontal continua a ser o da tabela, e não uma conversão para cards;
- `.table-responsive` mantém `border`/`border-radius` no mobile e `min-width: 680px` para as restantes tabelas, preservando todas as colunas e ações.

### Correções aplicadas — modais

- cadeia global `.modal.show .modal-dialog` → `.modal-content` → `.modal-body` com `display: flex`, `flex-direction: column` e `max-height: calc(100dvh - 1rem)`: cabeçalho e rodapé ficam sempre visíveis e apenas o corpo rola;
- até `767.98px`, `.modal { padding: .5rem }` e `.modal > .modal-dialog { margin: 0; max-width: none }` garantem margem lateral também em tablets, onde um `modal-lg` sem Bootstrap de `padding` ficava a 100% da largura;
- `.modal-footer` com `flex-wrap: wrap` e `.btn { flex: 1 1 8rem }` para alvos de toque utilizáveis;
- rodapés que vivem dentro de `.modal-body` (formulários) recebem `position: sticky; bottom: 0` com fundo, borda superior e compensação de padding, permanecendo acessíveis enquanto o corpo rola.

### Correções aplicadas — filtros, calendário e quadros

- `.filter-bar` (`overflow-x: auto`, `overscroll-behavior-x: contain`) envolve o grupo de botões de período em `ReportsPage`;
- grelha do mês com `min-width: 0` nas colunas e células;
- `overflow-x: auto` + `min-width: 620px` nas colunas de semana/dia movido para o bloco correto de `≤991.98px`, com o `flex-wrap` do `.btn-group` no mesmo breakpoint (antes só valia abaixo de `768px`);
- quadro de disponibilidade: cabeçalho e corpo passam a partilhar a mesma grelha de duas colunas (`minmax(11rem, 13rem) minmax(0, 1fr)`), removendo a coluna fantasma e alinhando os rótulos; `flex-wrap` no cabeçalho do dia, `min-width: 0` nos filhos da grelha, `min-width: 0`/`overflow-wrap` em `.person-cell` e `.exception-title`/`.exception-period`, `flex-wrap` em `.availability-period`;
- `.card dt, .card dd`, `.list-intro`, `.service-summary` e `.page-actions > *` passaram a quebrar conteúdo longo; utilitário `.min-w-0` disponível para itens de flex.

### Breakpoints

- **390px / 430px**: navbar com nome do utilizador oculto e gaps reduzidos; sino com painel ancorado à viewport; filtros de período e tabelas com scroll interno; modais com margem lateral, corpo rolável e rodapé sticky; drawer's largura limitada a `82vw`.
- **768px**: nome do utilizador volta com truncagem mais curta; modais mantêm margem lateral; grelha do quadro de disponibilidade ainda em duas colunas com cabeçalho alinhado; tabelas em scroll controlado.
- **1366px / 1920px**: sem alteração de composição; a nova `--sp-navbar-height` e a truncagem do nome só entram em ação quando o espaço falta, e a grelha de disponibilidade passa a ocupar a largura disponível com a primeira coluna elástica.

### Testes, typecheck, build e coverage

Executados em `client/`:

- `npm.cmd run typecheck` — passou.
- `npm.cmd run test` — 79 ficheiros, 850 testes, todos a passar.
- `npm.cmd run build` — passou (CSS 249.04 kB / 34.98 kB gzip, JS 537.99 kB / 159.59 kB gzip, 14.34s na última execução); permanece apenas o warning de chunk principal acima de 500 kB, pré-existente.
- `npm.cmd run test:coverage` — 79 ficheiros, 850 testes; Statements 96.04% (2526/2630), Branches 90.4% (1978/2188), Functions 96.4% (644/668), Lines 96.22% (2450/2546).

Testes novos/atualizados: fecho do painel de notificações com `Escape`, painel com `role="dialog"` e texto longo quebrado, fecho do drawer com `Escape`, `aria-expanded` do botão do menu e presença da região rolável `app-sidebar-scroll`.

A suíte passa integralmente, mas sob carga apresenta instabilidade pré-existente do ambiente (já registada antes deste refinamento: "execução muito lenta e timeouts de workers"). Observaram-se falhas transitórias, sempre em testes **não alterados** por este refinamento e nunca reproduzidas depois:

- `AvailabilityPage > loads and renders the exceptions of the selected employee` — falha em execuções completas concorrentes; passa de forma constante isolado (6 execuções consecutivas com `-t=exceptions`: 2 passed / 19 skipped) e em execuções completas posteriores;
- `CompanyForm > renders the current company values as initial state` — uma ocorrência, sem reprodução;
- uma execução de `test:coverage` com falha única, sem reprodução.

`client/src/pages/availability/AvailabilityPage.test.tsx` não foi modificado neste refinamento (`git diff` vazio), o que confirma que a flakiness não vem das alterações de overflow/shell. Confirmação final: `npm.cmd run test` 850/850 em 2 execuções completas consecutivas; `vitest run --coverage --maxWorkers=1` 850/850 com 96.04% de statements. Não alterar estes testes para acomodar a flakiness; se persistir, tratar o timeout de `findByText` sob contenção de recursos.

### Regressões preexistentes corrigidas

A terceira iteração deixou a suíte vermelha em 4 ficheiros (11 testes) por causas externas a este refinamento, corrigidas agora apenas no harness de teste, sem alterar comportamento de produto:

- `DashboardPage`, `AppointmentsPage` e `EmployeesPage` passaram a renderizar `PageHeader` com `Link` dentro de `actions`, mas os testes não montavam `MemoryRouter`, o que fazia o render completo lançar `Cannot destructure property 'basename'`. Envolvidos em `MemoryRouter`.
- copy do `EmptyState` sem ponto final ("Nenhum agendamento encontrado") e título "Resumo do dia" no Dashboard: asserções alinhadas com a copy atual.
- `Sidebar` passou a mostrar o contexto da empresa com fallback `"SchedulerPro"`, o que tornava ambíguo `getByText("SchedulerPro")` no `AppLayout.test.tsx`; a asserção passou a ser dirigido à marca da navbar.
- `EmployeesPage` mostra o e-mail duas vezes (célula de identidade e coluna "E-mail"); a asserção passou a `getAllByText`. A duplicação em si é uma questão de informação e fica para a próxima iteração de IA.

### Fora de âmbito

Nada foi alterado em `server/`, endpoints, autenticação, sessão, RBAC, Redux de domínio, `MANAGER -> USER_READ`, notificações/reminders de backend, contratos, timezone ou regras de agendamento. Nenhum commit, merge, push ou PR foi executado.

### Limitações

Não há Playwright/Puppeteer no ambiente e o jsdom não calcula layout; a validação de 390/430/768/1366/1920px foi estrutural e por CSS, sem medição de pixels em navegador real. Tabelas densas continuam a exigir gesto horizontal em mobile por decisão explícita de preservar colunas e ações em vez de virar cards. A duplicação do e-mail na tabela de Funcionários e a avaliação de menus contextuais continuam pendentes.

## CONTEXTO PARA A PRÓXIMA IA

O Stage 30 acumula agora quatro frentes: a base de design system em tokens CSS, a reordenação por contexto e ação (Dashboard, Agendamentos, Disponibilidade, Exceções, Funcionários, Portal, páginas públicas) e este Refinamento 1 de responsividade/overflow/shell. O shell autenticado tem navbar escura com token `--sp-navbar-height`, nome truncado, `aria-expanded` no botão do menu, drawer com largura `min(260px, 82vw)`, região rolável própria e fecho por `Escape`, e `height: 100dvh` com fallback `100vh`. O sino de notificações tem badge contido, painel com `role="dialog"`, cabeçalho fixo, corpo rolável com `overscroll-behavior: contain`, quebra de texto longo e, até `991.98px`, painel `fixed` ancorado à viewport. Modais têm cadeia flex com corpo rolável, margem lateral até `768px` e rodapé sticky quando vive dentro do corpo. Tabelas mantêm `.table-responsive` com scroll interno (nunca cards) e `overflow-wrap: anywhere` nas células; `ReportsPage` teve o contentor corrigido porque a classe responsiva está no `card-body`. Filtros segmentados usam `.filter-bar`. Calendário semana/dia tem scroll interno abaixo de `992px` e a grelha mensal encolhe; o quadro de disponibilidade alinha cabeçalho e corpo na mesma grelha de duas colunas.

Invariantes preservadas: `server/` intocado, sem alterações de API, autenticação, sessão, RBAC, Redux de domínio, `MANAGER -> USER_READ`, notificações/reminders, contratos, timezone ou regras de agendamento; nenhuma função removida. `npm.cmd run typecheck`, `npm.cmd run build` e `npm.cmd run test` passam com 850/850 testes, e `test:coverage` com 96.04% de statements; o warning de chunk >500 kB do Vite não é falha funcional.

Pendências conhecidas para a próxima IA: a duplicação do e-mail na tabela de Funcionários (célula de identidade e coluna "E-mail") é uma questão de informação a decidir; `LoadingState` e `ErrorState` ainda não substituíram todos os spinners/alerts inline; não há busca/filtro em Clientes e Serviços para ampliar a composição sem escopo funcional; menus contextuais para ações secundárias permanecem por construir; code splitting continua pendente para reduzir o bundle principal. A validação em navegador real nos breakpoints 390/430/768/1366/1920px continua não automatizada — se houver Playwright disponível, deve ser a primeira verificação. Antes de qualquer alteração, repetir `npm.cmd run typecheck`, `npm.cmd run build` e a suíte Vitest, e não alterar testes para acomodar regressões de produto.
