# SchedulerPro — Correção tablet: botão «Abrir agenda» no Dashboard

**Data:** 2026-11-05  
**Referências:** [`schedulerpro-dashboard-mobile-ux-improvements.md`](./schedulerpro-dashboard-mobile-ux-improvements.md), [`schedulerpro-dashboard-mobile-implementation.md`](./schedulerpro-dashboard-mobile-implementation.md)

---

## 1. Problema

Entre **768px e 1200px**, o botão **Abrir agenda** no cabeçalho do Dashboard continuava **comprimido** após a rodada UX (flex-wrap no `.page-header`), com texto/área de clique reduzidos.

**Validação visual manual desta correção:** não executada pelo agente.

---

## 2. Causa técnica exacta

1. **Global** — [`.page-actions > *`](../../client/src/index.css): `min-width: 0` e `overflow-wrap: anywhere` permitem que o `Link` encolha abaixo da largura natural do rótulo.
2. **Tablet anterior** — `.dashboard-page .page-actions .btn` com `flex: 0 **1** auto` mantinha `flex-shrink: 1` no botão.
3. **Layout** — `.page-header` com `justify-content: space-between` e `flex-wrap` não garantia que o bloco de acções passasse para uma segunda linha com largura intrínseca; título e acções podiam partilhar a mesma linha com compressão.

**DOM** (inalterado): `header.page-header` → `div` (título) + `div.page-actions` → `Link.btn` ([`PageHeader.tsx`](../../client/src/components/common/PageHeader.tsx), [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) com `section.dashboard-page`).

---

## 3. Solução implementada

Dentro de `@media (min-width: 768px) and (max-width: 1199.98px)`, **scoped** a `.dashboard-page`:

| Regra | Efeito |
|-------|--------|
| `.dashboard-page .page-header` | `flex-direction: column`, `align-items: flex-start`, `justify-content: flex-start` — título em cima, acções abaixo, **mesmo eixo esquerdo** |
| `.dashboard-page .page-actions` | `flex: 0 0 auto`, `align-self: flex-start`, `justify-content: flex-start` |
| `.dashboard-page .page-actions > *` | `flex-shrink: 0`, `min-width: max-content`, `overflow-wrap: normal` — anula compressão global |
| `.dashboard-page .page-actions .btn` | `flex: 0 0 auto`, `width: auto`, `white-space: nowrap` — largura natural, sem reduzir padding/fonte |

Regras `.dashboard-agenda-card` na mesma media query **mantidas** (tabela tablet).

**≥1200px:** media query não aplica — header desktop em linha com `space-between`.  
**≤767px:** regras mobile globais do `.page-header` inalteradas.

**Componente global `PageHeader`:** não modificado.

---

## 4. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Substituição do bloco `.dashboard-page .page-header` / `.page-actions` (768–1199.98px) |
| `docs/reports/schedulerpro-dashboard-tablet-header-fix.md` | Este relatório |

**Não alterados:** `DashboardPage.tsx`, `PageHeader.tsx`, testes (asserts existentes suficientes).

---

## 5. Git no início (read-only)

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `cb6427814205c8006be665d621444a08b11959a1` |
| Working tree | Modificações dashboard + docs untracked |

**Operações Git:** nenhuma.

---

## 6. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm test -- DashboardPage.test.tsx` | **21 passed**, 0 failed (~31s) |
| `npm run build` | **exit 0** — `tsc -b` + Vite (~29s) |

Teste estrutural existente: `data-testid="dashboard-open-agenda"`, `href="/appointments"`, `section.dashboard-page`.

---

## 7. Checklist — validação visual manual

- [ ] **768 / 800 / 992 / 1024 / 1100 / 1199px:** botão «Abrir agenda» largura natural, alinhado à esquerda com eyebrow/título, segunda linha abaixo do bloco de título
- [ ] **1200px+:** header em linha, botão à direita (desktop anterior)
- [ ] **≤767px:** botão full-width mobile global (se aplicável)
- [ ] Texto completo, padding e fonte sem alteração artificial

---

## 8. Limitações

- Correção baseada em CSS; comportamento exacto depende de sidebar aberta/fechada e padding de `main`.
- Não foi confirmado em dispositivo real nesta etapa.

---

## 9. Continuidade

Se o produto exigir **uma única linha** quando couber (quebra condicional em vez de column fixa), iterar com `flex-wrap` + `flex: 0 0 100%` em `.page-actions` mantendo overrides `min-width: max-content` no filho — sem remover `flex-shrink: 0`.
