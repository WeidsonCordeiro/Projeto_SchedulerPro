# SchedulerPro — Auditoria de responsividade das tabelas (768px–1200px)

## 1. Objetivo e escopo

Investigar causas técnicas de **quebra de conteúdo** e **colunas excessivamente estreitas** nas tabelas das páginas **Funcionários**, **Clientes** e **Serviços**, com foco na faixa **≥768px e &lt;1200px** (tablet / layout estreito antes do breakpoint `xl` do Bootstrap).

**Escopo:** leitura de código e CSS apenas. **Não foi realizada validação visual** nesta auditoria (sem servidor de preview nem inspecção em browser).

**Única alteração ao repositório:** criação deste ficheiro Markdown.

---

## 2. Estado inicial do repositório (read-only)

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `42193a1880e289702a071d97330480c23d9307b5` |
| Tracking | `origin/develop` |
| Working tree | ficheiro não rastreado pré-existente: `docs/reports/schedulerpro-employees-clients-services-mobile-ux-audit.md` |

**Nota:** não foram executadas operações Git de escrita (commit, push, merge, etc.) durante esta auditoria.

---

## 3. Ficheiros analisados

| Área | Caminho |
|------|---------|
| Páginas | [`client/src/pages/employees/EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx), [`client/src/pages/clients/ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx), [`client/src/pages/services/ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx) |
| CSS global | [`client/src/index.css`](../../client/src/index.css) |
| Referência (padrão resolvido no Dashboard) | Mesmo ficheiro: regras `.dashboard-agenda-card` em `@media (min-width: 768px) and (max-width: 1199.98px)` |
| Testes | [`client/src/pages/employees/EmployeesPage.test.tsx`](../../client/src/pages/employees/EmployeesPage.test.tsx), [`ClientsPage.test.tsx`](../../client/src/pages/clients/ClientsPage.test.tsx), [`ServicesPage.test.tsx`](../../client/src/pages/services/ServicesPage.test.tsx) |

---

## 4. Factos sobre o layout responsivo actual

### 4.1 Visibilidade tabela vs cards

**Fato:** Em todas as três páginas, a tabela usa `className="card table-card mt-3 d-none d-md-block"` e o contentor interno `<div className="table-responsive">`. Os cards mobile usam `d-md-none`.

**Conclusão:** Para **viewport ≥768px**, as tabelas estão visíveis; abaixo disso, os cards substituem a tabela. O breakpoint de alternância é **`md` (768px)** — não foi alterado nesta auditoria.

### 4.2 Regra `min-width: 680px` em `.table-responsive .table`

**Fato importante:** Em [`client/src/index.css`](../../client/src/index.css), a regra:

```css
@media (max-width: 767.98px) {
  ...
  .table-responsive .table {
    min-width: 680px;
  }
  ...
}
```

**Implicação:** Essa `min-width` **só se aplica quando a largura da viewport é ≤767.98px**. Na faixa **768px–1199px** (e em desktop), **não há** essa imposição de largura mínima à tabela via este selector.

**Hipótese:** Relatos de “tabela com scroll em tablet” podem misturar com comportamento **&lt;768px** ou com outras causas (ver secções por página).

### 4.3 Regras globais que afectam todas as tabelas

| Regra | Local | Efeito |
|-------|--------|--------|
| `.table thead th { white-space: nowrap }` | `index.css` ~L114–120 | Cabeçalhos **nunca quebram linha**, aumentando a largura mínima agregada das colunas. |
| `.table > … > *:not(th) { overflow-wrap: anywhere }` | ~L126–129 | Células `td` podem partir palavras em qualquer sítio — bom para não expandir horizontalmente, mas pode produzir **linhas muito estreitas e muitas quebras** quando a largura útil é pequena. |
| `.table-card { overflow: hidden }` | ~L137–138 | O cartão recorta conteúdo nas bordas; o scroll horizontal esperado fica no filho `.table-responsive` (`overflow-x: auto`, ~L1716–1720). |
| `.table-responsive` | ~L1716–1720 | `overflow-x: auto` — **scroll horizontal dentro do contentor** quando o conteúdo excede a largura. |
| `.table-actions` + `.table-actions .btn` | ~L150–165 | `flex-wrap: wrap`; botões com `min-width: var(--sp-btn-action-min-width)` (**6.75rem**) e `white-space: nowrap`. Várias acções **empilham em altura** dentro da célula, não eliminam botões. |

**Fato:** `table-layout` não é definido globalmente para estas páginas; o comportamento por omissão é **`auto`** (larguras distribuídas pelo browser com base no conteúdo e `min-width` de células).

### 4.4 `.person-cell` (Funcionários e Clientes)

**Fato** (`index.css` ~L914–925):

```css
.person-cell {
  align-items: center;
  display: flex;
  gap: 0.7rem;
  min-width: 13rem;
}
.person-cell > :not(.entity-avatar) {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

**Implicação:** A primeira coluna (**Funcionário** / **Cliente**) tem um **mínimo explícito de 13rem** (~208px ao tipo raiz por omissão), **além do avatar**. Entre **768px** e **~1200px**, com **5–6 colunas** e cabeçalhos sem wrap, esta restrição **absorve largura fixa** e pode forçar:

- encolhimento forte das outras colunas (com muito `overflow-wrap` nas `td`), e/ou
- **scroll horizontal** dentro de `.table-responsive`, se a soma dos mínimos e do conteúdo exceder a largura útil.

**Serviços** não usa `.person-cell` na tabela; a primeira célula é texto (nome + `table-subline` opcional).

---

## 5. Análise por página (factos do TSX + CSS)

### 5.1 Funcionários — [`EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx)

**Colunas (desktop):** Funcionário | E-mail | Perfil | Status | Adicionado em | Ações (condicional `actionsVisible`).

| Factor | Detalhe |
|--------|---------|
| Primeira coluna | `.person-cell` + `ImageAvatar` + nome + “Você” opcional (`table-subline`) |
| Coluna e-mail | Texto sem `text-nowrap` explícito no TSX — sujeito a `overflow-wrap: anywhere` global em `td` |
| Perfil / Status | `badge` |
| Ações | `renderEmployeeRowActions` → `.table-actions` (vários `btn-sm`) |

**Causa provável de estreitamento / quebras (código):**

1. **`min-width: 13rem` em `.person-cell`** em conjunto com **5–6 colunas** e **`th` com `white-space: nowrap`**.
2. **Cabeçalhos longos** (“Adicionado em”, “Funcionário”) sem quebra, a competir por largura com colunas de dados.
3. Coluna **Ações** com múltiplos botões (mín. 6.75rem cada): com `flex-wrap`, a **altura** da célula aumenta; largura da coluna ainda depende do algoritmo `auto`.

**Validação visual:** não realizada — **hipótese** a confirmar em 768–1199px com dados realistas.

---

### 5.2 Clientes — [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx)

**Colunas:** Cliente | Email | Telefone | Status | Ações (condicional).

| Factor | Detalhe |
|--------|---------|
| Primeira coluna | `.person-cell` — **mesmo `min-width: 13rem`** que Funcionários |
| Email | `<td className="text-nowrap">` (**Bootstrap**) — **impede quebra de linha** no email |
| Telefone | texto normal |
| Ações | Editar, Convidar (condicional), Excluir |

**Causa provável (código):**

1. **`text-nowrap` no email** + conteúdo longo: a coluna de email tende a ter **largura mínima igual ao comprimento visual da linha** (ou exige scroll na `.table-responsive`).
2. **`person-cell`** + colunas adicionais no mesmo intervalo de largura que Funcionários.

**Coluna mais afectada (hipótese):** **Email** (nowrap) e, em segundo plano, a primeira coluna (mínimo 13rem).

**Validação visual:** não realizada.

---

### 5.3 Serviços — [`ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx)

**Colunas:** Serviço | Duração | Preço | Status | Ações (condicional).

| Factor | Detalhe |
|--------|---------|
| Serviço | Nome + descrição opcional em `span.table-subline` (`display: block`) |
| Duração | "`N` min" |
| Preço | `formatPrice` (pt-PT, 2 decimais) |
| Ações | Editar, Desativar/Ativar, Excluir |

**Fato:** **Não há** `.person-cell` nesta tabela.

**Causa provável (código):**

1. Primeira coluna com **duas linhas** (nome + descrição) pode ser **alta** e, com `overflow-wrap` agressivo, **visualmente “esmagada”** se as outras colunas tiverem conteúdo com largura mínima (badges, preço).
2. Menos pressão de `min-width` fixo na primeira coluna do que em Funcionários/Clientes — o problema pode ser **mais de hierarquia/legibilidade** do que de largura mínima absoluta.

**Validação visual:** não realizada.

---

## 6. Breakpoints indicados para atenção (análise lógica, não visual)

| Largura | Observação baseada em código |
|---------|-------------------------------|
| 768px | Início de `d-md-block` — tabela visível; `.person-cell` e `th` nowrap entram em vigor no layout “wide”. |
| 820px, 900px, 992px | Largura útil típica de tablet; **soma de mínimos** (13rem + colunas + nowrap email em clientes) pode aproximar-se do limite. `992px` é `lg` no Bootstrap — pode alterar grelha/sidebar em componentes ascendentes (**validar no layout**). |
| 1024px, 1100px, 1199px | Ainda abaixo de `xl` (1200px) em muitos layouts Bootstrap; mesmas tensões. |
| 1200px | Breakpoint `xl`: frequentemente mais largura útil para `main` — alinha com “layout desktop actual” no enunciado. |

**Fato:** O projecto já contém um padrão explícito para **768px–1199.98px** na **agenda do Dashboard** (`.dashboard-agenda-card` com `min-width: max(100%, 40rem)` na tabela, etc.) — **as páginas de entidades analisadas não reutilizam essas regras.**

---

## 7. Comparação com padrão Dashboard (referência)

**Fato:** Em `index.css` (~L1126–1161), a tabela da agenda no tablet:

- força `overflow-x: auto` no `.table-responsive` dentro do cartão,
- define `min-width` na própria tabela para garantir espaço mínimo,
- ajusta `table-layout: auto` e `min-width: 0` em células,
- reserva largura mínima para a última coluna (acções).

**Implicação para implementação futura:** um tratamento **análogo mas específico** para `.table-card` das páginas de entidades (ou classes dedicadas) pode alinhar comportamento — **recomendação**, não estado actual.

---

## 8. Testes existentes (facto)

Os ficheiros `*Page.test.tsx` cobrem sobretudo:

- estados de loading, erro, vazio, permissões,
- presença de tabelas **desktop** via `data-testid` (`*-list-desktop`),
- superfície mobile via `*-list-mobile`,
- em vários casos classes `d-none d-md-block` / `d-md-none`.

**Fato:** Não foi encontrada (nesta leitura) cobertura automática específica para **largura de colunas** ou **scroll** em viewports 768–1199px (o que é esperado em jsdom).

---

## 9. Recomendações por página (para implementação futura)

### 9.1 Abordagem comum (candidata)

- Garantir que **scroll horizontal** ocorre **apenas** dentro de `.table-responsive` (já é o desenho; verificar se `.table-card { overflow: hidden }` nunca mascara botões — hipótese visual).
- Para a faixa **768px–1199.98px**, considerar regra dedicada (media query alinhada a `md`–abaixo de `xl`) que:
  - defina `min-width` **mínima** da tabela **ou** `table-layout: fixed` **com** percentagens por coluna — **requer decisão de design**;
  - ou siga o padrão do Dashboard: `min-width` na `table` + scroll no contentor.

### 9.2 Funcionários

| Item | Recomendação |
|------|----------------|
| Causa provável | `.person-cell { min-width: 13rem }` + muitas colunas + `th` nowrap |
| Colunas mais afectadas | 1ª (funcionário), depois e-mail / data |
| CSS envolvido | `.person-cell`, `.table thead th`, `.table` células |
| Solução | Reduzir `min-width` da `.person-cell` **só em viewports estreitos ≥768px**, ou substituir por `min-width: 0` + `max-width` na célula; opcionalmente `width`/`min-width` por coluna em media query |
| Riscos | Quebras de layout em nomes muito curtos; regressão em outras páginas que usam `.person-cell` (verificar usos) |
| Testes | Visuais + screenshot/regression; testes RTL podem assertar presença de conteúdo dentro de `employees-list-desktop` por role |

### 9.3 Clientes

| Item | Recomendação |
|------|----------------|
| Causa provável | **`text-nowrap` no email** + `.person-cell` |
| Colunas mais afectadas | Email, Cliente |
| CSS / markup | `text-nowrap` em [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx); globais `.table` |
| Solução | Remover `text-nowrap` em tablet estreito **ou** aplicar só a partir de `lg`/`xl`; alternativa: `max-width` + ellipsis com `title` (cuidado com acessibilidade) |
| Riscos | Emails longos sem nowrap podem aumentar altura da linha — aceitável se preferir legibilidade |
| Testes | Garantir que `clients-list-desktop` ainda renderiza email; teste com email longo mock |

### 9.4 Serviços

| Item | Recomendação |
|------|----------------|
| Causa provável | Duas linhas na 1ª coluna + distribuição `auto`; menos `person-cell` |
| Colunas mais afectadas | Serviço (nome + descrição), possivelmente Preço |
| Solução | Larguras mínimas relativas ou coluna “Serviço” com `min-width` moderado; clamp de descrição **na tabela** (similar ao card mobile) apenas se produto aceitar |
| Riscos | Truncar descrição na tabela pode perder informação — alinhar com produto |

---

## 10. Riscos globais de regressão

- Alterar `.person-cell` ou `.table thead th` **globalmente** afecta **todas** as tabelas que os usam (ex.: outras listagens).
- Duplicar regras sem namespace pode conflitar com Bootstrap (especialmente `text-nowrap`, `table-responsive`).
- `overflow-x` na página vs no contentor: o enunciado pede scroll **no contentor** — o CSS actual de `.table-responsive` já aponta nesse sentido.

---

## 11. Ordem sugerida de implementação (futura)

1. **Validação visual** nos breakpoints listados (768, 820, 900, 992, 1024, 1100, 1199, 1200) com dados longos (nome, email, descrição).
2. **Clientes:** ajuste do `text-nowrap` no email (maior impacto isolado).
3. **Funcionários:** ajuste de `.person-cell` ou override scoped à página.
4. **Serviços:** refinamento da primeira coluna após observar (1).
5. Extrair padrão partilhado **opcional** (classe em `table-card` + media query) inspirado em `.dashboard-agenda-card`.

---

## 12. Ficheiros prováveis a alterar numa fase de implementação

- [`client/src/pages/clients/ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx) — condição de `text-nowrap` / classes responsivas.
- [`client/src/pages/employees/EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx) — opcional: classes em `td`/`th`.
- [`client/src/pages/services/ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx) — opcional: estrutura da primeira coluna.
- [`client/src/index.css`](../../client/src/index.css) — media queries `min-width: 768px` and `max-width: 1199.98px` (ou `max-width: 1399.98px`) **com selector específico** para não rebentar o Dashboard.
- Testes em [`*Page.test.tsx`](../../client/src/pages/employees/EmployeesPage.test.tsx) se o markup/classes mudarem de forma testável.

---

## 13. Legenda

- **Fato:** derivado directamente do código citado.
- **Hipótese:** requer confirmação visual ou medição em browser.
- **Recomendação:** intencionalmente não implementada nesta auditoria.

---

## 14. Confirmações

| Confirmação | Cumprimento |
|-------------|-------------|
| Documento criado em `docs/reports/schedulerpro-tablet-responsive-audit.md` | Sim |
| Código, CSS, testes, APIs e tipos **não** modificados por esta tarefa | Sim |
| Operações Git de escrita **não** executadas | Sim |
| Validação visual nos breakpoints | **Não realizada** — explicitamente indicada acima |
