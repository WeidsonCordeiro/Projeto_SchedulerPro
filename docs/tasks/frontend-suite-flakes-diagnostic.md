# Diagnóstico — Falhas da suite frontend pós-O5

**Data:** 16/11/2026  
**Tipo:** Diagnóstico read-only (sem alterações a prod, testes, config ou deps; sem `npm test` integral; sem git write)

**Branch:** `test/diagnose-frontend-suite-flakes`  
**HEAD:** `ad48f5ce32e180188f8b08a92dcd6de6e1cf4147` — `ad48f5c Merge pull request #139 from WeidsonCordeiro/test/stabilize-dashboard-o5-stale-response`

**Fonte da suite integral (não reexecutada nesta tarefa):** [dashboard-o5-stale-response-fix.md](dashboard-o5-stale-response-fix.md) §7 — 16/11/2026, **1604/1610**, 6 falhas.

---

## 1. Estado Git

### Inicial

| Campo | Valor |
|-------|--------|
| Branch | `test/diagnose-frontend-suite-flakes` (gate **OK**) |
| HEAD | `ad48f5c` (merge O5 / PR #139) |
| Modified / staged | Nenhum |
| Untracked | Nenhum |

### Final

| Campo | Valor |
|-------|--------|
| HEAD | Inalterado |
| `git diff --name-only` | Apenas `docs/tasks/frontend-suite-flakes-diagnostic.md` (novo) |
| Código `client/` | **Sem alterações** |

---

## 2. Seis testes investigados (nomes completos)

| ID | Ficheiro | Nome `it(...)` | Linha |
|----|----------|----------------|-------|
| **T1** | `client/src/pages/RegisterPage.test.tsx` | `calls register with the selected IANA timezone in the payload` | L224 |
| **T2** | `client/src/pages/RegisterPage.test.tsx` | `shows server errors` | L265 |
| **T3** | `client/src/components/appointments/AppointmentsListView.test.tsx` | `invokes edit, status and delete callbacks from the action row` | L126 |
| **T4** | `client/src/components/appointments/AppointmentsListView.test.tsx` | `disables action buttons and shows Aguarde for the pending status action` | L170 |
| **T5** | `client/src/pages/appointments/AppointmentsPage.test.tsx` | `shows a friendly error and a retry button when loading fails` | L312 |
| **T6** | `client/src/pages/company/CompanyPage.test.tsx` | `keeps the session and shows feedback when delete fails` | L573 |

**Config Vitest (referência):** `client/vite.config.ts` — `testTimeout` não definido (**5000 ms** default); `maxWorkers: 3`; `pool: threads`.

---

## 3. Comandos executados

Diretório: `client/`

**Isolado (×3 por teste):**

```bash
npx vitest run <ficheiro> -t "<nome exacto do it>"
```

**Ficheiro completo (×1 por ficheiro afectado):**

```bash
npx vitest run src/pages/RegisterPage.test.tsx
npx vitest run src/components/appointments/AppointmentsListView.test.tsx
npx vitest run src/pages/appointments/AppointmentsPage.test.tsx
npx vitest run src/pages/company/CompanyPage.test.tsx
```

**Não executado:** `npm test` integral (conforme brief).

---

## 4. Resultados — execuções isoladas (×3)

| ID | R1 | R2 | R3 | Duração teste (aprox., R1) |
|----|----|----|-----|-----------------------------|
| T1 | PASS (ec 0) | PASS | PASS | tests ~3.8 s / total ~15 s |
| T2 | PASS | PASS | PASS | tests ~4.0 s |
| T3 | **FAIL** | **FAIL** | **FAIL** | tests ~1.0 s |
| T4 | **FAIL** | **FAIL** | **FAIL** | tests ~0.9 s |
| T5 | PASS | PASS | PASS | tests ~1.3 s |
| T6 | PASS | PASS | PASS | tests ~3.6 s |

### Mensagens de erro (T3 / T4 — idênticas nas 3 corridas)

```
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Editar"
```

- **T3 — stack:** `AppointmentsListView.test.tsx` L129 — `getByRole("button", { name: "Editar" })`
- **T4 — stack:** `AppointmentsListView.test.tsx` L176 — `getByRole("button", { name: "Editar" })` (`.toBeDisabled()`)

**T1/T2/T5/T6:** sem falha isolada; nenhum timeout registado nas 9 corridas.

---

## 5. Resultados — ficheiro completo (×1)

| Ficheiro | Exit | Resultado | Falhas listadas |
|----------|------|-----------|-----------------|
| RegisterPage.test.tsx | 0 | **11/11** | — |
| AppointmentsListView.test.tsx | 1 | **7 passed, 2 failed** | T3, T4 |
| AppointmentsPage.test.tsx | 0 | **43/43** | — |
| CompanyPage.test.tsx | 0 | **34/34** | — |

Durações Vitest totais: Register ~21 s; ListView ~8 s; AppointmentsPage ~20 s; CompanyPage ~25 s.

---

## 6. Análise técnica individual

### T1 — Register, timezone no payload (L224)

- **Fluxo:** `fillValidRegistrationFields()` + `selectTimezoneBySearch("America/Sao_Paulo")` (helper **síncrono**, L88–97) + submit + `findByRole` “criando conta” + asserts `authApi.register` / `getCompany`.
- **Mocks:** `authApi.register` resolve; `companyApi.getCompany` no `beforeEach`.
- **Suite 16/11:** timeout 5000 ms (corpo inteiro do `async` test).
- **Diagnóstico local:** passa **3/3** isolado (~3–4 s de teste) e **11/11** no ficheiro.

### T2 — Register, server errors (L265)

- **Fluxo:** mock reject 409 + fill + submit + `findByRole("alert")`.
- **Suite 16/11:** timeout 5000 ms.
- **Diagnóstico local:** passa **3/3** isolado (~3 s) e no ficheiro completo.

### T3 — AppointmentsListView, callbacks (L126)

- **Fixture:** `startAt: "2026-11-15T09:00:00.000Z"` ([`makeAppointment`](../../client/src/components/appointments/AppointmentsListView.test.tsx) L14).
- **Produção:** [`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx) L177–195 — se `isInstantInPast(startAt)` → botão **Visualizar**; senão **Editar**.
- **`isInstantInPast`:** [`appointmentCalendar.ts`](../../client/src/config/appointmentCalendar.ts) L77–83 — compara com `DateTime.now()` (hora real do sistema).
- **Data do diagnóstico:** 16/11/2026 → agendamento de 15/11/2026 está no **passado** → UI mostra **Visualizar**, não **Editar** (alinhado com suite 16/11: botões Visualizar / Confirmar / Cancelar / Excluir).

### T4 — AppointmentsListView, Aguarde (L170)

- **Props:** `pendingStatusAction: { id: "appt1", action: "confirm" }`.
- **Produção:** botão de status com `pending === action` renderiza label **"Aguarde..."** (L205–207); **Editar/Visualizar** também `disabled={pending !== null}` mas com appointment passado o label é **Visualizar**, não Editar.
- **Assert falho:** L176 exige `getByRole("button", { name: "Editar" })` — elemento **inexistente** (mesma causa de data passada que T3).

### T5 — AppointmentsPage, loading fails (L312)

- **Fluxo:** reject + retry + `switchToListView` + `findByRole(table)` + `getAppointments` **3×**.
- **Suite 16/11:** timeout 5000 ms; stderr `act(...)` warning noutro teste do mesmo ficheiro na suite (não neste isolado).
- **Diagnóstico local:** **3/3** isolado (~1 s teste); **43/43** ficheiro.

### T6 — CompanyPage, delete fails (L573)

- **Fluxo:** mock `deleteCompany` reject 403 + modais + `findByRole("alert")` + session mantida.
- **Suite 16/11:** timeout 5000 ms.
- **Diagnóstico local:** **3/3** isolado (~2–3.5 s teste); **34/34** ficheiro.

---

## 7. Classificação por falha

| ID | Classificação principal | Secundária | Fundamentação |
|----|-------------------------|------------|---------------|
| **T1** | **Dependente da suite** | Intermitente (carga / workers) | Passa isolado ×3 e ficheiro 11/11; falhou só na suite longa (~12 min) com timeout 5 s |
| **T2** | **Dependente da suite** | Intermitente | Idem T1 |
| **T3** | **Reproduzível** | Teste desalinhado com prod (data) | Falha 3/3 isolado + ficheiro; `Editar` vs `Visualizar` por `isInstantInPast` + `startAt` fixo no passado |
| **T4** | **Reproduzível** | Teste desalinhado com prod | Idem T3; assert em `Editar` disabled inexistente com appointment passado |
| **T5** | **Dependente da suite** | Intermitente (caminho longo) | Passa isolado e ficheiro; timeout só na suite integral |
| **T6** | **Dependente da suite** | Intermitente | Passa isolado e ficheiro; timeout só na suite integral |

**Não aplicável nesta corrida:** “Dependente do ficheiro” (nenhum teste falha isolado e passa só no ficheiro).

**Possível problema funcional:** **Não** para T3/T4 — comportamento **Visualizar** para passados é intencional em produção; o defeito está na **fixture/asserção do teste**, não na UI.

---

## 8. Evidências por conclusão

| Conclusão | Evidência |
|-----------|-----------|
| T3/T4 determinísticos | 6/6 corridas isoladas FAIL; 2/9 no ficheiro ListView |
| Causa data | `startAt` 2026-11-15 vs `DateTime.now()` em 2026-11-16; código L178 ListView |
| T1/T2/T5/T6 flakes de suite | 0 falhas em 12 corridas (3×4) isoladas + 0 no ficheiro; falhas documentadas só em `npm test` [fix doc](dashboard-o5-stale-response-fix.md) |
| O5 estável após merge | HEAD inclui PR #139; Dashboard O5 **não** nas 6 falhas da suite |

---

## 9. Correções futuras recomendadas (não implementadas)

| Prioridade | ID | Correção mínima sugerida |
|------------|-----|---------------------------|
| **P0** | T3, T4 | Fixar “agora” no teste (`vi.setSystemTime` / `Settings`) **antes** de `Europe/Lisbon` ou usar `startAt` **claramente futuro** relativo à data do teste; T4: assert **Visualizar** disabled e/ou **Aguarde...** — não `Editar` |
| **P1** | T1 | Alinhar `selectTimezoneBySearch` ao padrão async de [CompanyForm.test.tsx](../../client/src/components/company/CompanyForm.test.tsx) (`findByRole` searchbox/listbox + `await`) |
| **P2** | T2 | Garantir waits após submit se flakes persistirem na suite (menos crítico que T1 picker) |
| **P2** | T5 | Após retry, waits explícitos antes de `switchToListView` / tabela; evitar dependência de ordem lenta sob 3 workers |
| **P2** | T6 | Se flake na suite continuar: `waitFor` pós-modais ou isolamento de timing do delete |

**Ordem sugerida:** AppointmentsListView (T3/T4) → Register (T1, T2) → AppointmentsPage / CompanyPage (T5, T6) só se `npm test` ainda falhar após P0/P1.

---

## 10. Limitações

- Suite integral **não** reexecutada — classificação “Dependente da suite” baseada no relatório de 16/11 e no contraste isolado/ficheiro.
- Workers, ordem global Vitest e duração ~736 s da suite anterior **não** reproduzidos.
- Falhas T5/T6 na suite podem ser intermitentes — confirmar com 2–3 `npm test` após corrigir T3/T4.
- Ambiente: Vitest v4.1.11, Windows, aviso npm `devdir`.

---

## 11. Parecer final — o que corrigir e em que ordem

| Ordem | Área | Motivo |
|-------|------|--------|
| 1 | **AppointmentsListView T3/T4** | Falha **reproduzível** hoje; não é flake de carga — desalinhamento data/asserção |
| 2 | **Register T1** (e T2 se necessário) | Flake de suite; picker IANA + corpo do teste > 5 s sob carga |
| 3 | **T5/T6** | Só se falharem após `npm test` pós-itens 1–2 |

**Conclusão geral:** Das 6 falhas da suite 16/11, **2 são reproduzíveis e explicáveis sem suite integral** (ListView). **4 dependem da execução conjunta** (timeouts) e **não** falharam neste diagnóstico isolado/ficheiro.

---

## 12. Handoff para correção (outra IA)

```bash
# Reproduzir T3/T4 (deve falhar em 16/11/2026+)
cd client
npx vitest run src/components/appointments/AppointmentsListView.test.tsx \
  -t "invokes edit, status and delete callbacks from the action row"

# Validar T1 após fix Register (meta: estável em npm test)
npx vitest run src/pages/RegisterPage.test.tsx -t "calls register with the selected IANA timezone in the payload"
```

**Documentos relacionados:**

- [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md) — Register timeout histórico (11/11)
- [dashboard-o5-stale-response-fix.md](dashboard-o5-stale-response-fix.md) — suite 1604/1610
- [company-page-logo-router-test-fix.md](company-page-logo-router-test-fix.md) — padrão timezone async

**Git:** utilizador controla commit; nenhuma operação git write nesta tarefa.