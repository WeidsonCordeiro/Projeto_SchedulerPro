# SchedulerPro — Dashboard O5: Refresh automático (visibilidade)

**Data:** 2026-11-10  
**Referência:** [dashboard-o5-refresh-audit.md](../audits/dashboard-o5-refresh-audit.md)  
**Branch base:** `develop` @ `8203a41` (sem commit automatizado)

---

## 1. Objetivo

Actualizar o Dashboard de forma **silenciosa** quando a aba do browser volta a `visible`, mantendo KPIs O1, distribuição O2 e agendas visíveis, com throttle de 45 s e protecção contra pedidos duplicados e respostas antigas.

**Fora de escopo:** polling, botão manual, `useLocation`, alterações backend, RTK Query.

---

## 2. Ficheiros criados e modificados

| Ficheiro | Alteração |
| --- | --- |
| [`client/src/config/dashboardRefresh.ts`](../../client/src/config/dashboardRefresh.ts) | **Novo** — `DASHBOARD_AUTO_REFRESH_MIN_MS`, mensagem de aviso |
| [`client/src/hooks/useDashboardVisibilityRefresh.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.ts) | **Novo** — listener `visibilitychange` + throttle |
| [`client/src/hooks/useDashboardVisibilityRefresh.test.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.test.ts) | **Novo** — 6 casos |
| [`client/src/pages/dashboard/DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) | Fetch/apply, `loadAll` com geração, `refreshDashboard`, UI |
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Bloco O5 (13 casos) + `staffCompanyAccessSuspended` no store mock |

---

## 3. Fluxos

### 3.1 Carregamento inicial (`loadAll`)

- Incrementa `loadGenerationRef`; cancela flag `refreshInFlightRef`.
- `setIsLoading(true)` — fullscreen «A carregar o painel…».
- `fetchSummary` / `fetchRelatedData` (sem `setState` dentro do fetch).
- Aplica estado só se `isMountedRef && generation === loadGenerationRef.current`.
- `hasInitialLoadCompletedRef = true` após sucesso.
- Retry de erro fatal reutiliza `loadAll`.

### 3.2 Refresh silencioso (`refreshDashboard`)

- Guardas: suspensão staff, `refreshInFlightRef`, carga inicial incompleta.
- Não altera `isLoading`.
- `setIsRefreshing(true)` + indicador discreto (`dashboard-refreshing`).
- Mesmo par fetch → apply com geração.
- Erro: `dashboard-refresh-warning` com `DASHBOARD_REFRESH_WARNING_MESSAGE`; **não** remove dados actuais.

### 3.3 Visibilidade

[`useDashboardVisibilityRefresh`](../../client/src/hooks/useDashboardVisibilityRefresh.ts):

- Só `document.visibilityState === "visible"`.
- Ignora durante `isInitialLoading`.
- Ao terminar o loading inicial, `lastAutoRefreshAtRef = Date.now()` (evita refresh imediato no mount).
- Throttle `DASHBOARD_AUTO_REFRESH_MIN_MS` (45 000 ms).
- `enabled: !staffCompanyAccessSuspended`.

### 3.4 Regresso de rota

Sem alterações: desmontar `/` e voltar continua a chamar `loadAll` no mount.

---

## 4. Concorrência e respostas antigas

- `loadGenerationRef` incrementado no início de cada `loadAll` e `refreshDashboard`.
- Dados obtidos **antes** de qualquer `setState`; apply condicionado à geração actual.
- `refreshInFlightRef` impede ciclos paralelos de refresh automático.
- `isMountedRef` bloqueia updates após unmount.
- **StrictMode (dev):** dois `loadAll` em paralelo — o segundo incremento de geração invalida applies do primeiro; o ciclo vencedor define `isLoading(false)`.

Não foi adoptado `AbortController` (axios sem `signal` dedicado no projecto).

---

## 5. UI

| Elemento | testid |
| --- | --- |
| Aviso de falha no refresh | `dashboard-refresh-warning` |
| Indicador «A actualizar…» | `dashboard-refreshing` |

---

## 6. Testes e build

| Comando | Resultado |
| --- | --- |
| `npm run test -- src/hooks/useDashboardVisibilityRefresh.test.ts src/pages/dashboard/DashboardPage.test.tsx` | **53/53** aprovados, exit **0** |
| `npm run build` | Sucesso (`tsc -b && vite build`), exit **0** |

**Warnings:** npm `devdir`; Vitest `act` em alguns refreshes assíncronos (não bloqueante).

Cobertura O5: unmount/remount, visible/hidden, throttle 45 s, in-flight, falha silenciosa, sem fullscreen, O1/O2, stale generation, listener cleanup, staff suspenso, libertação de in-flight.

---

## 7. Limitações e melhorias futuras

| Tema | Nota |
| --- | --- |
| O4 | Refresh ainda chama clients/services/employees em cada ciclo |
| Botão «Actualizar» | Não implementado |
| `AbortController` | Possível se `apiClient` passar a suportar `signal` |
| Related parcial | Falhas em related no refresh silencioso mantêm aviso agregado em `relatedError` quando apply completa |

---

## 8. Contexto para outra IA

- Constantes: [`dashboardRefresh.ts`](../../client/src/config/dashboardRefresh.ts).
- Não remover `hasInitialLoadCompletedRef` — gate do visibility refresh.
- Tests usam `setDocumentVisibility` + `dispatchVisibilityChange` + fake timers para throttle.
- KPI «Clientes ativos» e O2 actualizam quando `setSummary` aplica novo payload.

**Fim.** Pronto para validação visual e commit manual.
