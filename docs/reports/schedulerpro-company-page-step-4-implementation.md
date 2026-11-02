# SchedulerPro — Etapa 4.2 — CompanyPage: Link público (implementação)

**Data:** 02/11/2026  
**Branch:** `feature/ui-company-page-step-4`  
**Base:** `develop` @ `8d4e7af`  
**Auditoria de referência:** [`schedulerpro-company-page-step-4-audit.md`](./schedulerpro-company-page-step-4-audit.md)

---

## 1. O que foi implementado

Padronização visual **apenas** do grupo «Link público de agendamento» na CompanyPage:

- Classe de contexto `company-public-booking-link` no `input-group` existente.
- **Desktop / tablet (≥768px):** linha horizontal; campo com `min-width: 0` e `text-overflow: ellipsis`; botões Copiar/Abrir com `min-width: var(--sp-btn-action-min-width)` e mesma `min-height` que o campo dentro do grupo.
- **Mobile (≤767.98px):** `flex-wrap` + `gap`; campo a 100% na primeira linha; botões na linha seguinte com `flex: 1 1 0` e a mesma largura mínima; `margin-left: 0` e `border-radius: 0.6rem` nos filhos desanexados (evita cantos Bootstrap colados e scroll horizontal).

**Inalterado:** handlers de copy/open, URL, `readOnly`, mensagens, permissões, Salvar, logo, lifecycle, PageHeader, Agendamentos/Relatórios, personalizações Etapa 3.

---

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/pages/company/CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) | `className="input-group company-public-booking-link"` (L234) |
| [`client/src/index.css`](../../client/src/index.css) | Bloco base `.company-public-booking-link` + regras `@media (max-width: 767.98px)` |
| `docs/reports/schedulerpro-company-page-step-4-implementation.md` | Este relatório |

Nenhum outro ficheiro TSX/CSS/teste foi modificado.

---

## 3. Classes CSS adicionadas

### Markup

- `company-public-booking-link` — no contentor `input-group` do link público.

### Selectors novos (escopo exclusivo)

| Selector | Propósito |
|----------|-----------|
| `.company-public-booking-link` | `max-width: 100%`, `align-items: stretch`, `nowrap` (base) |
| `.company-public-booking-link > .form-control` | Flex grow, altura alinhada, ellipsis |
| `.company-public-booking-link > .btn` | `inline-flex`, `min-width` / `min-height` / `padding-inline` via tokens |
| `@767` `.company-public-booking-link` | `flex-wrap`, `gap` |
| `@767` `.company-public-booking-link > .form-control` | Largura total, radius, `margin-left: 0` |
| `@767` `.input-group.company-public-booking-link > .btn` | Par simétrico; quatro cantos `div` 0.6rem (override Bootstrap input-group) — ver §13 |

Não foram alterados selectors globais `.btn`, `.form-control` ou `.input-group` fora desta classe.

---

## 4. Layout por viewport

| Viewport | Comportamento |
|----------|----------------|
| **≥992px (desktop)** | `input-group` em fila; URL ocupa espaço flexível; botões à direita com largura mínima igual (`--sp-btn-action-min-width`). |
| **768–991px (tablet)** | Mesmas regras base que desktop; campo encolhe com ellipsis em vez de forçar overflow da página. |
| **≤767.98px (mobile)** | Campo full width; Copiar e Abrir na linha de baixo, larguras equivalentes (`flex: 1 1 0` + mesmo `min-width`). |
| **320–390px** | `white-space: nowrap` nos botões + `min-width` token (~6.75rem cada); par cabe em ~320px sem scroll horizontal da página (**validação visual pendente** — ver §8). |

Breakpoint mobile alinhado ao resto da app (`767.98px`, mesmo bloco que `.page-actions` / `.filter-bar`).

---

## 5. Tokens reutilizados

| Token | Uso no link público |
|-------|---------------------|
| `--sp-btn-action-min-width` | Largura mínima Copiar / Abrir |
| `--sp-btn-action-gap` | Espaçamento entre campo e botões em mobile (wrap) |
| `--sp-btn-min-height` | Altura mínima partilhada campo + botões **dentro** do grupo |
| `--sp-btn-padding-x` | Padding horizontal dos botões do grupo |

Nenhum token novo foi criado.

---

## 6. Testes executados

### Específicos (vitest)

```text
CompanyPage.test.tsx
CompanyPage.logo.test.tsx
CompanyForm.test.tsx
CompanyForm.logo.test.tsx
→ 4 ficheiros, 40 testes — OK
```

### Suite completa

```text
npm test -- --run
→ 131 ficheiros, 1439 testes — OK
```

---

## 7. Build

```text
npm run build  (tsc -b && vite build)
→ exit 0 — OK
```

(Aviso Vite sobre chunk >500 kB — pré-existente, não relacionado com esta etapa.)

---

## 8. Limitações e validação visual

- **Não foi feita** validação visual no browser nesta etapa (DevTools / dispositivos reais).
- Confirmar manualmente: alinhamento vertical desktop, stack mobile, ausência de scroll horizontal em 320px, cantos do grupo em desktop (segmentado Bootstrap vs radius global).
- Tablet muito estreito (~768px): mantém layout horizontal; se compressão for perceptível, o utilizador pode pedir empilhar também em `@991` (fora do implementado).

---

## 9. Personalizações anteriores preservadas

- **Etapa 3 (Agendamentos):** não foram tocados `AppointmentScheduleFilters.tsx`, `appointments-calendar.css` nem reintroduzidos blocos CSS removidos pelo utilizador; `borderRadius: "5px"` nos filtros Estado intacto.
- **Resto da CompanyPage:** Salvar, ImageUploader, lifecycle, cards — sem alterações.

---

## 10. Git

Nenhum commit, push, pull, merge ou PR executado (conforme instrução).

---

## 11. Contexto para outra IA

- Único `input-group` da aplicação; solução intencionalmente scoped em `.company-public-booking-link`.
- Problemas C1–C6 da auditoria 4.1 endereçados nesta etapa; C9–C20 permanecem fora de scope.
- Próximo passo sugerido após validação manual do utilizador: opcional Etapa 4.3 (save / lifecycle) ou commit na branch `feature/ui-company-page-step-4`.

---

## 12. Checklist de aceitação (implementação técnica)

| Critério | Estado |
|----------|--------|
| Campo e botões alinhados no desktop (CSS) | Implementado |
| Copiar / Abrir largura mínima equivalente | Implementado |
| Layout responsivo mobile @767 | Implementado |
| Sem overflow horizontal em 320px | Implementado (CSS); **validar no browser** |
| Copy / open / readonly preservados | Sim (só className no wrapper) |
| Fora de scope respeitado | Sim |
| Testes específicos | 40/40 OK |
| Suite completa | 1439/1439 OK |
| Build | OK |
| Validação manual utilizador (4.2 link público) | **Aprovada** (utilizador) |
| Validação manual utilizador (4.2.1 cantos) | **Não resolvido** — ver §14 |
| Validação manual utilizador (4.2.2 cantos) | **Pendente** |

---

## 13. Etapa 4.2.1 — Correção dos cantos Copiar / Abrir

**Data:** 02/11/2026  
**Motivação:** Após validação manual da 4.2, ao empilhar (≤767.98px) o botão «Copiar link» mostrava cantos mistos (lados rectos + arredondados); «Abrir link» herda o mesmo padrão Bootstrap de grupo segmentado.

### Causa identificada

Com `flex-wrap` e `gap`, o campo e os botões deixam de formar uma barra contínua, mas o Bootstrap continua a aplicar regras de `.input-group` por ordem no DOM, nomeadamente:

- filhos `:not(:first-child)` → anula `border-top-left-radius` / `border-bottom-left-radius`;
- filhos `:not(:last-child)` → anula cantos direitos.

O shorthand `border-radius: 0.6rem` da Etapa 4.2 **não prevalece** sobre essas propriedades por canto (especificidade / ordem). O 2.º filho («Copiar») fica especialmente inconsistente entre cantos.

### Correção aplicada

Em `@media (max-width: 767.98px)`, substituído o selector `.company-public-booking-link > .btn` por `.input-group.company-public-booking-link > .btn` e definidos explicitamente os quatro cantos:

- `border-top-left/right-radius: 0.6rem`
- `border-bottom-left/right-radius: 0.6rem`

Mantidos `flex`, `margin-left: 0` e `min-width` já aprovados. **Desktop (≥768px):** regras base inalteradas — grupo segmentado horizontal preservado.

### Ficheiros alterados (4.2.1)

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Override de radius nos botões @767; correcção menor de indentação em `.exception-section-header` no mesmo bloco `@media` |
| `docs/reports/schedulerpro-company-page-step-4-implementation.md` | Esta secção |

### Testes e build (4.2.1)

```text
CompanyPage*.test.tsx + CompanyForm*.test.tsx → 40/40 OK
npm run build → exit 0 OK
```

Validação visual no browser **não** executada nesta sub-etapa.

---

## 14. Etapa 4.2.2 — Correção definitiva do `border-radius` (mobile)

**Data:** 02/11/2026  
**Motivação:** A 4.2.1 manteve o problema visual; o utilizador confirmou cantos mistos em «Copiar link» / «Abrir link» com layout empilhado.

### Diagnóstico (cascata real)

Ordem de carregamento: `bootstrap.min.css` → [`index.css`](../../client/src/index.css) (L6–7 [`main.tsx`](../../client/src/main.tsx)).

Estrutura DOM (ordem fixa): (1) `input` readonly, (2) botão Copiar, (3) link Abrir.

Com `flex-wrap` + campo a 100% (@767), os botões passam para a 2.ª linha, mas o Bootstrap continua a aplicar regras de **grupo segmentado** por posição no DOM, não por linha visual.

**Regras Bootstrap que anulam cantos** (`bootstrap.min.css`, trechos relevantes):

| Regra | Efeito em Copiar (2.º filho) | Efeito em Abrir (3.º filho) |
|--------|------------------------------|----------------------------|
| `.input-group:not(.has-validation) > :not(:last-child):not(.dropdown-toggle):not(.dropdown-menu):not(.form-floating)` | Zera cantos **direitos** | — |
| `.input-group > :not(:first-child):not(.dropdown-menu):not(.valid-tooltip)…` | Zera cantos **esquerdo** | Zera cantos **esquerdo** |

O shorthand `border-radius: 0.6rem` global em `.btn` ([`index.css`](../../client/src/index.css) L61–62) perde para estas propriedades **por canto** (maior especificidade).

**Porque a 4.2.1 falhou:** o selector `.input-group.company-public-booking-link > .btn` tem especificidade **(0, 2, 1)**. As regras Bootstrap acima somam várias classes e pseudo-classes `:not(...)` — **(0, 5+, 1)** — e continuam a prevalecer sobre cada `border-*-radius`, mesmo com os quatro cantos declarados na 4.2.1.

**Desktop (≥768px):** inalterado; regras abaixo só dentro de `@media (max-width: 767.98px)`.

### Correção aplicada (sem `!important`)

Dois selectors que **espelham** a estrutura das regras Bootstrap e acrescentam classes do markup real (`.company-public-booking-link`, `.btn-outline-primary` / `.btn-outline-secondary`), garantindo especificidade superior:

1. **Copiar** — intermediário (`:not(:first-child):not(:last-child)` + mesmos `:not` do Bootstrap).
2. **Abrir** — último filho (`:not(:first-child)` + lista de `:not` do Bootstrap para o 2.º selector).

Layout (`flex`, `margin-left`, `min-width`) mantido no selector mais curto `.input-group.company-public-booking-link > .btn`.

### CSS final (@767, excerto)

```css
  .input-group.company-public-booking-link > .btn {
    flex: 1 1 0;
    margin-left: 0;
    min-width: var(--sp-btn-action-min-width);
  }
  .input-group.company-public-booking-link:not(.has-validation)
    > .btn.btn-outline-primary:not(:first-child):not(:last-child):not(.dropdown-toggle):not(.dropdown-menu):not(.form-floating) {
    border-bottom-left-radius: 0.6rem;
    border-bottom-right-radius: 0.6rem;
    border-top-left-radius: 0.6rem;
    border-top-right-radius: 0.6rem;
  }
  .input-group.company-public-booking-link:not(.has-validation)
    > .btn.btn-outline-secondary:not(:first-child):not(.dropdown-menu):not(.valid-tooltip):not(.valid-feedback):not(.invalid-tooltip):not(.invalid-feedback) {
    border-bottom-left-radius: 0.6rem;
    border-bottom-right-radius: 0.6rem;
    border-top-left-radius: 0.6rem;
    border-top-right-radius: 0.6rem;
  }
```

### Ficheiros alterados (4.2.2)

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Substituição do bloco 4.2.1; correcção de indentação `.exception-section-header` no mesmo `@media` |
| Este relatório | §14 |

**Fora de scope:** markup, tokens, desktop, resto da CompanyPage, Agendamentos/Etapa 3 — sem alterações.

### Testes e build (4.2.2)

```text
CompanyPage*.test.tsx + CompanyForm*.test.tsx → 40/40 OK
npm run build → exit 0 OK
```

Validação visual no browser **não** executada nesta sub-etapa. Aguardar confirmação manual do utilizador.

---

## 15. Etapa 4.3 — Logótipo centralizado em mobile (CompanyForm)

**Data:** 02/11/2026  
**Motivação:** Centralizar horizontalmente o bloco de pré-visualização e controlos do logótipo da empresa em ecrãs estreitos, sem afectar outros `ImageUploader` (Clientes, Funcionários).

### Análise prévia

| Peça | Papel |
|------|--------|
| [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) | Instancia `ImageUploader` (`id="company-logo"`, `kind="company"`, labels de logo). |
| [`ImageUploader.tsx`](../../client/src/components/common/ImageUploader.tsx) | Root `.image-uploader`: `ImageAvatar.image-uploader-preview` + `.image-uploader-body` (acções, hint, mensagens). |
| [`index.css`](../../client/src/index.css) L1449–1489 | Base: flex row, `align-items: center`. @575 global: `align-items: flex-start` em **todos** os uploaders. |

Tablet/desktop (≥768px): mantém flex horizontal do componente. Mobile Company: override scoped só com wrapper dedicado.

### Implementação

**Markup:** wrapper `<div className="company-form-logo-uploader">` à volta do `ImageUploader` em `CompanyForm` (sem alterar props nem handlers).

**CSS** (apenas `@media (max-width: 767.98px)`):

| Selector | Regra |
|----------|--------|
| `.company-form-logo-uploader .image-uploader` | `flex-direction: column`, `align-items: center` |
| `.company-form-logo-uploader .image-uploader-body` | coluna, `align-items: center`, `width: 100%` |
| `.company-form-logo-uploader .image-uploader-actions` | `justify-content: center` |
| `.company-form-logo-uploader .image-uploader-hint/success/error` | `text-align: center` |

A pré-visualização continua via `ImageAvatar` / `object-fit: cover` — sem distorção. Especificidade `(0, 2, 0)` prevalece sobre `.image-uploader { align-items: flex-start }` @575 noutros contextos; Client/Employee uploaders inalterados.

**Link público (4.2):** sem alterações.

### Comportamento esperado

| Viewport | Logótipo CompanyForm |
|----------|----------------------|
| **≥768px** | Igual ao anterior: avatar + acções lado a lado (flex wrap global). |
| **≤767.98px** | Avatar centrado; acções e textos de hint/feedback centrados abaixo. |

### Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) | Wrapper `company-form-logo-uploader` |
| [`index.css`](../../client/src/index.css) | Regras @767 scoped |
| Este relatório | §15 |

### Testes e build

```text
CompanyPage*.test.tsx, CompanyForm*.test.tsx, ImageUploader.test.tsx → 54/54 OK
npm test -- --run → 1439/1439 OK
npm run build → exit 0 OK
```

Validação visual manual **não** executada nesta etapa.
