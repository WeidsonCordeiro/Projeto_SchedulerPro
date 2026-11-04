# Stage 49.2 — Extrair `useAppointmentsSchedule`

Data: 21/10/2026  
Âmbito: extrair carregamento de agendamentos e entidades relacionadas de `AppointmentsPage` para um hook dedicado, sem alterar comportamento.  
Sem commit, merge ou push.

## 1. Objetivo

Reduzir a responsabilidade de [`AppointmentsPage.tsx`](../client/src/pages/appointments/AppointmentsPage.tsx) concentrando fetch, intervalo API, mapas de nomes e estados de loading/erro em [`useAppointmentsSchedule.ts`](../client/src/hooks/useAppointmentsSchedule.ts), conforme auditoria Stage 49 e continuação da 49.1.

**Fora de âmbito:** navegação (49.3), toolbar unificada (49.4), CSS, `appointmentCalendar.ts` (apenas imports de funções de range), API/RBAC.

**Baseline pré-49.2:** **1300** testes / **115** ficheiros (Stage 49.1).

**Contexto Git (leitura):** branch `develop`, HEAD `86fe3ad` no momento da validação; alterações 49.1 + 49.2 no working tree.

## 2. Responsabilidades

| Hook `useAppointmentsSchedule` | Permanece em `AppointmentsPage` |
|--------------------------------|----------------------------------|
| `computeAppointmentsRange` (exportada para testes) | `viewType`, `currentDateKey`, `monthFocusedDateKey`, reconciliação |
| Estado: `appointments`, `clients`, `services`, `employees` | Formulário, delete, `successMessage`, `actionError`, `pendingStatusAction` |
| `isLoading`, `loadError`, `relatedError` | Handlers calendário, `openCreate` / `openEdit` / `openDetails` |
| `loadAppointments`, `loadRelated`, efeito quando `canList` | `handleStatusAction` (mutações API de status) |
| Mapas `clientNames`, `serviceNames`, `employeeNames` | `getAppointmentAbilities`, early return `!canList` |
| Race guard `requestIdRef`; lista sem `startAt`/`endAt` | `canListEmployees` calculado na página e passado ao hook |

Entrada do hook: `canList`, `viewType`, `currentDateKey`, `timezone`, `actorRole`, `canListEmployees`.

Recarregamento após criar/editar/eliminar/status/conflito no form continua a chamar apenas `loadAppointments()` na página — **sem** novo fetch de related.

## 3. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/hooks/useAppointmentsSchedule.ts` | **Novo** — hook + `computeAppointmentsRange` |
| `client/src/hooks/useAppointmentsSchedule.test.ts` | **Novo** — 12 casos (range puro + fetch/RBAC/retry) |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Integração do hook; remoção de fetch/estado duplicado |

`AppointmentsPage.test.tsx` — **sem alterações**; integração end-to-end mantida.

## 4. Paridade funcional

- Vista **Lista:** `getAppointments` sem parâmetros de intervalo.
- Mês / Semana / Dia: `startAt` / `endAt` conforme `computeAppointmentsRange`.
- Falhas parciais em clientes/serviços/funcionários → alerta `relatedError` sem ocultar agendamentos.
- Papel **CLIENT:** não carrega listas de nomes; funcionários com `role === "CLIENT"` excluídos do array.

## 5. Testes e validação

Comandos em `client/`:

| Comando | Resultado |
|---------|-----------|
| `npm run test -- --pool=forks --maxWorkers=1 src/hooks/useAppointmentsSchedule.test.ts` | 12 passaram |
| `npm run test -- --pool=forks --maxWorkers=1` | **1312** passaram (**116** ficheiros); +12 vs baseline 1300 |
| `npm run typecheck` | OK |
| `npm run build` | OK |

## 6. Limitações e decisões

- `loadRelated` corre no mesmo efeito que `loadAppointments` (mount e quando `loadAppointments` / `loadRelated` mudam de identidade); não há refresh manual de related após mutações.
- Navegação, `useMatchMedia` e política mobile/desktop permanecem na página até a **49.3**.
- Toolbar da vista Lista inalterada (49.4).

## CONTEXTO PARA A PRÓXIMA IA

- Stage **49.3:** extrair **`useAppointmentsNavigation`** — `viewType`, `currentDateKey`, `monthFocusedDateKey`, reconciliação do mês, handlers unificados (create vs seleção mobile, overflow) — ver [`stage-49-appointments-refactor-audit.md`](stage-49-appointments-refactor-audit.md) §5.2 e §8.
- Dados e fetch já isolados em `useAppointmentsSchedule`; página ainda concentra navegação e UI.
- Testes cliente após 49.2: **1312** pass; typecheck e build OK.
- Não fazer commit/merge/push salvo pedido explícito do utilizador.
