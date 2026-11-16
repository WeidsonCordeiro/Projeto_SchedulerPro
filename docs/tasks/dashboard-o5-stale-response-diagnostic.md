# Diagnóstico O5 — respostas antigas no Dashboard

**Data:** 16/11/2026  
**Tipo:** Diagnóstico read-only (sem alterações a prod, testes ou config; sem git write)  
**Branch:** `test/stabilize-dashboard-o5-stale-response`  
**HEAD:** `5f6c53aef3ed4889c4fcd45d661b6c260b4a4d96` — `5f6c53a Atualização das documentações`

**Contexto histórico:** [frontend-dashboard-companyform-test-stabilization.md](frontend-dashboard-companyform-test-stabilization.md) (13/11/2026 — 47/48 no ficheiro completo; este teste falhou na 1.ª corrida); [frontend-final-quality-audit.md](frontend-final-quality-audit.md) (Q1 flake O5).

---

## 1. Estado Git

### 1.1 Início e fim (idênticos)

| Campo | Valor |
|-------|--------|
| Branch actual | `test/stabilize-dashboard-o5-stale-response` (**gate OK** — branch esperada) |
| HEAD | `5f6c53aef3ed4889c4fcd45d661b6c260b4a4d96` |
| Tracking | Branch local (sem ahead/behind reportado nesta sessão) |
| Staged | Nenhum |
| Modified | Nenhum |
| Untracked | Nenhum |
| Working tree | **Limpa** (correcções de teste e docs já commitadas nesta branch) |

**Nota:** Diferente do estado 13/11 em `develop` @ `438de5e` com working tree suja; este diagnóstico corre sobre commits já integrados na branch de teste O5.

### 1.2 Preservação

Não foi necessário preservar alterações locais — árvore limpa. Referências anteriores (logo, Dashboard, CompanyForm, docs frontend) permanecem no histórico da branch.

---

## 2. Identificação exacta do teste

| Campo | Valor |
|-------|--------|
| Ficheiro | [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) |
| `describe` | `DashboardPage` → `automatic refresh (O5)` |
| Nome | `ignores stale summary responses that complete after a newer load cycle` |
| Linhas | **L1278–L1341** |
| Filtro Vitest | `-t "ignores stale summary responses that complete after a newer load cycle"` |

---

## 3. Análise do teste

### 3.1 Setup partilhado

`beforeEach` (L275–281): `vi.clearAllMocks()`, `mockRelatedData()`, `setDocumentVisibility("visible")`, `vi.useFakeTimers({ toFake: ["Date"] })`, `vi.setSystemTime(NOW)`.

`afterEach`: `vi.useRealTimers()`, visibilidade `visible`.

### 3.2 Sequência intencional

1. **Render** `Europe/Lisbon` — `getSummary` **call 1** resolve imediato (`activeClientsCount: 1`).
2. **`await waitForDashboardLoaded()`** — painel carregado.
3. **`advanceTimersByTime(45_000)`** + `dispatchVisibilityVisible()` — refresh automático O5.
4. **`getSummary` call 2** → `slow.promise` (fica pendente — simula refresh lento).
5. **`rerender`** com `America/Sao_Paulo` — novo store/timezone → `loadAll()` via `useEffect` (`todayRange` muda).
6. **`getSummary` call 3+** → `fresh.promise`.
7. **`fresh.resolve`** com `activeClientsCount: 50` — conclui o **ciclo de carga mais recente**.
8. **`vi.waitFor`** — combobox/KPI: `activeClientsCard()` deve mostrar **50** (L1324–1327).
9. **`slow.resolve`** com **99** — resposta **antiga** do refresh (call 2).
10. **Assert final** — KPI continua **50** (L1338–1340) — valida ignorar stale em produção.

### 3.3 Mocks e Promises

- `deferred()` para `slow` e `fresh` — controlo explícito de quando cada resposta chega.
- `summaryCalls` discrimina 1ª/2ª/3ª chamada.
- **Não** há Promises pendente deixadas pelo mock global após o teste se `slow`/`fresh` forem resolvidas (neste teste ambas são resolvidas).

### 3.4 Helpers e sincronização

```223:226:client/src/pages/dashboard/DashboardPage.test.tsx
function activeClientsCard() {
  const title = screen.getByRole("heading", { name: "Clientes ativos" });
  return title.closest(".card") as HTMLElement;
}
```

- **`getByRole` síncrono** — falha se o painel ainda está em loading.
- **`waitForDashboardLoaded()`** (L244–246) — usa `findByRole` “Resumo do dia”; **chamado antes** do refresh, **não** após `fresh.resolve` nem antes do `vi.waitFor` dos cards.

Comparação com teste vizinho estável `does not start a second refresh while one is already in flight` (L1121–1154): também usa `vi.waitFor` + `activeClientsCard`, mas **sem** `rerender` que dispare `loadAll` e `setIsLoading(true)`.

---

## 4. Código de produção relacionado (só leitura)

### 4.1 Protecção contra respostas antigas

[`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx):

- `loadGenerationRef` (L77) incrementado em `loadAll` (L155) e `refreshDashboard` (L224).
- Após cada `await fetchSummary()` / dados relacionados, verifica `generation !== loadGenerationRef.current` antes de `setSummary` / `setIsLoading(false)` (ex.: L166–167, L199–202, L232–233).
- **`slow` (refresh gen. anterior)** não deve alterar UI após **`fresh` (novo `loadAll`)** — comportamento que o teste quer provar no passo 9–10.

### 4.2 Loading e UI

```321:327:client/src/pages/dashboard/DashboardPage.tsx
  if (isLoading) {
    return (
      <section className="dashboard-page">
        {pageHeader}
        <LoadingState label="A carregar o painel…" />
      </section>
    );
  }
```

Enquanto `isLoading === true`, **não existe** heading “Clientes ativos” — apenas `role="status"` “A carregar o painel…”.

`rerender` com timezone novo → `loadAll` → **`setIsLoading(true)`** (L159) **antes** de `fetchSummary` (call 3 / `fresh`) completar.

### 4.3 Refresh por visibilidade

[`useDashboardVisibilityRefresh.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.ts): throttle 45 s (`DASHBOARD_AUTO_REFRESH_MIN_MS`), `onRefresh` → `refreshDashboard`; não trata stale — delega em `loadGenerationRef` na página.

---

## 5. Execuções (até 10, só teste isolado)

Comando (cada corrida):

```bash
cd client
npx vitest run src/pages/dashboard/DashboardPage.test.tsx \
  -t "ignores stale summary responses that complete after a newer load cycle"
```

**Não** foi executada suite completa nem ficheiro `DashboardPage.test.tsx` integral (conforme brief).

### 5.1 Tabela de corridas

| # | Exit | Resultado | Duração teste (Vitest) | Duração total (Vitest) | Wall (~ms) |
|---|------|-----------|------------------------|-------------------------|------------|
| 1 | **1** | Fail | 1.93 s | 25.21 s | ~47323 |
| 2 | 0 | Pass | 1.91 s | 11.68 s | ~20922 |
| 3 | 0 | Pass | 0.97 s | 12.95 s | ~21200 |
| 4 | **1** | Fail | 1.87 s | 11.45 s | ~20269 |
| 5 | 0 | Pass | 1.12 s | 10.40 s | ~18481 |
| 6 | **1** | Fail | 1.92 s | 11.43 s | ~20495 |
| 7 | **1** | Fail | 1.81 s | 11.23 s | ~19151 |
| 8 | 0 | Pass | 1.00 s | 11.14 s | ~20124 |
| 9 | 0 | Pass | 0.99 s | 10.13 s | ~18065 |
| 10 | 0 | Pass | 1.01 s | 10.14 s | ~20164 |

**Resumo:** **6 passed / 4 failed** (40% falha em modo **isolado**).  
**Conclusão:** A intermitência **não** depende apenas da ordem dos outros 47 testes do ficheiro — reproduz-se com filtro `-t`, embora a carga do worker/import varie.

### 5.2 Mensagem de falha capturada (corrida extra, 16/11/2026)

**Teste:** `ignores stale summary responses that complete after a newer load cycle`  
**Asserção:** `vi.waitFor` L1324–1327 — `within(activeClientsCard()).getByTestId("card-value")` → **"50"**

**Erro (excerto):**

```
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "Clientes ativos"
```

**Stack:** `activeClientsCard` L224 → teste L1325.

**DOM no momento da falha:**

- Presentes: header “Bem-vindo ao SchedulerPro”, link “Abrir agenda”.
- **Ausentes:** cards KPI, “Resumo do dia”, “Clientes ativos”.
- Presente: `role="status"` — **“A carregar o painel…”** (`LoadingState`).

**Interpretação:** A falha ocorre **antes** do passo de provar stale (`slow.resolve` / expect **50** final). O teste quebra ao **esperar o KPI 50** enquanto o painel ainda está no ramo `isLoading` do pós-`rerender`, ou antes de React commitar `setIsLoading(false)`.

**Não observado nesta sessão:** falha com `card-value` **"99"** (isso implicaria bug de stale em produção no assert final).

---

## 6. Factos, hipóteses e conclusões

### 6.1 Factos (com evidência)

| # | Facto |
|---|--------|
| F1 | Falha aponta para L1325, não L1338 — sintoma é **loading**, não **sobrescrita por 99**. |
| F2 | DOM de falha = apenas header + `LoadingState` (alinhado a `isLoading` em produção). |
| F3 | `rerender` dispara `loadAll` → `setIsLoading(true)` até concluir summary + related. |
| F4 | Produção usa `loadGenerationRef` para descartar callbacks obsoletos. |
| F5 | Taxa ~40% falha em 10 corridas **isoladas**. |
| F6 | Histórico 13/11: mesma mensagem em corrida de **ficheiro completo** (47/48). |

### 6.2 Hipóteses

| # | Hipótese | Estado |
|---|----------|--------|
| H1 | `vi.waitFor` + `activeClientsCard()` síncrono entra em polling enquanto `isLoading` ainda é true ou antes do commit React após `fresh.resolve`. | **Forte** (DOM loading + stack L1325) |
| H2 | O passo `vi.waitFor` deveria usar `waitForDashboardLoaded()` / `findBy*` após `fresh.resolve`, como noutros testes O5. | **Forte** (gap no teste vs padrão local) |
| H3 | Bug em produção: `slow` (99) sobrescreve `fresh` (50). | **Fraca** — falhas não chegam ao assert final |
| H4 | Falha só por contaminação entre testes no mesmo ficheiro. | **Refutada** para exclusividade — falha isolada 4/10 |
| H5 | `vi.waitFor` default timeout curto + callbacks que **lançam** (`getByRole`) → flakes de timing. | **Plausível** — duração teste ~1.8 s nas falhas |

### 6.3 Conclusões

1. **Causa principal provável:** deficiência de **sincronização no teste** entre `fresh.resolve`, conclusão de `loadAll` e asserção do KPI — não espera explícita pelo fim do loading após `rerender`.
2. **Comportamento de produção (stale):** pelo desenho de `loadGenerationRef`, a intenção do prod **parece correcta**; este diagnóstico **não** obteve evidência de stale apply no assert final (L1338 nunca falhou nas capturas).
3. O nome do teste cobre **dois** riscos: (A) KPI 50 após novo load; (B) ignorar `slow` com 99. A intermitência actual afecta **(A)**.

---

## 7. Correção mínima recomendada (não implementada)

**Escopo: teste apenas** (cenário mais provável).

1. Após `await act(async () => { fresh.resolve(...); })`, adicionar **`await waitForDashboardLoaded()`** (padrão já usado largamente no mesmo ficheiro).
2. Substituir `vi.waitFor(() => within(activeClientsCard())...)` por:
   - RTL **`await waitFor(() => expect(...).toHaveTextContent("50"))`** **depois** do painel carregado, ou
   - `await screen.findByRole("heading", { name: "Clientes ativos" })` antes de ler `card-value`.
3. Manter `act` ao resolver `slow` e assert final síncrono em **50** — valida stale.
4. **Não** aumentar `testTimeout` global como primeira medida.

**Se após (1–2) o assert final (L1338) falhar com 99:** reavaliar prod — overlap `refreshDashboard` + `loadAll` e incrementos de `loadGenerationRef`.

---

## 8. Riscos de implementação (futura)

| Risco | Mitigação |
|-------|-----------|
| Esperas demasiado laxas mascararem regressão real | Manter assert explícito de **50** após load e de **50** após `slow` |
| Aumentar só timeout | Evitar — não trata loading UI |
| Alterar prod sem evidência | Só se assert final (stale) falhar de forma determinística |

---

## 9. Limitações da investigação

- Não reexecutou ficheiro completo 48 testes nem `npm test`.
- Não instrumentou `summaryCalls` / `loadGenerationRef` em runtime (sem alterar código).
- Run 1 com duração total 25 s — falha provável mas mensagem completa não arquivada (npm notice no output).
- Ambiente: Vitest v4.1.11, `npm warn devdir`, Windows — pode afectar timing marginal.
- Working tree limpa — não reproduz estado 13/11 com docs não commitados.

---

## 10. Parecer

### **Causa parcialmente identificada**

| Dimensão | Veredicto |
|----------|-----------|
| Intermitência reproduzida | **Sim** (6/10 pass, 4/10 fail isolado) |
| Sintoma | Asserção **precoce** no KPI durante **loading** pós-`rerender` (L1324–1327) |
| Produção stale (`loadGenerationRef`) | **Sem evidência de defeito** nesta investigação; falhas **anteriores** ao cenário stale |
| Correção indicada | **Teste** — espera pós-`fresh.resolve` / evitar `getByRole` síncrono em loading |

---

## 11. Referências

- [frontend-dashboard-companyform-test-stabilization.md](frontend-dashboard-companyform-test-stabilization.md) — 3a/3b ficheiro Dashboard  
- [frontend-final-quality-audit.md](frontend-final-quality-audit.md) — Q1 O5  
- [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md) — flakes O5 throttle (outro teste)

---

## 12. Próximo passo (fora desta tarefa)

Tarefa separada de **implementação** na branch `test/stabilize-dashboard-o5-stale-response`: aplicar correção mínima §7, correr ficheiro Dashboard 3–5× e `npm test` — só após revisão deste relatório.