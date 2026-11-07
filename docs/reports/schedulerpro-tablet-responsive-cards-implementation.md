# SchedulerPro — tablet entity list cards (768px–1199.98px)

**Read-only Git snapshot (documentation time):**

| | |
| --- | --- |
| Branch | `develop` |
| `HEAD` | `42193a1` |
| Tracking | `develop...origin/develop` |

**Modified files (implementation):**

- `client/src/index.css`
- `client/src/pages/employees/EmployeesPage.tsx`
- `client/src/pages/employees/EmployeesPage.test.tsx`
- `client/src/pages/clients/ClientsPage.tsx`
- `client/src/pages/clients/ClientsPage.test.tsx`
- `client/src/pages/services/ServicesPage.tsx`
- `client/src/pages/services/ServicesPage.test.tsx`

**Untracked (not part of this feature):**

- `docs/reports/schedulerpro-employees-clients-services-mobile-ux-audit.md`
- `docs/reports/schedulerpro-tablet-responsive-audit.md`

No commit, push, or stash was performed for this work.

---

## Problem

The **Funcionários**, **Clientes**, and **Serviços** pages used only **mobile cards** (`&lt;768px`) and **desktop tables** (`md+`). Between **768px and 1199.98px**, the table layout was heavy or awkward on tablets; the product goal is a **third surface**: compact **tablet cards** in that range, with the table only from **XL (≥1200px)**.

---

## Breakpoint strategy (Bootstrap 5)

| Viewport | Visible block | Wrapper pattern | `data-testid` suffix |
| --- | --- | --- | --- |
| &lt; 768px | Mobile cards (unchanged) | `d-md-none` | `*-list-mobile` |
| 768px–1199.98px | Tablet cards (new) | `d-none d-md-block d-xl-none` | `*-list-tablet` |
| ≥ 1200px | Desktop table | `d-none d-xl-block` | `*-list-desktop` |

Exactly one list/table surface is intended to show per breakpoint (CSS-only; no JS).

---

## Implementation notes

- **Employees:** Tablet cards reuse `ImageAvatar`, `formatDate`, `renderEmployeeRowActions`, role badges, self (“Você”) and status in the header area; full email; footer actions when RBAC allows.
- **Clients:** Avatar, name, status; full email and phone lines; `renderClientRowActions` in the footer when allowed.
- **Services:** Name and status; **full** description without the mobile three-line clamp (tablet uses wrapping / `overflow-wrap` via scoped CSS); duration and price in a responsive row; `renderServiceRowActions` in the footer.
- **`index.css`:** Scoped under `.entity-list-tablet` / related classes for compact layout, `min-width: 0` on text containers where needed to reduce horizontal overflow; no global `overflow-x: hidden` on the whole page. Tablet footers: `.entity-list-tablet .table-actions` uses `justify-content: flex-end` and `width: 100%` so action buttons align right with wrap (see below).

---

## Ajuste de alinhamento das ações (tablet)

**Read-only Git snapshot (início do ajuste):**

| | |
| --- | --- |
| Branch | `develop` |
| `HEAD` | `42193a1` |
| Tracking | `develop...origin/develop` |

**Problema:** Em validação visual, ações nos cards tablet de Funcionários e Clientes apareciam à esquerda; Serviços serviu de referência de UX. O markup dos três footers é o mesmo (`card-footer` + `render*RowActions` → `.table-actions`); faltava alinhamento explícito à direita.

**Alteração (escopo mínimo):**

- Ficheiro: [`client/src/index.css`](../../client/src/index.css)
- Substituição do media query que só impunha `max-width: 100%` por regra global scoped:

```css
.entity-list-tablet .table-actions {
  justify-content: flex-end;
  max-width: 100%;
  width: 100%;
}
```

- **Sem alterações** em `EmployeesPage.tsx`, `ClientsPage.tsx`, `ServicesPage.tsx`, mobile (`.entity-list-mobile`) nem tabelas desktop (`.table-actions` em `<td>`).
- `flex-wrap` e `gap` herdados de `.table-actions`; botões, RBAC e visibilidade inalterados.

**Testes (pós-ajuste):**

```bash
cd client
npm run test -- src/pages/employees/EmployeesPage.test.tsx src/pages/clients/ClientsPage.test.tsx src/pages/services/ServicesPage.test.tsx
```

**Resultado:** **86 passed** (3 ficheiros). Nenhuma alteração nos testes.

**Build (pós-ajuste):** `npm run build` — **sucesso** (`tsc -b` + Vite).

**Validação visual:** Não executada nesta passagem; recomendado viewport ~900px nas três páginas com `npm run dev`.

---

## Tests

**Scoped (recommended for this feature):**

```bash
cd client
npm run test -- src/pages/employees/EmployeesPage.test.tsx src/pages/clients/ClientsPage.test.tsx src/pages/services/ServicesPage.test.tsx
```

**Result at documentation time:** **86 tests passed** across those three files.

**Updates in tests:**

- Helpers such as `within(screen.getByTestId('*-list-tablet'))`.
- Wrapper class assertions: desktop uses `d-xl-block` (not `d-md-block` for the table container); tablet uses `d-md-block` and `d-xl-none`; mobile unchanged (`d-md-none`).
- New or extended `describe` blocks for tablet cards (fields and actions where applicable).

**Full suite:**

One full `npm run test` run completed with **exit code 1**: **3 failed test files** / 134 total; **6 failed tests** / 1554 total (**1548 passed**). Approx. **748s** wall time.

| File | Failure |
| --- | --- |
| `RegisterPage.test.tsx` (4) | `Test timed out in 5000ms` — password validation, confirmation, timezone payload, server errors |
| `CompanyForm.test.tsx` (1) | `Test timed out in 5000ms` — legacy backend timezone / `ensureOption` |
| `DashboardPage.test.tsx` (1) | Missing `dashboard-upcoming-agenda-desktop` — DOM showed loading state (`A carregar o painel…`) |

Failures are **outside** the Employees / Clients / Services tablet changes. Fix or raise timeouts / async waits in those suites for a green full run.

---

## Build

```bash
cd client
npm run build
```

**Result at documentation time:** **Succeeded** (TypeScript + Vite production build).

---

## Limitations

- **No automated visual / browser validation** was part of this pass; behaviour is covered by unit/integration tests and Bootstrap visibility classes only.
- Full test suite may still fail due to unrelated tests; see above.

---

## References

- Plan: tablet entity list cards (768px–1199.98px), third surface on Employees / Clients / Services, XL-only table, no API changes.
