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

## CONTEXTO PARA A PRÓXIMA IA (histórico — primeira iteração, substituído no fim do documento)

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

### Arquivos alterados

Produto (5 ficheiros):

| Ficheiro | Alteração |
|---|---|
| `client/src/index.css` | cadeia flex dos modais, `overflow-wrap` nas células, `.filter-bar`, `.min-w-0`, token `--sp-navbar-height`, truncagem do nome, `.notification-*`, `.app-sidebar-scroll`, `height: 100dvh` no shell, `min-width: 0` na grelha mensal, correção de breakpoint do calendário e grelha única no quadro de disponibilidade |
| `client/src/components/layout/NotificationBell.tsx` | fecho com `Escape`, badge reposicionado, painel com `role="dialog"`/`aria-labelledby`, classes de header/item/title/message, remoção de `style` inline |
| `client/src/components/layout/Navbar.tsx` | `isSidebarOpen` e `aria-expanded`, `flex-shrink-0`, gaps responsivos, `min-w-0`, classe `user-name` |
| `client/src/components/layout/AppLayout.tsx` | remoção de `vh-100`, `app-sidebar-scroll`, `flex-shrink-0` no cabeçalho, fecho com `Escape` |
| `client/src/pages/reports/ReportsPage.tsx` | involvement do grupo de períodos em `.filter-bar` |

Testes (7 ficheiros): `NotificationBell.test.tsx` (+3 casos), `AppLayout.test.tsx` (+2 casos e asserção da marca da navbar), `DashboardPage.test.tsx`, `AppointmentsPage.test.tsx`, `EmployeesPage.test.tsx`, `PortalAppointmentsPage.test.tsx` (harness).

Nenhum ficheiro criado, nenhum ficheiro de teste de produto removido, `server/` intocado.

### Resoluções avaliadas

| Opção | Decisão | Motivo |
|---|---|---|
| `overflow-x: hidden` em `html`/`body` | **Rejeitada** | Proibido pela regra principal e Mascara a causa: conteúdo continuaria a ultrapassar a viewport e a ser cortado, sem forma de o alcançar. |
| `min-width: 0` em `.dropdown-item` apenas | **Rejeitada** | Resolve o problema herdado do `white-space: nowrap` do Bootstrap, mas não contém o painel: continuaria a poder transbordar lateralmente a partir da posição do sino. Resolvido na raiz com painel ancorado à viewport. |
| Converter tabelas em cards no mobile | **Rejeitada** | Fora de âmbito nesta etapa e destrói a comparação por colunas, além de reverter a decisão registada nas iterações anteriores. |
| `100vh` mantido no shell | **Rejeitada** | Em Chrome/Safari Android `100vh` é a viewport máxima; a área inferior ficava inalcançável. Adotado `100dvh` com fallback `100vh`. |
| `position: fixed` no painel só abaixo de `575.98px` | **Rejeitada** | A 768px um `modal-lg`/painel largo ainda pode transbordar; o limite `991.98px` coincide com o breakpoint da sidebar e cobre tablet. |
| Remover o e-mail duplicado em `EmployeesPage` | **Adiada para o Refinamento 2** | É uma decisão de hierarquia de informação, não de overflow; pertence à iteração seguinte. **Resolvido no Refinamento 2** (ver secção abaixo). O teste foi apenas relaxado para `getAllByText`. |
| Aumentar `testTimeout` ou isolar testes para eliminar a flakiness | **Rejeitada** | Esconderia instabilidade do ambiente em vez de a registar; os testes em causa passam isolados de forma consistente. |
| Reduzir o bundle com code splitting | **Fora de âmbito** | Não afeta overflow; registado como pendência. |

### Fora de âmbito

Nada foi alterado em `server/`, endpoints, autenticação, sessão, RBAC, Redux de domínio, `MANAGER -> USER_READ`, notificações/reminders de backend, contratos, timezone ou regras de agendamento. Nenhum commit, merge, push ou PR foi executado.

### Limitações

Não há Playwright/Puppeteer no ambiente e o jsdom não calcula layout; a validação de 390/430/768/1366/1920px foi estrutural e por CSS, sem medição de pixels em navegador real. Tabelas densas continuam a exigir gesto horizontal em mobile por decisão explícita de preservar colunas e ações em vez de virar cards. A duplicação do e-mail na tabela de Funcionários e a avaliação de menus contextuais estavam pendentes neste ponto; a duplicação foi resolvida no Refinamento 2 e os menus contextuais continuam por construir.

## Refinamento 2 — Consistência Visual de Tabelas, Formulários e Espaçamento

### Âmbito

Padronizar tabelas, ações, formulários e espaçamentos para que todas as páginas pertençam ao mesmo sistema visual, sem alterar identidade, paleta, shell, permissões, validações ou regras de negócio.

### Inventário e problemas encontrados

A auditoria cobriu as 9 tabelas (Clientes, Serviços, Funcionários, Agendamentos, Portal, 3 de Relatórios e a agenda do Dashboard), os 5 formulários de entidade, os 2 modais de confirmação e o quadro de disponibilidade. Divergências reais encontradas:

| Problema | Onde | Impacto |
|---|---|---|
| Tabelas sem moldura comum | 5 tabelas de lista sem cartão; Relatórios e Dashboard com cartão | A mesma tabela parecia um elemento diferente consoante a página; em mobile o contentor desenhava a sua própria moldura por cima do cartão |
| Coluna de estado com nomes diferentes | "Situação" em Clientes/Serviços/Portal, "Status" em Agendamentos | Leitura inconsistente da mesma informação |
| Estado como texto simples | Funcionários mostrava Ativo/Inativo em texto colorido por baixo do badge de perfil | Único estado que não usava badge em todo o produto |
| Três grafias da segunda linha de célula | `div.small.text-muted`, `small.d-block.text-muted`, `span.small.text-muted` | Métricas e cor diferentes para a mesma informação secundária |
| Seletor CSS morto | `.person-cell > div` nunca correspondeu ao markup (`<span>`) | `min-width: 0` e quebra de palavra nunca se aplicaram às células de identidade |
| Duas métricas do contentor de ações | `d-flex gap-2` em 3 tabelas, `d-flex flex-wrap gap-2` em 1 | Ações sem quebra de linha podiam transbordar a célula |
| Dois ritmos de rodapé de modal | Rodapé como irmão do corpo vs. dentro do corpo, com `gap` + `mb-3` a duplicar o espaçamento | Rodapés com aparência e espaçamento diferentes conforme o formulário |
| Linhas sem goteira | `row` sem `g-*` em `ServiceForm` e `AppointmentForm` | Margens negativas do Bootstrap ultrapassavam o padding do corpo do modal |
| ARIA contraditório | 20 spinners decorativos com `role="status"` **e** `aria-hidden="true"` | O elemento era simultaneamente anunciado e ocultado |
| E-mail duplicado | Célula de identidade **e** coluna "E-mail" em Funcionários | O mesmo valor aparecia duas vezes na mesma linha |

### Correções aplicadas — superfície e cabeçalho das tabelas

Todas as tabelas passaram a usar a mesma estrutura: `.table-card > .table-responsive > .table`. As cinco tabelas de lista (Clientes, Serviços, Funcionários, Agendamentos, Portal) receberam o cartão; a agenda do Dashboard passou a usar a mesma classe; as três tabelas de Relatórios trocaram `card-body table-responsive` por `table-responsive table-compact` dentro do cartão já existente, deixando de ter um contentor diferente das restantes. Abaixo de `767.98px` o cartão fornece a moldura, pelo que `.table-card > .table-responsive` deixa de desenhar a segunda borda.

A nova classe `.table-compact` preserva a decisão anterior: as tabelas de Relatórios, com poucas colunas, ajustam-se à largura disponível; as tabelas densas mantêm `min-width: 680px` e scroll interno. Nenhuma tabela foi convertida em cards.

A coluna de estado passou a chamar-se **Status** em Clientes, Serviços e Portal. Em Funcionários, o estado deixou de ser texto colorido por baixo do badge de perfil e passou a uma coluna **Status** própria com badge, igual a Clientes e Serviços.

### Correções aplicadas — células e ações

- `.table-subline` substituiu as três grafias da segunda linha de célula, usada na descrição de Serviços, no fim do período em Agendamentos e no marcador "Você" em Funcionários.
- O seletor morto `.person-cell > div` passou a `.person-cell > :not(.person-avatar)`, ativando a quebra de texto nas células de identidade.
- A classe CSS morta `.client-avatar` foi removida.
- `.table-actions` substituiu `d-flex gap-2` e `d-flex flex-wrap gap-2`, dando a mesma quebra de linha e o mesmo espaçamento às ações das quatro tabelas que têm coluna de ações.
- O e-mail deixou de ser repetido na célula de identidade de Funcionários; a coluna **E-mail** passa a ser a única ocorrência.

### Correções aplicadas — formulários e modais

O rodapé de modal tem agora uma única métrica em CSS, cobrindo os dois formatos em uso: mesmo `padding` e `gap: .5rem`, com as margens dos filhos a zero para que o espaçamento venha apenas do `gap`. O rodapé dentro do corpo ganhou borda superior em todos os breakpoints; abaixo de `767.98px` a regra mobile limita-se a juntar `position: sticky` e fundo, em vez de repetir a métrica.

As linhas de `ServiceForm` e `AppointmentForm` passaram a `row g-3`, deixando de ultrapassar o padding do corpo do modal.

### Correções aplicadas — acessibilidade

Removidos 20 pares `role="status"` + `aria-hidden="true"` de spinners decorativos, em que o elemento era ao mesmo tempo anunciado e ocultado. Os spinners de carregamento de página mantêm `role="status"` com a respetiva etiqueta oculta, que é a forma correta.

### Testes, typecheck, build e coverage

Seis testes novos, que fixam os contratos de consistência em vez de apenas observar o resultado:

- `ClientsPage`, `ServicesPage`, `AppointmentsPage`, `PortalAppointmentsPage`: a tabela está dentro de `.table-card`, a coluna chama-se "Status" e as ações estão em `.table-actions`.
- `ServicesPage`: a descrição usa `.table-subline`.
- `EmployeesPage`: o estado é um badge e o e-mail aparece uma única vez por linha.
- `ServiceForm`: o par de campos está numa linha com goteira e as ações no rodapé partilhado.

| Verificação | Resultado |
|---|---|
| `npm.cmd run typecheck` | passou |
| `npm.cmd run build` | passou — CSS 249.31 kB (gzip 35.01 kB), JS 537.99 kB (gzip 159.62 kB) |
| `npm.cmd run test` | 79 ficheiros, 856/856 testes (eram 850/850) |
| Statements | 96.04% (2526/2630) |
| Branches | 90.39% (1976/2186) |
| Functions | 96.4% (644/668) |
| Lines | 96.22% (2450/2546) |

### Resoluções avaliadas

| Opção | Decisão | Motivo |
|---|---|---|
| Converter as tabelas de lista em cartões de dados no mobile | **Rejeitada** | Proibido pela regra principal; destrói a comparação por colunas e já fora rejeitado no Refinamento 1. |
| Largar os modais de formulário para `modal-lg` | **Rejeitada** | Seria uma alteração visual sem motivo funcional. `AppointmentForm` é `modal-lg` porque hospeda calendário e seleção de horários; Clientes, Funcionários e Serviços são de coluna única e funcionam nos 500px por omissão. |
| Renomear o rótulo "Timezone" para "Fuso horário" em `CompanyForm` | **Rejeitada** | A mensagem de erro do servidor para o mesmo campo é "Timezone IANA inválido."; renomear apenas o rótulo criaria uma divergência nova entre rótulo e mensagem de validação. |
| Substituir os 8 blocos de loading/erro por `LoadingState`/`ErrorState` | **Rejeitada** | Os 8 blocos já são idênticos entre si. `LoadingState` desenha um bloco inline compacto, pelo que a adoção seria uma alteração visual em 8 páginas e não uma correção de consistência. |
| Uniformizar os 4 controlos segmentados por classe | **Rejeitada** | `btn-group-sm` e `btn btn-sm` nos filhos renderizam exatamente o mesmo tamanho. É divergência de código, não de aspeto. |
| Unificar `Email`/`E-mail` em rótulos e cabeçalhos | **Rejeitada** | Exigia alterar rótulos fixados em testes, sem ganho visual. |
| Acrescentar a linha de contagem às páginas que não a têm | **Rejeitada** | `.list-intro`/`.service-summary` são conteúdo informativo; adicioná-las seria criar conteúdo, não padronizar. |
| Corrigir o e-mail duplicado em Funcionários | **Adotada** | Estava explicitamente diferido no Refinamento 1 como questão de hierarquia de informação; era a única linha com o mesmo valor duas vezes. |

### Fora de âmbito

Nada foi alterado em `server/`, endpoints, payloads, contratos, chamadas API, validações, regras de negócio, autenticação, sessão, RBAC, permissões de ação, Redux de domínio, calendário, disponibilidade, notificações ou reminders. Nenhuma ação, coluna de ações ou permissão foi removida. Nenhum commit, merge, push ou PR foi executado.

### Limitações

Continua a não haver Playwright/Puppeteer e o jsdom não calcula layout: a validação em 390/430/768/1366/1920px permanece estrutural e por CSS. Os testes fixam a estrutura (classes, rótulos, contagem de e-mails, badges) e não a geometria. `LoadingState` e `ErrorState` continuam sem imports no produto; a decisão está registada acima.

## Refinamento 3 — Dashboard, Calendário e Disponibilidade

### Âmbito

Dashboard, Agenda (Month, Week, Day, List, toolbar e seletor de data do formulário) e Disponibilidade. Refinamento de leitura e hierarquia visual, sem redesenho, sem novas chamadas API e sem qualquer alteração de backend, modelo, permissões, RBAC, timezone ou regras de negócio. Nada foi adicionado ao Dashboard: nenhum KPI, cálculo ou dado novo.

### Problemas encontrados e causa

**Calendário**

1. `DayCalendar.tsx` ignorava `item.column` e posicionava todos os blocos com `left: 0`, usando apenas a largura. A `computeDayLayout` já calculava colunas para sobreposições, mas a vista Dia não as aplicava: dois agendamentos sobrepostos ficavam um por cima do outro e o de trás tornava-se inclicável. A vista Semana aplicava corretamente `item.column * colWidth`.
2. `DayCalendar.tsx` pintava todos os blocos com `bg-primary bg-opacity-75`. O status (agendado, confirmado, cancelado, concluído, não compareceu) não era distinguível, ao contrário do Mês e da Semana.
3. `WeekCalendar.tsx` calculava `isToday` a partir da prop `todayKey`, enquanto o cabeçalho e o resto do componente usavam `todayKeyInternal` (a prop ou, em falta dela, a data corrente na timezone da empresa). Sem a prop, a coluna de hoje não era destacada.
4. Os itens do mês herdavam `.calendar-item { min-height: 3.45rem }`, uma medida pensada para a grelha de horas de 48px das vistas Semana/Dia. Com 4 eventos mais o indicador de excesso, o conteúdo do dia ultrapassava a célula, tornando as linhas muito altas e irregulares consoante a densidade.
5. O indicador `+N mais` era texto centrado e discreto, sem afordância, apesar de o dia inteiro ser clicável.
6. O marcador de "hoje" no mês usava estilos inline (`width/height/lineHeight` de 26px) em vez de classes, ao contrário de todo o resto do sistema.
7. A `CalendarToolbar` escondia o período abaixo de `576px` (`d-none d-sm-inline`) e só o Mês tinha um título alternativo (`d-sm-none`). Nas vistas Semana, Dia e Lista o período ficava **invisível em mobile**; no Mês o período aparecia duas vezes.
8. O seletor de data do formulário de agendamento (`AppointmentCalendar.tsx`, dentro de `AppointmentForm`) usava `.calendar-grid`, `.calendar-day` e `.calendar-legend`, **nenhuma das quais existia em `index.css`**. O mês de criação/edição de agendamento era desenhado apenas com o Bootstrap base, sem a identidade visual do calendário principal.
9. Abaixo de `768px` as 7 colunas do mês eram comprimidas em ~50px cada em 390px, ilegíveis.

**Dashboard**

10. "Agenda do dia" e "Próximos agendamentos" recebiam os agendamentos na ordem devolvida pela API, sem ordenação. "Próximos" aplicava `slice(0, 5)` **antes** de qualquer ordenação, pelo que o agendamento mais próximo podia nem aparecer, enquanto um mais distante ocupava a lista.
11. Os cartões de agenda não indicavam quantos agendamentos continham.

**Disponibilidade**

12. `DAY_ORDER` segue a enum do backend (`SUNDAY=0`), pelo que o quadro começava no domingo, ao contrário de todas as vistas de calendário, que começam à segunda-feira (Luxon `weekday` / `WEEKDAYS_SHORT`). O mesmo produto apresentava duas semanas diferentes.
13. A regra CSS `.availability-day-card > .card-body > .mt-3` correspondia **tanto ao alerta de erro como ao contentor do botão Salvar**, colocando ambos em `grid-column: 2; grid-row: 3`. Com um erro por guardar, o alerta e o botão ficavam sobrepostos na mesma célula da grelha.
14. O estado "sem disponibilidade" dependia sobretudo da cor (topo do cartão verde/cinza e badge), sem um sinal de forma.

### Correções aplicadas — Dashboard

- `byStartAt` ordena `todayAppointments` e `upcomingAppointments`; a ordenação passa a preceder `slice(0, MAX_UPCOMING)`, garantindo que os 5 mais próximos são os apresentados.
- `.dashboard-agenda-count` mostra a quantidade de agendamentos no cabeçalho de cada cartão de agenda (só quando há linhas).
- Nenhuma chamada API, KPI, cálculo ou coluna foi adicionada ou alterada.

### Correções aplicadas — Calendário

- `APPOINTMENT_STATUS_CALENDAR_CLASS` em `config/appointmentStatus.ts` passou a ser a fonte única da cor por status, usada pelas vistas Mês, Semana e Dia. Eliminaram-se o mapa local duplicado em `AppointmentCalendarItem.tsx` e as cinco regras CSS `.calendar-week-event.status-*`, que eram redundantes face às classes `.status-*` (usadas com `!important`).
- `DayCalendar.tsx` aplica `item.column`/`item.totalColumns` como a Semana e reutiliza `.calendar-week-event` com `.calendar-event-time`, `.calendar-event-client` e `.calendar-event-service`. O serviço passa a ser uma terceira linha truncada, mantendo os três dados.
- `WeekCalendar.tsx` usa `todayKeyInternal` no `isToday`, alinhando coluna e cabeçalho e tornando o destaque independente de a prop ser fornecida.
- Itens do mês compactados com âmbito `.month-calendar` (altura mínima removida, `line-height` e escalas tipográficas próprias), mantendo as três linhas de informação. `.calendar-day-number`/`.today` substituem os estilos inline do marcador de hoje.
- `.calendar-overflow` dá afordância ao `+N mais` (continua a abrir o dia, como antes, através do clique na célula).
- `.calendar-toolbar-label` mantém o período visível em todas as larguras e vistas; a toolbar passou a `flex-wrap: wrap`, ficando o período em linha própria no mobile e o grupo de vistas sempre alcançável. O título duplicado do `MonthCalendar` foi removido.
- Abaixo de `768px` a grelha mensal mantém as 7 colunas com `min-width: 40rem` por linha e scroll horizontal dentro da própria grelha, em vez de 7 células ilegíveis.
- `.calendar-grid`, `.calendar-day` e `.calendar-legend` foram definidos, dando ao seletor de data do formulário a mesma linguagem visual do calendário principal.

### Correções aplicadas — Disponibilidade

- `DAY_DISPLAY_ORDER` introduz a ordem segunda→domingo **apenas para desenho**; `DAY_ORDER` mantém a ordem da enum porque indexa objetos por dia. Nenhum dia, valor ou chamada foi alterado.
- `.availability-day-save` no contentor do botão substitui o seletor `.mt-3`, eliminando a sobreposição entre alerta de erro e ação de guardar.
- `.is-unavailable` passa a ter topo tracejado e corpo esbatido, distinguindo o dia fechado por forma e não só por cor. O texto "Sem disponibilidade" e a nota "Sem horários definidos para este dia" foram mantidos.

### Testes, typecheck, build e coverage

8 testes de regressão novos:

- `CalendarView.test.tsx` (5): colunas distintas em agendamentos sobrepostos na vista Dia; cor por status na vista Dia; coluna de hoje destacada sem a prop `todayKey`; indicador de excesso no mês (4 visíveis + `1 mais`); período da toolbar sem `d-none`.
- `DashboardPage.test.tsx` (2): agenda do dia em ordem cronológica; agendamentos mais próximos primeiro.
- `AvailabilityPage.test.tsx` (1): semana apresentada de segunda a domingo.

Cada teste novo foi validado contra o defeito original: reintroduzindo `left: 0`, `todayKey` no `isToday`, removendo `byStartAt` e voltando a `DAY_ORDER`, os testes correspondentes falham.

Alteração de teste existente (5 posições): em `AvailabilityPage.test.tsx`, `getAllByRole("switch")[1]` passou a `[0]`. O índice identificava Segunda-feira pela posição Sunday-first; as asserções sobre o dia (`getByText("Segunda-feira")`, `Salvar Segunda-feira`) são as mesmas.

Validações:

- `npm.cmd run typecheck`: passou.
- `npm.cmd run build`: passou, 198 módulos, CSS 251.31 kB, JS 538.25 kB, 24.99s. Mantém o warning de chunk >500 kB.
- `npm.cmd test`: **864/864 testes em 79 ficheiros** (eram 856 no Refinamento 2).
- `npm.cmd run test:coverage`: Statements 96.05% (2530/2634), Branches 90.52% (1977/2184), Functions 96.41% (645/669), Lines 96.23% (2454/2550).

### Resoluções avaliadas

- **Passar o mês a lista vertical em mobile** foi descartado: duplicaria o DOM (quebrando consultas por role/nome) ou exigiria renderização condicional por media query, com duas árvores de calendário a manter. O scroll horizontal dentro da grelha mensal preserva a leitura do mês e todas as ações.
- **Encolher a fonte dos eventos** foi evitado; a hierarquia passa por ordem e truncagem, com a mesma altura de linha nas três vistas.
- **Scroll interno na vista Dia/Semana** não foi adicionado: a Week já tem `overflow-auto` no corpo e a Day não tem limite de altura. Impor `max-height` mudaria o comportamento de leitura no desktop sem necessidade.
- **Alinhar o calendário ao grid semanal do Relatórios** (domingo) foi descartado: em pt-PT e em uso administrativo a semana começa à segunda-feira, que é também o que o calendário já usava. A correção foi na Disponibilidade, não no calendário.
- **Coluna "Dia" na "Agenda do dia"** foi mantida, apesar de redundante: removê-la exigiria um novo prop e alteraria a estrutura testada das duas tabelas por um ganho pequeno.
- **Rótulo do switch para "Remover disponibilidade"**: o control é um `role="switch"` que abre a confirmação de exclusão e não adiciona dias. O badge já comunica o estado e o texto do switch não é a fonte da informação; manter "Disponível" evita sugerir que o switch cria dias.

### Fora de âmbito

Nada foi alterado em `server/`, endpoints, payloads, contratos, chamadas API, modelo, validações, regras de negócio, autenticação, sessão, RBAC, permissões de ação, Redux de domínio, notificações, reminders ou timezone. As três correções que mexem em lógica são de **apresentação**: a ordenação por `startAt` na leitura das listas, a ordem de desenho dos dias e o uso da coluna já calculada por `computeDayLayout`. Nenhuma ação, coluna, campo ou permissão foi removida. Nenhum commit, merge, push ou PR foi executado.

### Limitações

Continua a não haver Playwright/Puppeteer e o jsdom não calcula layout: o posicionamento por percentagem, o `min-width` da grelha mensal e a quebra de linha da toolbar foram verificados por leitura de CSS e por asserções estruturais, não por medição em navegador. Recomenda-se confirmar em 390/430/768px, em especial o scroll horizontal do mês e a largura do `min-width: 40rem` contra a largura real do contentor.

## CONTEXTO PARA A PRÓXIMA IA

O Stage 30 acumula agora seis frentes: a base de design system em tokens CSS, a reordenação por contexto e ação, o Refinamento 1 de responsividade/overflow/shell, o Refinamento 2 de consistência visual e o Refinamento 3 de Dashboard, Calendário e Disponibilidade.

O shell autenticado tem navbar escura com token `--sp-navbar-height`, nome truncado, `aria-expanded` no botão do menu, drawer com largura `min(260px, 82vw)`, região rolável própria e fecho por `Escape`, e `height: 100dvh` com fallback `100vh`. O sino de notificações tem badge contido, painel com `role="dialog"`, cabeçalho fixo, corpo rolável com `overscroll-behavior: contain`, quebra de texto longo e, até `991.98px`, painel `fixed` ancorado à viewport. Filtros segmentados usam `.filter-bar`. O quadro de disponibilidade alinha cabeçalho e corpo na mesma grelha de duas colunas.

Calendário (Refinamento 3): `APPOINTMENT_STATUS_CALENDAR_CLASS`, em `config/appointmentStatus.ts`, é a **fonte única** da cor por status nas vistas Mês, Semana e Dia — não voltar a criar mapas de status por componente. As três vistas usam os mesmos blocos: `.calendar-week-event` com `.calendar-event-time` (hora), `.calendar-event-client` e `.calendar-event-service`; as classes globais `.status-*` aplicam a cor com `!important`, pelo que **não** devem ser redefinidas por vista. `computeDayLayout` devolve `column`/`totalColumns` e as vistas Semana e Dia têm de os aplicar (`left: item.column * (100 / totalColumns)`), senão os sobrepostos reaparecem uns por cima dos outros. Os itens do mês são compactados por `.month-calendar .calendar-item` (sem `min-height`), o excesso é `.calendar-overflow` e o marcador de hoje é `.calendar-day-number.today`. O período vive em `.calendar-toolbar-label`, **sempre visível**, e abaixo de `768px` a grelha mensal faz scroll horizontal com `min-width: 40rem` por linha. O seletor de data do formulário usa `.calendar-grid`, `.calendar-day` e `.calendar-legend`, já definidas — qualquer classe nova usada num componente precisa de regra em `index.css`, ou o componente fica só com o Bootstrap base.

Dashboard: "Agenda do dia" e "Próximos agendamentos" são ordenados por `byStartAt` **antes** de `slice(0, MAX_UPCOMING)`, para que os 5 mais próximos sejam os apresentados. `.dashboard-agenda-count` mostra a quantidade no cabeçalho do cartão. Os KPIs continuam a ser exatamente os mesmos (Hoje, Pendentes, Confirmados, Clientes, Serviços e, para OWNER/ADMIN, Funcionários), alimentados pelas mesmas 4 chamadas — não introduzir dados ou chamadas para melhorar o aspeto.

Disponibilidade: `DAY_ORDER` continua na ordem da enum do backend (`SUNDAY=0`) porque indexa objetos por dia; `DAY_DISPLAY_ORDER` é a ordem de desenho (segunda→domingo) e a única a usar no mapa de cartões. Todas as vistas de calendário começam à segunda-feira. `.availability-day-save` substitui qualquer seletor por `.mt-3` dentro do cartão, para o alerta de erro e o botão Salvar não ocuparem a mesma célula da grelha. O estado fechado é sinalizado por forma (topo tracejado) e não só por cor.

Sistema de tabelas: **todas as 9 tabelas** usam `.table-card > .table-responsive > .table`, com `.table-card` a fornecer a única moldura (below `768px` o contentor deixa de desenhar uma segunda borda). `.table-compact` marca as 3 tabelas de Relatórios, que se ajustam à largura; as restantes mantêm `min-width: 680px` com scroll interno e nunca são convertidas em cards. A coluna de estado chama-se **Status** em todas as páginas e usa badge. `.table-subline` é a segunda linha de célula e `.table-actions` o contentor de ações; `.person-cell > :not(.person-avatar)` é o seletor correto para o contentor textual da célula de identidade.

Modais: cadeia flex com corpo rolável, margem lateral até `768px`, e **uma única métrica de rodapé** para os dois formatos (irmão do corpo ou dentro do corpo) — mesmo `padding`, `gap: .5rem` e margens de filho a zero, borda superior em todos os breakpoints, e `sticky` + fundo só no mobile. Linhas de campos lado a lado usam `row g-3` para não ultrapassar o padding do corpo.

Invariantes preservadas nos três refinamentos: `server/` intocado, sem alterações de API, payloads, contratos, autenticação, sessão, RBAC, Redux de domínio, `MANAGER -> USER_READ`, notificações/reminders, timezone, regras de agendamento, validações ou permissões; nenhuma função, ação ou coluna removida. `npm.cmd run typecheck`, `npm.cmd run build` e `npm.cmd run test` passam com 864/864 testes em 79 ficheiros, e `test:coverage` com 96.05% de statements, 90.52% de branches, 96.41% de funções e 96.23% de linhas; o warning de chunk >500 kB do Vite não é falha funcional.

Prática de testes a manter: cada teste novo de regressão deve ser confirmado a falhar contra o defeito que corrige (reintroduzir o código anterior e ver o teste falhar). Os 8 testes do Refinamento 3 foram validados dessa forma. Alterações de teste que acompanham mudanças intencionais de apresentação estão registadas acima (5 índices posicionais em `AvailabilityPage.test.tsx`), com as asserções de conteúdo mantidas.

Decisões a não repetir sem nova decisão: rodapés de modal não foram alargados (`AppointmentForm` é `modal-lg` por conteúdo); o rótulo "Timezone" não foi traduzido porque a mensagem de erro do servidor usa o mesmo termo; `LoadingState`/`ErrorState` continuam sem uso porque os 8 blocos inline já são idênticos; os controlos segmentados mantêm dois mecanismos de classe; a linha de contagem não foi acrescentada às páginas que não a têm; o mês não passa a lista vertical em mobile (scroll horizontal na grelha).

Pendências conhecidas para a próxima IA: `LoadingState` e `ErrorState` continuam sem imports no produto (decisão registada, não esquecimento); não há busca/filtro em Clientes e Serviços; menus contextuais para ações secundárias permanecem por construir; code splitting continua pendente para reduzir o bundle principal; a avaliação de menus contextuais do Refinamento 1 mantinha-se pendente. A coluna "Dia" da "Agenda do dia" é redundante e foi mantida deliberadamente. A validação em navegador real nos breakpoints 390/430/768/1366/1920px continua não automatizada — se houver Playwright disponível, deve ser a primeira verificação, em especial para o scroll horizontal do mês e para a quebra de linha da toolbar. Antes de qualquer alteração, repetir `npm.cmd run typecheck`, `npm.cmd run build` e a suíte Vitest, e não alterar testes para acomodar regressões de produto.
