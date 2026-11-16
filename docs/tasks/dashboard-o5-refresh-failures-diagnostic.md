# Diagnóstico F1–F4 — Dashboard automatic refresh (O5)

## Objetivo e âmbito

Investigar as quatro falhas observadas na suite frontend completa (`npm test`), todas no bloco `DashboardPage > automatic refresh (O5)` em [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx).

**Tipo:** diagnóstico read-only — sem alterações a produção, testes, config, deps ou Git write.

**Fora de âmbito:** implementar correções; reexecutar `npm test` integral (conforme brief).

**Evidência de falha na suite:** [`frontend-suite-post-t3-t4-validation.md`](./frontend-suite-post-t3-t4-validation.md) (16/11/2026, develop, 1606/1610, 4 falhas F1–F4).

---

## Branch e HEAD

| Momento | Branch | HEAD |
|---------|--------|------|
| Início | `develop` | `f6d9f8da0543cde0d4224350d2141650d5a70468` |
| Fim | `develop` | `f6d9f8da0543cde0d4224350d2141650d5a70468` |

- Tracking: `develop...origin/develop` (up to date).
- Integração T3/T4: **presente** (`futureAppointmentTimes` em `AppointmentsListView.test.tsx`).

---

## Estado do working tree

| Momento | Estado |
|---------|--------|
| Inicial | **Limpo** (`nothing to commit, working tree clean`) |
| Final | Limpo de código; **untracked** apenas este relatório até commit manual |

---

## Ficheiros analisados (leitura)

| Ficheiro | Papel |
|----------|--------|
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | F1–F4 (L1103–1276), helpers (`waitForDashboardLoaded`, `dispatchVisibilityVisible`, `deferred`), `beforeEach`/`afterEach` (L275–287) |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | `loadAll`, `refreshDashboard`, `loadGenerationRef`, UI `dashboard-refresh-warning`, loading fullscreen |
| [`client/src/hooks/useDashboardVisibilityRefresh.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.ts) | Throttle 45 s, `visibilitychange`, `lastAutoRefreshAtRef` |
| [`client/src/hooks/useDashboardVisibilityRefresh.test.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.test.ts) | Testes unitários do throttle (fake timers **completos**) |
| [`client/src/config/dashboardRefresh.ts`](../../client/src/config/dashboardRefresh.ts) | `DASHBOARD_AUTO_REFRESH_MIN_MS = 45_000` |
| [`client/vite.config.ts`](../../client/vite.config.ts) | Vitest: `pool: "threads"`, `maxWorkers: 3` |
| [`client/src/test/setup.ts`](../../client/src/test/setup.ts) | Sem config de timers global |
| [`docs/tasks/dashboard-o5-stale-response-diagnostic.md`](./dashboard-o5-stale-response-diagnostic.md) | Flake no teste *stale* (distinto, mesma área O5) |

---

## Comandos executados

Diretório: `client/`. Vitest **v4.1.11**.

### Reprodução individual (×3 cada)

```bash
npm test -- DashboardPage.test.tsx -t "throttles rapid visible events to one extra call per interval"
npm test -- DashboardPage.test.tsx -t "keeps existing KPIs and shows a warning when a silent refresh fails"
npm test -- DashboardPage.test.tsx -t "does not show fullscreen loading during a silent refresh"
npm test -- DashboardPage.test.tsx -t "preserves O2 distribution after a successful silent refresh"
```

### Ficheiro completo (×3)

```bash
npm test -- DashboardPage.test.tsx
```

### Bloco O5 (×3, diagnóstico extra)

```bash
npm test -- DashboardPage.test.tsx -t "automatic refresh"
```

**Não executado:** `npm test` (suite integral).

---

## Resultados — reproduções individuais F1–F4

| ID | Teste | Run 1 | Run 2 | Run 3 | Falhas / 3 | Duração Vitest (~) |
|----|--------|-------|-------|-------|------------|-------------------|
| **F1** | throttles rapid visible events… | PASS | PASS | PASS | **0/3** | 6.2–6.9 s |
| **F2** | keeps existing KPIs and shows a warning… | PASS | PASS | PASS | **0/3** | 6.1–6.7 s |
| **F3** | does not show fullscreen loading… | PASS | PASS | PASS | **0/3** | 6.0–6.6 s |
| **F4** | preserves O2 distribution… | PASS | PASS | PASS | **0/3** | 6.0–6.2 s |

Exit code observado em todas as corridas isoladas: **0**.

### Mensagens de erro nesta sessão

**Nenhuma** (todos passaram isolados).

### Referência — erros na suite integral (sessão anterior)

| ID | Erro (resumo) | Linha |
|----|----------------|-------|
| F1 | `getSummary` expected **2** calls, got **1** | L1114 |
| F2 | `dashboard-refresh-warning` not found | L1192 |
| F3 | heading `"Resumo do dia"` not found (`waitForDashboardLoaded`) | L1215 |
| F4 | `dashboard-status-count-completed` expected `"1"`, got `"0"` | L1272 |

---

## Resultados — ficheiro `DashboardPage.test.tsx` (×3)

| Run | Passed | Failed | Duração Vitest |
|-----|--------|--------|----------------|
| 1 | **48/48** | 0 | 10.11 s |
| 2 | **48/48** | 0 | 10.19 s |
| 3 | **48/48** | 0 | 9.88 s |

F1–F4 **não** falharam no ficheiro completo nesta sessão.

### Bloco `automatic refresh` (×3)

| Run | Passed (O5) | Duração |
|-----|-------------|---------|
| 1 | **13/13** | 9.18 s |
| 2 | **13/13** | 8.37 s |
| 3 | **13/13** | 11.15 s |

Inclui o teste *stale* (PR #139); **nenhuma** falha no bloco O5 isolado.

---

## Análise técnica por falha

### Factos comuns de setup

- `beforeEach`: `vi.clearAllMocks()`, `mockRelatedData()`, `mockSummaryResponse(makeSummary())`, `vi.useFakeTimers({ toFake: ["Date"] })`, `vi.setSystemTime(NOW)` com `NOW = 2026-09-10T12:00:00.000Z`.
- `afterEach`: `vi.useRealTimers()`.
- **Nota:** só `Date` é fingido; Promises e `setTimeout` reais correm — padrão igual em vários testes do projeto.
- Throttle: [`useDashboardVisibilityRefresh`](../../client/src/hooks/useDashboardVisibilityRefresh.ts) usa `Date.now()` e marca `lastAutoRefreshAtRef` quando `isInitialLoading` passa a `false`.
- Refresh silencioso: [`refreshDashboard`](../../client/src/pages/dashboard/DashboardPage.tsx) não activa `isLoading` fullscreen; erros de refresh definem `refreshWarning` (`data-testid="dashboard-refresh-warning"`); geração invalida respostas tardias.

---

### F1 — throttles rapid visible events

**Intenção do teste:** após carga inicial, avançar 45 s, disparar `visibilitychange` **duas vezes**; deve existir **exactamente** 2 chamadas a `getSummary` (carga + um refresh por throttle).

**Factos observados:** passa 3/3 isolado e dentro do ficheiro 48/48; falhou na suite com 1 chamada (refresh não disparou ou `vi.waitFor` expirou antes da 2.ª).

**Evidência técnica:**

- Produção: o 2.º evento não deve gerar 2.º refresh no mesmo instante (mesmo `Date.now()` após `advanceTimersByTime`) — alinhado com teste vizinho `does not start a second refresh while one is already in flight`.
- Se `hasInitialLoadCompletedRef` ainda for `false` ou `refreshDashboard` sair cedo, permanece 1 chamada.

**Hipótese provável:** **condição de corrida / carga** na suite — carga inicial ou `lastAutoRefreshAtRef` não estabilizada antes do par `dispatchVisibilityVisible`, ou `vi.waitFor` (timeout default) insuficiente sob CPU/memory pressure. **Não reproduzida** neste diagnóstico.

**Defeito de produção:** **sem evidência** — lógica de throttle coberta no hook dedicado.

---

### F2 — warning após refresh silencioso falhar

**Intenção:** KPI inicial 11; `mockRejectedValueOnce` na próxima `getSummary`; após refresh por visibilidade, aviso `dashboard-refresh-warning` e KPI mantém "11".

**Factos:** passa isolado; na suite o aviso não apareceu.

**Evidência técnica:**

- `mockRejectedValueOnce` afecta **a próxima** chamada global ao mock — se outra chamada (microtask, related data path, ou corrida) consumir o `Once` antes do refresh, o refresh pode ter sucesso e não definir warning.
- `refreshFailed` só em `catch` de `refreshDashboard`; warning só se `generation === loadGenerationRef.current` no `finally`.

**Hipótese provável:** **ordem/timing de mocks e chamadas** sob carga da suite, ou refresh **não chegou a executar** (mesma família que F1). **Não reproduzida** aqui.

**Defeito de produção:** **sem evidência** — fluxo `setRefreshWarning` é directo após falha de refresh.

---

### F3 — sem loading fullscreen no refresh silencioso

**Intenção:** 1.ª `getSummary` resolve; 2.ª fica em `hanging.promise`; após refresh, UI mantém agenda e mostra `dashboard-refreshing`, sem "A carregar o painel…".

**Factos na suite (validação anterior):** falha em `waitForDashboardLoaded` **na carga inicial** (L1215), com DOM de **erro fullscreen** (`Erro interno do servidor.`) — inconsistente com mocks do teste (1.ª chamada deveria resolver).

**Evidência técnica:**

- Sugere **mock chain incorrecta** ou **estado residual** na suite (implementação anterior do mock consumida/rejeitada), não falha do assert de “silent refresh” em si.
- Isolado: 3/3 pass — comportamento coerente com desenho.

**Hipótese provável:** **intermitência dependente da suite** — contaminação ou timing na sequência `mockResolvedValueOnce` + `mockImplementationOnce`, ou lentidão na 1.ª resolução. **Não reproduzida** nesta sessão.

**Defeito de produção:** **sem evidência** — ecrã de erro na suite contradiz expectativa do teste isolado.

---

### F4 — preservar distribuição O2 após refresh

**Intenção:** 1.ª resposta `makeSummary()`; 2.ª com `completed: 1`; após refresh, `dashboard-status-count-completed` deve mostrar "1".

**Factos na suite:** recebeu "0" — refresh não aplicou dados ou assert antes do commit React.

**Evidência técnica:**

- `mockImplementation` incrementa `summaryCalls` — depende de refresh ser a 2.ª chamada.
- `vi.waitFor` no assert final — pode expirar se refresh atrasado.

**Hipótese provável:** refresh não concluído a tempo (**mesma causa raiz assíncrona** que F1) ou UI não actualizada antes do assert. **Não reproduzida** isolada.

**Defeito de produção:** **sem evidência**.

---

## Comparação com diagnóstico stale (O5)

| Aspecto | Teste *stale* (diagnóstico PR #139) | F1–F4 (este diagnóstico) |
|---------|-------------------------------------|---------------------------|
| Nome | `ignores stale summary responses…` | Throttle / warning / loading / O2 |
| Isolado | ~40% falha **com** `-t` (documentado) | **0%** falha isolado (3/3 cada) |
| Ficheiro só | Flake documentado | **48/48** ×3 nesta sessão |
| Suite integral | Falhas históricas | 4 falhas F1–F4 (uma corrida documentada) |
| Mecanismo partilhado | `loadGenerationRef`, async `getSummary`, fake `Date`, `vi.waitFor` | **Sim** — mesma pilha refresh/visibilidade/mocks |
| Protecção stale | Assert final KPI após `slow.resolve` | F4 usa sucesso de refresh sem `rerender` timezone |

**Conclusão comparativa:** mesma **família O5** (refresh + mocks + tempo), mas F1–F4 nesta sessão comportam-se como **flakes dependentes da suite**; o teste *stale* mostrou intermitência **mesmo isolado**. Não é o mesmo teste nem a mesma taxa de reprodução, mas **causa comum plausível**: sincronização teste ↔ async React ↔ mocks ↔ `Date` fingido sob carga.

---

## Classificação individual (obrigatória)

| ID | Classificação | Falhas reproduzidas neste diagnóstico | Falhas na suite (evidência externa) |
|----|----------------|----------------------------------------|-----------------------------------|
| **F1** | **INTERMITENTE** (dependente da suite) | 0/3 isolado, 0/3 ficheiro | 1/1 corrida documentada |
| **F2** | **INTERMITENTE** | 0/3 | 1/1 |
| **F3** | **INTERMITENTE** | 0/3 | 1/1 |
| **F4** | **INTERMITENTE** | 0/3 | 1/1 |

**POTENCIAL DEFEITO DE PRODUÇÃO:** **não** atribuído a F1–F4 com evidência concreta.

**NÃO REPRODUZIDA** nesta sessão: todas na prática **não reproduzidas aqui**, mas **reproduzidas na suite** (registo anterior).

---

## Respostas aos critérios de conclusão

1. **Causa provável F1:** refresh automático não contabilizado a tempo (1 chamada) — timing `hasInitialLoadCompleted` / visibilidade / `vi.waitFor` sob carga da suite.
2. **F2:** refresh não falhou como esperado ou `mockRejectedValueOnce` não aplicado à chamada certa; aviso nunca renderizado.
3. **F3:** carga inicial falhou ou não atingiu “Resumo do dia” na suite — mock/sequência ou lentidão, não o assert de silent refresh em ambiente estável.
4. **F4:** 2.ª resposta de summary não reflectida na UI a tempo — async refresh.
5. **Mesma origem?** **Sim, provável** — pipeline O5 partilhado (fake `Date`, `useDashboardVisibilityRefresh`, `refreshDashboard`, mocks `getSummary`, awaits insuficientes sob carga). Manifestações distintas.
6. **Defeito produção?** **Não** com evidência actual; falhas correlacionam com suite, não com isolado/ficheiro.
7. **Só ajustes de teste?** **Provável sim** — `mockReset`/`mockClear` mais forte, `await` explícitos pós-load, alinhar waits com PR #139 (`waitForDashboardLoaded`, `vi.waitFor` com timeouts), eventual `describe.sequential` ou isolar O5; validar na suite 2–3×.
8. **Ordem de correção sugerida:** (1) endurecer setup O5 / waits partilhados F1–F4; (2) revalidar suite integral; (3) se persistir, teste *stale* (já parcialmente tratado); (4) opções estruturais (workers, serialização do ficheiro Dashboard).
9. **Testes pós-correção:** F1–F4 isolado ×3; `DashboardPage.test.tsx` ×3; bloco `automatic refresh` ×3; **`npm test`** ×2–3.

---

## Conclusão geral

As quatro falhas F1–F4 são **intermitentes e dependentes da suite frontend completa**. Nesta sessão **não foram reproduzidas** (12/12 isolados, 48/48 ficheiro, 39/39 bloco O5). A evidência da suite integral aponta para **sincronização e mocks** na área O5, **não** para regressão funcional demonstrada em produção.

**Confirmação de restrições:** nenhum ficheiro de produção, teste, config ou dependência foi alterado; nenhuma operação Git de escrita.

---

## Recomendações para a próxima tarefa

1. Tarefa de **estabilização apenas em testes** `DashboardPage.test.tsx` (bloco O5): reforço de `beforeEach` (`vi.mocked(dashboardApi.getSummary).mockReset()` antes de `mockSummaryResponse`), waits após `waitForDashboardLoaded` antes de `advanceTimersByTime`, e padrões do fix stale (PR #139).
2. Executar **`npm test` 2–3 vezes** após alterações; registar taxa de falha F1–F4.
3. Se flakes permanecerem: considerar `fileParallelism` / ordem / `maxWorkers` só com medição (fora do escopo deste diagnóstico).
4. Não misturar com correção T1–T6 até suite Dashboard estável.

---

## Handoff técnico rápido

```text
Hook throttle: useDashboardVisibilityRefresh.ts (Date.now + 45s)
Produção refresh: DashboardPage refreshDashboard + loadGenerationRef
Testes F1-F4: L1103-1276, fake Date only, mock getSummary variável
Vitest: threads, maxWorkers 3
Suite fail evidence: frontend-suite-post-t3-t4-validation.md §4
Stale related: dashboard-o5-stale-response-diagnostic.md
```