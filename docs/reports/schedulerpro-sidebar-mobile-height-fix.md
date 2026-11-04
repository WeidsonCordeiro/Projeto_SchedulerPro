# SchedulerPro — Correção CSS: altura e posicionamento da Sidebar Mobile

**Data:** 2026-11-04  
**Branch:** `develop`  
**HEAD (início):** `df3d168ceafc63cf30dbc92bb283b2544f3f2f53`

**Relacionado:** [`schedulerpro-sidebar-mobile-step-6-4c-2-implementation.md`](./schedulerpro-sidebar-mobile-step-6-4c-2-implementation.md), [`schedulerpro-sidebar-mobile-step-6-4c-1-audit.md`](./schedulerpro-sidebar-mobile-step-6-4c-1-audit.md)

---

## 1. Estado inicial Git

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `df3d168` |
| Working tree | `client/src/index.css` modificado (6.4c.2); relatórios 6.4c untracked |

Sem conflitos com alterações não relacionadas.

---

## 2. Causa técnica identificada

### 2.1 Espaço vertical / altura incorrecta do drawer

A custom property **`--sp-navbar-height`** estava definida apenas em **`.app-navbar`**.

Hierarquia ([`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx)):

```
.app-shell
  nav.app-navbar     ← --sp-navbar-height (antes)
  .app-body
    aside.app-sidebar  ← irmã do navbar, NÃO descendente
```

Propriedades custom **não atravessam irmãos**. Em `.app-sidebar`, `var(--sp-navbar-height)` era **inválida**, logo:

- `top: var(--sp-navbar-height)` — ignorado (`top: auto`);
- `height: calc(100dvh - var(--sp-navbar-height))` — ignorado (`height: auto`).

Com `position: fixed`, `bottom: 0` e `top: auto`, o topo do drawer era calculado a partir da **posição estática** do `<aside>` dentro de `.app-body` (já **abaixo** da navbar no fluxo flex). O drawer ficava efectivamente **deslocado para baixo** (gap visível ~ altura da navbar) e a altura não preenchia de forma fiável o viewport — coerente com a captura **390×844**.

### 2.2 Nome longo da empresa

`.sidebar-context` é **flex row**. Filhos flex têm `min-width: auto` por defeito, o que impede encolher abaixo do conteúdo intrínseco. Textos longos podiam **forçar largura** do drawer apesar de `width: min(240px, 66vw)`, gerando overflow horizontal.

---

## 3. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Token de altura no shell; drawer `top`/`bottom`; truncamento workspace (mobile) |
| Este relatório | Criado |

**Nenhum** JSX, componente, teste ou dependência alterado.

---

## 4. CSS — anterior vs corrigido

### 4.1 Token partilhado (global + ≤575.98px)

| | Antes | Depois |
|---|--------|--------|
| `.app-shell` | Sem token | `--sp-navbar-height: 4.25rem` |
| `.app-navbar` | `--sp-navbar-height: 4.25rem` + `min-height` | Apenas `min-height: var(--sp-navbar-height)` (herda do shell) |
| `@media (max-width: 575.98px)` | `.app-navbar { --sp-navbar-height: 3.75rem }` | `.app-shell { --sp-navbar-height: 3.75rem }` |

Navbar e drawer passam a usar o **mesmo** valor em cada breakpoint (390px → **3.75rem**).

### 4.2 Drawer mobile (`@media (max-width: 991.98px)`)

| Propriedade | Antes | Depois |
|-------------|--------|--------|
| `top` | `var(--sp-navbar-height)` (inválido) | `var(--sp-navbar-height)` (válido via shell) |
| `bottom` | `0` | `0` (mantido) |
| `height` | `calc(100dvh - var(...))` (inválido) | `auto` + `max-height: none` (stretch entre `top` e `bottom`) |
| Largura | `width: min(240px, 66vw)` | Mantida + `max-width: min(240px, 66vw)`, `overflow-x: hidden`, `box-sizing: border-box` |

**Preservado:** largura 6.4c.2, indentação 0.65rem, backdrop, scroll interno, desktop ≥992px.

### 4.3 Nome da empresa (mobile, mesmo media query)

Adicionado em `.sidebar-context` e descendentes:

- `min-width: 0`, `max-width: 100%`, `overflow: hidden` no contentor;
- `min-width: 0; flex: 1 1 auto` no bloco de texto;
- `text-overflow: ellipsis; white-space: nowrap` em label e `strong`;
- `.sidebar-context-avatar { flex-shrink: 0 }`;
- `.app-sidebar-scroll { min-width: 0; overflow-x: hidden }` (com `overflow-y: auto` existente).

---

## 5. Justificação da solução

1. **Token em `.app-shell`** — fonte única visível para navbar, drawer e regras que já usam `var(--sp-navbar-height)` (ex.: painel de notificações), sem alterar React.
2. **`top` + `bottom` + `height: auto`** — preenche o viewport entre o fim efectivo da navbar e o fundo da janela, robusto quando a navbar muda de altura por breakpoint.
3. **Flex + ellipsis no workspace** — impede que strings longas alargem o drawer; mantém logo com `flex-shrink: 0`.

Comportamento desktop: regras mobile confinadas a `max-width: 991.98px`; `.app-sidebar { width: 280px }` global intacto.

---

## 6. Rolagem interna preservada

- Cabeçalho «Menu» + `btn-close`: `flex-shrink-0` no JSX (inalterado).
- `.app-sidebar-scroll`: `flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`, `overscroll-behavior: contain`.
- Drawer com altura fixa pelo viewport → scroll **só** na área de menu, não no documento (`body:has(.app-shell)` continua `overflow: hidden`).

---

## 7. Testes

```bash
cd client && npm test -- src/components/layout/AppLayout.test.tsx src/components/layout/Sidebar.test.tsx
```

| Resultado | **2 ficheiros, 25 testes — passou** (~8,7 s) |

---

## 8. Build

```bash
cd client && npm run build
```

| Resultado | **Sucesso** (~6,2 s) |
|-----------|----------------------|
| CSS | `index-D8S_zo9-.css` |

---

## 9. Viewports validadas

| Viewport | Validação visual nesta sessão |
|----------|-------------------------------|
| 390×844, 420×844, 768×844, 991×844, 992×844, 1440 | **Não realizada** (sem inspecção browser/DevTools) |

**Pendente (utilizador):**

- Drawer colado à navbar e até ao fundo em 390×844.
- Rolagem interna com muitos itens (OWNER).
- Nome de empresa longo (ex.: «Salão Beleza Estética Centro Histórico Lisboa Lda») — ellipsis, sem scroll horizontal.
- Desktop 992+ inalterado.

---

## 10. Limitações e pendências

| Item | Nota |
|------|------|
| Validação visual | Obrigatória pelo utilizador para fechar esta correção |
| Navbar mais alta que `min-height` | Se conteúdo exceder `3.75rem`/`4.25rem`, pode voltar a haver gap — monitorizar; correcção futura exigiria altura medida (JS) ou simplificar navbar |
| Etapa 6.4c.3 | Toggle ☰, `aria-controls`, focus trap — fora deste fix |

---

## 11. Resumo para continuidade

Correcção **CSS-only**: token `--sp-navbar-height` no `.app-shell`, drawer ancorado com `top`/`bottom` válidos, contenção horizontal do bloco workspace. Larguras e indentações 6.4c.2 mantidas. Próximo passo de produto: **validação manual** na captura 390×844; depois **6.4c.3** (comportamento/a11y).
