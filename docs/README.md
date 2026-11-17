# Documentação SchedulerPro

Índice orientado à navegação. O repositório contém dezenas de relatórios em `docs/` (~188 ficheiros entre `.md` e um log histórico em `tasks/`); este ficheiro aponta para os **documentos canónicos** por tema, sem listar tudo.

---

## Categorias

| Pasta | Finalidade |
|-------|------------|
| [`tasks/`](tasks/) | Relatórios de **tarefas** e validações (flakes, correções de testes, sync documental, roadmap completo). Metadados Git e resultados de corridas **na data da tarefa**. |
| [`audits/`](audits/) | **Entradas curtas** (stubs) e auditorias por área; muitos stubs redireccionam para o relatório completo em `tasks/` ou `reports/`. |
| [`reports/`](reports/) | Relatórios de **produto e implementação** por feature (dashboard O1/O2/O5, timezone picker, estágios nomeados `schedulerpro-*`, etc.). |

### Política de leitura

- Relatórios históricos **não foram reescritos** na sincronização documental de 2026-11-16.
- Para o **estado actual da suite frontend** em `develop`, use primeiro: [`reports/frontend-quality-status-2026-11-16.md`](reports/frontend-quality-status-2026-11-16.md).
- Contagens como **1604/1610** ou **1606/1610** são execuções anteriores; a última validação documentada em integração é **1610/1610** (ver qualidade e [`tasks/dashboard-o5-refresh-tests-stabilization.md`](tasks/dashboard-o5-refresh-tests-stabilization.md)).

---

## Roadmap e visão geral

| Documento | Notas |
|-----------|--------|
| [`tasks/ROADMAP_AUDIT_2026-11-11.md`](tasks/ROADMAP_AUDIT_2026-11-11.md) | Auditoria completa O1–O7, E1–E4.1, Company (HEAD snapshot `527a623` — histórico) |
| [`audits/ROADMAP_AUDIT_2026-11-11.md`](audits/ROADMAP_AUDIT_2026-11-11.md) | **Stub** → relatório em `tasks/` |
| [`audits/roadmap-audit-post-o6.md`](audits/roadmap-audit-post-o6.md) | Pós-O6 |

---

## Dashboard (O1, O2, O5)

| Documento | Notas |
|-----------|--------|
| [`reports/schedulerpro-dashboard-o1-active-clients.md`](reports/schedulerpro-dashboard-o1-active-clients.md) | KPI clientes ativos |
| [`reports/schedulerpro-dashboard-o2-status-distribution.md`](reports/schedulerpro-dashboard-o2-status-distribution.md) | Distribuição por estado |
| [`reports/schedulerpro-dashboard-o5-refresh.md`](reports/schedulerpro-dashboard-o5-refresh.md) | Refresh por visibilidade (45 s) |
| [`audits/dashboard-o5-refresh-audit.md`](audits/dashboard-o5-refresh-audit.md) | Auditoria O5 |
| [`audits/dashboard-o2-status-distribution-audit.md`](audits/dashboard-o2-status-distribution-audit.md) | Auditoria O2 |

**Testes / qualidade (tasks):** [`tasks/dashboard-o5-stale-response-fix.md`](tasks/dashboard-o5-stale-response-fix.md) (PR #139), [`tasks/dashboard-o5-refresh-failures-diagnostic.md`](tasks/dashboard-o5-refresh-failures-diagnostic.md), [`tasks/dashboard-o5-refresh-tests-stabilization.md`](tasks/dashboard-o5-refresh-tests-stabilization.md) (PR #142).

---

## Agendamentos — visibilidade e escrita (O6, O7)

| Documento | Notas |
|-----------|--------|
| [`tasks/o6-appointment-visibility-by-role.md`](tasks/o6-appointment-visibility-by-role.md) | O6 |
| [`tasks/o7-appointment-write-scope-by-role.md`](tasks/o7-appointment-write-scope-by-role.md) | O7 |
| [`audits/appointment-visibility-by-role-audit.md`](audits/appointment-visibility-by-role-audit.md) | Auditoria O6 |
| [`audits/o7-appointment-write-scope-audit.md`](audits/o7-appointment-write-scope-audit.md) | Auditoria O7 |
| [`audits/appointment-booking-write-conflict-audit.md`](audits/appointment-booking-write-conflict-audit.md) | Conflitos de escrita |

---

## Appointment expiration (E1–E4.1)

| Documento | Notas |
|-----------|--------|
| [`tasks/appointment-expiration-documentation-sync.md`](tasks/appointment-expiration-documentation-sync.md) | Sync documental |
| [`tasks/appointment-expiration-documentation-validation.md`](tasks/appointment-expiration-documentation-validation.md) | Validação |
| [`audits/appointment-expiration-audit.md`](audits/appointment-expiration-audit.md) | Auditoria |
| [`audits/appointment-expiration-e4-approval-audit.md`](audits/appointment-expiration-e4-approval-audit.md) | E4 |

**Stub em `audits/`:** [`audits/ROADMAP_AUDIT_2026-11-11.md`](audits/ROADMAP_AUDIT_2026-11-11.md) liga também a sync / validação / cleanup em `tasks/`.

---

## Company Management

| Documento | Notas |
|-----------|--------|
| [`tasks/company-management-e1-api-permissions.md`](tasks/company-management-e1-api-permissions.md) | E1 API |
| [`tasks/company-management-e2-soft-delete-ui.md`](tasks/company-management-e2-soft-delete-ui.md) | E2 UI soft delete |
| [`audits/company-management-backend-audit.md`](audits/company-management-backend-audit.md) | Backend |
| [`audits/company-management-frontend-audit.md`](audits/company-management-frontend-audit.md) | Frontend |

---

## Timezone

Série de implementação e validação (exemplo de entrada):

| Documento | Notas |
|-----------|--------|
| [`reports/schedulerpro-timezone-picker-step-6-4b-audit.md`](reports/schedulerpro-timezone-picker-step-6-4b-audit.md) | Auditoria |
| [`reports/schedulerpro-timezone-picker-step-6-4b-6-final-validation.md`](reports/schedulerpro-timezone-picker-step-6-4b-6-final-validation.md) | Validação final |

Outros passos: `reports/schedulerpro-timezone-picker-step-6-4b-*`.

---

## Qualidade frontend

| Documento | Notas |
|-----------|--------|
| [`reports/frontend-quality-status-2026-11-16.md`](reports/frontend-quality-status-2026-11-16.md) | **Referência actual** (integração PR #139–#142) |
| [`tasks/frontend-final-quality-audit.md`](tasks/frontend-final-quality-audit.md) | Auditoria 13/11 (HEAD histórico) |
| [`tasks/frontend-suite-flakes-diagnostic.md`](tasks/frontend-suite-flakes-diagnostic.md) | Diagnóstico T1–T6 |
| [`tasks/appointments-listview-date-tests-fix.md`](tasks/appointments-listview-date-tests-fix.md) | PR #141 — T3/T4 |
| [`tasks/frontend-suite-post-t3-t4-validation.md`](tasks/frontend-suite-post-t3-t4-validation.md) | Suite pós-#141 (1606/1610) |
| [`tasks/frontend-dashboard-companyform-test-stabilization.md`](tasks/frontend-dashboard-companyform-test-stabilization.md) | Estabilização anterior (1610/1610 nessa corrida) |

**Registo histórico de execução:** [`tasks/_npm-test-output-post-t3t4.txt`](tasks/_npm-test-output-post-t3t4.txt) — log com **1606/1610**; não é a última validação documentada.

---

## Auditorias técnicas (`audits/`)

Lista completa de stubs e auditorias: ficheiros em [`audits/`](audits/). Destaques além dos já citados: appointment expiration, company, dashboard O2/O5, booking write conflict.

---

## Sincronização documental (nov 2026)

| Documento | Notas |
|-----------|--------|
| [`tasks/documentation-sync-audit.md`](tasks/documentation-sync-audit.md) | Auditoria read-only pré-implementação (pode estar untracked até commit) |
| [`tasks/documentation-sync-implementation.md`](tasks/documentation-sync-implementation.md) | Relatório da TASK 1 (este ciclo) |

---

## Raiz do repositório

- [`../README.md`](../README.md) — instalação, comandos e ligações para aqui.