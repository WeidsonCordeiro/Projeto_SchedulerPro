# Validação da suite frontend completa — pós-integração T3/T4

## Metadados

| Campo | Valor |
|-------|--------|
| Data da validação | 2026-11-16 |
| Tipo | Validação e diagnóstico (sem alterações a código, testes, config ou Git write) |
| Branch | `develop` |
| HEAD | `f29b0b959d0bdfd265922d1b629351bdcb3b994a` |
| Commit de integração T3/T4 | `f29b0b9` — Merge pull request #141 (`test/fix-appointments-listview-date-dependent-tests`) |
| Commit funcional da correção | `dbfff10` — `test(agendamentos): tornar o ListView T3/T4 independente de data` |
| Relatório da correção | [`appointments-listview-date-tests-fix.md`](./appointments-listview-date-tests-fix.md) |
| Diagnóstico de referência | [`frontend-suite-flakes-diagnostic.md`](./frontend-suite-flakes-diagnostic.md) |

---

## 1. Verificações iniciais

| Verificação | Resultado |
|-------------|-----------|
| Branch atual = `develop` | **Sim** |
| HEAD | `f29b0b9` |
| Working tree inicial | **Limpo** (`nothing to commit, working tree clean`) |
| Tracking | `develop...origin/develop` (up to date) |
| Correção T3/T4 em `develop` | **Sim** — merge PR #141; ficheiro contém `futureAppointmentTimes()` e overrides em T3/T4 |

**Confirmação em código (develop):**

- `futureAppointmentTimes()` — `DateTime.now().plus({ days: 30 })`.
- T3 — `renderList({ appointments: [makeAppointment(futureAppointmentTimes())] })` + clicks **Editar** / **Confirmar** / **Excluir** e callbacks.
- T4 — mesmo override + asserts **Aguarde...**, **Editar**, **Excluir** disabled.

---

## 2. Estado Git

### Inicial

- Branch `develop`, limpo, HEAD `f29b0b9`.

### Final

```
## develop...origin/develop
?? docs/tasks/_npm-test-output-post-t3t4.txt
?? docs/tasks/frontend-suite-post-t3-t4-validation.md
```

- **Alterações de código:** nenhuma (tarefa read-only para código).
- **Artefacto auxiliar:** log capturado durante `npm test` (`_npm-test-output-post-t3t4.txt`, untracked); pode ser removido manualmente se não for necessário.
- **Este relatório:** untracked até commit do utilizador.

---

## 3. Resultado global — `npm test`

| Campo | Valor |
|-------|--------|
| Diretório | `client/` |
| Comando | `npm test` (`vitest run`) |
| Vitest | v4.1.11 |
| Start at | 15:46:14 (local) |
| Duração | **493.25 s** (~8 min 13 s) |
| Test files | **136** total — **135 passed**, **1 failed** |
| Tests | **1610** total — **1606 passed**, **4 failed**, 0 skipped (na sumarização final) |
| Exit code Vitest | **Falha** (4 testes falhados; esperado exit code ≠ 0) |

**Nota:** a suite **não** está verde.

---

## 4. Falhas registadas (suite integral)

Todas as falhas concentradas num único ficheiro — **não** são T1–T6 do diagnóstico anterior.

| # | Ficheiro | Teste completo (describe > it) | Tipo de erro | Local |
|---|----------|-------------------------------|--------------|-------|
| F1 | `DashboardPage.test.tsx` | `DashboardPage > automatic refresh (O5) > throttles rapid visible events to one extra call per interval` | AssertionError — `dashboardApi.getSummary` expected 2 calls, got 1 | L1114 |
| F2 | `DashboardPage.test.tsx` | `DashboardPage > automatic refresh (O5) > keeps existing KPIs and shows a warning when a silent refresh fails` | TestingLibraryElementError — `dashboard-refresh-warning` not found | L1192 |
| F3 | `DashboardPage.test.tsx` | `DashboardPage > automatic refresh (O5) > does not show fullscreen loading during a silent refresh` | TestingLibraryElementError — heading `"Resumo do dia"` not found (`waitForDashboardLoaded`) | L245 / L1215 |
| F4 | `DashboardPage.test.tsx` | `DashboardPage > automatic refresh (O5) > preserves O2 distribution after a successful silent refresh` | AssertionError — `dashboard-status-count-completed` expected `"1"`, received `"0"` | L1272 |

**Classificação provisória:** mistura de **asserção** / **sincronização** (O5, refresh silencioso, mocks de API, `vi.waitFor`) — típico de flakes ou condições de corrida **sob carga da suite**. Não foram reexecutados isoladamente nesta tarefa (evitar repetição indiscriminada).

---

## 5. Análise T1–T6

Comparação com [`frontend-suite-flakes-diagnostic.md`](./frontend-suite-flakes-diagnostic.md) (fonte suite anterior: **1604/1610**, 6 falhas T1–T6).

| ID | Teste (nome completo) | Diagnóstico anterior (suite) | Esta execução integral | Classificação |
|----|------------------------|------------------------------|-------------------------|---------------|
| **T1** | `calls register with the selected IANA timezone in the payload` | Falhou na suite (timeout / dependente de carga) | **PASSOU** | Nenhuma falha reportada em `RegisterPage.test.tsx` |
| **T2** | `shows server errors` | Idem T1 | **PASSOU** | Idem |
| **T3** | `invokes edit, status and delete callbacks from the action row` | **FAIL** (reproduzível, data passada) | **PASSOU** | Correção integrada eficaz na suite |
| **T4** | `disables action buttons and shows Aguarde for the pending status action` | **FAIL** (reproduzível) | **PASSOU** | Idem |
| **T5** | `shows a friendly error and a retry button when loading fails` | Falhou na suite (intermitente) | **PASSOU** | Nenhuma falha em `AppointmentsPage.test.tsx` |
| **T6** | `keeps the session and shows feedback when delete fails` | Falhou na suite (intermitente) | **PASSOU** | Nenhuma falha em `CompanyPage.test.tsx` |

### T3/T4 — confirmação pós-integração

| Critério | Estado |
|----------|--------|
| Fixture futura na suite integrada | **Sim** (`futureAppointmentTimes`) |
| Botão **Editar** nos cenários T3/T4 | Exercitado pelos testes (passaram na suite) |
| Callbacks / disabled / **Aguarde...** | Assertions originais mantidas no código |
| Regressão da integração PR #141 | **Não observada** nesta corrida |

### T1, T2, T5, T6

Passaram nesta corrida integral **uma vez**. O diagnóstico anterior classificou-os como **dependentes da suite** / intermitentes — **não** se pode concluir estabilidade permanente sem mais corridas; apenas que **não falharam** quando T3/T4 já estão corrigidos.

---

## 6. Comparação global com o diagnóstico anterior

| Métrica | Pós-O5 (diagnóstico) | Pós-T3/T4 (esta validação) | Δ |
|---------|----------------------|----------------------------|---|
| Testes pass | 1604 | 1606 | **+2** |
| Testes falh | 6 | 4 | **−2** |
| Ficheiros falh | (vários) | 1 (`DashboardPage`) | Concentração em O5 |
| Falhas T3/T4 | Sim | **Não** | Objetivo da integração atingido |
| Falhas T1/T2/T5/T6 | Sim | **Não** (nesta corrida) | Melhoria vs baseline 1604/1610 |

**Novas falhas (relativamente ao conjunto T1–T6):** as 4 falhas actuais são testes **Dashboard O5** (grupo `automatic refresh`), não estavam na tabela T1–T6. Podem ser flakes de suite já conhecidos na área Dashboard (ver [`dashboard-o5-stale-response-diagnostic.md`](./dashboard-o5-stale-response-diagnostic.md)), distintos do teste stale corrigido em PR #139.

---

## 7. Verificações complementares

| Comando | Exit code | Observações |
|---------|-----------|-------------|
| `npm run typecheck` | **0** | `tsc -b --noEmit` |
| `npm run build` | **0** | Vite build OK |

**Warnings (build):**

- Chunk JS > 500 kB após minificação (rollup `chunkSizeWarningLimit`).
- `npm warn Unknown env config "devdir"` (ambiente npm).

Nenhuma alteração feita para suprimir warnings.

---

## 8. Conclusão

**Classificação: SUITE APROVADA COM RESSALVAS**

| Aspeto | Avaliação |
|--------|-----------|
| Integração T3/T4 | **Sucesso** na suite completa (T3/T4 passam; sem regressão identificada) |
| Objetivo T1/T2/T5/T6 | Nesta corrida, **passaram**; histórico de intermitência mantém risco |
| Suite integral | **1606/1610** — 4 falhas Dashboard O5 |
| Regressão causada por PR #141 | **Não** — falhas actuais são outro subconjunto (Dashboard) |

Não é **SUITE APROVADA** (4 testes falhados). Não é **SUITE NÃO APROVADA** no sentido T3/T4 (não voltaram a falhar).

---

## 9. Recomendações para a próxima tarefa

1. **Prioridade:** diagnóstico / estabilização dos **4 testes O5** em `DashboardPage.test.tsx` sob `npm test` (reprodução isolada + ficheiro completo; possível extensão do padrão `waitForDashboardLoaded` / `vi.waitFor` usado em PR #139).
2. **Monitorização:** após estabilizar Dashboard, repetir 2–3× `npm test` para confirmar T1/T2/T5/T6 sob carga.
3. **Não iniciar** correções Register/Appointments/Company enquanto Dashboard O5 falhar de forma reproduzível na suite — evita mascarar causas cruzadas.

**Aguardar aprovação do utilizador** antes de abrir tarefa de estabilização.

---

## 10. Handoff — resumo executivo

- **develop** @ `f29b0b9` inclui PR #141 (`dbfff10`).
- **`npm test`:** 1606/1610, 4 falhas só em Dashboard O5 (refresh automático).
- **T1–T6:** todos **PASSOU** nesta corrida; T3/T4 confirmam fixture futura e comportamento **Editar**.
- **typecheck / build:** OK.
- **Relatório:** `docs/tasks/frontend-suite-post-t3-t4-validation.md`.
- **Git após validação:** develop limpo de código; untracked: este relatório + log opcional `_npm-test-output-post-t3t4.txt`.

### Tabela T1–T6 (suite integral)

| ID | Resultado |
|----|-----------|
| T1 | PASSOU |
| T2 | PASSOU |
| T3 | PASSOU |
| T4 | PASSOU |
| T5 | PASSOU |
| T6 | PASSOU |

### Problemas pendentes

1. F1–F4 — `DashboardPage.test.tsx` / automatic refresh (O5).
2. Incerteza residual — T1/T2/T5/T6 podem voltar a falhar sob carga (evidência histórica).
3. Artefacto `docs/tasks/_npm-test-output-post-t3t4.txt` (limpeza opcional).