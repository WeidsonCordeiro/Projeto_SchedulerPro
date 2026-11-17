# Implementação — atualização temporal UX (agendamentos expirados)

**Data:** 2026-11-17  
**Branch:** `feat/expired-appointments-confirmation-guard`  
**HEAD:** `d3d56707ab6ef7122b82d9a7c4cacfb091bf0486` (sem commit desta entrega)

---

## 1. Objetivo

Complementar o guard de confirmação (UX-01) com:

1. **Re-render periódico** na página de agendamentos para reavaliar acções temporais **sem** refetch da API.
2. **Alinhamento** da regra de bloqueio de confirmação no frontend com o backend: `startAt < now` (não `<=`).

Contexto anterior: [`expired-appointments-confirmation-guard-implementation.md`](./expired-appointments-confirmation-guard-implementation.md).  
Auditoria que motivou esta tarefa: [`expired-appointments-ux-refresh-audit.md`](./expired-appointments-ux-refresh-audit.md).

---

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/config/appointmentCalendar.ts` | Nova função `isConfirmStartPassed` |
| `client/src/config/appointmentCalendar.test.ts` | Testes dos 3 limites temporais |
| `client/src/config/appointmentStatus.ts` | `getAppointmentStatusActions` usa `isConfirmStartPassed` |
| `client/src/config/appointmentStatus.test.ts` | Caso `startAt === now` mantém confirm |
| `client/src/hooks/useAppointmentsUiTick.ts` | **Novo** — intervalo 30 s, retorna `uiNowISO` |
| `client/src/hooks/useAppointmentsUiTick.test.ts` | **Novo** — tick, cleanup, `enabled` |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Hook + `uiNowISO` → ListView e Form |
| `client/src/components/appointments/AppointmentsListView.tsx` | Prop `uiNowISO` → `getAppointmentStatusActions` |
| `client/src/components/appointments/AppointmentForm.tsx` | Prop `uiNowISO`; nota de guard com `isConfirmStartPassed` |
| `client/src/components/appointments/AppointmentsListView.test.tsx` | Transição temporal via `uiNowISO` |
| `client/src/components/appointments/AppointmentForm.test.tsx` | Sem nota quando `startAt === uiNowISO` |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` | Tick sem API extra; Confirmar some após 90 s |

**Não alterado:** `server/`, scheduler, portal, calendário visual, RBAC, `useAppointmentsSchedule`, `isInstantInPast` (Editar/Visualizar/read-only).

---

## 3. Descrição técnica

### B — Comparação temporal (confirmação)

- `isConfirmStartPassed(startAt, nowISO?)` em `appointmentCalendar.ts`: `start.toMillis() < now.toMillis()`.
- `getAppointmentStatusActions` no ramo `scheduled` omite `confirm` apenas quando `isConfirmStartPassed` é verdadeiro.
- `isInstantInPast` mantém `startAt <= now` para Editar/Visualizar e alertas de somente leitura.

### A — Tick de UI

- `APPOINTMENTS_UI_TICK_INTERVAL_MS = 30_000`.
- `useAppointmentsUiTick(enabled)` actualiza estado `uiNowISO` (UTC ISO) no mount, **de imediato quando `enabled` passa a `true`**, e a cada 30 s; `clearInterval` no unmount; um intervalo por efecto (`[enabled]`).
- `AppointmentsPage`: `const uiNowISO = useAppointmentsUiTick(canList)`.
- Lista e modal de edição recebem `uiNowISO` para reavaliar acções e mensagem de bloqueio.

Nenhuma chamada a `getAppointments` é disparada pelo tick.

---

## 4. Decisões de implementação

| Decisão | Motivo |
|---------|--------|
| Intervalo 30 s | Equilíbrio entre UX e custo; dentro do intervalo 30–60 s pedido |
| Função dedicada `isConfirmStartPassed` | Não mudar semântica global de `isInstantInPast` |
| Tick só com `canList` | Evitar trabalho na página sem permissão de listagem |
| Tick limitado a ListView + Form | Calendário fora de âmbito desta tarefa |
| `uiNowISO` opcional nos componentes | Retrocompatibilidade em testes isolados |

---

## 5. Testes executados

### Alvo (incl. correção enabled → true)

```text
vitest run useAppointmentsUiTick                    → 6/6
vitest run appointmentCalendar appointmentStatus useAppointmentsUiTick
  AppointmentsListView AppointmentsPage AppointmentForm → 150/150
```

- Cobertura: limites `>`, `===`, `<`; evolução de `uiNowISO`; **refresh imediato ao activar `enabled`**; cleanup de timers; zero `getAppointments` extra; Confirmar some após avanço temporal; Cancelar preservado; mensagem de bloqueio.

### Suite completa frontend

```text
npm test
Test Files  2 failed | 135 passed (137)
Tests       2 failed | 1629 passed (1631)
Duration    ~704 s
```

**Falhas não introduzidas por esta tarefa** (timeouts 5 s, provável flake de ambiente):

1. `RegisterPage.test.tsx` — `calls register with the selected IANA timezone in the payload`
2. `CompanyForm.test.tsx` — `submits with trimmed payload and notifies onSaved`

Testes da feature (guard + refresh) passam. +13 testes face à baseline anterior (~1616) por novos casos desta entrega e da confirmação.

### Typecheck e build

```text
npm run typecheck  → OK
npm run build      → OK (aviso chunk > 500 kB; aviso npm devdir)
```

---

## 6. Correção pós-revisão (enabled false → true)

**Ficheiro:** `client/src/hooks/useAppointmentsUiTick.ts` — `setUiNowISO(currentUtcIso())` no início do `useEffect` quando `enabled === true`.

**Teste:** `useAppointmentsUiTick.test.ts` — `refreshes uiNowISO immediately when enabled becomes true` (avance de relógio sem esperar 30 s; intervalo e cleanup subsequentes).

**Validação pós-correção (2026-11-17):**

| Comando | Resultado |
|---------|-----------|
| `vitest run useAppointmentsUiTick` | **6/6** pass (incl. `refreshes uiNowISO immediately when enabled becomes true`) |
| `vitest run` alvo agendamentos (calendar, status, hook, ListView, Page, Form) | **150/150** pass (2.ª corrida; 1.ª corrida teve 2 flakes intermitentes no lote) |
| `npm run typecheck` | OK |
| `npm run build` | OK |

---

## 7. Limitações e riscos

- **Latência até 30 s:** após `startAt < now` **com o hook já activo**, o botão Confirmar pode permanecer visível até o próximo tick (não aplica ao momento em que `enabled` torna-se `true` — corrigido).
- **Vista calendário:** acções na grelha não recebem tick nesta entrega (lista + modal de edição na página staff).
- **Badge `scheduled`:** continua a depender de dados da API/scheduler até refetch manual ou foco futuro opcional.

---

## 8. Git — estado final

Sem **commit**, **push**, **merge** ou **PR**.

Executar `git status --short` localmente para lista actualizada. Esperado: ficheiros `M` do guard original + ficheiros desta entrega em `client/` + docs `??`/`M` em `docs/tasks/`.

---

## 9. Confirmação

- Nenhuma alteração no backend nesta entrega complementar.
- Nenhum commit ou integração Git realizados pelo agente.
- Critérios de conclusão da tarefa considerados satisfeitos no código e testes da feature; suite global com 2 flakes pré-existentes documentados.