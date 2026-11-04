# SchedulerPro — Etapa 6.4c.2 — Ajustes CSS da Sidebar Mobile (implementação)

**Data:** 2026-11-04  
**Branch:** `develop`  
**HEAD (início):** `df3d168ceafc63cf30dbc92bb283b2544f3f2f53` (merge PR #126 — 6.4b)

**Relacionado:** [`schedulerpro-sidebar-mobile-step-6-4c-1-audit.md`](./schedulerpro-sidebar-mobile-step-6-4c-1-audit.md)

---

## 1. Objetivo

Melhorar a utilização da largura em viewports mobile/tablet (`≤991.98px`): drawer menos dominante em telemóveis estreitos e mais largura útil para textos dos itens do menu, **sem alterar** layout desktop, JSX, estado ou testes.

---

## 2. Estado inicial do Working Tree

| Item | Valor |
|------|--------|
| Branch | `develop` (sync com `origin/develop`) |
| Modificados | Nenhum (código) |
| Untracked | `docs/reports/schedulerpro-sidebar-mobile-step-6-4c-1-audit.md` |

Não havia alterações locais em conflito com esta tarefa.

---

## 3. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Regras dentro de `@media (max-width: 991.98px)` apenas |
| Este relatório | Criado |

Nenhum outro CSS, componente ou teste foi modificado.

---

## 4. Regras CSS — antes e depois

### 4.1 Largura do drawer (`@media (max-width: 991.98px)`)

| | Valor |
|---|--------|
| **Antes** | `width: min(260px, 82vw);` |
| **Depois** | `width: min(240px, 66vw);` (+ comentário no ficheiro) |

### 4.2 Indentação e padding (só no mesmo media query)

| Selector | Antes (mobile) | Depois (mobile) |
|----------|----------------|-----------------|
| `.app-sidebar .nav-link` | Herdava global `margin-left: 2rem`, `padding: 0.7rem 0.85rem` | `margin-left: 0.65rem;` `padding-inline: 0.75rem;` (mantém `min-height: 2.7rem`) |
| `.sidebar-group-label` | Herdava `margin: 0 0.85rem 0.45rem` | `margin-inline: 0.65rem;` (resto herdado) |
| `.sidebar-context` | Herdava `margin: 0.15rem 0.1rem 0.5rem` | `margin-inline: 0.05rem;` |

### 4.3 Desktop (inalterado)

Regra global mantida:

```css
.app-sidebar {
  width: 280px;
}
.app-sidebar .nav-link {
  margin-left: 2rem;
  /* ... */
}
```

A partir de **`992px`**, o media query mobile **não aplica** — sidebar inline 280px e indentação 2rem como antes.

---

## 5. Justificativa das medidas

### Largura `min(240px, 66vw)`

| Viewport | Antes `min(260px, 82vw)` | Depois `min(240px, 66vw)` | % viewport (depois) |
|----------|--------------------------|-----------------------------|---------------------|
| **360px** | 260px (72,2%) | **237,6px** (~238px) | ~66% |
| 390px | 260px | 240px (cap) | ~62% |
| 430px | 260px | 240px | ~56% |
| 768px | 260px | 240px | ~31% |
| 991px | 260px | 240px | ~24% |

- Atende ao alvo **~230–240px em 360px** (auditoria C1).
- **Não** usa `min(280px, 88vw)` — evitar aumento em telemóveis.
- Tecto **240px** (vs 260px) liberta ~20px de conteúdo principal visível com drawer aberto em 360px (~122px vs ~100px).
- Em tablet, drawer ligeiramente mais estreito mantém boa legibilidade dos labels (sem ícones).

### Indentação `0.65rem` (mobile)

- Reduz ~21px de deslocamento horizontal vs `2rem` (32px), aumentando área para labels longos («Disponibilidade», «Meus agendamentos»).
- Desktop **2rem** intacto.

### Padding / margens de grupo e contexto

- Ajustes modestos alinhados à nova grelha horizontal; **min-height 2.7rem** preservado para área de toque.

---

## 6. Confirmação desktop

- Largura **280px** e `margin-left: 2rem` permanecem nas regras base.
- Nenhuma regra nova em `@media (min-width: 992px)`.
- Comportamento drawer/backdrop/scroll continua definido apenas abaixo de 991.98px (Stage 38 preservada).

---

## 7. Testes executados

### Layout / sidebar

```bash
cd client && npm test -- src/components/layout/AppLayout.test.tsx src/components/layout/Sidebar.test.tsx src/components/layout/Navbar.test.tsx src/components/layout/Sidebar.logo.test.tsx
```

| Resultado | **4 ficheiros, 33 testes — todos passaram** (~20,3 s) |

### Suite completa

```bash
cd client && npm test
```

| Resultado | **134 ficheiros, 1500 testes — todos passaram** (~467,6 s) |

---

## 8. Build

```bash
cd client && npm run build
```

| Resultado | **Sucesso** (`tsc -b && vite build`, 251 módulos, ~12,9 s) |
|-----------|-----------------------------------------------------------|
| CSS bundle | `index-C4wdK4iw.css` (hash actualizado vs build anterior) |
| Warnings | Chunk JS > 500 kB — pré-existente |

---

## 9. Validação visual

| Tipo | Estado |
|------|--------|
| Browser 360 / 390 / 430 / 768 / 991 / 992 / 1024 / 1440 | **Pendente** (utilizador) |
| Inspeção DevTools nesta sessão | **Não realizada** |

Checklist sugerida para o utilizador:

- [ ] Drawer proporcional em 360–430; nomes de empresa truncados de forma aceitável.
- [ ] Itens do menu sem truncamento desnecessário.
- [ ] Sem scroll horizontal na página com drawer aberto/fechado.
- [ ] 992px+: sidebar 280px inline idêntica ao comportamento anterior.

---

## 10. Problemas identificados

| ID | Nota |
|----|------|
| — | Nenhum problema técnico ou falha de testes introduzida nesta etapa. |
| Info | Toggle ☰, focus trap e `aria-controls` continuam pendentes — **Etapa 6.4c.3+** (fora de escopo 6.4c.2). |

---

## 11. Estado final do Working Tree

| Ficheiro | Estado |
|----------|--------|
| `client/src/index.css` | Modificado (+15 / −1 linhas) |
| `docs/reports/schedulerpro-sidebar-mobile-step-6-4c-1-audit.md` | Untracked (pré-existente) |
| Este relatório | Untracked (novo) |

Sem commit (controlo manual do utilizador).

---

## 12. Contexto para Etapa 6.4c.3

**Próximo foco (comportamento / a11y, não CSS):**

1. [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) — toggle ☰ abrir **e** fechar; opcional fecho em `location.pathname`.
2. [`Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) — `aria-controls="app-sidebar"` no botão menu.
3. Focus trap / `inert` em `main` com drawer aberto; devolver foco ao ☰ ao fechar.
4. [`AppLayout.test.tsx`](../../client/src/components/layout/AppLayout.test.tsx) — fecho ao clicar link; segundo clique no toggle.

**Preservar após 6.4c.2:** larguras mobile definidas neste relatório até nova decisão de produto; desktop 280px / 2rem.

---

## 13. Conclusão

Ajustes CSS mobile aplicados exclusivamente em `@media (max-width: 991.98px)`. Testes de layout e suite completa verdes; build OK. Validação visual manual **pendente**.
