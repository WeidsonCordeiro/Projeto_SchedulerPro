# SchedulerPro — Correção de layout: Header e botão Salvar (Disponibilidade)

**Data:** 01/11/2026  
**Tipo:** Correção visual (CSS) — sem alterações de negócio, API ou Redux

---

## 1. Objetivo

Corrigir alinhamento e proporções do botão **Salvar** no quadro de disponibilidade semanal e do cluster direito do **Header** (notificações, avatar, nome/função, Logout), mantendo identidade visual Bootstrap existente.

---

## 2. Problemas identificados

| # | Sintoma | Área |
|---|---------|------|
| P1 | Botão «Salvar {dia}» com altura excessiva, desalinhado face aos `input type="time"` | Disponibilidade — layout desktop do `.availability-board` |
| P2 | Elementos do lado direito do Header visualmente desalinhados no eixo vertical | [`Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) |

---

## 3. Causa técnica

### P1 — Botão Salvar

- [`AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx) renderiza o botão em `.availability-day-save` (flex + `btn btn-sm`).
- Em desktop, [`index.css`](../../client/src/index.css) aplica a `.availability-day-column .availability-day-card` uma **grelha CSS** e `display: contents` no `.card-body`, colocando `.availability-day-save` na **linha 3** da coluna de conteúdo.
- Com `align-items: stretch` (omissão da grelha), a célula da linha do botão **estica** o contentor flex; o `.btn` herda altura stretch e preenche a zona como os blocos Manhã/Tarde.

### P2 — Header

- `.navbar-actions` já usava `align-items: center`, mas:
  - **Bootstrap `.navbar-text`** mantém padding vertical por omissão; o projecto só sobrescrevia cor/line-height.
  - Bloco `.user-summary` com `text-end` sem coluna flex centrada face ao avatar.
  - Sino e Logout (`btn-sm`) com caixas de linha diferentes do bloco textual.

---

## 4. Componentes envolvidos (sem alteração de lógica)

| Componente | Ficheiro |
|------------|----------|
| Header | [`client/src/components/layout/Navbar.tsx`](../../client/src/components/layout/Navbar.tsx) |
| Notificações | [`client/src/components/layout/NotificationBell.tsx`](../../client/src/components/layout/NotificationBell.tsx) |
| Editor dia | [`client/src/components/availability/AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx) |
| Página | [`client/src/pages/availability/AvailabilityPage.tsx`](../../client/src/pages/availability/AvailabilityPage.tsx) |
| Estilos globais | [`client/src/index.css`](../../client/src/index.css) |

---

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | **Único ficheiro de código** — overrides navbar + grelha disponibilidade |

**Não alterados:** TSX/Redux/API; markup opcional do plano **não** foi necessário.

---

## 6. Correções realizadas

### Disponibilidade (`.availability-day-column`)

1. `.availability-day-card { align-items: start; }` — evita stretch global na grelha.
2. `.availability-day-save` — `align-self: end`, `align-items: center`, `justify-content: flex-end`.
3. `.availability-day-save .btn` — `width: auto; height: auto; align-self: center` — altura de `btn-sm`, não preenche a linha.

Comportamento de `onSave`, permissões e campos Manhã/Tarde **inalterados**.

### Header (`.app-navbar`)

1. `.navbar-text` — `padding-top/bottom: 0`.
2. `.user-summary` — flex column, `justify-content: center`, `text-align: end`, `gap` reduzido.
3. `.navbar-actions` — `gap: 0.75rem`; filhos directos `.btn` e `.notification-bell-anchor` com `inline-flex` + `align-items: center`.

---

## 7. Justificação das decisões

- **CSS scoped** a `.availability-day-column` e `.app-navbar` — minimiza regressões (disponibilidade só no quadro semanal; header consistente em `AppLayout`).
- **Sem Tailwind / novos componentes** — alinhado com stack Bootstrap + `index.css` existente.
- **`align-items: start` na grelha** + regras no save — corrige a causa (stretch) em vez de mascarar só com `height` fixo.

---

## 8. Responsividade

| Breakpoint | Comportamento |
|------------|----------------|
| Desktop (grelha activa) | Regras `.availability-day-column` aplicam-se; save compacto alinhado à direita. |
| `max-width: 991.98px` | CSS existente passa cartões para `display: block`; save mantém `d-flex justify-content-end` + regras `.btn` auto. |
| `max-width: 575.98px` | Navbar oculta `.user-summary`; sino + Logout com regras `inline-flex` — sem scroll horizontal introduzido. |

**Validação visual em browser real:** **não realizada** nesta tarefa (sem E2E visual). Alinhamento inferido por causa CSS + testes funcionais.

---

## 9. Testes executados

Ambiente: `client/`, 01/11/2026.

### Targeted

```bash
npm test -- --run src/components/layout/Navbar.test.tsx src/components/availability/AvailabilityDayEditor.test.tsx src/pages/availability/AvailabilityPage.test.tsx
```

| Métrica | Resultado |
|---------|-----------|
| Exit code | **0** |
| Test files | 3 passed |
| Tests | **41 passed** |
| Duration | ~31.8s |

### Suite completa

```bash
npm test -- --run
```

| Métrica | Resultado |
|---------|-----------|
| Exit code | **0** |
| Test files | **131 passed** |
| Tests | **1439 passed** |
| Duration | ~722.9s |

### Build

```bash
npm run build
```

| Métrica | Resultado |
|---------|-----------|
| Exit code | **0** |
| tsc + Vite | OK (~30s build) |
| Aviso | Chunk JS > 500 kB (pré-existente) |

---

## 10. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Botão sem altura/largura excessiva | **Corrigido (CSS)** — validação visual pendente |
| Botão alinhado com campos de horário | **Corrigido (CSS)** — validação visual pendente |
| Header alinhado verticalmente | **Corrigido (CSS)** — validação visual pendente |
| Nome/função organizados | **Corrigido (flex column + padding zero)** |
| Notificações, avatar, Logout — espaçamento | **Gap 0.75rem + inline-flex** |
| Layout funcional em resoluções menores | **Media queries existentes preservadas** |
| Funcionalidades inalteradas | **Sim** (só CSS) |
| Testes relevantes | **41 + 1439 passed** |
| Build OK | **Sim** |
| Relatório criado | **Sim** |

---

## 11. Limitações e pendências

- Confirmar no browser (Desktop / tablet / mobile) que o botão e o Header correspondem à imagem de referência do utilizador.
- Não foi adicionado teste visual automatizado (fora do scope).

---

## 12. Conclusão

Correção **mínima e isolada** em [`index.css`](../../client/src/index.css). Pronta para revisão manual visual; testes e build do frontend **aprovados**.

---

## Resumo para outra IA

- **Causa save:** grid + `display:contents` + stretch → botão alto.
- **Causa header:** padding `.navbar-text` + bloco user sem flex column centrado.
- **Fix:** regras em `.availability-day-column` e `.app-navbar` apenas.
- **Não tocar:** Redux, save handlers, NotificationBell API.
