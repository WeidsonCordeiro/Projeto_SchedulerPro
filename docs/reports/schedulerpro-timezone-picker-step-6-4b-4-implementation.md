# SchedulerPro — Etapa 6.4b.4 — TimezonePicker no CompanyForm (implementação)

**Data:** 2026-11-04  
**Branch:** `feature/timezone-picker-step-6-4b`  
**Relacionado:** [`schedulerpro-timezone-picker-step-6-4b-3-implementation.md`](./schedulerpro-timezone-picker-step-6-4b-3-implementation.md)

---

## 1. Objetivo

Substituir o `<select>` nativo de timezone em [`CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) pelo [`TimezonePicker`](../../client/src/components/common/TimezonePicker.tsx), mantendo validação, payload IANA e suporte a zonas legadas via `ensureOption`.

Sem alterações em `RegisterPage`, backend ou Redux.

---

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/company/CompanyForm.tsx`](../../client/src/components/company/CompanyForm.tsx) | `<select>` → `TimezonePicker`; removidos `getIanaTimezones` / `timezoneOptions` |
| [`client/src/components/company/CompanyForm.test.tsx`](../../client/src/components/company/CompanyForm.test.tsx) | Interacções combobox + pesquisa; `mockViewportDesktop()` |

**Inalterados:** `TimezonePicker.tsx`, helpers `timezones.ts`, API, DTOs.

---

## 3. Alterações no formulário

| Antes | Depois |
|-------|--------|
| `<select id="company-timezone">` + label/form-text duplicados | `<TimezonePicker />` com label, helper e erros integrados |
| Lista manual `timezoneOptions` | `ensureOption={company.timezone}` no picker |
| `onChange` via `event.target.value` | `onChange={setTimezone}` |

Props ligadas ao estado existente:

```tsx
<TimezonePicker
  id="company-timezone"
  label="Timezone"
  value={timezone}
  onChange={setTimezone}
  invalid={Boolean(fieldErrors.timezone)}
  errorMessage={fieldErrors.timezone}
  helperText="Fuso horário da empresa (padrão IANA). Todos os horários de agendamento são interpretados neste fuso."
  ensureOption={company.timezone}
/>
```

- **`validate()`** e mensagens (`O timezone é obrigatório.`, `Timezone IANA inválido.`) — inalteradas.
- **Submit:** `UpdateCompanyPayload { name, timezone: timezone.trim() }` — inalterado.
- **Loading:** apenas o botão submit fica `disabled` durante `isSubmitting`; o picker permanece enabled (comportamento anterior do `<select>`).
- **Logo / nome:** sem alterações.

---

## 4. Testes

Comando:

```bash
cd client
npm test -- src/components/company/CompanyForm.test.tsx src/components/common/TimezonePicker.test.tsx src/config/timezones.test.ts
```

| Resultado | Detalhe |
|-----------|---------|
| **52/52 passou** | 12 CompanyForm + 26 TimezonePicker + 14 timezones |

Adaptações principais:

- Valor inicial via `formatTimezoneOptionLabel` no combobox.
- Helpers `openTimezonePicker` / `selectTimezoneBySearch`.
- Legacy `Etc/Unknown_Legacy` visível no trigger e na lista.
- Submit asserta `timezone: "America/Sao_Paulo"` e **não** envia prefixo `(UTC`.
- `mockViewportDesktop()` para suite de form (dropdown desktop).

Testes de API, rede e loading preservados.

---

## 5. Build

```bash
cd client && npm run build
```

**Sucesso** — bundle inclui `TimezonePicker` (251 módulos vs 250 anterior). Aviso chunk > 500 kB — pré-existente.

---

## 6. Limitações

- Testes de form usam viewport desktop simulado; mobile modal na página empresa fica coberto pelos testes do `TimezonePicker`.
- `ensureOption` usa `company.timezone` das props (não só estado local) — alinhado ao valor persistido no backend ao montar o form.

---

## 7. Próxima sub-etapa — 6.4b.5 RegisterPage

- Substituir `<select id="register-company-timezone">` por `TimezonePicker`.
- Label «Fuso horário», `value` / `onChange` em `companyTimezone`, validação existente.
- Registo **não** precisa de `ensureOption` (nova empresa); default `getDefaultTimezone()` mantém-se no state inicial.
- Actualizar [`RegisterPage.test.tsx`](../../client/src/pages/RegisterPage.test.tsx) (hoje `getByLabelText("Fuso horário")` + payload register).

---

## 8. Git

| Item | Estado |
|------|--------|
| Commit / push | **Não executados** |
| Branch | `feature/timezone-picker-step-6-4b` |

---

*Fim do relatório — Etapa 6.4b.4.*
