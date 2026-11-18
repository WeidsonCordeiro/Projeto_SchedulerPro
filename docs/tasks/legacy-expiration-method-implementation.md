# Implementação — Remoção do método legado `expireOverdueScheduled`

**Data:** 2026-11-17  
**Auditoria:** [`legacy-expiration-method-audit.md`](./legacy-expiration-method-audit.md) (não alterada)  
**Conclusão da auditoria:** OPÇÃO A — Remoção segura  

**Git write pelo agente:** criação de branch `chore/remove-legacy-expiration-method` apenas; **sem** commit, push, PR ou merge.

---

## 1. Objetivo da tarefa

Remover exclusivamente o método público legado `AppointmentService.expireOverdueScheduled`, que era um wrapper 1:1 para `AppointmentRepository.cancelOverdueScheduled`, sem callers em código executável. Preservar integralmente o mecanismo actual de expiração automática (`AppointmentExpirationScheduler` → `AppointmentExpirationService` → repositório).

---

## 2. Referência ao relatório de auditoria

| Item | Valor |
|------|--------|
| Relatório | [`docs/tasks/legacy-expiration-method-audit.md`](./legacy-expiration-method-audit.md) |
| Commit base da auditoria | `9b925fb8676d024c7477d3c378937d06990b3706` |
| Evidência pré-remoção | 1 definição, 0 chamadas em `server/` / `client/` / testes pelo nome |

---

## 3. Estado inicial do Git e commit base

| Check | Resultado |
|-------|-----------|
| Branch inicial | `audit/legacy-expiration-method` |
| `git rev-parse HEAD` | `9b925fb8676d024c7477d3c378937d06990b3706` |
| Working tree (pré-implementação) | `?? docs/tasks/legacy-expiration-method-audit.md` |
| `git diff --check` | exit **0** |

---

## 4. Branch de implementação

```bash
git checkout -b chore/remove-legacy-expiration-method
```

| Item | Valor |
|------|--------|
| Branch actual | `chore/remove-legacy-expiration-method` |
| HEAD após criação | `9b925fb8676d024c7477d3c378937d06990b3706` (inalterado; só mudou o ponteiro de branch) |

---

## 5. Método removido e localização

| Campo | Detalhe |
|-------|---------|
| Classe | `AppointmentService` |
| Ficheiro | [`server/src/modules/appointments/services/AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts) |
| Método | `expireOverdueScheduled(companyId: string, now?: Date): Promise<number>` |
| Localização (antes da remoção) | Entre `findAll` e `findById` (~L739–753) |
| Comportamento removido | `return this.appointmentRepository.cancelOverdueScheduled(companyId, now)` |

---

## 6. Descrição exacta da alteração

Removidos **16 linhas**: bloco JSDoc associado ao método e a implementação completa de `expireOverdueScheduled`. Nenhuma outra linha do ficheiro foi modificada. `findAll` mantém `void now` e apenas `findByCompanyId` (comportamento pós-E4 inalterado).

---

## 7. Ficheiros alterados

| Ficheiro | Tipo | Alteração |
|----------|------|-----------|
| `server/src/modules/appointments/services/AppointmentService.ts` | produção | **-16 linhas** (método + comentário) |
| `docs/tasks/legacy-expiration-method-implementation.md` | documentação | **novo** (este relatório) |

**Não alterados:** testes, `AppointmentRepository`, `AppointmentExpirationService`, `AppointmentExpirationScheduler`, `server.ts`, controllers, routes, client.

**Preservado sem edição:** `docs/tasks/legacy-expiration-method-audit.md` (untracked).

---

## 8. Confirmação — mecanismo actual intacto

| Componente | Estado |
|------------|--------|
| `AppointmentExpirationScheduler` | Sem diff |
| `AppointmentExpirationService.processOverdueForAllCompanies` | Continua a chamar `cancelOverdueScheduled` por empresa |
| `AppointmentRepository.cancelOverdueScheduled` | Sem diff |
| `CompanyRepository.findAllActiveNotDeleted` | Sem diff |
| `AppointmentService.findAll` | Sem alteração de lógica |

---

## 9. Pesquisa final de referências

**Código executável** (`*.ts`, `*.tsx`, `*.js`, `*.sh`):

| Padrão | Ocorrências |
|--------|-------------|
| `expireOverdueScheduled` | **0** |
| `cancelOverdueScheduled` em `AppointmentExpirationService.ts` | Presente (L51, L63) |

**Documentação:** menções históricas a `expireOverdueScheduled` em `docs/` mantidas (fora do âmbito desta tarefa).

---

## 10. Testes executados e resultados

Comandos executados a partir de `server/`:

| # | Comando | Resultado |
|---|---------|-----------|
| 1 | `npm run test -- tests/unit/appointments/AppointmentService.test.ts` | **1** ficheiro, **23/23** testes, exit **0** |
| 2 | `npm run test -- tests/unit/appointments/AppointmentExpirationService.test.ts` | **1** ficheiro, **8/8** testes, exit **0** |
| 3 | `npm run test -- tests/unit/appointments/AppointmentExpirationScheduler.test.ts` | **1** ficheiro, **16/16** testes, exit **0** |
| 4 | `npm run test -- tests/integration/appointments/cancel-overdue-scheduled.mongo.test.ts` | **1** ficheiro, **11/11** testes, exit **0** (~18 s) |
| 5 | `npm run test` | **102** ficheiros, **1411/1411** testes, exit **0** (~197 s) |

Nenhum ficheiro de teste foi modificado. Falhas: **nenhuma**.

---

## 11. Typecheck e build

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` (`tsc --noEmit`) | exit **0** |
| `npm run build` (`tsc`) | exit **0** |

Na raiz do repositório: `git diff --check` → exit **0**.

---

## 12. Avisos ou limitações

| Aviso | Nota |
|-------|------|
| `npm warn Unknown env config "devdir"` | Ambiente local npm; não relacionado com a remoção |
| Vitest / Vite `configLoader: 'native'` | Aviso de configuração pré-existente |
| Mongoose `findOneAndUpdate` `new` option deprecated | Warnings durante suite de integração; pré-existentes |
| Documentação histórica | Vários `docs/**` ainda mencionam `expireOverdueScheduled`; limpeza opcional em tarefa P3 de docs |

---

## 13. Estado final do Git

```
Branch: chore/remove-legacy-expiration-method
HEAD:   9b925fb8676d024c7477d3c378937d06990b3706

Modified (tracked):
  server/src/modules/appointments/services/AppointmentService.ts  (-16 linhas)

Untracked:
  docs/tasks/legacy-expiration-method-audit.md
  docs/tasks/legacy-expiration-method-implementation.md
```

**Commit / push / PR:** não executados (aguardar aprovação explícita).

---

## 14. Conclusão

A remoção do wrapper órfão `expireOverdueScheduled` está concluída com âmbito mínimo: uma única alteração em produção, zero alterações em testes, mecanismo de expiração automática inalterado, e validação completa da suite backend (1411 testes), typecheck e build com sucesso.

**Aguardar** revisão do utilizador para commit e integração.