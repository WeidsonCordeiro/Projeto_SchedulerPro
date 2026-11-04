# Stage 49.1 — Extrair `AppointmentsListView`

Data: 21/10/2026  
Âmbito: extrair a UI da vista **Lista** de `AppointmentsPage` para um componente dedicado, com testes e paridade de comportamento.  
Sem commit, merge ou push.

## 1. Objetivo

Reduzir o tamanho e a responsabilidade de [`AppointmentsPage.tsx`](../client/src/pages/appointments/AppointmentsPage.tsx) movendo loading, erro, empty state e tabela da lista para [`AppointmentsListView.tsx`](../client/src/components/appointments/AppointmentsListView.tsx), conforme [`stage-49-appointments-refactor-audit.md`](stage-49-appointments-refactor-audit.md).

**Fora de âmbito:** toolbar da lista, `CalendarView`, hooks de schedule (49.2), CSS global, API/RBAC.

**Contexto Git (leitura):** branch `develop`, HEAD `4a37bb6` no momento do relatório. Alterações 49.1 no working tree (sem commit).

**Baseline pré-49.1:** **1291** testes cliente (auditoria Stage 49).

## 2. Responsabilidades

| Permanece em `AppointmentsPage` | Em `AppointmentsListView` |
|-----------------------------------|---------------------------|
| `loadAppointments`, `range`, estado `appointments`, `pendingStatusAction` | `LoadingState`, `ErrorState`, `EmptyState`, tabela `table-card` |
| Handlers: `openCreate`, `openEdit`, `openDetails`, `handleStatusAction`, modais | Formatação de data/hora, badges de status, `nameFor`, ações por linha |
| Toolbar lista + gate `!showCalendar` | `getAppointmentStatusActions`, `isInstantInPast` (Visualizar vs Editar) |
| Bloco calendário quando `viewType !== "list"` | `hasActions` = `canUpdate \|\| canStatus \|\| canDelete` (interno) |

Integração na página:

```tsx
{!showCalendar && (
  <AppointmentsListView
    isLoading={isLoading}
    loadError={loadError}
    onRetry={() => void loadAppointments()}
    appointments={appointments}
    timezone={timezone}
    clientNames={clientNames}
    serviceNames={serviceNames}
    employeeNames={employeeNames}
    canCreate={canCreate}
    canUpdate={canUpdate}
    canStatus={canStatus}
    canDelete={canDelete}
    pendingStatusAction={pendingStatusAction}
    onCreate={() => openCreate()}
    onViewDetails={openDetails}
    onEdit={openEdit}
    onStatusAction={(appointment, action) =>
      void handleStatusAction(appointment, action)
    }
    onDeleteRequest={setDeletingAppointment}
  />
)}
```

## 3. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/appointments/AppointmentsListView.tsx` | **Novo** — UI da lista |
| `client/src/components/appointments/AppointmentsListView.test.tsx` | **Novo** — 9 casos (loading, erro, empty, tabela, callbacks, passado, RBAC, pending) |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Substituição do JSX inline (~L507–638) pelo componente; imports de estado vazio removidos da página |

`AppointmentsPage.test.tsx` — **sem alterações**; integração lista continua a passar com o mesmo DOM.

## 4. Paridade funcional

- Colunas e classes (`table-card`, `table-responsive`, `table-actions`) preservadas.
- Empty com CTA “Cadastrar primeiro agendamento” só se `canCreate`.
- Ações de status com “Aguarde...” e `disabled` quando há `pendingStatusAction`.
- Passado: botão **Visualizar**; futuro: **Editar**.

## 5. Testes e validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1 src/components/appointments/AppointmentsListView.test.tsx` | 9 passaram |
| `npm run test -- --pool=forks --maxWorkers=1` | **1300** passaram (**115** ficheiros); +9 vs baseline 1291 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

## 6. Limitações

- Toolbar da vista Lista (filtros / alternância) permanece em `AppointmentsPage` — extração prevista na auditoria (ex. Stage 49.4).
- Testes unitários da lista usam datas futuras (`2026-11-15`) para “Editar” vs “Visualizar”, pois `isInstantInPast` usa `DateTime.now()` em runtime.

## CONTEXTO PARA A PRÓXIMA IA

- Stage **49.2:** extrair hook **`useAppointmentsSchedule`** — fetch de agendamentos + entidades relacionadas, maps de nomes, `loadAppointments`, `isLoading`, `loadError`, `relatedError` — ver § proposta em [`stage-49-appointments-refactor-audit.md`](stage-49-appointments-refactor-audit.md).
- Lista já isolada em `AppointmentsListView`; página ainda orquestra fetch, permissões, calendário e modais.
- Testes cliente após 49.1: **1300** pass; typecheck e build OK.
- Não fazer commit/merge/push salvo pedido explícito do utilizador.
