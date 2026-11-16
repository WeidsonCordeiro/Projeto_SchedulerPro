# Appointment Expiration — Sincronização documental pós-E4/E4.1

**Data:** 11/11/2026  
**Tipo:** Apenas documentação (sem código, testes, config ou dependências).  
**Branch:** `develop` @ `438de5ec3a457b5635d6443d53557a8d95627c40` (início e fim; working tree com alterações só em `docs/`).

**Git write:** não executado.

**Validação final (read-only):** [appointment-expiration-documentation-validation.md](appointment-expiration-documentation-validation.md)  
**Limpeza documental:** [appointment-expiration-documentation-cleanup.md](appointment-expiration-documentation-cleanup.md)

---

## 1. Objetivo

Alinhar a documentação de Appointment Expiration com a arquitectura integrada em `develop` após E1, E2, E2.1, E3, E4 e E4.1, preservando o valor histórico das auditorias iniciais e eliminando interpretações erradas (ex.: expiração no `GET` como comportamento actual).

---

## 2. Contexto técnico pós-E4/E4.1

| Regra | Documentação |
|-------|----------------|
| Fluxo | `server.ts` → `AppointmentExpirationScheduler` → `AppointmentExpirationService` → `AppointmentRepository.cancelOverdueScheduled()` |
| `GET /api/appointments` | Somente leitura — sem expiração (E4) |
| Critérios | `scheduled`, `startAt < now` → `cancelled`; empresas `isActive` + `deletedAt: null` |
| Falhas | Por empresa, não bloqueia o lote |
| Shutdown | E2.1 — `stop()` aguarda execução |
| Multi-instância | Sem lock distribuído (limitação explícita) |
| Visibilidade | `scheduled` vencido pode aparecer até tick do scheduler |
| `updatedAt` | Esperado pelo Mongoose `timestamps: true`; repositório não faz `$set` explícito — E3 não asserta este campo |

**Canónico roadmap:** [stub](../audits/ROADMAP_AUDIT_2026-11-11.md) → [relatório](../tasks/ROADMAP_AUDIT_2026-11-11.md).

**Testes de referência:** `appointment-expiration-full-cycle.mongo.test.ts`, `find-all-no-expiration.mongo.test.ts`, `cancel-overdue-scheduled.mongo.test.ts`.

---

## 3. Documentos analisados

1. `docs/audits/appointment-expiration-audit.md`
2. `docs/audits/roadmap-audit-post-o6.md`
3. `docs/audits/appointment-expiration-e4-approval-audit.md`
4. `docs/tasks/appointment-expiration-e1-multi-company-service.md`
5. `docs/tasks/appointment-expiration-e2-scheduler.md`
6. `docs/tasks/appointment-expiration-e2-1-shutdown-hardening.md` (sem alteração — já coerente)
7. `docs/tasks/appointment-expiration-e3-mongodb-integration-tests.md`
8. `docs/tasks/appointment-expiration-e4-remove-get-side-effect.md` (sem alteração de corpo)
9. `docs/tasks/appointment-expiration-e4-1-full-integration-test.md` (sem alteração de corpo)
10. `docs/tasks/ROADMAP_AUDIT_2026-11-11.md`

---

## 4. Documentos alterados ou criados

| Ficheiro | Acção |
|----------|--------|
| `docs/audits/appointment-expiration-audit.md` | Secção **Estado actual** + registo histórico |
| `docs/audits/roadmap-audit-post-o6.md` | Banner, resumo, O6 expiração, §4.D, riscos, roadmap P1–P2 |
| `docs/audits/appointment-expiration-e4-approval-audit.md` | Secção pós-E4.1; link E4.1 |
| `docs/tasks/appointment-expiration-e1-multi-company-service.md` | Nota histórica findAll |
| `docs/tasks/appointment-expiration-e2-scheduler.md` | Nota pós-E4 |
| `docs/tasks/appointment-expiration-e3-mongodb-integration-tests.md` | Limitações/handoff E4 |
| `docs/tasks/ROADMAP_AUDIT_2026-11-11.md` | Link para stub canónico |
| `docs/audits/ROADMAP_AUDIT_2026-11-11.md` | **Novo** stub |
| `docs/tasks/appointment-expiration-documentation-sync.md` | **Novo** (este ficheiro) |

---

## 5. Resumo das alterações

- **Auditoria inicial:** topo com estado pós-E4.1; corpo pré-E4 preservado; veredicto etiquetado; handoff §13 marcado como plano realizado.
- **Roadmap pós-O6:** expiração actualizada para E1–E4.1 concluídas; linhas obsoletas em O6 tabela marcadas `OBSOLETO (pré-E4)`.
- **Aprovação E4:** parecer histórico mantido; E4.1 endereça lacuna L1 sem reescrever §6.
- **Tasks:** notas de contexto histórico em E1/E2/E3 sem alterar resultados de execução.

---

## 6. Validações documentais executadas

| Verificação | Resultado |
|-------------|-----------|
| `rg` em `docs/audits/*appointment*` e `docs/tasks/*appointment-expiration*` | Afirmações de GET como **estado actual** só em secções históricas ou em tasks E4 (descrição do «antes») |
| `git diff --name-only` | Apenas ficheiros sob `docs/` |
| Links relativos nos ficheiros editados | Revisão manual (`../tasks/`, `../../server/`, stub ROADMAP) |
| Build / testes | **Não executados** (escopo exclusivamente documental) |

**Contradições residuais (fora de escopo desta tarefa):**

- `docs/audits/appointment-visibility-by-role-audit.md` — descreve expiração em `findAll` (pré-O6/evolução).
- Vários `docs/reports/*` com menções antigas a `expireOverdueScheduled` em listagem.

---

## 7. Ficheiros intencionalmente inalterados

- `server/**`, `client/**`, configs, testes.
- `appointment-expiration-e2-1-shutdown-hardening.md`, `appointment-expiration-e4-remove-get-side-effect.md`, `appointment-expiration-e4-1-full-integration-test.md` (corpo de execução).
- Plan file em `.cursor/plans/`.

---

## 8. Limitações

- Não foi feita passagem completa por todos os `docs/reports/`.
- HEAD na documentação de tarefas antigas (E1–E3) mantém SHAs históricos de quando foram escritas.
- Client não validado nesta tarefa.

---

## 9. Handoff para outra IA

1. Ler **Estado actual** em [`appointment-expiration-audit.md`](../audits/appointment-expiration-audit.md).
2. Roadmap geral: [`ROADMAP_AUDIT_2026-11-11.md`](../audits/ROADMAP_AUDIT_2026-11-11.md).
3. Sequência de entregas: E1 → E4.1 em `docs/tasks/appointment-expiration-e*.md`.
4. Não reimplementar expiração no GET.
5. Opcional seguinte: UX `scheduled` vencido ou limpeza `expireOverdueScheduled` órfão (código — fora desta tarefa).
