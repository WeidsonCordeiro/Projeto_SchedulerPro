# Diagnóstico — novos timeouts Frontend (13/11/2026)

**Data:** 13/11/2026  
**Tipo:** Diagnóstico read-only (sem correções de código/tests/config; sem git write; sem `npm test` integral).  
**Branch:** `develop`  
**HEAD:** `438de5ec3a457b5635d6443d53557a8d95627c40` — `438de5e Auditoria geral do roadmap`

**Referências:**

- Revalidação (fonte das falhas): [frontend-quality-revalidation.md](frontend-quality-revalidation.md)
- Diagnóstico anterior (logo, O5, Register): [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md)
- Baseline: [frontend-quality-validation.md](frontend-quality-validation.md)
- Fix logo (preservado): [company-page-logo-router-test-fix.md](company-page-logo-router-test-fix.md)

---

## 1. Objetivo

Classificar as **2 falhas por timeout (5000 ms)** reportadas na revalidação integral, com análise estática e reproduções Vitest **filtradas**, sem alterar implementação nem aumentar timeouts.

| Ficheiro | Teste | Linha |
|----------|-------|-------|
| `client/src/pages/dashboard/DashboardPage.test.tsx` | `renders greeting, summary cards and appointment tables with data` | L295 |
| `client/src/components/company/CompanyForm.test.tsx` | `updates form state when a different timezone is selected` | L95 |

---

## 2. Estado Git

### Início (diagnóstico)

| Campo | Valor |
|-------|--------|
| Branch | `develop` |
| HEAD | `438de5ec3a457b5635d6443d53557a8d95627c40` |
| Alteração client relevante | `M client/src/pages/company/CompanyPage.logo.test.tsx` (+7/−1, MemoryRouter) |
| Docs | Pacote expiration + relatórios frontend (inalterados nesta tarefa até criar este ficheiro) |

### Fim (diagnóstico)

| Campo | Valor |
|-------|--------|
| HEAD | Inalterado |
| Código `client/` | Sem edições nesta tarefa |
| Novo | `docs/tasks/frontend-new-timeouts-diagnostic.md` |
| Link opcional | Uma linha em [frontend-quality-revalidation.md](frontend-quality-revalidation.md) §7 |

---

## 3. Configuração Vitest relevante

Ficheiro: `client/vite.config.ts`

- `testTimeout`: **não definido** → default Vitest **5000 ms** por teste
- `pool: "threads"`, `maxWorkers: 3`
- `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`

---

## 4. Reproduções (comandos executados)

Diretório: `client/`. Runner: Vitest v4.1.11. Aviso npm: `Unknown env config "devdir"`.

| # | Comando | Exit | Tests (passed) | Duração Vitest | Duração wall (`time`) |
|---|---------|------|----------------|----------------|----------------------|
| 1 | `npx vitest run src/pages/dashboard/DashboardPage.test.tsx -t "renders greeting"` | **0** | 1 / 1 (47 skipped) | 18.77 s (tests **1.36 s**) | ~31.4 s |
| 2 | `npx vitest run src/components/company/CompanyForm.test.tsx -t "updates form state"` | **0** | 1 / 1 (11 skipped) | 16.07 s (tests **3.11 s**) | ~15.7 s |
| 3 | `npx vitest run src/pages/dashboard/DashboardPage.test.tsx` | **0** | **48 / 48** | 22.08 s (tests **8.55 s**) | ~19.8 s |
| 4 | `npx vitest run src/components/company/CompanyForm.test.tsx` | **0** | **12 / 12** | 22.74 s (tests **11.04 s**) | ~27.5 s |

**Não executado nesta tarefa:** `npm test` (suite completa ~445 s na revalidação).

### Interpretação da matriz de reprodução

| Cenário | Este diagnóstico |
|---------|------------------|
| Isolado passa, ficheiro passa, suite integral falhou | **Sim** — classificação **flake / carga** (ambiente de teste), alinhada com O5/Register no diagnostic anterior |
| Isolado falha | Não observado |
| Só `-t` passa, ficheiro falha | Não observado |
| Ficheiro falha sempre | Não observado |

**Nota obrigatória:** passar isolado e em ficheiro **não** fecha o caso enquanto `npm test` exit ≠ 0; a falha na suite completa permanece **reproduzida apenas** via [frontend-quality-revalidation.md](frontend-quality-revalidation.md) (~6085 ms e ~6271 ms reportados).

---

## 5. Análise estática e classificação

### 5.1 Dashboard — `renders greeting, summary cards and appointment tables with data` (L295)

#### Confirmado

1. **Falha na revalidação:** `Error: Test timed out in 5000ms.` (~6085 ms no output da suite).
2. **Reproduções deste diagnóstico:** teste isolado e ficheiro completo (48 testes) — **passaram**, teste isolado em **~1.36 s** (bem abaixo de 5 s).
3. **Setup do `describe`:** `beforeEach` com `vi.useFakeTimers({ toFake: ["Date"] })` e `vi.setSystemTime(NOW)` (L279–280); `afterEach` restaura timers reais — aplica-se a **todos** os 48 testes do ficheiro.
4. **Corpo do teste (L295–345):** `async`; `renderDashboard()`; único `await screen.findByRole` no greeting; depois muitas asserções **síncronas** (`getBy*`, `cardValues()`, `todayAgendaDesktop()`).
5. Existe helper `waitForDashboardLoaded()` (`findByRole` "Resumo do dia") usado noutros testes — **este teste não o usa**, confiando em `getByRole` síncrono após o greeting.
6. Mocks: `mockSummaryResponse` com appointments today/upcoming; `mockRelatedData()` em `beforeEach`.

#### Hipótese

- Sob **3 workers** e **~1610 testes**, o mesmo teste pode exceder 5 s por **contention** (CPU, jsdom, import/transform) mesmo quando a lógica DOM é rápida isoladamente.
- Fake `Date` em todo o ficheiro aumenta custo cognitivo do worker partilhado, mas **não explica** timeout isolado (passou rápido); reforça leitura de **carga**, não de bug de página.
- Risco marginal: corrida entre greeting visível e paint de cards/tabelas — improvável em isolado; possível edge sob carga se microtasks atrasarem (sem evidência de asserção falhada, só timeout).

#### Teste vs implementação

| Veredicto | **Teste / ambiente (flake ou carga)** |
|-----------|----------------------------------------|
| Implementação prod | Sem evidência: UI e mocks são os mesmos; ficheiro inteiro verde nesta máquina |

#### Correção mínima recomendada (não aplicada)

1. Após `findByRole` do greeting, usar `await waitForDashboardLoaded()` ou `await waitFor(() => expect(cardValues()).toEqual(...))` para alinhar com testes mais estáveis do mesmo ficheiro.
2. Evitar aumentar `testTimeout` global; se política do projeto permitir, só após **2–3** falhas consecutivas em `npm test`.
3. **Não** alterar `DashboardPage` de produção para este sintoma.

#### Risco de regressão ao corrigir

- Baixo: tornar waits explícitos pode **aumentar** duração marginal do teste, mas reduz flake.
- Médio se aumentar timeout sem política: mascara outros problemas.

---

### 5.2 CompanyForm — `updates form state when a different timezone is selected` (L95)

#### Confirmado

1. **Falha na revalidação:** `Error: Test timed out in 5000ms.` (~6271 ms).
2. **Reproduções:** isolado **~3.11 s**; ficheiro 12/12 em **~11.04 s** — **passaram** (isolado já próximo de 50–60% do limite de 5 s só na métrica `tests` do Vitest; wall time maior por setup).
3. **Teste L95–102:** `it` **síncrono** (sem `async`); corpo = `renderForm()` + `selectTimezoneBySearch("America/New_York")` + `expect` no combobox.
4. **`selectTimezoneBySearch` (L49–58):** `fireEvent.click` combobox → `fireEvent.change` searchbox → `fireEvent.click` option com label `formatTimezoneOptionLabel(iana)`.
5. Teste vizinho L79–93 cobre search sem seleccionar NY (listbox com 1 opção); L95 adiciona **click na opção** (caminho mais pesado).
6. `beforeEach`: `mockViewportDesktop()`, mock `companyApi.updateCompany`.

#### Hipótese

- Picker + filtro de zonas IANA é **caro** em jsdom; em suite longa com workers limitados, o corpo inteiro do `it` síncrono pode ultrapassar 5 s **sem** `waitFor`/`findBy*` (timeout = tempo total do teste, não só uma query).
- Padrão alinhado com flakes já documentados em Register/CompanyForm no [frontend-test-failures-diagnostic.md](frontend-test-failures-diagnostic.md).

#### Teste vs implementação

| Veredicto | **Teste / ambiente (flake ou carga)** |
|-----------|----------------------------------------|
| Implementação prod | Sem evidência: seleção de timezone funciona; 12/12 no ficheiro nesta corrida |

#### Correção mínima recomendada (não aplicada)

1. Converter o `it` para `async` e `await waitFor` / `await findByRole` no combobox com texto NY após `selectTimezoneBySearch` (ou refatorar helper para async com `userEvent` se convenção do projeto).
2. Opcional: reutilizar padrão do teste L79 (assert listbox) antes do click, para fail fast.
3. Evitar `testTimeout` elevado até confirmar flake repetida em CI/local.
4. **Não** alterar `TimezonePicker` em produção só por timeout de teste.

#### Risco de regressão ao corrigir

- Baixo para async + `waitFor` (melhora estabilidade).
- Nenhum se mantiver apenas documentação até nova autorização.

---

## 6. Ficheiros analisados

| Ficheiro | Âmbito |
|----------|--------|
| `client/src/pages/dashboard/DashboardPage.test.tsx` | L176–188 `renderDashboard`, L243–245 `waitForDashboardLoaded`, L273–345 teste L295 |
| `client/src/components/company/CompanyForm.test.tsx` | L49–58 helpers timezone, L95–102 teste alvo |
| `client/vite.config.ts` | `maxWorkers`, ausência de `testTimeout` |
| `client/src/pages/company/CompanyPage.logo.test.tsx` | Confirmado modificado (fix Router), não relacionado com estes timeouts |

---

## 7. Síntese

| Falha | Revalidação suite | Isolado | Ficheiro | Classificação |
|-------|-------------------|---------|----------|---------------|
| Dashboard L295 | Timeout ~6085 ms | Pass (1.36 s tests) | 48/48 pass | **Flake / carga** |
| CompanyForm L95 | Timeout ~6271 ms | Pass (3.11 s tests) | 12/12 pass | **Flake / carga** (teste síncrono + picker pesado) |

**Evidência suficiente para correções de teste?** Sim — padrão claro (suite vs filtrado), sem falha de asserção nem falha em ficheiro isolado. **Correção ainda não autorizada nesta tarefa** (apenas recomendações mínimas).

**Suite frontend aprovada?** **Não.** Última suite integral: [frontend-quality-revalidation.md](frontend-quality-revalidation.md) — 1608/1610, exit 1.

---

## 8. Próximos passos (após autorização explícita)

| Prioridade | Acção |
|------------|--------|
| P1 | Aplicar waits async no Dashboard L295 (`waitForDashboardLoaded` ou equivalente) |
| P1 | Tornar CompanyForm L95 async com `waitFor` pós-seleção timezone |
| P2 | Correr `npm test` 2× consecutivas para confirmar verde antes de declarar suite aprovada |
| P3 | Opcional CI: `testTimeout` pontual ou `--no-file-parallelism` só com métricas repetidas |
| — | Manter chunk JS > 500 kB fora deste âmbito (build warning) |

---

## 9. Handoff

1. Estado suite integral: [frontend-quality-revalidation.md](frontend-quality-revalidation.md).
2. Este diagnóstico: reproduções **todas verdes** em modo filtrado; falhas só na corrida completa anterior.
3. Logo: fix confirmado presente no working tree; passou na revalidação.
4. Não marcar qualidade frontend como aprovada até `npm test` exit 0.
