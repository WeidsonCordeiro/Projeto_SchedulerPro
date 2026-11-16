# SchedulerPro — Diagnóstico das falhas da suite Frontend

**Data:** 11/11/2026  
**Tipo:** Diagnóstico somente leitura (sem alteração de código, testes ou configs).  
**Baseline:** [frontend-quality-validation.md](frontend-quality-validation.md) — suite completa `npm test`: 4 falhas / 1610 testes.

**Git write:** não executado.

---

## 1. Objetivo

Investigar as quatro falhas Vitest registadas na validação de qualidade do frontend, reproduzir com testes filtrados, classificar causas e recomendar correções mínimas **sem implementar**.

---

## 2. Estado Git

### Inicial

| Campo | Valor |
|-------|--------|
| Branch | `develop` |
| HEAD | `438de5ec3a457b5635d6443d53557a8d95627c40` |
| Último commit | `Auditoria geral do roadmap` |
| Working tree | Alterações documentais preservadas (sync/cleanup/validation + `frontend-quality-validation.md` untracked) |

### Final

| Campo | Valor |
|-------|--------|
| HEAD | Inalterado |
| Alteração desta tarefa | Apenas **este ficheiro** (`docs/tasks/`) |
| `client/src`, testes, configs | Sem modificações no diff |

### Artefactos pós-build anterior

- `client/dist/` — presente no disco; **ignorado** pelo Git (`client/.gitignore`).
- `client/tsconfig.app.tsbuildinfo`, `client/tsconfig.node.tsbuildinfo` — tipicamente ignorados; não listados em `git status` como modificados.

**Não eliminados** durante o diagnóstico.

---

## 3. Resumo das quatro falhas (suite completa vs isolado)

| # | Teste | Suite completa (validação) | Reprodução isolada (11/11) | Classificação |
|---|--------|---------------------------|---------------------------|---------------|
| 1–2 | `CompanyPage.logo` ×2 | Falha | **Falha** (determinística) | **Setup de teste** |
| 3 | Dashboard O5 throttle 45s | Falha (`getSummary` 1× vs 2×) | **Passa** | **Intermitente / carga** (hipótese fortalecida) |
| 4 | RegisterPage password min length | Timeout 5000 ms | **Passa** (3.4 s no teste; ficheiro 11/11 pass) | **Intermitente / carga ou timeout marginal** |

---

## 4. Reexecução direcionada

Comandos (`client/`, Vitest v4.1.11):

| Comando | Exit | Resultado | Duração (aprox.) |
|---------|------|-----------|------------------|
| `npx vitest run src/pages/company/CompanyPage.logo.test.tsx` | **1** | 2 failed | ~9 s |
| `npx vitest run src/pages/dashboard/DashboardPage.test.tsx -t "waits for the full 45 second throttle"` | **0** | 1 passed, 47 skipped | ~12 s |
| `npx vitest run src/pages/RegisterPage.test.tsx -t "validates password minimum length"` | **0** | 1 passed, 10 skipped | ~15 s |
| `npx vitest run src/pages/RegisterPage.test.tsx` | **0** | 11 passed | ~24 s |

---

## 5. Análise por falha

### 5.1 CompanyPage logo (2 testes) — **causa confirmada: teste**

**Reprodução:** falha **sempre** em isolado.

**Erro confirmado:**

```
useNavigate() may be used only in the context of a <Router> component.
```

Stack: `CompanyPage.tsx:48` → `useNavigate()`.

**Evidência:**

- [`CompanyPage.logo.test.tsx`](../../client/src/pages/company/CompanyPage.logo.test.tsx) — `renderPage()` usa `Provider` + `<CompanyPage />` **sem** `MemoryRouter`.
- [`CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx) — padrão correcto: `MemoryRouter`, `Routes`, `Route path="/company"`.
- [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx) — `useNavigate` é uso legítimo de produção (não é bug de implementação para estes cenários de logo).

**Correção mínima recomendada:** copiar o wrapper Router de `CompanyPage.test.tsx` para `CompanyPage.logo.test.tsx` (ou extrair helper partilhado).

**Risco de regressão:** baixo (só testes). **Pós-fix:** `npx vitest run CompanyPage.logo.test.tsx` + regressão `CompanyPage.test.tsx`.

**Implementação:** não necessária nesta tarefa.

---

### 5.2 Dashboard — `waits for the full 45 second throttle` — **hipótese: intermitência em suite longa**

**Reprodução:** **passa** em isolado; **falhou** na suite completa (~522 s).

**Factos confirmados:**

- Constante [`DASHBOARD_AUTO_REFRESH_MIN_MS = 45_000`](../../client/src/config/dashboardRefresh.ts).
- [`useDashboardVisibilityRefresh`](../../client/src/hooks/useDashboardVisibilityRefresh.ts) — throttle `now - lastRefreshAt >= minIntervalMs`; `lastAutoRefreshAtRef` actualizado ao fim do load inicial e após refresh aceite.
- Teste L1156–1173: `advanceTimersByTime(44_999)` + visibility (mantém 1× `getSummary`), depois `+1` + visibility (espera 2×).
- Teste unitário [`useDashboardVisibilityRefresh.test.ts`](../../client/src/hooks/useDashboardVisibilityRefresh.test.ts) L107–134 — mesmo padrão 44999+1 com mock `onRefresh` → 2 chamadas (com `vi.useFakeTimers()` completo).
- `DashboardPage.test.tsx` L279: `vi.useFakeTimers({ toFake: ["Date"] })` — diferente do hook test.

**Falha na suite completa (confirmada na validação):**

`expect(dashboardApi.getSummary).toHaveBeenCalledTimes(2)` — recebeu **1**.

**Hipóteses (não todas confirmadas):**

1. **Carga / ordem na suite:** isolado passa; falha pode depender de estado global, timers ou pressão de recursos na suite completa.
2. **Fake Date vs integração:** possível desalinhamento entre `toFake: ["Date"]` e `advanceTimersByTime` apenas sob certas condições de async load (menos provável quando isolado passa de forma estável).
3. **Async refresh:** segundo `visibilitychange` não completa `getSummary` antes do assert na corrida completa (hipótese secundária).

**Comportamento de produção:** alinhado com hook e constante 45 s — **não** se recomenda alterar intervalo de produção.

**Correção mínima recomendada (se falhar de novo após fix logo):**

- Opção A: alinhar setup de fake timers ao hook test após `waitForDashboardLoaded` dentro de `act`.
- Opção B: repetir suite completa 2–3× para confirmar flake antes de mexer no teste.

**Risco:** médio se alterar timing sem reproduzir falha localmente na suite completa.

**Classificação:** **problema de teste / timing**; **inconclusivo** na causa exacta da falha em suite completa.

---

### 5.3 RegisterPage — `validates password minimum length` — **hipótese: timeout marginal sob carga**

**Reprodução:** **passa** em isolado (teste ~3.4 s; limite Vitest default 5 s).

**Falha na suite completa (confirmada):** `Test timed out in 5000ms` — não falhou asserção de mensagem ausente.

**Factos confirmados:**

- [`RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx) L60–61 — mensagem «A senha deve possuir pelo menos 8 caracteres.»; render em `invalid-feedback` L204–205.
- Teste L178–191 — `fireEvent` nos campos + submit + `findByText` da mensagem.
- Testes vizinhos (confirmação de senha, required fields) na mesma suite **passaram** na validação global.
- Ficheiro completo (11 testes) passa em isolado em ~23 s.

**Hipóteses:**

1. **Timeout 5 s insuficiente** quando a suite está sob carga (ficheiro Register reportou ~24 s no run completo; teste individual ~5.2 s no timeout reportado na validação).
2. **Flake** — isolado estável; não afirmar resolvido.
3. **DOM** — improvável se isolado passa com a mesma lógica (mensagem aparece).

**Correção mínima recomendada (se reproduzir sob `npm test` completo):**

- `testTimeout` só neste `it` (decisão explícita), ou optimizar interacções (sem aumentar timeout global sem critério).
- **Não** alterar validação de produto.

**Classificação:** **intermitente / ambiente**; tendência **teste**, não implementação.

---

## 6. Tabela consolidada — tipo de problema

| Falha | Configuração teste | Implementação prod | Inconclusivo / flake |
|-------|-------------------|-------------------|----------------------|
| CompanyPage logo ×2 | **Sim (confirmado)** | Não | Não |
| Dashboard throttle O5 | Provável | Não | **Sim** (só falha em suite completa) |
| Register password | Provável (timeout) | Não | **Sim** (passa isolado) |

---

## 7. Ordem recomendada de implementação (futura)

1. **CompanyPage.logo.test.tsx** — Router (correção determinística, alto impacto / baixo risco).
2. **Dashboard throttle** — só após reproduzir falha em `npm test` completo ou alinhar timers com evidência.
3. **RegisterPage** — só se timeout voltar a ocorrer em suite completa após (1).

---

## 8. Testes a executar após correções

```bash
cd client
npx vitest run src/pages/company/CompanyPage.logo.test.tsx
npm test
npm run typecheck
npm run build
```

---

## 9. Limitações

- Não foi repetida suite completa neste diagnóstico (só reexecuções filtradas).
- Causa raiz exacta das falhas Dashboard/Register **em suite completa** não reproduzida localmente nesta sessão.
- Sem alteração de código.

---

## 10. Handoff para outra IA

1. Corrigir primeiro **Router** em `CompanyPage.logo.test.tsx` — falha 100% reprodutível.
2. Ler [frontend-quality-validation.md](frontend-quality-validation.md) para baseline da suite.
3. Dashboard O5: confiar em `useDashboardVisibilityRefresh.test.ts` para contrato throttle; integração falhou só em suite longa.
4. Register: validação de password existe; preferir timeout local ao teste se flake confirmado em `npm test`.
5. Não marcar suite como verde sem `npm test` completo após fix (1).
