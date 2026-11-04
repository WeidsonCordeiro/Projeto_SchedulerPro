# SchedulerPro — Etapa 6.4b.6 — Auditoria e validação final do TimezonePicker

**Data:** 2026-11-04  
**Branch:** `feature/timezone-picker-step-6-4b`  
**Tipo:** auditoria read-only (sem alterações de código de produção; apenas este relatório foi criado)

**Relacionado:** [`schedulerpro-timezone-picker-step-6-4b-audit.md`](./schedulerpro-timezone-picker-step-6-4b-audit.md), implementações 6.4b.1–6.4b.5, [`schedulerpro-timezone-picker-step-6-4b-branch.md`](./schedulerpro-timezone-picker-step-6-4b-branch.md)

---

## 1. Git — estado inicial e final

| Item | Valor |
|------|--------|
| Branch actual | `feature/timezone-picker-step-6-4b` |
| HEAD | `ffc27cfcd133e231ec5cabbc6b98956154a2c886` (merge PR #125 — Etapa 6.4a em `develop`) |
| Mudança de branch | Não (conforme instruções) |

### Working tree (início e fim da auditoria — idêntico)

**Modificados (unstaged):**

- `client/src/config/timezones.ts`
- `client/src/config/timezones.test.ts`
- `client/src/components/company/CompanyForm.tsx`
- `client/src/components/company/CompanyForm.test.tsx`
- `client/src/pages/RegisterPage.tsx`
- `client/src/pages/RegisterPage.test.tsx`

**Untracked (6.4b):**

- `client/src/components/common/TimezonePicker.tsx`
- `client/src/components/common/TimezonePicker.test.tsx`
- `docs/reports/schedulerpro-timezone-picker-step-6-4b-audit.md`
- `docs/reports/schedulerpro-timezone-picker-step-6-4b-branch.md`
- `docs/reports/schedulerpro-timezone-picker-step-6-4b-{1..5}-implementation.md`

**Diff agregado (6 ficheiros staged-equivalent):** +361 / −103 linhas.

**Relatórios anteriores:** presentes em `docs/reports/`; nenhum foi apagado ou sobrescrito (excepto adição deste ficheiro 6.4b.6).

**Ignorados relevantes:** `client/coverage/`, `client/dist/`, `node_modules/` (sem impacto na auditoria).

---

## 2. Ficheiros auditados

| Área | Ficheiros |
|------|-----------|
| Helpers | `client/src/config/timezones.ts`, `timezones.test.ts` |
| Picker | `client/src/components/common/TimezonePicker.tsx`, `TimezonePicker.test.tsx` (CSS inline no componente) |
| Empresa | `client/src/components/company/CompanyForm.tsx`, `CompanyForm.test.tsx` |
| Registo | `client/src/pages/RegisterPage.tsx`, `RegisterPage.test.tsx` |
| Integração indirecta | `client/src/pages/company/CompanyPage.test.tsx` (não alterado na 6.4b) |
| Layout / rotas | `client/src/components/layout/AppLayout.tsx`, `client/src/routes/AppRoutes.tsx` |
| Limites de escopo | `git diff HEAD -- server/`, `client/package.json`, lockfiles — **sem alterações** |

---

## 3. Resultado da auditoria por componente

### 3.1 Helpers (`timezones.ts`)

| Verificação | Resultado |
|-------------|-----------|
| `getIanaTimezones()` | Mantém `Intl.supportedValuesOf("timeZone")` com fallback ordenado; comportamento alinhado ao original documentado. |
| `isValidIanaTimezone()` | Usa `IANAZone.isValidZone` (Luxon), coerente com backend. |
| `formatTimezoneOptionLabel()` | `(UTC±offset) {iana}`; inválidos devolvem a string bruta; offset informativo via `DateTime.now()`. |
| `filterIanaTimezones()` | Pesquisa por identificador e por rótulo formatado; normalização trim + lowercase + colapsar espaços; devolve cópia (`[...zones]` ou filter); **não muta** a lista de entrada. |
| Valor persistido | Apenas identificador IANA nos consumidores; confirmado em `CompanyForm` PATCH e `RegisterPage` POST. |

**Conclusão helpers:** conforme especificação 6.4b.1.

### 3.2 `TimezonePicker`

| Verificação | Resultado |
|-------------|-----------|
| Pesquisa e seleção | Lista filtrada; `selectZone` chama `onChange(zone)` com IANA puro. |
| `ensureOption` | `buildTimezoneOptions` prefixa valor legado se ausente de `getIanaTimezones()`. |
| Estados | `open`, `searchQuery`, `activeIndex`; mensagem «Nenhum fuso horário encontrado.» quando filtro vazio. |
| Inválido / disabled | Props `invalid`, `errorMessage`, `disabled` reflectidas na UI e no trigger. |
| Fecho | Escape (search + modal), clique exterior (desktop `mousedown`), seleção → `closePicker()` restaura foco no trigger. |
| Teclado / ARIA | Combobox (`role="combobox"`), listbox/options, `aria-expanded`, `aria-activedescendant`, modal `role="dialog"` + `aria-modal`. |
| Desktop | Dropdown ancorado ao container; scroll `max-height` + `scrollIntoView` na opção activa. |
| Mobile | Breakpoint `MOBILE_CALENDAR_MEDIA_QUERY` (767.98px); modal fullscreen Bootstrap; `body.overflow = hidden` com cleanup no `useEffect`; focus trap Tab no modal. |
| Desmontagem | Listeners e restore de `body.overflow` removidos nos cleanups dos efeitos; desmontar com modal aberto repõe overflow via cleanup. |
| Portal | **Não** usa `createPortal`; modal renderizado na árvore do componente. |

**Conclusão picker:** implementação coerente com 6.4b.2–6.4b.3 e testes dedicados; risco de stacking/overflow depende do ancestral (ver problemas).

### 3.3 `CompanyForm`

| Verificação | Resultado |
|-------------|-----------|
| Substituição | Apenas o `<select>` de timezone → `TimezonePicker` (`id="company-timezone"`). |
| `ensureOption` | `ensureOption={company.timezone}` preserva legado. |
| Validação | `validate()` inalterada: obrigatório + `isValidIanaTimezone`. |
| PATCH | `updateCompany` com `{ name, timezone: timezone.trim() }`. |
| Loading | Botão submit `disabled={isSubmitting}`; picker **não** disabled durante submit (equivalente ao `<select>` anterior). |
| Permissões / logo / outros campos | Não alterados neste diff. |

**Conclusão CompanyForm:** conforme 6.4b.4.

### 3.4 `RegisterPage`

| Verificação | Resultado |
|-------------|-----------|
| Valor inicial | `useState(getDefaultTimezone())` — Luxon local válido ou `Europe/Lisbon`. |
| `ensureOption` | Ausente (correcto para registo). |
| Validação | `companyTimezone` + `isValidIanaTimezone` no submit. |
| Payload | Contrato de registo mantido (timezone IANA string). |
| Disabled | `disabled={isLoading}` no picker e no botão. |
| Rota | `/register` **fora** de `AppLayout` ([`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx)) — menor risco de `overflow-hidden` do layout autenticado. |

**Conclusão RegisterPage:** conforme 6.4b.5.

### 3.5 Limites de escopo (Etapa 6.4b)

| Área | Alterado? |
|------|-----------|
| `server/` | Não |
| DTOs / contratos API | Não (client-side only) |
| MongoDB / Mongoose | Não |
| Redux / seletores timezone globais | Não |
| `appointmentTime.ts` | Não |
| Calendário / agendamentos | Não |
| `client/package.json` / lockfiles | Não |

Utilização dinâmica de `company.timezone` em toda a app permanece **fora de escopo** (não iniciado).

---

## 4. Testes automatizados

### 4.1 Testes específicos 6.4b

**Comando:**

```bash
cd client && npm test -- src/config/timezones.test.ts src/components/common/TimezonePicker.test.tsx src/components/company/CompanyForm.test.tsx src/pages/RegisterPage.test.tsx
```

**Resultado (2026-11-04 ~15:07 UTC):**

| Ficheiro | Ficheiros | Testes |
|----------|-----------|--------|
| `timezones.test.ts` | 1 | 14 |
| `TimezonePicker.test.tsx` | 1 | 26 |
| `CompanyForm.test.tsx` | 1 | (incl. no total) |
| `RegisterPage.test.tsx` | 1 | (incl. no total) |
| **Total** | **4 passed** | **63 passed** |

Duração ~26.6 s.

**Nota:** numa execução anterior em batch, o teste «calls register with the selected IANA timezone» chegou a falhar por timeout; na re-execção acima **passou**. Tratar como possível flakiness sob carga paralela (severidade baixa).

### 4.2 Suite completa client

**Comando:**

```bash
cd client && npm test
```

**Resultado (2026-11-04 ~15:14 UTC):**

| Métrica | Valor |
|---------|--------|
| Ficheiros | 133 passed, **1 failed** |
| Testes | **1497 passed**, **3 failed**, **1500 total** |
| Duração | ~375.7 s |

**Falhas (todas em `CompanyPage.test.tsx`):**

1. **«renders the company data…»** — `expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Lisbon")` — combobox não expõe `.value` como `<select>`.
2. **«shows an error with retry…»** — mesma asserção `toHaveValue`.
3. **«updates the company and shows success feedback»** — `fireEvent.change` no label «Timezone» não altera estado; PATCH mock recebe `timezone: "Europe/Lisbon"` em vez de `"America/Sao_Paulo"`.

**Causa:** integração do picker no `CompanyForm` embutido na página; **`CompanyPage.test.tsx` não foi actualizado** na 6.4b.4 (fora do escopo explícito da sub-etapa, mas regressão de CI).

### 4.3 Build

**Comando:**

```bash
cd client && npm run build
```

**Resultado:** **sucesso** (`tsc -b && vite build`, 251 módulos, ~12.6 s).

**Warnings:** chunk JS > 500 kB — **pré-existente** (mesmo padrão reportado na auditoria 6.4b); npm `Unknown env config "devdir"` — ambiente local, não introduzido pela etapa.

---

## 5. Problemas encontrados (por severidade)

### Alta — CI / regressão de testes

| ID | Local | Impacto | Recomendação |
|----|-------|---------|--------------|
| P1 | [`client/src/pages/company/CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx) L94, L192, L255 | Suite completa falha (3 testes); PR/CI vermelho após merge do picker | Actualizar asserções para combobox (texto do trigger / `formatTimezoneOptionLabel`) e seleccionar timezone via interacção do picker (pesquisa + clique), alinhado a [`CompanyForm.test.tsx`](../../client/src/components/company/CompanyForm.test.tsx). **Requer autorização explícita** (fora do read-only 6.4b.6). |

### Média — validação manual / UX

| ID | Local | Impacto | Recomendação |
|----|-------|---------|--------------|
| P2 | `TimezonePicker` modal sem portal + [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) L59 `.app-body … overflow-hidden` | Em `/company` (mobile/desktop), dropdown ou backdrop do modal podem ser **clipped** ou ficar sob stacking context do layout | Checklist manual em viewports reais; se confirmado, considerar portal ou ajuste de overflow **numa etapa futura** autorizada. |
| P3 | Checklist browser (secção 8) | Comportamento visual, PATCH real, Redux e calendário **não verificados** nesta auditoria | Utilizador executa checklist antes de considerar merge «sem ressalvas». |

### Baixa

| ID | Local | Impacto | Recomendação |
|----|-------|---------|--------------|
| P4 | `RegisterPage.test.tsx` (execuções paralelas) | Flake ocasional por timeout | Re-correr isolado; se persistir, aumentar timeout ou serializar teste pesado. |

### Informativo

| ID | Nota |
|----|------|
| I1 | Registo em rota pública sem `AppLayout` — risco P2 menor que na página Empresa. |
| I2 | Testes de viewport no Vitest **não substituem** QA visual real (conforme instruções). |

---

## 6. Limitações conhecidas

1. Modal mobile **aninhado** no DOM do picker (documentado em 6.4b.3).
2. Offset no label depende de «agora» (DST); valor guardado continua IANA.
3. `CompanyPage.test.tsx` desactualizado — falha de suite não implica falha funcional do form isolado (`CompanyForm.test.tsx` passa).
4. Nenhuma validação manual em browser foi executada pelo auditor (sem evidência DevTools/rede).

---

## 7. Checklist manual pendente (utilizador)

**Não marcada como concluída neste relatório.**

### Desktop (dropdown)

- [ ] 768px — abrir picker, pesquisar (ex.: `Sao`), seleccionar, scroll longo na lista.
- [ ] 1024px — idem; confirmar fecho Escape e clique fora.

### Mobile (modal)

- [ ] 360px, 390px, 767px — modal fullscreen, pesquisa, seleção, botão fechar, scroll.
- [ ] **Empresa (`/company`):** confirmar que modal/backdrop **não** ficam cortados pelo layout.
- [ ] **Registo (`/register`):** repetir smoke mobile.

### Registo

- [ ] Timezone inicial coerente com ambiente (ou Lisboa).
- [ ] Seleccionar timezone ≠ Lisboa; criar conta.
- [ ] DevTools: `POST /auth/register` com `timezone` IANA exacto.

### Empresa (OWNER/ADMIN)

- [ ] Editar timezone; pesquisar; guardar.
- [ ] DevTools: `PATCH` com IANA; Redux `company.timezone` actualizado.
- [ ] Empresa com timezone legado fora da lista runtime — opção visível via `ensureOption`.

### Calendário (smoke pós-login)

- [ ] Horários continuam coerentes com timezone da empresa (sem alterar lógica de calendário nesta etapa).

---

## 8. Conclusão

| Verdicto | **Aprovado com ressalvas** |
|----------|----------------------------|

**Fundamentação:**

- Implementação 6.4b (helpers, picker, `CompanyForm`, `RegisterPage`) **consistente** com objectivos e contratos IANA; build **OK**; testes dedicados **63/63 OK**.
- Suite completa **não verde** por regressão documentada em `CompanyPage.test.tsx` (P1).
- QA manual e risco de overflow/portal (P2–P3) **pendentes**.

---

## 9. Recomendação para o próximo passo

1. **Autorizar** correcção de `CompanyPage.test.tsx` (ou incluir num commit de «hardening CI» antes do PR).
2. Utilizador: **commit** na branch `feature/timezone-picker-step-6-4b` (código + relatórios 6.4b.* incluindo este ficheiro) e **PR → develop**.
3. Executar checklist manual (secção 7); se P2 se confirmar na Empresa, planear follow-up (portal/overflow).
4. Não iniciar propagação global de `company.timezone` até etapa dedicada.

---

## 10. Restrições respeitadas

- Sem commits, push, pull, merge, rebase, stash, reset, clean ou mudança de branch.
- Sem alterações de código de produção durante a auditoria.
- Sem instalação ou actualização de dependências.
- Relatórios anteriores preservados.
