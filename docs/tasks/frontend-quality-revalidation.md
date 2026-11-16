# SchedulerPro — Revalidação integral da qualidade Frontend

**Data:** 13/11/2026  
**Tipo:** Validação somente leitura (sem correções; sem git write).  
**HEAD:** `438de5ec3a457b5635d6443d53557a8d95627c40` (`develop`)

**Referências:**

- Baseline: [frontend-quality-validation.md](frontend-quality-validation.md) (11/11/2026)
- Correção prévia: [company-page-logo-router-test-fix.md](company-page-logo-router-test-fix.md)
- Diagnóstico: [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md)

**Git write:** não executado.

---

## 1. Objetivo

Reexecutar `npm test`, `npm run typecheck` e `npm run build` após o fix `MemoryRouter` em `CompanyPage.logo.test.tsx`, comparar com o baseline e registar o estado actual.

---

## 2. Estado Git

### Inicial

| Campo | Valor |
|-------|--------|
| Branch | `develop` |
| HEAD | `438de5ec3a457b5635d6443d53557a8d95627c40` |
| Último commit | `Auditoria geral do roadmap` |
| Alteração relevante client | `M client/src/pages/company/CompanyPage.logo.test.tsx` |
| Docs | Pacote expiration + relatórios frontend (preservados) |

### Final

| Campo | Valor |
|-------|--------|
| HEAD | Inalterado |
| Novo nesta tarefa | `docs/tasks/frontend-quality-revalidation.md` |
| Código | Sem edições adicionais em `client/` |

---

## 3. Comandos executados

| # | Comando | Diretório | Exit code | Duração (aprox.) |
|---|---------|-----------|-----------|------------------|
| 1 | `npm test` | `client/` | **1** | ~445 s |
| 2 | `npm run typecheck` | `client/` | **0** | ~38 s |
| 3 | `npm run build` | `client/` | **0** | ~53 s (incl. tsc) |

Runner: Vitest v4.1.11. Aviso ambiente: npm `Unknown env config "devdir"`.

---

## 4. Resultados completos

### 4.1 Testes (`vitest run`)

| Métrica | Valor |
|---------|--------|
| Ficheiros de teste | **136** — **134 passed**, **2 failed** |
| Testes | **1610** — **1608 passed**, **2 failed** |
| Skipped | 0 (reportado) |

### Falhas (mensagens exactas)

**1.** `src/pages/dashboard/DashboardPage.test.tsx` — `renders greeting, summary cards and appointment tables with data`

```
Error: Test timed out in 5000ms.
```

(L295)

**2.** `src/components/company/CompanyForm.test.tsx` — `updates form state when a different timezone is selected`

```
Error: Test timed out in 5000ms.
```

(L95)

### Checklist específico (pós-fix logo)

| Item | Baseline (11/11) | Esta execução |
|------|------------------|---------------|
| `CompanyPage.logo` ×2 | Falha (Router) | **Passou** (ficheiro em 134 passed) |
| Dashboard O5 `waits for the full 45 second throttle` | Falha (`getSummary` 1× vs 2×) | **Passou** (não listado nas falhas) |
| Register `validates password minimum length` | Falha (timeout 5 s) | **Passou** (não listado nas falhas) |

### 4.2 TypeScript

- `tsc -b --noEmit` — **0 erros**, exit **0**.

### 4.3 Build

- `tsc -b && vite build` — exit **0**, Vite v7.3.7, build ~8.53 s.
- `dist/index.html` — 0.41 kB (gzip 0.27 kB)
- `dist/assets/index-7pHOvoeD.css` — 279.95 kB (gzip 39.71 kB)
- `dist/assets/index-45IRRS42.js` — **623.26 kB** (gzip 183.22 kB)
- Warning: chunk **> 500 kB** (inalterado face ao baseline)

---

## 5. Comparação com baseline

| Métrica | Baseline | Revalidação | Δ |
|---------|----------|-------------|---|
| Testes total | 1610 | 1610 | 0 |
| Passed | 1606 | **1608** | +2 |
| Failed | 4 | **2** | −2 |
| Ficheiros failed | 3 | **2** | −1 |
| typecheck exit | 0 | 0 | = |
| build exit | 0 | 0 | = |
| JS bundle | ~623 kB | 623.26 kB | ≈ |
| Suite aprovada | Não | **Não** | — |

### Resolvidas (face ao baseline)

- `CompanyPage.logo.test.tsx` — Router (correção aplicada).
- `DashboardPage` — throttle O5 45 s (não falhou nesta corrida; possível **flake** no baseline).
- `RegisterPage` — password min length (não falhou nesta corrida; possível **flake** no baseline).

### Persistentes / novas

| Tipo | Detalhe |
|------|---------|
| **Nova** (vs baseline) | `DashboardPage` — greeting/cards/tables — **timeout** 5 s (não era falha do baseline) |
| **Nova** (vs baseline) | `CompanyForm` — timezone — **timeout** 5 s |
| **Não reproduzidas** | Baseline: O5 throttle, Register password, CompanyPage logo |

**Causa provável (sem correção nesta tarefa):** testes com interacção pesada (`findBy`, timezone picker, dashboard load) a exceder **5000 ms** sob suite longa (~445 s) — padrão semelhante ao diagnostic Register/Dashboard flake; não indica regressão de produção.

---

## 6. Conclusão sobre qualidade actual

| Área | Estado |
|------|--------|
| TypeScript | **OK** |
| Build produção | **OK** (warning tamanho chunk) |
| Suite Vitest | **Não aprovada** — exit **1**, **2** testes falhados |

**Não** declarar a suite frontend como aprovada.

Melhoria líquida: **−2 falhas** vs baseline; falhas restantes são **timeouts** em testes diferentes dos quatro do baseline (mix de flake e carga).

---

## 7. Próximos passos recomendados

| Prioridade | Acção |
|------------|--------|
| P1 | Timeouts L295/L95 — diagnóstico [frontend-new-timeouts-diagnostic.md](frontend-new-timeouts-diagnostic.md); correção [frontend-dashboard-companyform-test-stabilization.md](frontend-dashboard-companyform-test-stabilization.md) |
| P2 | Monitorar O5 throttle e Register em 2–3 corridas `npm test` antes de marcar flake como fechado |
| P3 | Opcional: `testTimeout` por teste só com evidência de flake repetida (não feito aqui) |
| P3 | Build: code-split chunk JS > 500 kB (produto) |
| P3 | `test:coverage` — fora desta revalidação |

---

## 8. Handoff para outra IA

1. Baseline histórico: [frontend-quality-validation.md](frontend-quality-validation.md).
2. Estado actual: **este ficheiro**.
3. Logo Router: [company-page-logo-router-test-fix.md](company-page-logo-router-test-fix.md) — confirmado na suite completa.
4. Reproduzir falhas: `npx vitest run DashboardPage.test.tsx -t "renders greeting"` e `CompanyForm.test.tsx -t "timezone"`.
5. Não assumir verde total até `npm test` exit 0.
