# Qualidade frontend — estado de referência (2026-11-16)

Documento **canónico** para interpretar o estado da suite Vitest do pacote `client/` após a integração dos PR #139, #141 e #142 em `develop`. Não substitui corridas locais ou CI; não altera relatórios históricos em `docs/tasks/`.

---

## 1. Estado actual

| Campo | Valor |
|-------|--------|
| **Branch de integração** | `develop` |
| **HEAD confirmado na documentação** | `35856e752f529fd6663b4207c3f981500b5c944a` — merge PR #142 |
| **Pacote** | `client/` |
| **Runner documentado** | Vitest **v4.1.11** ([`dashboard-o5-refresh-tests-stabilization.md`](../tasks/dashboard-o5-refresh-tests-stabilization.md)) |
| **Declaração de dependência** | `vitest` `^4.1.7` em [`client/package.json`](../../client/package.json) |

### Integração recente (testes)

| PR | Responsabilidade | Evidência |
|----|------------------|-----------|
| **#139** | Estabilizar teste O5 *stale summary responses* em `DashboardPage.test.tsx` | Merge `ad48f5c` — [`frontend-suite-flakes-diagnostic.md`](../tasks/frontend-suite-flakes-diagnostic.md); implementação [`dashboard-o5-stale-response-fix.md`](../tasks/dashboard-o5-stale-response-fix.md) |
| **#141** | Tornar testes ListView **T3/T4** independentes de data (`futureAppointmentTimes`) | Merge `f29b0b9` — [`appointments-listview-date-tests-fix.md`](../tasks/appointments-listview-date-tests-fix.md) |
| **#142** | Estabilizar cenários O5 **F1–F4** (`mockReset`, `waitForDashboardReady`, mocks determinísticos) | Merge `35856e7` — [`dashboard-o5-refresh-tests-stabilization.md`](../tasks/dashboard-o5-refresh-tests-stabilization.md) |

**Código de produção:** inalterado nestes PR; alterações restritas a testes (e documentação de tarefas).

### Resultado da suite (última validação documentada)

Fonte: [`dashboard-o5-refresh-tests-stabilization.md`](../tasks/dashboard-o5-refresh-tests-stabilization.md) §6 Etapa D — execuções **no merge alvo**, antes da sincronização documental de 16/11/2026.

| Métrica | Resultado |
|---------|-----------|
| Comando | `npm test` em `client/` |
| Ficheiros de teste | **136/136** (3×) |
| Testes | **1610/1610** (3×) |
| Durações | ~458–508 s por corrida |
| `npm run typecheck` | exit **0** |
| `npm run build` | exit **0** |

A tarefa de sincronização documental **não** reexecutou a suite integral; a evidência acima provém do relatório de estabilização O5.

---

## 2. Histórico resumido (cronologia)

1. **Suite com falhas dispersas (Nov 2026)** — Diagnóstico [`frontend-suite-flakes-diagnostic.md`](../tasks/frontend-suite-flakes-diagnostic.md): após PR #139, **1604/1610** na corrida documentada em [`dashboard-o5-stale-response-fix.md`](../tasks/dashboard-o5-stale-response-fix.md) (T1–T6 e outros subconjuntos analisados como T1–T6).

2. **Correcção T3/T4 (datas)** — Fixture com data fixa no passado quebrava botões Editar vs Visualizar; corrigido só em testes ([`appointments-listview-date-tests-fix.md`](../tasks/appointments-listview-date-tests-fix.md)); integrado em **#141**.

3. **Validação pós-#141** — [`frontend-suite-post-t3-t4-validation.md`](../tasks/frontend-suite-post-t3-t4-validation.md): **1606/1610**; T1–T6 passaram; **4 falhas F1–F4** no bloco O5 *automatic refresh* do `DashboardPage.test.tsx`. Log guardado em [`_npm-test-output-post-t3t4.txt`](../tasks/_npm-test-output-post-t3t4.txt) (registo histórico, não removido nesta sincronização).

4. **Diagnóstico F1–F4** — [`dashboard-o5-refresh-failures-diagnostic.md`](../tasks/dashboard-o5-refresh-failures-diagnostic.md): falhas sob suite integral, passagens isoladas e ficheiro completo; causa provável mocks, carga inicial e sincronização assíncrona.

5. **Estabilização F1–F4 e suite** — [`dashboard-o5-refresh-tests-stabilization.md`](../tasks/dashboard-o5-refresh-tests-stabilization.md): **1610/1610** em **três** `npm test` integrais; classificação **APROVADO**; integrado em **#142** @ `35856e7`.

6. **Leitura de relatórios antigos** — [`frontend-final-quality-audit.md`](../tasks/frontend-final-quality-audit.md) (HEAD `438de5e`, 13/11) descreve ressalvas O5 **anteriores** ao #142; deve ser lido como snapshot histórico, não como estado corrente.

**Execuções que não representam a última validação documentada:** 1604/1610, 1606/1610 (incluindo o ficheiro `_npm-test-output-post-t3t4.txt`), e qualquer corrida intermédia citada nos relatórios de diagnóstico.

---

## 3. Ressalvas

| Tema | Detalhe |
|------|---------|
| **Bundle JS** | Warning Rollup/Vite: chunk JavaScript **> 500 kB** após build (documentado na estabilização O5; também em [`frontend-final-quality-audit.md`](../tasks/frontend-final-quality-audit.md)) |
| **npm `devdir`** | Aviso de ambiente `Unknown env config "devdir"` nas corridas documentadas — não altera exit codes registados |
| **Flake exploratório (stale)** | Durante desenvolvimento do fix #142, falha intermitente no teste *stale* ou no ficheiro completo **fora** do lote oficial 3×3; **não** reproduzida nas três execuções integrais finais documentadas |

Este documento **não** garante ausência total de problemas em todos os ambientes, nem cobre a suite do `server/` nesta data.

---

## 4. Referências cruzadas

- Índice geral: [`../README.md`](../README.md)
- Auditoria de lacunas documentais: [`../tasks/documentation-sync-audit.md`](../tasks/documentation-sync-audit.md)
- Implementação da sincronização: [`../tasks/documentation-sync-implementation.md`](../tasks/documentation-sync-implementation.md)
- README do repositório: [`../../README.md`](../../README.md)