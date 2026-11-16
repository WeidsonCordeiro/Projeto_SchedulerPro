# Estabilização testes Dashboard O5 (F1–F4)

**Data:** 2026-11-16  
**Branch:** `develop` (exceção ao gate `test/stabilize-dashboard-o5-refresh-tests` — autorizada)  
**Tipo:** implementação em testes + validação (sem git write, sem alteração de produção)

**Referências:** [`dashboard-o5-refresh-failures-diagnostic.md`](./dashboard-o5-refresh-failures-diagnostic.md)

---

## 1. Objetivo

Tornar F1–F4 determinísticos na suite integral, sem alterar código de produção.

---

## 2. Git e working tree

| Campo | Inicial | Final |
|-------|---------|-------|
| Branch | `develop` | `develop` |
| HEAD | `f6d9f8da0543cde0d4224350d2141650d5a70468` | `f6d9f8da0543cde0d4224350d2141650d5a70468` (sem commit) |
| Tracking | `origin/develop` | idem |

### Working tree

**Inicial:** limpo excepto docs untracked (diagnóstico + este relatório em rascunho).

**Final:**

```
 M client/src/pages/dashboard/DashboardPage.test.tsx
?? docs/tasks/dashboard-o5-refresh-failures-diagnostic.md
?? docs/tasks/dashboard-o5-refresh-tests-stabilization.md
```

Nenhuma operação Git de escrita.

---

## 3. Diagnóstico resumido F1–F4

Falhas na suite integral (1606/1610): mocks/asserções adiantadas, carga inicial não estabilizada antes do throttle de visibilidade, `mockRejectedValueOnce` / cadeias `Once` ambíguas sob carga.

---

## 4. Alterações realizadas

**Único ficheiro de código:** [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx)

**Diff:** `1 file changed, 43 insertions(+), 12 deletions(-)`

### 4.1 `beforeEach`

- `vi.mocked(dashboardApi.getSummary).mockReset()` após `clearAllMocks`, antes de `mockSummaryResponse`.

### 4.2 Helper

- `waitForDashboardReady()` — `waitForDashboardLoaded` + `getSummary` chamado 1× + flush microtasks.

### 4.3 F1 — throttles rapid visible events

- `waitForDashboardReady` no lugar de só `waitForDashboardLoaded`.
- `vi.waitFor` → RTL `waitFor` para 2 chamadas.

### 4.4 F2 — silent refresh fails

- `mockImplementation` com contador: call 1 sucesso (KPI 11), call 2 `httpError(500)`.
- `waitForDashboardReady`.
- Esperar 2 chamadas antes do assert do aviso.

### 4.5 F3 — no fullscreen loading

- `mockReset` antes da cadeia Once/hanging.
- `waitForDashboardReady`.
- `waitFor` 2 chamadas antes de asserts de UI silenciosa.

### 4.6 F4 — O2 distribution

- `waitForDashboardReady`.
- `waitFor` 2 chamadas + RTL `waitFor` em `dashboard-status-count-completed` = "1".

**Produção:** inalterada.

---

## 5. Justificação técnica

1. **`mockReset`** — repõe implementações `Once`/`Implementation` entre testes no mesmo worker (suite longa).
2. **`waitForDashboardReady`** — garante `hasInitialLoadCompleted` e baseline de `lastAutoRefreshAt` antes de `advanceTimersByTime(45_000)`.
3. **Contador F2** — refresh falha na 2.ª chamada, nunca na 1.ª.
4. **Esperar 2.ª `getSummary`** — sincroniza com `refreshDashboard` assíncrono antes de asserts F2–F4.

Padrão alinhado ao fix stale (PR #139), aplicado apenas onde o fluxo é refresh por visibilidade sem `rerender` de timezone.

---

## 6. Resultados de validação

Vitest **v4.1.11**. Diretório: `client/`.

### Etapa A — Individuais (×3)

| ID | Run 1 | Run 2 | Run 3 |
|----|-------|-------|-------|
| F1 | PASS | PASS | PASS |
| F2 | PASS | PASS | PASS |
| F3 | PASS | PASS | PASS |
| F4 | PASS | PASS | PASS |

Durações típicas isoladas: ~7–11 s.

### Etapa B — `DashboardPage.test.tsx` (×3 oficial)

| Run | Resultado | Duração |
|-----|-----------|---------|
| 1 | **48/48** | 12.22 s |
| 2 | **48/48** | 11.85 s |
| 3 | **48/48** | 12.05 s |

**Nota:** durante desenvolvimento, 1 corrida intermédia falhou (flake pré-validação oficial); as 3 corridas oficiais acima passaram.

### Etapa C — `-t "automatic refresh"` (×3 oficial)

| Run | Resultado | Duração |
|-----|-----------|---------|
| 1 | **13/13** | 9.92 s |
| 2 | **13/13** | 9.67 s |
| 3 | **13/13** | 8.76 s |

Inclui teste *stale*. Exploratório: 1 falha intermitente no teste stale antes da validação oficial; 3/3 oficiais verdes.

### Etapa D — `npm test` (×3)

| Run | Test files | Tests | Duração | F1–F4 |
|-----|------------|-------|---------|-------|
| 1 | 136/136 | **1610/1610** | 484.11 s | N/A (pass) |
| 2 | 136/136 | **1610/1610** | 457.95 s | N/A (pass) |
| 3 | 136/136 | **1610/1610** | 507.98 s | N/A (pass) |

**Nenhuma falha** nas três execuções integrais. Regresso face a validação pré-fix (1606/1610, F1–F4 falhados): **resolvido**.

### Etapa E

| Comando | Exit |
|---------|------|
| `npm run typecheck` | **0** |
| `npm run build` | **0** |

**Warnings:** chunk JS > 500 kB (rollup); npm `devdir` (ambiente).

---

## 7. Classificação final

**APROVADO**

| Critério | Atendido |
|----------|----------|
| F1–F4 3/3 isolados | Sim |
| Ficheiro 3/3 (48/48) | Sim |
| O5 3/3 (13/13) | Sim |
| Suite 3/3 (1610/1610) | Sim |
| typecheck + build | Sim |
| Sem produção alterada | Sim |
| Relatório actualizado | Sim |

---

## 8. Limitações e problemas residuais

1. **Flake ocasional** no teste *stale* ou no ficheiro completo observado em corridas exploratórias (fora do lote oficial 3×3) — não reproduzido na suite integral pós-fix.
2. **`mockReset` no `beforeEach`** afecta todos os testes do ficheiro — intencional para isolamento de mocks; nenhuma regressão detetada em B/C/D.
3. Branch de trabalho permanece `develop`; utilizador deve criar/commit na branch desejada.

---

## 9. Recomendação pós-entrega

1. Commit em `test/stabilize-dashboard-o5-refresh-tests` ou `develop` conforme política do projecto.
2. Monitorizar CI com 2–3 corridas de suite se flakes stale reaparecerem.
3. Não reabrir T1–T6 sem nova evidência — suite verde nesta sessão.

---

## 10. Confirmação de restrições

- Sem alteração de produção, hooks, Vitest config, timeouts globais, `describe.sequential`.
- Sem commit/push/merge.
- Sem remoção de asserções.

---

## Handoff

```bash
# Regressão rápida F1–F4 + suite
cd client
npm test -- DashboardPage.test.tsx -t "throttles rapid visible events"
npm test -- DashboardPage.test.tsx -t "keeps existing KPIs"
npm test -- DashboardPage.test.tsx -t "does not show fullscreen loading"
npm test -- DashboardPage.test.tsx -t "preserves O2 distribution"
npm test
```