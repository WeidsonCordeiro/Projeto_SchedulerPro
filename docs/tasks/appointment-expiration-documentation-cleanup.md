# Appointment Expiration — Limpeza documental pós-E4.1

**Data:** 11/11/2026  
**Tipo:** Apenas documentação (`docs/`).  
**Relacionado:** [sync](appointment-expiration-documentation-sync.md) · [validação](appointment-expiration-documentation-validation.md)

**Git write:** não executado.

---

## 1. Objetivo

Eliminar ambiguidades identificadas na [validação final](appointment-expiration-documentation-validation.md) (ROADMAP L111, O6 §7.1, relatórios antigos, precisão `updatedAt`), **sem** reescrever auditorias como pós-E4.1 nem alterar código/testes.

---

## 2. Estado Git

### Inicial (início da tarefa)

| Campo | Valor |
|-------|--------|
| Branch | `develop` |
| HEAD | `438de5ec3a457b5635d6443d53557a8d95627c40` |
| Modified | 7 ficheiros (pacote sync anterior) |
| Untracked | `ROADMAP` stub, sync, validation |

### Final (fim da limpeza)

| Campo | Valor |
|-------|--------|
| Branch | `develop` |
| HEAD | `438de5ec3a457b5635d6443d53557a8d95627c40` (inalterado) |
| Diff tracked | 13 ficheiros sob `docs/` |
| Untracked | stub ROADMAP, sync, validation, **cleanup** (este ficheiro) |

**Fora de `docs/`:** nenhum ficheiro alterado.

---

## 3. Ficheiros analisados

| Área | Ficheiros |
|------|-----------|
| Roadmap | `docs/tasks/ROADMAP_AUDIT_2026-11-11.md` |
| O6 | `docs/audits/appointment-visibility-by-role-audit.md` |
| Relatórios | `schedulerpro-dashboard-technical-audit.md`, `schedulerpro-global-technical-audit.md`, `schedulerpro-phase-h-final-consolidation.md`, `STAGE_33_*`, `STAGE_34_1_*` |
| Expiration / sync | `appointment-expiration-audit.md`, `appointment-expiration-documentation-sync.md` |
| Ligações | `ROADMAP` stub, `appointment-expiration-documentation-validation.md` |

**Não alterados (já coerentes):** `schedulerpro-dashboard-v1-implementation.md`, `schedulerpro-dashboard-v1-code-review.md`.

---

## 4. Ficheiros alterados nesta tarefa

| Ficheiro | Alteração |
|----------|-----------|
| `docs/tasks/ROADMAP_AUDIT_2026-11-11.md` | L111 resolvido; P-DOC-01 mitigado; P1 concluído; §12 item 1 |
| `docs/audits/appointment-visibility-by-role-audit.md` | Banner pré-E4.1; §7.1; nota tabela GET; teste 15; §13 |
| `docs/reports/schedulerpro-dashboard-technical-audit.md` | Nota contexto pós-E4.1 |
| `docs/reports/schedulerpro-global-technical-audit.md` | Idem |
| `docs/reports/schedulerpro-phase-h-final-consolidation.md` | Idem |
| `docs/reports/STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md` | Linha no blockquote natureza |
| `docs/reports/STAGE_34_1_FORECAST_VALUE_DIAGNOSTIC.md` | Linha no blockquote natureza |
| `docs/audits/appointment-expiration-audit.md` | Linha `updatedAt` no Estado actual |
| `docs/tasks/appointment-expiration-documentation-sync.md` | `updatedAt` + link cleanup |
| `docs/tasks/appointment-expiration-documentation-validation.md` | Handoff → cleanup |
| `docs/audits/ROADMAP_AUDIT_2026-11-11.md` | Link cleanup |
| `docs/tasks/appointment-expiration-documentation-cleanup.md` | **Novo** (este ficheiro) |

**Preservados:** todo o conteúdo anterior do pacote sync (Estado actual, banners post-o6, tasks E1–E3) — apenas edições aditivas ou cirúrgicas.

---

## 5. Resumo das correções

### 5.1 ROADMAP

- Lacuna §4 L111 (post-o6 / `findAll`) marcada **resolvida** com links sync/validation/cleanup.
- `P-DOC-01` → mitigado com ponte para expiration audit Estado actual.
- Roadmap P1 sync e recomendação §12.1 reflectem trabalho já realizado.

### 5.2 O6 visibilidade

- Documento identificado como análise histórica pré-E4/E4.1.
- §7.1 etiquetada pré-E4; motor actual scheduler + link E4.
- GET `/` clarificado como read-only pós-E4; critérios RBAC O6 inalterados.
- Teste 15 recontextualizado; §13 AppointmentService anotado.

### 5.3 Relatórios antigos

- Notas curtas apontando para [appointment-expiration-audit.md](../audits/appointment-expiration-audit.md); corpo histórico intacto.

### 5.4 `updatedAt`

- Estado actual: distingue **esperado** (Mongoose) vs **comprovado** (E3 não asserta).
- Sync alinhado; corpo histórico da expiration audit (§ lacunas `updateMany`) não reescrito.

---

## 6. Validação documental

| Verificação | Resultado |
|-------------|-----------|
| `git diff --name-only` | Apenas `docs/**` |
| `rg` findAll/expiração | Menções actuais só com rótulo histórico, E4 «antes», ou notas pós-E4.1 nos reports |
| Links `../audits/appointment-expiration-audit.md` | Coerentes a partir de `docs/reports/` |
| Testes / build | **Não executados** |

---

## 7. Histórico preservado

- Corpo completo das auditorias e relatórios (incl. tabelas AUD-004, limitações dashboard L85/L223, STAGE_33 fluxo antigo).
- Secção «Registo histórico (pré-E4)» em `appointment-expiration-audit.md`.
- Parecer e evidências do relatório E4 approval audit.
- Metadados Git `527a623` no corpo do ROADMAP tasks (snapshot da auditoria 11/11).

---

## 8. Limitações e pendentes

| Item | Notas |
|------|--------|
| Commit documental | Por conta do utilizador |
| Metadados ROADMAP tasks (HEAD/working tree) | Ainda reflectem auditoria original |
| `expireOverdueScheduled` órfão | Código — P3, fora desta tarefa |
| UX `scheduled` vencido | P2 produto |
| Outros `docs/reports/` | Não varridos; sem menção GET-expiração nos listados na validação |

---

## 9. Handoff para outra IA

1. **Estado actual (runtime):** [`appointment-expiration-audit.md`](../audits/appointment-expiration-audit.md) — topo.
2. **Sequência documental:** [sync](appointment-expiration-documentation-sync.md) → [validation](appointment-expiration-documentation-validation.md) → **este cleanup**.
3. **Roadmap geral:** stub [`../audits/ROADMAP_AUDIT_2026-11-11.md`](../audits/ROADMAP_AUDIT_2026-11-11.md).
4. **O6:** `appointment-visibility-by-role-audit.md` — ler banner + §7.1 antes do corpo.
5. **Relatórios antigos:** respeitar blockquotes «Contexto pós-E4.1».
6. **Não** reimplementar expiração no `GET`.
