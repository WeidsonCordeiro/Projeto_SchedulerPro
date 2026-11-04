# SchedulerPro — Etapa 6.4b.3 — TimezonePicker mobile (implementação)

**Data:** 2026-11-04  
**Branch:** `feature/timezone-picker-step-6-4b`  
**Base:** `ffc27cf` + trabalho 6.4b.1 / 6.4b.2 no working tree  
**Relacionado:** [`schedulerpro-timezone-picker-step-6-4b-2-implementation.md`](./schedulerpro-timezone-picker-step-6-4b-2-implementation.md)

---

## 1. Objetivo

Adaptar o [`TimezonePicker`](../../client/src/components/common/TimezonePicker.tsx) para:

- **Desktop (≥768px):** manter dropdown absoluto da 6.4b.2.
- **Mobile (≤767.98px):** modal Bootstrap `modal-fullscreen`, pesquisa, lista com scroll interno, focus trap e bloqueio de scroll do `body`.

Sem integração em `CompanyForm` / `RegisterPage`.

---

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/common/TimezonePicker.tsx`](../../client/src/components/common/TimezonePicker.tsx) | Ramo mobile + refacção painel partilhado |
| [`client/src/components/common/TimezonePicker.test.tsx`](../../client/src/components/common/TimezonePicker.test.tsx) | `mockViewportMobile`, suites desktop/mobile |

Nenhuma alteração a helpers, backend, Redux, CSS global ou dependências.

Relatórios anteriores em `docs/reports/` **preservados**.

---

## 3. Estratégia desktop / mobile

| Aspecto | Implementação |
|---------|----------------|
| Breakpoint | [`MOBILE_CALENDAR_MEDIA_QUERY`](../../client/src/hooks/useMatchMedia.ts) — `(max-width: 767.98px)` (alinhado calendário / `index.css`) |
| Detecção | [`useMatchMedia`](../../client/src/hooks/useMatchMedia.ts) |
| Estado partilhado | `searchQuery`, `filteredZones`, `activeIndex`, `selectZone`, `closePicker`, `openPicker` |
| UI partilhada | `searchField` + `optionsList` (mesmos helpers) |
| Desktop aberto | `timezone-picker__menu` absoluto, `max-height: 40vh` na lista |
| Mobile aberto | `modal-backdrop` + `modal modal-fullscreen`, lista `timezone-picker__list--modal` (flex + `overflow-y: auto`) |

Título modal: **«Selecionar fuso horário»** (`MOBILE_MODAL_TITLE`).

---

## 4. Comportamento mobile

- Toque no combobox → modal fullscreen.
- Pesquisa com foco inicial (`searchRef.focus()`).
- Seleção → `onChange(IANA)` → `closePicker()` (limpa pesquisa, devolve foco ao trigger).
- Fechar: botão `btn-close`, Escape (documento + campo pesquisa), seleção.
- `document.body.style.overflow = "hidden"` enquanto modal aberto; restaurado no cleanup.

Desktop: clique fora (`mousedown`) **apenas** quando `!isMobile` (inalterado em espírito).

---

## 5. Acessibilidade e foco

| Recurso | Desktop | Mobile |
|---------|---------|--------|
| Trigger | `role="combobox"`, `aria-haspopup="listbox"` | `aria-haspopup="dialog"` |
| `aria-activedescendant` | No combobox | No campo de pesquisa (evita conflito com foco no input) |
| Diálogo | — | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → título |
| Listbox | `aria-labelledby` → label do form | `aria-labelledby` → título do modal |
| Focus trap | — | Tab no último focusável → primeiro; Shift+Tab inverso |
| Ao fechar | Foco no trigger (`triggerRef`) | Idem |

Focus trap implementado em React (sem dependência extra), inspirado no padrão de [`DestructiveConfirmModal`](../../client/src/components/common/DestructiveConfirmModal.tsx) (sem assumir comportamento Bootstrap JS).

---

## 6. Testes

Comando:

```bash
cd client
npm test -- src/components/common/TimezonePicker.test.tsx src/config/timezones.test.ts
```

| Resultado | Detalhe |
|-----------|---------|
| **40/40 passou** | 26 TimezonePicker (17 desktop + 9 mobile) + 14 timezones |

**Simulação de viewport:** `mockViewportMobile()` redefine `window.matchMedia` com `matches: mobile && query.includes("767.98")` (padrão [`CalendarView.test.tsx`](../../client/src/components/appointments/CalendarView.test.tsx)).

Cobertura mobile adicionada: dialog + título, pesquisa/filtro, seleção IANA, fecho pós-seleção, Escape + foco no trigger, `body` overflow, Tab trap, `ensureOption`, `aria-haspopup="dialog"`.

Suite **desktop** preservada (describe aninhado, `mockViewportMobile(false)` por defeito).

---

## 7. Build

```bash
cd client && npm run build
```

**Sucesso** (`tsc -b && vite build`). Aviso chunk > 500 kB — pré-existente.

---

## 8. Validação visual (viewports)

| Viewport | Teste automatizado | Teste visual manual |
|----------|--------------------|---------------------|
| 360 / 390 / 767 px | Simulado via `matchMedia` nos testes | **Não executado** nesta entrega |
| 768 / 1024 px | Suite desktop nos testes | **Não executado** |

**Limitação declarada:** não houve inspeção em browser DevTools nem dispositivos físicos iOS/Android. Recomenda-se smoke manual nos tamanhos acima antes de merge.

---

## 9. Limitações conhecidas

- Modal renderizado dentro do `position-relative` do control (não portal `document.body`); fullscreen Bootstrap mitiga corte por `overflow` na maioria dos layouts de form.
- Backdrop + modal empilhados no DOM local (z-index 1055); suficiente para páginas de registo/empresa futuras.
- `aria-activedescendant` no search em mobile enquanto foco está no input — padrão híbrido; testado via setas + Enter.

---

## 10. Próximas sub-etapas (6.4b.4 / 6.4b.5)

- **6.4b.4 — [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx):** substituir `<select>` por `<TimezonePicker id="company-timezone" ensureOption={company.timezone} … />`; adaptar [`CompanyForm.test.tsx`](../../client/src/components/company/CompanyForm.test.tsx).
- **6.4b.5 — [`RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx):** id `register-company-timezone`, default `getDefaultTimezone()`; testes de registo.

Contrato inalterado: `value` / `onChange` string IANA.

---

## 11. Git

| Item | Estado |
|------|--------|
| Commit / push | **Não executados** |
| Branch | `feature/timezone-picker-step-6-4b` |

---

## 12. Contexto para continuidade (IA)

```text
TimezonePicker: isMobile via useMatchMedia(MOBILE_CALENDAR_MEDIA_QUERY)
Props inalteradas (TimezonePickerProps)
Integração: invalid, errorMessage, helperText já suportados no componente
Testes empresa/registo: hoje usam getByLabelText + HTMLSelectElement — migrar para combobox + interacções de picker
```

---

*Fim do relatório — Etapa 6.4b.3.*
