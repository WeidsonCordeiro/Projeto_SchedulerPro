# GW-3 — Robustez do retry em `withBookingTransaction`

**Data:** 2026-11-09  
**Alternativa implementada:** **A** (auditoria [appointment-booking-write-conflict-audit.md](../audits/appointment-booking-write-conflict-audit.md))  
**Sem operações Git de escrita.**

---

## 1. Contexto do problema

Reservas concorrentes para o mesmo funcionário passam por `touchBookingSerialization()` no documento `User`, gerando `WriteConflict` (código **112**) com label `TransientTransactionError`. O helper `withBookingTransaction` já repetia a transação completa, mas com **4 tentativas imediatas** e **sem backoff**, o que podia esgotar o orçamento no cenário **ACC-03** (dois agendamentos adjacentes no mesmo employee em `Promise.all`).

---

## 2. Estado inicial do Git

| Campo | Valor |
| --- | --- |
| Branch | `feature/dashboard-active-clients-kpi` |
| HEAD | `ea7e6a4` |
| Último commit | `adicionar card de KPI de clientes ativos` |
| Tracking | `origin/feature/dashboard-active-clients-kpi` (up to date) |
| Working tree (pré-implementação) | Limpa + untracked `docs/audits/` |

**Pós-implementação (sem commit):** modificado `appointment-booking-transaction.ts`; novo teste unitário; untracked `docs/tasks/`, `docs/audits/`. **KPI:** HEAD e ficheiros client inalterados.

---

## 3. Plano executado

1. Pré-voo Git — branch e commit KPI confirmados.  
2. Reforço de [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts).  
3. Testes unitários dedicados.  
4. Regressão ACC-01–07 + `npm run build`.  
5. Este relatório.

**Fora de escopo (respeitado):** `touchBookingSerialization`, `has*Conflict`, `AppointmentService`, commits/push.

---

## 4. Ficheiros modificados

| Ficheiro | Alteração |
| --- | --- |
| [`server/src/modules/appointments/services/appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts) | 8 tentativas, full jitter, logging, classificação de erros |
| [`server/tests/unit/appointments/appointment-booking-transaction.test.ts`](../../server/tests/unit/appointments/appointment-booking-transaction.test.ts) | **Novo** — 17 casos (requisitos §6 + auxiliares) |
| [`docs/tasks/gw3-booking-transaction-retry.md`](gw3-booking-transaction-retry.md) | **Novo** — este documento |

---

## 5. Alterações técnicas realizadas

- Constante exportada `BOOKING_TRANSACTION_MAX_ATTEMPTS = **8**` (antes `4` interno).
- `isRetryableBookingTransactionError` exportada: rejeita `AppError`; aceita código **112**, `errorLabels` em array ou `hasErrorLabel`.
- `computeBookingTransactionBackoffMs` — **full jitter**: `floor(random() * min(5 * 2^(failedAttempt-1), 50))`.
- `delayForBookingTransactionRetry` — encapsula `setTimeout` (testável em zero-delay).
- `withBookingTransaction` — inalterada assinatura pública; entre falhas reintentáveis: log + delay + nova sessão; sucesso após reintento e esgotamento com logs `Logger.database` / `Logger.error` (sem PII).

---

## 6. Estratégia de retry e valores adoptados

| Parâmetro | Valor | Justificação |
| --- | --- | --- |
| Tentativas máximas | **8** | ACC-03 com 2 txs paralelas no mesmo `User`; 4 retries imediatos insuficientes sob corrida (auditoria) |
| Base | **5 ms** | Referência do brief |
| Teto | **50 ms** | Referência do brief |
| Jitter | **Full** | Desfasamento uniforme para evitar colisão simétrica |
| Pior caso de espera artificial | ≈ **7 × 50 ms** (~350 ms) | Só em cenários de contenção prolongada |

Fórmula: `delayMs = floor(random() * min(5 * 2^(attempt-1), 50))` onde `attempt` é o número da tentativa **que acabou de falhar**.

---

## 7. Erros transitórios vs definitivos

| Tipo | Comportamento |
| --- | --- |
| Código 112 / labels transitórios | Abort tx, `endSession`, log `willRetry`, **delay**, nova sessão |
| `AppError` (ex. 409) | **Sem** retry, **sem** log de retry |
| Erro genérico | Propagação imediata |
| Transitório após 8.ª tentativa | `Logger.error` com `exhausted: true`, throw |

---

## 8. Testes criados

Ficheiro: `appointment-booking-transaction.test.ts`

Cobre os 10 requisitos do brief:

1. Sucesso à primeira (sem retry).  
2. `TransientTransactionError` — retry da tx completa.  
3. Código 112 — reintentável.  
4. Transitório ×2 + sucesso.  
5. Esgotamento de 8 tentativas.  
6. `AppError` 409 — sem retry.  
7. Erro não transitório — sem retry.  
8. Nova sessão por tentativa + `endSession`.  
9. `abortTransaction` em falha.  
10. Backoff — 7 logs `willRetry` (entre tentativas, não após a 8.ª).

Extras: testes puros de `isRetryableBookingTransactionError` e `computeBookingTransactionBackoffMs`.

---

## 9. Comandos executados e resultados

```bash
cd server
npm run test -- tests/unit/appointments/appointment-booking-transaction.test.ts
npm run test -- tests/integration/appointments/appointment-booking-concurrency.test.ts
npm run build
```

| Comando | Exit | Resultado |
| --- | --- | --- |
| Unit `appointment-booking-transaction.test.ts` | **0** | **17 passed** |
| Integração ACC | **0** | **7 passed** |
| `npm run build` (`tsc`) | **0** | Sem erros |

ACC-03 isolado **não** foi necessário (suite completa verde).

---

## 10. Resultado individual dos testes ACC

| ID | Estado | Garantia mantida |
| --- | --- | --- |
| ACC-01 | Pass | 1 sucesso + 1×409 mesmo slot |
| ACC-02 | Pass | Overlap parcial bloqueado |
| ACC-03 | Pass | Dois adjacentes no mesmo employee |
| ACC-04 | Pass | Reagendamento para slot ocupado → 409 |
| ACC-05 | Pass | Cancel + nova reserva |
| ACC-06 | Pass | Isolamento entre empresas |
| ACC-07 | Pass | Conflito de cliente |

---

## 11. Build

`cd server && npm run build` — exit **0**.

---

## 12. Riscos e limitações

- Latência extra em picos de contenção (até ~350 ms de backoff acumulado no pior caso).
- `company-lifecycle-transaction.ts` mantém 4 tentativas sem backoff — **fora de escopo**.
- Callback transacional pode reexecutar em retry (já assumption GW-3); notificações continuam **após** commit.
- CI pode ainda falhar em condições extremas; monitorizar logs `exhausted: true`.

---

## 13. Contexto para continuidade (outra IA)

- Ponto único de retry de reservas: [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts).
- Serialização: `UserRepository.touchBookingSerialization` / `ClientRepository` — **não alterados**.
- Mocks noutros testes substituem `withBookingTransaction` — não exercitam o retry real.
- Exports para testes: `BOOKING_TRANSACTION_MAX_ATTEMPTS`, `isRetryableBookingTransactionError`, `isUnknownTransactionCommitResultError`, `computeBookingTransactionBackoffMs`, `delayForBookingTransactionRetry`.
- Secção **15:** commit retry isolado para `UnknownTransactionCommitResult`.

---

## 14. Passos manuais pendentes (utilizador)

1. Revisar diff e relatório.  
2. Commit na branch actual (incluir server + `docs/tasks/`; decidir se inclui `docs/audits/`).  
3. Push e validar CI (ACC + suite server).  
4. Merge manual em `develop` quando aprovado.  
5. Opcional: alinhar `company-lifecycle-transaction` com a mesma política de retry.

---

## Confirmações

- **KPI:** commit `ea7e6a4` intacto; sem alterações em `client/`.
- **Git write:** nenhum commit, push ou troca de branch.
- **GW-3:** `touchBookingSerialization` e conflitos de disponibilidade inalterados.

---

## 15. Correção do retry de commit (`UnknownTransactionCommitResult`)

**Pedido:** 2026-11-10  
**Revisão pré-commit:** [gw3-booking-transaction-retry-diff-review.md](./gw3-booking-transaction-retry-diff-review.md) — ressalva **média** na secção C.  
**Estado de implementação desta secção:** **implementado** (2026-11-10).

### 15.1 Problema

Na versão das secções 5–14, `UnknownTransactionCommitResult` estava no mesmo conjunto que `TransientTransactionError` para `isRetryableBookingTransactionError()`. Uma falha em `commitTransaction()` podia **reexecutar o callback** e abrir nova sessão, embora o commit já pudesse ter sido aplicado no servidor.

### 15.2 Estratégia corrigida

| Fase do erro | Política |
| --- | --- |
| **Callback** (`operation(session)`) | `TransientTransactionError`, código **112** → abort, backoff, **nova sessão**, callback de novo (máx. 8). `AppError` / genérico → sem retry. |
| **Commit** (`commitTransaction()`) | `UnknownTransactionCommitResult` **apenas** → repetir **só** `commitTransaction()` na **mesma** sessão/transação (máx. 8, backoff/full jitter, logs `retryScope: "commit"`). **Não** voltar a chamar o callback. |
| **Commit** com `TransientTransactionError` (sem ser só unknown) | Abort + retry da **transação completa** (comportamento Mongo para tx inválida). |

**Classificação:**

- Exportar `isUnknownTransactionCommitResultError(error)`.
- `isRetryableBookingTransactionError(error)` deve retornar **false** quando o erro é só unknown commit (tratado na fase de commit).
- Extrair `commitWithUnknownResultRetries(session, transactionAttempt)` — loop interno só de commit.

**Sessões:**

- `tryAbortTransaction` / `endBookingSession` — `endSession` com try/catch e log; não mascarar o erro principal do fluxo.
- `finally { await endBookingSession(session); }` em cada tentativa de transação externa.

### 15.3 Ficheiros alterados (execução 2026-11-10)

1. [`appointment-booking-transaction.ts`](../../server/src/modules/appointments/services/appointment-booking-transaction.ts) — `commitWithUnknownResultRetries`, `isUnknownTransactionCommitResultError`, fases callback vs commit.
2. [`appointment-booking-transaction.test.ts`](../../server/tests/unit/appointments/appointment-booking-transaction.test.ts) — 18 testes (9 cenários obrigatórios + classificação).
3. Esta secção atualizada com resultados abaixo.

### 15.4 Testes obrigatórios (critério de aceite)

| # | Assert principal |
| --- | --- |
| 1 | Sucesso: 1× callback, 1× commit |
| 2 | Unknown commit → sucesso: **1×** callback, commit **>1** na **mesma** sessão, **1×** `startSession` |
| 3 | Unknown commit esgotado: **1×** callback, commit = MAX, erro propagado |
| 4 | Transient no callback: 2× callback, 2× sessão |
| 5 | 112 no callback: idem política tx completa |
| 6–7 | AppError / genérico: 1× tentativa |
| 8 | `abortTransaction` falha: erro original preservado |
| 9 | `endSession` falha: log; erro principal não substituído |

### 15.5 Validação pós-implementação

```bash
cd server
npm run test -- tests/unit/appointments/appointment-booking-transaction.test.ts
npm run test -- tests/integration/appointments/appointment-booking-concurrency.test.ts
npm run build
```

### 15.6 Decisão sobre labels múltiplos

Na **fase de commit**, se o erro tiver `UnknownTransactionCommitResult`, aplicar **só** retry de commit (não reiniciar operação), alinhado ao prompt §4.C.

### 15.7 Validação registada (2026-11-10)

| Comando | Exit | Resultado |
| --- | --- | --- |
| `npm run test -- tests/unit/appointments/appointment-booking-transaction.test.ts` | 0 | **18/18** passed |
| `npm run test -- tests/integration/appointments/appointment-booking-concurrency.test.ts` | 0 | **7/7** ACC passed |
| `npm run build` | 0 | `tsc` OK |

**Prova principal (cenário 2):** com `UnknownTransactionCommitResult` no commit, o callback executa **1×**, `commitTransaction` **2×** na **mesma** sessão, `startSession` **1×**.

**Git pós-implementação (sem commit):** branch `feature/dashboard-active-clients-kpi` @ `ea7e6a4`; `M` `appointment-booking-transaction.ts`; `??` teste unitário + `docs/`.
