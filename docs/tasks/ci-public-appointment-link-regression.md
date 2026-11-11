# CI — Regressão `public-appointment-link` após O7

## Contexto

No GitHub Actions, a suíte do servidor reportou:

- **97** ficheiros de teste
- **1.358** aprovados, **9** falhados (exit code 1)
- Falhas concentradas em [`public-appointment-link.routes.test.ts`](../../server/tests/integration/public-appointment-link.routes.test.ts)
- Erro: `this.appointmentRepository.updateInCompany is not a function`

Branch local no momento da correção: `feature/o7-appointment-write-scope-validation` @ `ded76b4c4a71ed8fab4eaa46ac0949dc3fb18931`.

## Causa raiz

### Produção (sem alteração)

No O7, [`persistReschedule`](../../server/src/modules/appointments/services/AppointmentService.ts) passou a persistir reagendamentos via `AppointmentRepository.updateInCompany(id, companyId, data, listScope?)`, incluindo o fluxo [`updatePublicByToken`](../../server/src/modules/appointments/services/AppointmentService.ts).

O PATCH público **não** usa `sessionUser` nem `listScope` de staff — apenas filtra por `companyId` do agendamento resolvido pelo token (defesa em profundidade alinhada ao O7, sem enfraquecer RBAC staff).

**Não** é defeito de implementação em produção.

### Testes

O teste de integração HTTP mockava só `appointmentRepository.update`. Os PATCHs que chegavam a `persistReschedule` falhavam em runtime porque o mock não expunha `updateInCompany`.

O teste unitário [`AppointmentService.public-link.test.ts`](../../server/tests/unit/appointments/AppointmentService.public-link.test.ts) já tinha sido actualizado na entrega O7; faltava o espelho na integração HTTP.

## Correção

Ficheiro alterado:

| Ficheiro | Alteração |
|----------|-----------|
| [`public-appointment-link.routes.test.ts`](../../server/tests/integration/public-appointment-link.routes.test.ts) | `updateInCompany` no hoisted mock; `applyUpdateData` partilhado; asserções `not.toHaveBeenCalled` / `toHaveBeenCalledWith(id, companyId, data, undefined)`; índice `[2]` para payload em `mock.calls` |

**Sem** alterações em `AppointmentService`, repositório, rotas ou O7 staff.

## Garantias preservadas

- Token, hash, contrato público, notificações, disponibilidade e conflitos: inalterados em produção.
- O7 (EMPLOYEE 404/400/403, `updateInCompany` com escopo staff): não tocado nesta correção.

## Testes executados (local, 2026-03-22)

| Comando | Resultado |
|---------|-----------|
| `npm test -- public-appointment-link` | **94/94** passed |
| `npm test -- public-appointment appointment-write-scope appointment-write-access AppointmentService.public-link` | **242/242** passed |
| `npm test` (suíte completa) | **97** ficheiros, **1367/1367** passed |
| `npm run build` | exit **0** |

### Antes vs depois

| Métrica | CI (antes) | Local (depois) |
|---------|------------|----------------|
| Falhas | 9 | 0 |
| Aprovados | 1.358 | 1.367 |
| Mensagem `updateInCompany is not a function` | Sim | Não |

## Pendências

Nenhuma. Pode re-executar o workflow no GitHub Actions.

## Continuidade

Se novos mocks de `AppointmentRepository` forem criados para fluxos que chamam `persistReschedule`, incluir sempre `updateInCompany` (e assinatura `(id, companyId, data, listScope?)`).
