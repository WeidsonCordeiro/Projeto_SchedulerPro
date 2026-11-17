# Implementação — Guard de confirmação (agendamentos `scheduled` vencidos)

**Data:** 2026-11-17  
**Branch:** `feat/expired-appointments-confirmation-guard`  
**HEAD referência (base `develop`):** `d3d56707ab6ef7122b82d9a7c4cacfb091bf0486` (PR #143)  
**HEAD final (sem commit):** `d3d56707ab6ef7122b82d9a7c4cacfb091bf0486`  
**Auditoria:** [`expired-appointments-ux-audit.md`](./expired-appointments-ux-audit.md) (não alterada)

**Git write pelo agente:** criação de branch apenas; **sem** commit, push ou integração.

---

## 1. Objetivo

Impedir a transição **`scheduled` → `confirmed`** quando `appointment.startAt < now` (relógio do servidor), com bloqueio na UI e validação obrigatória na API — resposta a **UX-01** da auditoria UX de expiração.

---

## 2. Regra de negócio

| Condição | Resultado |
|----------|-----------|
| `scheduled` + `startAt < now` | Confirmar **rejeitado** (400); cancelar **permitido** (regras existentes) |
| `scheduled` + `startAt >= now` | Confirmar permitido (RBAC inalterado) |
| `startAt === now` (estrito) | Confirmar **permitido** no backend (`<` apenas) |
| Frontend | Oculta Confirmar com `isInstantInPast(startAt)` (`<= now`) — ligeiramente mais conservador no instante exacto |
| Expiração / scheduler | **Inalterado** |
| Novo estado `expired` | **Não criado** |

---

## 3. Comportamento anterior vs novo

| Área | Antes | Depois |
|------|-------|--------|
| Backend `confirm()` | Aceitava `scheduled` vencido | `AppError` 400 + código `APPOINTMENT_CONFIRM_START_PASSED` |
| Lista | Confirmar sempre para `scheduled` | Confirmar omitido se passado; texto explicativo |
| Modal detalhes | Sem linha de estado | Badge de estado + nota se `scheduled` passado |
| API directa | Confirmava vencidos | 400 com mensagem canónica |

---

## 4. Ficheiros alterados

### Backend

| Ficheiro | Alteração |
|----------|-----------|
| [`server/src/constants/http-messages.ts`](../../server/src/constants/http-messages.ts) | `APPOINTMENT_CONFIRM_START_PASSED` |
| [`server/src/constants/error-codes.ts`](../../server/src/constants/error-codes.ts) | `APPOINTMENT_CONFIRM_START_PASSED` |
| [`server/src/modules/appointments/services/AppointmentService.ts`](../../server/src/modules/appointments/services/AppointmentService.ts) | Validação em `confirm(id, companyId, sessionUser, now?)` |

### Frontend

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/config/appointmentStatus.ts`](../../client/src/config/appointmentStatus.ts) | `getAppointmentStatusActions(status, startAt?, nowISO?)`; constante `APPOINTMENT_CONFIRM_GUARD_MESSAGE` |
| [`client/src/components/appointments/AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx) | Passa `startAt`; hint quando confirm bloqueado |
| [`client/src/components/appointments/AppointmentForm.tsx`](../../client/src/components/appointments/AppointmentForm.tsx) | Badge de estado + nota informativa |
| [`client/src/api/errors.ts`](../../client/src/api/errors.ts) | Mapeamento amigável por `code`/mensagem |

### Testes

| Ficheiro |
|----------|
| `server/tests/unit/appointments/AppointmentService.test.ts` |
| `server/tests/integration/availability-appointment.routes.test.ts` |
| `server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts` (ajuste `now` em confirm) |
| `client/src/config/appointmentStatus.test.ts` |
| `client/src/components/appointments/AppointmentsListView.test.tsx` |
| `client/src/components/appointments/AppointmentForm.test.tsx` |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` |
| `client/src/api/errors.test.ts` |

### Criado

- Este relatório.

---

## 5. Validação executada

| Comando | Resultado |
|---------|-----------|
| `server`: `npm test -- AppointmentService` | **113/113** |
| `server`: `npm test -- availability-appointment` | **39/39** |
| `server`: `npm test` | **102 ficheiros, 1411/1411** (~185 s) |
| `client`: testes alvo (status, ListView, Form, Page, errors) | **125/125** |
| `client`: `npm test` | **136 ficheiros, 1616/1616** (~492 s) |
| `server`: `npm run typecheck` | exit **0** |
| `server`: `npm run build` | exit **0** |
| `client`: `npm run typecheck` | exit **0** |
| `client`: `npm run build` | exit **0** (warning chunk > 500 kB — pré-existente) |

**Warnings:** npm `devdir` (ambiente); bundle JS > 500 kB (client build).

---

## 6. Itens fora do âmbito — confirmação

Não implementado: UX-02, UX-04–UX-08, scheduler/expiração, novos estados, migrações, RBAC, dashboard KPI, portal CLIENT, calendário visual, metadata cancelamento manual vs automático.

---

## 7. Decisões técnicas

1. Validação central só em `confirm()` — único caminho `scheduled → confirmed` staff.
2. `loadAppointmentForStaffWrite` antes da regra — respeita escopo O6/O7.
3. Testes legados com fixture `2026-08-30` recebem `now` explícito anterior ao `startAt`.
4. UI sem timer dedicado: acções reflectem dados na última carga (padrão existente).

---

## 8. Limitações

- Confirmação bloqueada no FE no instante `startAt === now` (usa `isInstantInPast`); API permite nesse limite.
- Untracked na working tree: `docs/tasks/expired-appointments-ux-audit.md` (da TASK 2 auditoria; fora deste diff).

---

## 9. Estado Git final

```
Branch: feat/expired-appointments-confirmation-guard
HEAD:   d3d56707ab6ef7122b82d9a7c4cacfb091bf0486
Modified: 15 ficheiros (client + server)
Untracked: docs/tasks/expired-appointments-confirmation-guard-implementation.md (este)
           docs/tasks/expired-appointments-ux-audit.md (pré-existente)
Commit/push: não executados
```

---

## 10. Resultado

**Concluído** — critérios de aceitação do brief atendidos com ressalva documentada FE `<=` vs BE `<` no instante exacto.

**Aguardar** revisão do utilizador, commit e integração.