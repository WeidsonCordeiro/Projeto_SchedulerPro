# SchedulerPro — Auditoria técnica UX responsiva: Funcionários, Clientes e Serviços

## 1. Objetivo e escopo

**Objetivo:** documentar o estado actual das páginas de listagem **Funcionários**, **Clientes** e **Serviços**, para fundamentar evoluções futuras de UX mobile (cards &lt;768px, tabelas ≥768px), alinhadas ao padrão já usado no Dashboard e em Relatórios.

**Escopo da auditoria (confirmado por leitura de código):**

- Componentes de página, tipos, permissões, APIs, estilos globais relevantes e testes.
- Avaliação de paridade mobile/desktop e riscos de regressão.

**Fora de escopo:** alterações a código, CSS, testes, APIs ou configurações. Nenhuma operação Git de escrita foi executada durante a elaboração deste documento.

---

## 2. Estado inicial do repositório

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `42193a1880e289702a071d97330480c23d9307b5` |
| Tracking | `origin/develop` |
| Working tree | limpa (`git status`: nada a comitar) |

**Fato:** não há ficheiros modificados nem não rastreados no momento da auditoria.

---

## 3. Arquivos analisados

| Categoria | Caminhos |
|-----------|----------|
| Páginas | `client/src/pages/employees/EmployeesPage.tsx`, `client/src/pages/clients/ClientsPage.tsx`, `client/src/pages/services/ServicesPage.tsx` |
| Permissões | `client/src/config/employeePermissions.ts`, `client/src/config/clientPermissions.ts`, `client/src/config/servicePermissions.ts` |
| Tipos | `client/src/types/employee.ts`, `client/src/types/client.ts`, `client/src/types/service.ts` |
| APIs | `client/src/api/endpoints/employees.api.ts`, `client/src/api/endpoints/clients.api.ts`, `client/src/api/endpoints/services.api.ts` |
| Erros / carregamento | `client/src/api/errors.ts` (uso indirecto via `getPageLoadErrorPresentation`, `getApiError`, `getFriendlyErrorMessage`) |
| Estilos | `client/src/index.css` (secções `.table-card`, `.entity-list-mobile`, `.table-actions`, `.table-subline`) |
| Testes | `client/src/pages/employees/EmployeesPage.test.tsx`, `ClientsPage.test.tsx`, `ServicesPage.test.tsx` (+ `*.photo.test.tsx` onde aplicável) |
| Referência Relatórios | `client/src/pages/reports/ReportsPage.tsx` (classes `reports-ranking-mobile-*`, superfície dupla) |

---

## 4. Arquitetura actual das três páginas (factos)

### 4.1 Padrão de apresentação responsiva

**Fato:** as três páginas **já** implementam superfície dupla com breakpoint Bootstrap `md` (768px):

| Superfície | Classes típicas | `data-testid` |
|------------|-----------------|---------------|
| Tabela (≥768px) | `card table-card mt-3 d-none d-md-block` | `employees-list-desktop`, `clients-list-desktop`, `services-list-desktop` |
| Cards (&lt;768px) | `entity-list-mobile d-md-none mt-3` | `employees-list-mobile`, `clients-list-mobile`, `services-list-mobile` |

**Implicação:** o pedido de negócio “mobile em cards / tablet e desktop em tabela” **já está coberto** a nível de estrutura. Qualquer trabalho futuro tende a ser **refinamento visual**, **paridade de informação** ou **alinhamento** com o padrão de Relatórios, não introdução do padrão dual *de raiz*.

### 4.2 Dados e carregamento

**Fato:** em todas as páginas:

- Lista carregada com `useCallback` + `useEffect` chamando `*Api.get*()`.
- Estado local: `isLoading`, `loadError`, `loadErrorRetryable`, lista de entidades, `successMessage`; Funcionários e Serviços também têm `actionError` / `togglingId` para acções assíncronas.
- **Não existe** nos três ficheiros de página: paginação, ordenação, pesquisa nem filtros de listagem.

### 4.3 Permissões (RBAC no cliente)

Resumo alinhado a `get*Abilities` (backend é autoridade final):

| Página | Quem lista | Criação | Edição / gestão | Eliminar | Notas |
|--------|------------|---------|-----------------|----------|--------|
| Funcionários | OWNER, ADMIN | OWNER, ADMIN | idem + ativar/desativar | só OWNER | Sem lista: MANAGER/EMPLOYEE/CLIENT veem aviso de permissão |
| Clientes | OWNER, ADMIN, MANAGER, EMPLOYEE | OWNER, ADMIN, MANAGER | OWNER, ADMIN, MANAGER | só OWNER | Convite portal: OWNER, ADMIN (`canInvite`) |
| Serviços | OWNER, ADMIN, MANAGER, EMPLOYEE | OWNER, ADMIN | OWNER, ADMIN | só OWNER | — |

**Fato:** as acções nas linhas/cards usam os mesmos `render*RowActions` para desktop e mobile, pelo que **permissões e handlers** não duplicam lógica de negócio entre superfícies.

### 4.4 Componentes reutilizáveis

**Fato:** uso comum de `PageHeader`, `DashboardCard`, `LoadingState`, `ErrorState`, `EmptyState`, `ImageAvatar` (Funcionários e Clientes), formulários e modais por domínio (`EmployeeForm`, `ClientForm`, `ServiceForm`, modais de eliminação, etc.).

---

## 5. Auditoria detalhada — Funcionários

**Página principal:** `EmployeesPage.tsx`.

### 5.1 Listagem e colunas (desktop)

**Fato (tabela):** colunas: Funcionário (avatar + nome + “Você” se próprio), E-mail, Perfil (badge de `role`), Status (Ativo/Inativo), Adicionado em (`formatDate(createdAt)`), Ações (condicional `actionsVisible`).

**Fato:** após `getEmployees()`, o cliente filtra `role !== "CLIENT"` (defensivo).

### 5.2 Cards (mobile)

**Fato:** avatar + nome + “Você”, e-mail (`entity-card-email`), badges de perfil e status, “Adicionado em …”, `card-footer` com mesmas acções que a tabela.

### 5.3 Acções por registo

**Fato:** Editar (`canEdit`); Desativar/Ativar conforme estado e não ser próprio utilizador (`canDeactivate` / `canActivate`); Excluir (`canDelete`, não self). Botões partilham `table-actions` e estados `togglingId`.

### 5.4 Estados

**Fato:** loading (`LoadingState`), erro com retry condicionado (`ErrorState`), vazio (`EmptyState` + botão criar se `canCreate`), KPIs (`DashboardCard` — total, ativos, managers) só quando há dados.

### 5.5 Gaps / hipóteses UX mobile

| Tópico | Fato | Hipótese (validar visualmente) |
|--------|------|--------------------------------|
| Paridade tabela vs card | Mesmos campos visíveis nos cards | OK para utilizadores actuais |
| Accordion | Não usado | Provavelmente desnecessário (poucos campos por cartão) |
| Nomes/e-mails longos | `.entity-card-email` com quebra; tabela com `overflow-wrap` global em células | Confirmar em 360–430px |
| Scroll horizontal | Tabela dentro de `table-responsive`; `.table-card { overflow: hidden }` | Confirmar que não há overflow na página em mobile quando só cards visíveis |

---

## 6. Auditoria detalhada — Clientes

**Página principal:** `ClientsPage.tsx`.

### 6.1 Listagem e colunas (desktop)

**Fato:** Cliente (avatar + nome), Email (`text-nowrap` na célula — pode forçar scroll horizontal **dentro** do `table-responsive` em emails muito longos), Telefone, Status, Ações.

### 6.2 Cards (mobile)

**Fato:** avatar + nome, e-mail, telefone, badge de status, `card-footer` com acções.

### 6.3 Acções

**Fato:** Editar (`canUpdate`); Convidar (`canInvite` + `client.email` + `!client.portalAccess.exists`); Excluir (`canDelete`). Sem `togglingId` nas acções (diferente de Funcionários/Serviços).

### 6.4 Tipo vs UI

**Fato:** `Client` inclui `notes`, `portalAccess`, `createdAt` / `updatedAt` — **nenhum** destes campos aparece na tabela ou no card de listagem. Isto é **lacuna de listagem**, não bug: edição pode expor no `ClientForm` (fora do âmbito desta leitura).

### 6.5 Gaps / hipóteses UX mobile

| Tópico | Fato | Hipótese |
|--------|------|----------|
| Indicador de portal / convite | Só “Convidar” ou ausência do botão | Pode ser útil mostrar estado de convite no card (requer decisão de produto; hoje inferido pelas acções) |
| Email `text-nowrap` na tabela | Pode aumentar largura mínima da tabela | Validar scroll só no contentor, não na página |
| Paridade com Funcionários | Layout semelhante (person-cell + footer) | Alinhamento com `.reports-ranking-mobile-*` é opcional e cosmético |

---

## 7. Auditoria detalhada — Serviços

**Página principal:** `ServicesPage.tsx`.

### 7.1 Listagem e colunas (desktop)

**Fato:** Serviço (nome + `table-subline` opcional com descrição), Duração (`N min`), Preço (`formatPrice`), Status, Ações.

### 7.2 Cards (mobile)

**Fato:** `h6` com nome; descrição com `entity-card-description` (clamp 3 linhas em CSS); linha “`duration` min · `price`”; badge de status; footer com acções.

### 7.3 Acções

**Fato:** Editar; Desativar/Ativar (`handleToggleActive` + `togglingId`); Excluir (`canDelete`). `canUpdate` controla edição e toggle.

### 7.4 Gaps / hipóteses UX mobile

| Tópico | Fato | Hipótese |
|--------|------|----------|
| Descrição truncada | `-webkit-line-clamp: 3` em `.entity-card-description` | Utilizador pode precisar de ver texto completo no cartão ou só no formulário — validar |
| Duração + preço numa linha | Compacto | Avaliar se métrica principal deve ser preço vs nome (produto) |

---

## 8. Comparação entre as três páginas

| Aspeto | Funcionários | Clientes | Serviços |
|--------|--------------|----------|----------|
| Dual layout `md` | Sim | Sim | Sim |
| Avatar | Sim | Sim | Não |
| KPIs no topo | 3 cartões | 1 cartão | 2 cartões |
| Acções async com disabled global na linha | Sim (`togglingId`) | Não | Sim (`togglingId`) |
| Campos extra no tipo não na lista | — | `notes`, datas, `portalAccess` | `createdAt` / `updatedAt` |

**Referência Relatórios:** rankings usam `.reports-page .reports-ranking-mobile-*` (lista densa, métrica principal + `dl`). As entidades usam **Bootstrap card** + `entity-list-mobile` — stacks visuais diferentes mas **mesmo mecanismo** `d-none d-md-block` / `d-md-none`.

---

## 9. Proposta de organização dos cards mobile (evolutiva, não implementada)

**Premissa:** manter lógica de negócio nos handlers existentes; qualquer mudança deve ser **apresentação** e eventualmente extração de subcomponente puramente visual.

### 9.1 Funcionários

- **Destaque:** nome + avatar; secundário: e-mail, perfil, estado, data.
- **Acções:** manter no rodapé (padrão actual) ou barra fixa no card — validar toque alvo ≥44px.
- **Accordion:** não recomendado salvo aumento forte de campos na listagem.

### 9.2 Clientes

- **Destaque:** nome + avatar; secundário: email, telefone, status.
- **Opcional (produto):** chip “Portal: …” derivado de `portalAccess` — **não existe hoje** na UI de lista; seria campo novo na camada de apresentação.
- **Accordion:** não necessário para o conjunto actual de campos visíveis.

### 9.3 Serviços

- **Destaque:** nome do serviço; secundário: preço e duração (ou inverter hierarquia se negócio priorizar preço).
- **Descrição:** hoje limitada a 3 linhas no mobile — documentar na app ou expandir com “ver mais” seria decisão de produto (não auditada como requisito).

---

## 10. O que permanece nas tabelas desktop

**Fato:** todas as colunas actuais devem permanecer em ≥768px salvo alteração explícita de produto. Os requisitos de “preservar funcionalidades” implicam manter colunas de acção e mesmos dados que os cards quando a paridade for um objectivo.

---

## 11. Componentes e estilos reutilizáveis

**Fato (já no projecto):**

- `entity-list-mobile`, `entity-card-email`, `entity-card-description` (`index.css`).
- `table-card`, `table-actions`, `table-subline`, `person-cell` (uso nas páginas).
- Padrão Relatórios: `reports-ranking-mobile-*` sob `.reports-page` (referência para **consistência visual** futura, não obrigatório copiar para entidades).

**Recomendação:** evitar nova biblioteca; preferir consolidar tokens (espaçamento, tipografia de métricas) entre Relatórios e entidades **só** se houver decisão de design unificada.

---

## 12. Estratégia de breakpoints

**Fato:** uso consistente de **`md` (768px)** como fronteira (`d-md-block` / `d-md-none`), alinhado ao enunciado e ao resto do app.

**Hipótese:** testes manuais em 767px vs 768px para garantir que não há flash de ambas as superfícies.

---

## 13. Testes existentes e cenários futuros

### 13.1 Factos

- Cada página tem `*Page.test.tsx` com helpers `*Desktop()` / `*Mobile()` baseados em `data-testid`.
- Testes verificam classes `d-none d-md-block` e `d-md-none` nas superfícies (ex.: Employees ~579–583; Clients ~602–606; Services ~502–506).

### 13.2 Sugestões para implementação futura (não executadas nesta auditoria)

- Asserts `within(mobile)` para conteúdo crítico por item (hoje muitos testes focam a tabela desktop).
- `data-testid` por item (`*-card-{id}`) se surgirem testes de interacção granulares — **opcional**; evitar ruído excessivo.
- Casos de permissão já parcialmente cobertos — replicar padrão para novos campos visuais.
- Testes de `portalAccess` / convite no **mobile** se a UI passar a mostrar estado explícito.

---

## 14. Riscos de regressão

| Risco | Mitigação sugerida |
|-------|---------------------|
| Duplicar lógica entre tabela e cards | Manter um único renderer de acções e, se extrair componente, só props de dados |
| CSS global `.table` / `.table-card` afectar outras páginas | Alterações localizadas ou classes por página (ex.: prefixo) |
| Omissão de campos no mobile vs desktop | Checklist de paridade antes de fechar features |
| Emails longos / `text-nowrap` (Clientes) | Rever apenas na linha de tabela; não espalhar `nowrap` em cards |

---

## 15. Ordem recomendada de implementação futura

1. **Validação visual** nas três páginas (360–430px e ≥768px) — confirmar se o problema é só polish.
2. **Clientes:** decidir se estado de portal/convite deve aparecer no card (produto) antes de alterar markup.
3. **Serviços:** decidir hierarquia nome/preço e política de descrição truncada.
4. **Alinhamento visual** opcional com tokens de Relatórios (refactor cosmético por último).
5. Ajustar testes apenas depois de congelar decisões de UI.

---

## 16. Ficheiros que provavelmente serão tocados numa fase de implementação

(Referência para outra IA — **não modificados nesta auditoria**.)

- `client/src/pages/employees/EmployeesPage.tsx`
- `client/src/pages/clients/ClientsPage.tsx`
- `client/src/pages/services/ServicesPage.tsx`
- `client/src/index.css` (secções `entity-list-mobile`, eventual novo escopo por página)
- `client/src/pages/*/*Page.test.tsx`
- Possível extraccão: `client/src/components/...` apenas se surgir componente partilhado aprovado

**Nota:** `DashboardCard`, `get*Abilities`, endpoints e tipos só mudam se a feature o exigir explicitamente.

---

## 17. Contexto para continuidade (outra IA)

1. **Fato crítico:** cards mobile **já existem**; o trabalho futuro é iterativo sobre o mesmo padrão Bootstrap.
2. Relatórios usam outro “skin” (`.reports-ranking-mobile-*`); entidades usam cards Bootstrap + `.entity-list-mobile`.
3. Não há paginação nem filtros — listas completas em memória após `get*`.
4. RBAC: sempre espelhar `get*Abilities`; backend valida na mesma.

---

## 18. Confirmações finais desta auditoria

| Confirmação | Estado |
|-------------|--------|
| Documento criado apenas em `docs/reports/schedulerpro-employees-clients-services-mobile-ux-audit.md` | Sim |
| Nenhum componente React, CSS, teste, API ou tipo alterado pelo autor desta auditoria | Sim |
| Nenhuma operação Git de escrita (commit, push, merge, etc.) | Sim |
| Caminho do documento | `docs/reports/schedulerpro-employees-clients-services-mobile-ux-audit.md` |

---

### Legenda

- **Fato:** verificável directamente no código referenciado.
- **Hipótese:** requer validação visual ou decisão de produto.
- **Recomendação:** orientação para fases futuras; não constitui implementação.
