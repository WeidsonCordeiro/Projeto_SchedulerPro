# GW-3 — Verificação pontual: divergência Unknown commit vs revisão final

**Data:** 2026-11-10  
**Modo:** Somente leitura (nenhuma alteração de código nem operações Git de escrita).  
**Branch:** `feature/dashboard-active-clients-kpi` @ `ea7e6a4`  
**Relacionado:** [gw3-booking-transaction-retry.md](./gw3-booking-transaction-retry.md) (§15), [gw3-booking-transaction-retry-diff-review.md](./gw3-booking-transaction-retry-diff-review.md) (pré-§15)

---

## Resumo

Foi comparada a implementação actual de `withBookingTransaction` com o relatório de **revisão final do diff** e com o relatório de **implementação (§15)**. Conclusão: o código actual **separa** retry de commit unknown do retry da transação completa; o `gw3-booking-transaction-retry-diff-review.md` descreve o estado **anterior** à correção §15, não o código presente no working tree.

**Veredicto:** **CONFIRMADO** — separação implementada e testada para o cenário central (`UnknownTransactionCommitResult` no commit).

---

## A. Estado Git (momento da verificação)

| Campo | Valor |
| --- | --- |
| Branch | `feature/dashboard-active-clients-kpi` |
| HEAD | `ea7e6a4` — *adicionar card de KPI de clientes ativos* |
| Tracking | Up to date com `origin/feature/dashboard-active-clients-kpi` |
| Staged | Nenhum |
| Modificado (unstaged) | `server/src/modules/appointments/services/appointment-booking-transaction.ts` |
| Untracked | `docs/audits/`, `docs/tasks/`, `server/tests/unit/appointments/appointment-booking-transaction.test.ts` |

---

## B. Resultado da verificação (código actual)

Ficheiro: [`server/src/modules/appointments/services/appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts)

| # | Pergunta | Resposta | Linhas (aprox.) |
| --- | --- | --- | --- |
| 1 | `commitWithUnknownResultRetries` existe? | Sim | 213–248 |
| 2 | `isUnknownTransactionCommitResultError` existe? | Sim (exportada) | 61–67 |
| 3 | `isRetryableBookingTransactionError` exclui Unknown? | Sim | 82–84 |
| 4 | Callback separado da fase de commit? | Sim | 266–267 vs 293–294 |
| 5 | Unknown no commit → só repetir commit? | Sim | 217–247 |
| 6 | Mesma sessão nas tentativas de commit? | Sim | parâmetro `session` fixo; sem novo `startSession` no loop |
| 7 | Callback 1× no cenário unknown? | Sim (por desenho) | operation só antes do commit; unknown exhausted 298–299 sem retry externo |
| 8 | Transient no callback → nova sessão + tx completa? | Sim | 268–280, novo `startSession` 260 |
| 9 | Transient no commit (não Unknown)? | Retry da transação completa | 226–227 propaga; 302–312 abort + continue |
| 10 | Limite conta 1.ª tentativa de commit? | Sim | `commitAttempt` de 1 a 8; cada loop chama `commitTransaction()` |

**Unknown esgotado:** `throw commitError` em 298–299 **sem** `tryAbortTransaction` — não reinicia operação após esgotar retries de commit.

---

## C. Divergência encontrada

### C.1 O que cada documento diz

| Documento | Afirmação relevante | Código actual? |
| --- | --- | --- |
| [gw3-booking-transaction-retry.md](./gw3-booking-transaction-retry.md) **§15** | `commitWithUnknownResultRetries`; unknown só no commit; prova 1× callback / 2× commit | **Sim** |
| [gw3-booking-transaction-retry-diff-review.md](./gw3-booking-transaction-retry-diff-review.md) | Unknown reintentável no wrapper; commit no mesmo `catch`; risco de repetir operação; sem teste de falha de commit | **Não** — descreve versão **pré-§15** |
| [appointment-booking-write-conflict-audit.md](../audits/appointment-booking-write-conflict-audit.md) | WriteConflict / serialização GW-3 | Neutro (não cobre Unknown commit) |

### C.2 Explicação

A incompatibilidade entre «implementação reportada (§15)» e «revisão final (diff-review)» **não** indica código em falta nem regressão. Indica **cronologia**:

1. **Revisão diff-review (09–10/11):** auditoria do helper com 8 tentativas + jitter, ainda com `UnknownTransactionCommitResult` tratado como reintentável para **transação completa** (via `TRANSIENT_LABELS` / `catch` único na versão então revista).
2. **Correção §15 (10/11):** refatoração em fases (callback vs `commitWithUnknownResultRetries`) no ficheiro actual (unstaged).
3. **Diff-review não foi actualizado** após §15 — continua válido como histórico da **primeira** entrega, não da **correção de commit**.

### C.3 Qual relatório corresponde ao código

O código no working tree corresponde a **gw3-booking-transaction-retry.md §15** e contradiz as secções C / problemas médios de **gw3-booking-transaction-retry-diff-review.md** relativamente a Unknown commit (essas secções estão **desactualizadas**).

---

## D. Testes

Ficheiro: [`server/tests/unit/appointments/appointment-booking-transaction.test.ts`](../../server/tests/unit/appointments/appointment-booking-transaction.test.ts)

| Verificação | Via `withBookingTransaction`? | Onde |
| --- | --- | --- |
| Unknown commit → sucesso | **Sim** | «retries commit only…» — operation 1×, commit 2×, startSession 1× |
| Unknown commit esgotado | **Sim** | operation 1×, commit ×8, log `exhausted` + `retryScope: commit` |
| Transient / 112 no callback | **Sim** | 2× operation, 2× startSession |
| Classificação Unknown vs retryable | Auxiliar (funções puras) | `describe isUnknown…` / `isRetryable…` |
| Transient **só** na fase de commit | **Não** | Lacuna |
| Identidade explícita do objeto sessão | **Parcial** | Um `sessions[0]` com 2× commit; sem assert de `toHaveLength(1)` |
| `abortTransaction` = 0 no unknown→sucesso | **Não assertado** | Comportamento inferido do código |

Os testes **não** se limitam à contagem (18): os cenários 2 e 3 exercitam o fluxo real de commit unknown sem reexecutar callback.

**Nota:** Esta verificação foi feita por **inspeção** de código e testes; não reexecutou `npm test` nesta tarefa (resultados anteriores: 18/18 unit, 7/7 ACC, build OK).

---

## E. Conclusão (opção única)

**CONFIRMADO:** a separação entre retry da transação e retry do commit para `UnknownTransactionCommitResult` está **implementada** no código actual e **comprovada** por testes unitários nos cenários unknown→sucesso e unknown→esgotamento.

**Não aplicável:** **NÃO IMPLEMENTADO** (o commit unknown **não** força repetição do callback no código inspecionado).

**Ressalva (não altera o veredicto central):** cobertura **PARCIAL** em casos opcionais (transient no commit, labels múltiplos, assert de `abort` no sucesso após unknown).

---

## F. Próximo passo recomendado

1. **Avançar para commit** incluindo: `appointment-booking-transaction.ts`, `appointment-booking-transaction.test.ts`, documentação em `docs/tasks/` (e `docs/audits/` se desejado).
2. **Não bloquear** o commit por causa da divergência documental — actualizar ou anotar em **diff-review** que a revisão §C refere estado **pré-§15** (opcional, sem alterar código GW-3).
3. **Melhorias opcionais pós-commit:** teste de `TransientTransactionError` na fase de commit; teste de labels `Unknown` + `Transient` no commit.

---

## Ficheiros analisados

| Caminho | Papel |
| --- | --- |
| `server/src/modules/appointments/services/appointment-booking-transaction.ts` | Implementação |
| `server/tests/unit/appointments/appointment-booking-transaction.test.ts` | Testes |
| `docs/tasks/gw3-booking-transaction-retry.md` | Implementação + §15 |
| `docs/tasks/gw3-booking-transaction-retry-diff-review.md` | Revisão pré-§15 |
| `docs/audits/appointment-booking-write-conflict-audit.md` | Auditoria WriteConflict (contexto) |

---

## Declaração

Relatório criado por pedido de verificação pontual. Nenhum ficheiro de código ou Git foi modificado durante a auditoria que originou este documento; **este** ficheiro Markdown foi adicionado como entregável da tarefa «criar relatório novo».
