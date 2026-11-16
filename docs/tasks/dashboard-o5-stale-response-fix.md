# Implementação — Estabilização teste O5 (stale summary responses)

**Data:** 16/11/2026  
**Branch:** `test/stabilize-dashboard-o5-stale-response`  
**Referências:** [dashboard-o5-stale-response-diagnostic.md](dashboard-o5-stale-response-diagnostic.md), [frontend-dashboard-companyform-test-stabilization.md](frontend-dashboard-companyform-test-stabilization.md)

**Git write:** não executado.

---

## 1. Branch e HEAD

| Momento | HEAD | Mensagem |
|---------|------|----------|
| Inicial | `5f6c53aef3ed4889c4fcd45d661b6c260b4a4d96` | Atualização das documentações |
| Final | `5f6c53aef3ed4889c4fcd45d661b6c260b4a4d96` | (inalterado) |

Gate branch: **OK**

---

## 2. Estado Git

### Inicial

- Modified: `client/src/pages/dashboard/DashboardPage.test.tsx` (já em alteração)
- Untracked: `docs/tasks/dashboard-o5-stale-response-diagnostic.md`

### Final

- Modified: `client/src/pages/dashboard/DashboardPage.test.tsx` (esta implementação)
- Untracked: `docs/tasks/dashboard-o5-stale-response-diagnostic.md`, `docs/tasks/dashboard-o5-stale-response-fix.md`
- Staged: nenhum

---

## 3. Ficheiro alterado e diff

**Único ficheiro de código:** [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx)

**Único teste:** `ignores stale summary responses that complete after a newer load cycle` (bloco O5)

### Alterações (resumo)

| Passo | Alteração |
|-------|-----------|
| Após visibility throttle | `await vi.waitFor(() => expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2))` — garante refresh lento (call 2) **antes** do `rerender` |
| Após `rerender` | `await vi.waitFor(...).toHaveBeenCalledTimes(3)` — garante `loadAll` pendente em `fresh.promise` |
| Resolve `fresh` | Mantido em `act`; acrescentado `await Promise.resolve()` para flush de microtasks |
| Pós-fresh | `await waitForDashboardLoaded()` — painel sai de loading |
| KPI 50 | Substituído `vi.waitFor` por RTL `await waitFor(() => expect(...card-value...).toHaveTextContent("50"))` |
| Stale | Inalterado: `slow.resolve` (99) + assert final **50** |

**Invariantes preservados:** `slow`/`fresh` deferred, `summaryCalls` 1 / slow / fresh, throttle 45 s, cenário stale, asserts **50** antes e depois de `slow`.

`git diff --name-only HEAD -- client/src` → **apenas** `DashboardPage.test.tsx`.

---

## 4. Justificação técnica

Conforme diagnóstico: falhas em **loading** (L1324 antigo) e corrida no **índice** de `getSummary` quando `fresh.resolve` corria antes da 3.ª chamada ou quando call 2 (slow) ainda não tinha sido disparada.

1. **`waitForDashboardLoaded` após `fresh`** — “Resumo do dia” só existe com `isLoading === false` ([DashboardPage.tsx](../../client/src/pages/dashboard/DashboardPage.tsx) L321–327).
2. **Esperar 2 chamadas antes de `rerender`** — fixa call 2 = refresh `slow` e evita `summaryCalls === 2` ser o `loadAll` pós-rerender (ramo errado do mock).
3. **Esperar 3 chamadas antes de `fresh.resolve`** — resolve apenas quando `loadAll` está à espera de `fresh.promise`.
4. **RTL `waitFor` no KPI** — alinhado ao resto do ficheiro; polling sem `getByRole` em UI de loading.

**Produção:** não alterada; teste continua a validar `loadGenerationRef` via assert final após `slow`.

---

## 5. Cinco execuções isoladas (validação final do diff)

Comando:

```bash
npx vitest run src/pages/dashboard/DashboardPage.test.tsx \
  -t "ignores stale summary responses that complete after a newer load cycle"
```

| Run | Exit | Resultado | Duração total (Vitest) |
|-----|------|-----------|-------------------------|
| 1 | 0 | **Pass** | 13.93 s |
| 2 | 0 | **Pass** | 12.19 s |
| 3 | 0 | **Pass** | 10.11 s |
| 4 | 0 | **Pass** | 8.52 s |
| 5 | 0 | **Pass** | 9.01 s |

**5/5 pass** na validação pós-correção completa.

---

## 6. Três execuções do ficheiro Dashboard completo

Comando: `npx vitest run src/pages/dashboard/DashboardPage.test.tsx`

(Sessão de validação: 3 corridas consecutivas com **48/48**.)

| Run | Exit | Resultado | Duração total (Vitest) |
|-----|------|-----------|-------------------------|
| 1 | 0 | **48/48** | 12.94 s |
| 2 | 0 | **48/48** | 12.52 s |
| 3 | 0 | **48/48** | 14.22 s |

**Nota:** Noutras repetições antes deste lote, falharam testes **outros** do mesmo ficheiro (ex. `waits for the full 45 second throttle`, `preserves O2 distribution`) — flakes pré-existentes fora do escopo desta tarefa.

---

## 7. Suite frontend completa (`npm test`)

| Campo | Valor |
|-------|--------|
| Exit | **1** |
| Testes | **1604 passed**, **6 failed** (1610 total) |
| Duração | ~736 s Vitest (~12m28s wall) |

**Falhas (nenhuma em Dashboard O5 stale):**

| Ficheiro | Teste |
|----------|--------|
| RegisterPage.test.tsx | `calls register with the selected IANA timezone…` (timeout 5 s) |
| RegisterPage.test.tsx | `shows server errors` (timeout 5 s) |
| AppointmentsListView.test.tsx | `invokes edit, status and delete…` |
| AppointmentsListView.test.tsx | `disables action buttons and shows Aguarde…` |
| AppointmentsPage.test.tsx | `shows a friendly error and a retry button…` (timeout) |
| CompanyPage.test.tsx | `keeps the session… when delete fails` (timeout) |

---

## 8. Typecheck

```bash
npm run typecheck
```

| Exit |
|------|
| **0** |

---

## 9. Build

```bash
npm run build
```

| Exit | Notas |
|------|--------|
| **0** | Warning chunk JS 623.26 kB > 500 kB (inalterado) |

---

## 10. Código de produção

**Confirmado:** sem alterações a `DashboardPage.tsx`, `useDashboardVisibilityRefresh.ts`, config ou outros testes fora do único `it` O5.

---

## 11. Limitações e riscos residuais

| Item | Detalhe |
|------|---------|
| **Critérios de aprovação globais** | **Não satisfeitos** — `npm test` exit **1** (falhas fora do escopo) |
| Flake outros testes Dashboard | Throttle O5 45 s, O2 distribution — observado noutras corridas do ficheiro |
| Flake suite | Register / AppointmentsListView / CompanyPage — não introduzidos por este diff |
| Dependência de ordem de API | Teste O5 mais determinístico, porém mais acoplado a `toHaveBeenCalledTimes(2|3)` |
| Stale em prod | Assert final 50 após `slow` manteve-se; sem regressão observada nas validações O5 |

---

## 12. Parecer de conclusão da tarefa

| Critério | Estado |
|----------|--------|
| Só teste O5 alterado | **Sim** |
| O5 isolado 5/5 | **Sim** |
| Ficheiro Dashboard 3× 48/48 (validação registada) | **Sim** |
| `npm test` exit 0 | **Não** (1604/1610) |
| typecheck / build | **Sim** |
| Asserções stale preservadas | **Sim** |

**Correção O5:** considerada **implementada e estabilizada** nas validações A e B deste relatório.

**Tarefa / aprovação global do brief:** **não aprovada** na totalidade por falha da suite integral (§7), sem relação direta com o teste O5 corrigido.

---

## 13. Handoff

- Diagnóstico: [dashboard-o5-stale-response-diagnostic.md](dashboard-o5-stale-response-diagnostic.md)
- Commit: utilizador (sem git write nesta tarefa)
- Próximo passo sugerido: merge branch após revisão; suite completa pode exigir nova corrida ou tratamento de flakes Register/Appointments (tarefas separadas)