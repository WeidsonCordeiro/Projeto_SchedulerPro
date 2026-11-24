# SchedulerPro --- Resumo Geral do Sistema

**Documento de referência do projeto**\
**Atualizado em:** 23/11/2026\
**Estado:** Resumo consolidado com base no contexto e nas
auditorias/relatórios partilhados até esta data.

------------------------------------------------------------------------

## 1. Visão geral

O **SchedulerPro** é um SaaS reutilizável de agendamento, concebido para
suportar múltiplas empresas (multi-tenant). O primeiro cenário de
utilização é uma barbearia, mas a arquitetura pretende permitir a
adaptação a outros segmentos, como consultórios dentários, ginásios e
serviços que trabalhem com marcações.

Cada empresa utiliza a plataforma no seu próprio contexto, com
isolamento dos respetivos dados. O identificador da empresa
(`companyId`) é a referência central para a separação dos dados entre
tenants.

O produto é uma aplicação de gestão e agendamento para cada empresa. Não
deve ser confundido com um painel global de administração da plataforma:
a gestão de empresa existente é de **self-service do próprio tenant**.

## 2. Objetivos e princípios do projeto

-   Construir primeiro o backend e validar os endpoints com Postman.
-   Desenvolver e validar o frontend depois de a base do backend estar
    estável.
-   Manter uma arquitetura modular, reutilizável e preparada para
    crescimento.
-   Garantir isolamento multi-tenant em consultas e operações.
-   Separar regras de negócio, acesso a dados, controladores e
    infraestrutura.
-   Preservar segurança, rastreabilidade, validação e tratamento
    consistente de erros.
-   Evitar alterações amplas quando uma correção localizada é
    suficiente.
-   Registar cada tarefa de implementação num documento Markdown em
    `docs/tasks/`, com o que foi feito, decisões, ficheiros e contexto
    suficiente para outra IA continuar o trabalho.

## 3. Stack tecnológica

### Backend

-   Node.js
-   Express
-   TypeScript
-   MongoDB
-   Mongoose
-   JWT para autenticação
-   bcrypt para hash de palavras-passe
-   Winston para logging, encapsulado por uma abstração própria
-   Morgan para logging HTTP
-   Cloudinary para uploads
-   Redis previsto para cache
-   Resend e API WhatsApp previstos para notificações
-   Sentry previsto para monitorização de erros
-   Helmet e mecanismos de sanitização/validação para reforço de
    segurança
-   express-validator considerado para validação de entradas

A implementação concreta de cada integração deve ser confirmada no
código atual antes de assumir que está ativa em produção.

### Frontend

-   React
-   Redux
-   Vite
-   Bootstrap
-   CSS próprio e tokens de design `--sp-*`
-   Bootstrap Icons

**Decisão explícita:** não utilizar Tailwind CSS.

## 4. Arquitetura e organização do backend

O backend segue uma organização modular por domínio, com separação
entre:

-   **Routes:** definição dos endpoints e composição dos middlewares.
-   **Controllers:** receção dos pedidos e construção das respostas
    HTTP.
-   **Services:** regras e orquestração de negócio.
-   **Repositories:** acesso e persistência dos dados.
-   **Models:** modelos Mongoose.
-   **DTOs e tipos:** contratos internos e estruturas de dados.
-   **Validators:** validação de parâmetros e payloads.
-   **Providers:** integrações e infraestrutura, como base de dados e
    logging.
-   **Middlewares:** autenticação, autorização, validação, tratamento de
    erros e contexto do pedido.

### Arranque e ciclo de vida

-   `app.ts` configura a aplicação Express, mas não abre a porta HTTP.
-   `server.ts` utiliza `startServer()`.
-   A ligação à base de dados é estabelecida antes de `app.listen`.
-   O encerramento trata sinais `SIGINT` e `SIGTERM` e procura desligar
    os recursos de forma controlada.
-   A camada de base de dados utiliza uma abstração `IDatabaseProvider`,
    com operações `connect()`, `disconnect()`, `isConnected()` e
    `getStatus()`.

### Logging

O logging é encapsulado em `providers/logger/`, evitando que
controllers, services e repositories dependam diretamente do Winston.

A interface usada pelas camadas da aplicação é, por exemplo,
`Logger.info(...)`. O contexto de log pode incluir `requestId`,
`userId`, `companyId`, método, URL, IP e stack trace.

Categorias observadas incluem `DATABASE`, `SYSTEM` e `AUTH`. Morgan é
configurado separadamente para pedidos HTTP.

### Tratamento de erros

A arquitetura inclui um fluxo centralizado de erros, com `AppError`,
resposta HTTP normalizada e middleware de erro. Existe também middleware
para rotas não encontradas.

## 5. Multi-tenancy, utilizadores e permissões

O isolamento entre empresas é um requisito estrutural.

-   O `companyId` deve ser obtido do contexto autenticado, e não aceite
    cegamente de parâmetros enviados pelo cliente.
-   As consultas e operações devem respeitar o tenant autenticado.
-   As permissões são controladas por papéis e permissões específicas.
-   O sistema distingue, entre outros, os papéis `OWNER`, `ADMIN`,
    `MANAGER`, `EMPLOYEE` e `CLIENT`.
-   A autorização combina autenticação, verificações operacionais da
    empresa, papéis e permissões conforme o endpoint.

### Acesso ao Dashboard

Segundo a auditoria do Dashboard, o endpoint de resumo é protegido por
autenticação, conclusão da alteração obrigatória de palavra-passe,
verificação de empresa operacional, autorização por papel e permissão
`APPOINTMENT_READ`.

O `companyId` é derivado do JWT. O âmbito de leitura dos agendamentos
pode ser limitado ao próprio colaborador para `EMPLOYEE`. `CLIENT` não
está incluído nos papéis autorizados para o Dashboard.

## 6. Funcionalidades e domínios conhecidos

O projeto evoluiu através de módulos e tarefas incrementais. Com base no
histórico e nos relatórios partilhados, os seguintes domínios estão
implementados ou já foram objeto de trabalho relevante:

-   Autenticação e gestão de sessão.
-   Utilizadores e permissões.
-   Gestão da empresa (Company Management).
-   Agendamentos e respetivos estados.
-   Fluxos de agendamento público.
-   Disponibilidade e operações de criação/alteração de agendamentos.
-   Dashboard com resumo de atividade.
-   Calendário e visualização de agendamentos.
-   Clientes e serviços.
-   Gestão de colaboradores.
-   Relatórios e componentes comuns de apresentação.

A lista é um resumo dos domínios conhecidos; não substitui um inventário
atualizado do repositório nem afirma que todas as funcionalidades
planeadas ou integrações externas estão concluídas.

## 7. Company Management --- regras confirmadas

A gestão da empresa é uma área de self-service do tenant. A criação da
empresa ocorre no fluxo de registo, através de
`AuthService.createCompany`, dentro da transação de registo. Não foi
identificado um endpoint autenticado genérico `POST /companies` para
criar empresas adicionais.

### Capacidades identificadas

-   Consultar e atualizar dados da empresa.
-   Alterar nome e timezone.
-   Carregar ou remover logótipo.
-   Desativar e reativar a empresa.
-   Eliminar logicamente (soft delete) a empresa, sujeito às regras de
    autorização e proteção de agendamentos.

### Regras de ciclo de vida

-   A eliminação é uma operação lógica: define `deletedAt` e
    `isActive: false`.
-   Não existe cascade delete dos dados relacionados.
-   Não existe restauração/reactivação de uma empresa já eliminada.
-   A eliminação é restrita ao papel `OWNER` e à permissão
    correspondente.
-   A operação é bloqueada quando existem agendamentos não eliminados
    com estado `SCHEDULED` ou `CONFIRMED` e `endAt > now`.
-   A resposta de bloqueio usa HTTP 409 e o código
    `COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS`.
-   Agendamentos `CANCELLED`, `COMPLETED` e `NO_SHOW` não bloqueiam a
    eliminação.
-   A desativação suspende colaboradores que não sejam `OWNER`; a
    reativação repõe os que foram suspensos por essa desativação.

### Concorrência e transações

A implementação B2.4 utiliza um mecanismo de serialização associado ao
documento da empresa (`bookingSerializationVersion`) para coordenar
operações de agendamento e eliminação. O repositório disponibiliza
`touchBookingSerialization`, que atualiza esse campo dentro da transação
para provocar conflito de escrita quando necessário.

As transações de ciclo de vida e de agendamento têm políticas
específicas de retry. Em resultados de commit desconhecidos, a política
é repetir o `commitTransaction` na mesma sessão/transação, em vez de
executar novamente o callback. Não alterar estas políticas sem nova
análise e evidência.

### Pontos de manutenção registados

Foram identificados como assuntos futuros, não como tarefas autorizadas
de alteração:

1.  `CompanyService.create()` está vazio; avaliar se está efetivamente
    sem utilização antes de o remover.
2.  `CompanyRepository.findAll()` devolve apenas a empresa do tenant;
    considerar `findByTenantId()` numa refatoração futura, sem quebrar
    contratos.
3.  O índice global único do nome da empresa faz com que uma empresa
    soft-deleted continue a reservar o nome. A regra de negócio deve ser
    decidida antes de alterar o índice.

## 8. Dashboard --- comportamento confirmado

O backend disponibiliza `GET /api/dashboard/summary`.

### Dados e âmbito

-   O resumo é calculado para o tenant do utilizador autenticado.
-   O âmbito de leitura pode restringir os resultados de `EMPLOYEE` aos
    seus próprios agendamentos.
-   O período usa o intervalo `[startAt, endAt)`.
-   `period.byStatus` inclui todos os estados oficiais.
-   `period.total` soma os estados incluídos na distribuição.
-   `todayAppointments` exclui `CANCELLED`.
-   `upcomingAppointments` considera `SCHEDULED` e `CONFIRMED`, com
    `startAt >= now`, e tem limite configurável dentro dos limites
    definidos pelo backend.
-   `activeClientsCount` é opcional e não é disponibilizado para
    `EMPLOYEE`.

### KPIs aprovados

As decisões de produto aprovadas para o Dashboard são:

  -----------------------------------------------------------------------
  KPI                                 Regra
  ----------------------------------- -----------------------------------
  Agendamentos do dia                 `todayAppointments.length`; inclui
                                      SCHEDULED, CONFIRMED, COMPLETED e
                                      NO_SHOW; exclui CANCELLED

  Agendados                           Apenas `period.byStatus.scheduled`

  Confirmados                         Apenas `period.byStatus.confirmed`

  Clientes ativos                     `activeClientsCount`; oculto para
                                      EMPLOYEE
  -----------------------------------------------------------------------

A distribuição por estado continua a apresentar o conjunto completo de
estados. Por isso, os valores dos KPIs não têm de somar ao total da
distribuição.

### Data civil e timezone

O Dashboard deve apresentar a data civil do resumo no timezone da
empresa, usando `company.timezone`, e não o timezone do navegador nem um
valor fixo no componente.

A função `formatDashboardSummaryDay(timezone, now?)` foi adicionada a
`client/src/config/reportPeriod.ts`. A sua abordagem valida o timezone
IANA e utiliza `buildReportRange("today", timezone, ...)`, mantendo
coerência com o período pedido à API.

### Melhorias visuais concluídas segundo relatório e auditoria

-   O cartão anteriormente chamado "Hoje" passou a "Agendamentos do
    dia".
-   "Pendentes" passou a "Agendados".
-   O cartão "Confirmados" manteve a semântica.
-   O cartão "Clientes ativos" recebeu a classe específica
    `dashboard-kpi-accent-clients`.
-   A altura das barras de distribuição passou para `0.6rem`.
-   A classe de acento é localizada ao Dashboard e não depende de
    `nth-child(4)`.
-   As regras partilhadas `nth-child(1–3)` de outras páginas foram
    preservadas.

### Refresh

A auditoria anterior identificou o mecanismo
`useDashboardVisibilityRefresh`, com throttling de 45 segundos, proteção
contra pedidos simultâneos, limpeza do estado in-flight e proteção
contra respostas obsoletas.

O refresh O5 foi explicitamente excluído da tarefa de clarificação dos
KPIs e melhorias visuais. Não deve ser alterado sem autorização e
análise próprias.

### Estado da última tarefa do Dashboard

A implementação foi reportada com: - Frontend: 71/71 testes aprovados. -
Backend `DashboardService`: 5/5 testes aprovados.

A auditoria read-only posterior classificou-a como **APROVADO COM
OBSERVAÇÕES**. O diff confirmou as alterações esperadas e não
identificou alterações em `server/**`, refresh O5 ou RBAC. Os testes não
foram reexecutados durante essa auditoria final.

Observações não bloqueantes registadas: - Diferença editorial entre
"excepto" e "exceto". - `reportPeriod.ts` sem newline final. - Testes
não reexecutados durante a auditoria. - Não existe teste E2E manual
nesta entrega.

## 9. Regras de agendamentos e transações --- contexto relevante

Os agendamentos têm estados como `SCHEDULED`, `CONFIRMED`, `CANCELLED`,
`COMPLETED` e `NO_SHOW`.

A auditoria B2.4 registou: - Criação e reagendamento participam na
serialização com o documento da empresa dentro da transação. -
Transições de estado que removem um agendamento da condição de bloqueio
não criam um novo bloqueador. - Não introduzir transições que reabram
estados sem rever as regras de concorrência. - A lógica de bloqueio da
eliminação usa o instante atual (`now`) e considera agendamentos em
curso ou futuros conforme `endAt > now`.

Estas regras são sensíveis a concorrência e não devem ser simplificadas
apenas com base em testes unitários isolados.

## 10. Frontend --- convenções e experiência

O frontend utiliza React, Redux, Vite e Bootstrap, com componentes
partilhados e CSS próprio.

Princípios observados: - Reutilização de componentes comuns, como
`DashboardCard`. - Componentes adaptados a desktop, tablet e mobile. -
Estados de loading, erro, retry e vazio. - Listas e tabelas com
apresentação responsiva. - Utilização de tokens `--sp-*` para
consistência visual. - Acessibilidade através de rótulos, atributos ARIA
e foco visível onde aplicável.

O componente `DashboardCard` é partilhado por diferentes áreas.
Alterações futuras devem preservar a compatibilidade com Clients,
Services, Employees e Reports.

## 11. Testes, validação e qualidade

O projeto utiliza testes unitários e de integração no backend e testes
no frontend. Os comandos e resultados devem ser confirmados no
`package.json` e no estado atual do repositório antes de serem
reutilizados.

Boas práticas de validação: 1. Inspecionar o código e os contratos
afetados. 2. Criar ou atualizar testes focados na regra alterada. 3.
Executar os testes relevantes. 4. Executar testes mais abrangentes
quando o impacto o justificar. 5. Distinguir testes efetivamente
executados de resultados apenas reportados. 6. Não concluir que uma
implementação está correta apenas porque os testes estão verdes. 7.
Fazer revisão do diff e verificar alterações fora do escopo.

## 12. Backlog e melhorias futuras conhecidas

Os seguintes pontos foram registados para avaliação futura, não
significando autorização automática para os implementar:

-   Gestão de empresas e Dashboard são áreas funcionais relevantes do
    roadmap.
-   Tornar o uso de `company.timezone` dinâmico em todo o frontend,
    substituindo valores fixos como `Europe/Lisbon`, antes de suportar
    empresas em múltiplos fusos horários.
-   Rever a inconsistência de RBAC entre `MANAGER` e `EMPLOYEE` quando
    houver contexto e evidência suficientes.
-   Avaliar os três pontos de manutenção de Company Management descritos
    na secção 7.
-   Rever o comportamento temporal de próximos agendamentos (M2) apenas
    numa tarefa própria.
-   Não reabrir o refresh O5 sem evidência nova.

## 13. Processo de trabalho recomendado

O processo acordado para evoluir o SchedulerPro é:

1.  **Auditoria:** analisar o estado real do código, os fluxos e os
    testes.
2.  **Relatório:** apresentar achados, evidências, riscos e pontos não
    verificáveis.
3.  **Decisão:** o utilizador aprova ou ajusta o âmbito e as regras.
4.  **Implementação:** preparar um prompt para Cursor Agent,
    instruindo-o a inspecionar os ficheiros necessários.
5.  **Documentação:** cada implementação deve criar um relatório `.md`
    em `docs/tasks/`, com alterações, decisões, testes e contexto
    suficiente para outra IA.
6.  **Validação:** rever o relatório, os testes e o diff real.
7.  **Git:** o utilizador controla branches, commits, PRs e restantes
    operações Git.

### Restrições de colaboração

-   Não assumir acesso direto ao repositório local.
-   Não afirmar que ficheiros ou diffs foram inspecionados se apenas foi
    recebido um relatório.
-   Não executar nem afirmar operações Git em nome do utilizador.
-   Não sugerir commit, push, merge, rebase, reset, stash, clean ou
    criação de branch sem autorização explícita.
-   Auditorias devem ser read-only e não devem alterar código,
    configurações ou documentação, salvo autorização explícita.
-   Distinguir sempre factos confirmados, inferências e itens ainda não
    verificados.

## 14. Ambiente e detalhes operacionais conhecidos

O backend foi desenvolvido no diretório local anteriormente indicado:

`C:\_IEFP\Treinamentos_Gerais\Projeto_SchedulerPro\server`

O projeto utiliza MongoDB Atlas com a base de dados `schedulerpro`. Uma
ligação local inicial a `mongodb://localhost:27017/agendamento` falhou
por indisponibilidade do serviço local; posteriormente, a ligação ao
Atlas foi confirmada com sucesso.

O servidor usa scripts baseados em `tsx watch`, `tsc` e execução do
JavaScript compilado em `dist`. Confirmar sempre os scripts atuais no
`package.json`, pois podem ter evoluído.

Não incluir neste documento segredos, tokens, credenciais ou valores de
`.env`.

## 15. Objetivo de evolução profissional associado

Depois de concluir o SchedulerPro, existe o objetivo de realizar a
etapa:

**Stage 99 --- Preparação para entrevista Mid-Level**

Com foco em: - Revisão técnica sem depender de IA. - Perguntas de
entrevista para Fullstack. - Simulações de entrevistas. - Exercícios de
live coding. - Capacidade de explicar decisões arquiteturais e regras de
negócio do SchedulerPro.

------------------------------------------------------------------------

## Nota de manutenção deste documento

Este documento é um resumo de contexto, não uma especificação formal
completa nem um inventário atualizado do repositório. Antes de
implementar novas funcionalidades, confirmar os ficheiros, contratos,
testes, branches e estado real do código. Atualizar este resumo quando
decisões de arquitetura ou regras de negócio forem alteradas e
aprovadas.
