# GW-3 — Investigação ACC-04 (reagendamento para slot ocupado)

**Data:** 29/10/2026  
**Branch:** `fix/gw-3-double-booking` (sem commit/push)  
**Ficheiro de teste:** [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts)

---

## 1. Sintoma

ACC-04 falhava com:

`AppError: O funcionário já possui um agendamento neste horário.`

Stack Vitest apontava `AppointmentService.schedule` → `AppointmentService.create` na **linha ~354** do teste, **não** em `update` nem `updatePublicByToken`.

ACC-01, ACC-02, ACC-03, ACC-05, ACC-06 e ACC-07 passavam.

---

## 2. Causa raiz

**Erro na preparação do cenário de teste**, não defeito no protocolo transaccional de reagendamento.

| Passo | Acção                                                       | Problema                                                                                    |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | `create` ocupado (10:00)                                    | OK                                                                                          |
| 2     | `create` `movable` em `freeStart` (14:00)                   | OK                                                                                          |
| 3     | `update(movable)` → 10:00                                   | Esperado 409 — comportamento correcto                                                       |
| 4     | **`create` `movablePublic` de novo em `freeStart` (14:00)** | **Conflito legítimo** com o passo 2 (mesmo `companyId`, `employeeId`, intervalo sobreposto) |

O passo 4 invocava o fluxo de **criação** (`schedule`), que aplica `hasEmployeeConflict` **sem** `excludeAppointmentId`. O sistema rejeitou correctamente a segunda marcação activa no mesmo slot antes de se testar o reagendamento público.

[`persistReschedule`](../../server/src/modules/appointments/services/AppointmentService.ts) já exclui o próprio agendamento nos conflitos (`input.appointmentId` como `excludeAppointmentId`) — adequado para admin e link público. **Nenhuma alteração de produção foi necessária.**

---

## 3. Correção

Apenas no teste ACC-04:

- `freeStartAdmin` = `2028-06-15T14:00:00.000Z` — agendamento administrativo `movable`
- `freeStartPublic` = `2028-06-15T16:00:00.000Z` — agendamento preparado para fluxo público
- Contagem MongoDB `countOverlappingEmployee` **=== 1** no slot ocupado **após** rejeição admin **e** após rejeição pública (validação de persistência, não só HTTP 409)

Regras de negócio e asserções de conflito **inalteradas**.

---

## 4. Resultados de validação (29/10/2026)

Ambiente: MongoMemoryReplSet operacional (Windows com VC++ instalado).

| Comando                                                                 | Exit  | Resultado                                            |
| ----------------------------------------------------------------------- | ----- | ---------------------------------------------------- |
| `npm run test -- …/appointment-booking-concurrency.test.ts -t "ACC-04"` | **0** | 1 passed                                             |
| `npm run test -- …/appointment-booking-concurrency.test.ts`             | **0** | **7 passed** (ACC-01–07)                             |
| `npm run test` (server)                                                 | **0** | **1239 passed** em **82 ficheiros**, 0 failed (~99s) |
| `npm run build`                                                         | **0** | `tsc` OK                                             |

Timeout intermitente `object-id.routes.test.ts` (GW-1.2.1): **não observado** nesta execução.

---

## 5. Ficheiros alterados nesta tarefa

- `server/tests/integration/appointments/appointment-booking-concurrency.test.ts` — ACC-04 (slots distintos + assert intermédio MongoDB)

---

## 6. Pendências

Lista operacional **completa** (única fonte de verdade): [`schedulerpro-gw-3-double-booking.md`](schedulerpro-gw-3-double-booking.md) sec. **15.3**.

- **Transacções Atlas (30/10):** evidências em [`schedulerpro-gw-3-atlas-transaction-validation.md`](schedulerpro-gw-3-atlas-transaction-validation.md); resumo sec. **17** do relatório GW-3.
- **Investigação ACC-04:** secções **1–5** deste ficheiro; fecho formal GW-3 sec. **15**, **16**, **17**, **18** do relatório principal.

---

## 7. Revisão pré-commit documental (29/10/2026)

- **Preservado:** secções **1–5** (sintoma, causa raiz, correcção do teste, validação de 29/10).
- **Actualizado:** tabela sec. **4** (82 ficheiros na suite server).
- **Não reexecutados** nesta revisão: testes ACC, suite completa, `git commit` / merge / push.
- **Riscos residuais:** sec. **9** do relatório GW-3.

---

## 8. Revisão de consistência documental (30/10/2026)

- Sec. **6** simplificada — pendências remissivas a **15.3** (GW-3).
- Referências cruzadas a sec. **15**, **16**, **17**, **18** do relatório principal verificadas.
- Evidências técnicas ACC-04 (sec. **1–5**) e resultados 29/10: **inalterados**.
- **Não** commit / merge / push nesta revisão.
