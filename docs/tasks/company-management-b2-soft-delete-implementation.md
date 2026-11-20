# B2 — Implementação política soft delete Company

**Data:** 2026-11-20  
**Branch:** `feat/company-safe-soft-delete` (sem commit)  
**Referências:** [`company-management-b2-soft-delete-audit.md`](./company-management-b2-soft-delete-audit.md), plano B2 anexado na sessão.

---

## 1. Resumo

Implementada a política de soft delete seguro para empresas:

- Bloqueio **409** (`COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS`) quando existem agendamentos `SCHEDULED` ou `CONFIRMED` com `deletedAt: null` e `endAt > now`.
- Soft delete atómico: `deletedAt` + `isActive: false` na mesma `withCompanyLifecycleTransaction`.
- `DELETE /api/companies/:id` **sem** `RequireOperationalCompany` — OWNER pode eliminar empresa inactiva.
- Guard transacional em `AppointmentService.schedule`: `findById` da empresa com `session` antes da serialização de booking.
- Frontend: mensagem dedicada em `errors.ts` e teste 409 na `CompanyPage` (sessão mantida, sem logout).

---

## 2. Regras implementadas

| Regra | Implementação |
|-------|----------------|
| Appointments “abertos” | `status ∈ {SCHEDULED, CONFIRMED}`, `deletedAt: null`, `endAt > now` |
| Referência temporal | `new Date()` no servidor no início de `CompanyService.delete` |
| HTTP bloqueio | **409 Conflict** + código `COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS` |
| Soft delete | `CompanyRepository.softDelete` → `findOneAndUpdate` com `deletedAt` + `isActive: false` |
| Segunda tentativa | `findById` com `deletedAt: null` → **404** antes da transação |
| Sem cascata | Inalterado — só documento Company |
| activate/deactivate | Inalterados |

---

## 3. Ficheiros alterados

**Backend**

- `server/src/constants/http-messages.ts`
- `server/src/modules/appointments/repositories/AppointmentRepository.ts` — `hasOpenAppointmentsForCompany`
- `server/src/modules/companies/repositories/CompanyRepository.ts` — `findById` com `session`; `softDelete` atómico
- `server/src/modules/companies/services/CompanyService.ts` — delete transacional + gate
- `server/src/modules/companies/routes/CompanyRoutes.ts` — removido middleware operacional só no DELETE
- `server/src/modules/appointments/services/AppointmentService.ts` — `assertCompanyBookableForBooking` em `schedule`

**Testes**

- `CompanyService.soft-delete-policy.test.ts` (novo)
- `AppointmentRepository.open-for-company-delete.test.ts` (novo)
- `company-soft-delete-policy.mongo.test.ts` (novo)
- Atualizações: `CompanyService.behavior/isolation`, `CompanyRepository.test`, `multi-tenant-companies.routes.test.ts`

**Frontend**

- `client/src/api/errors.ts`, `errors.test.ts`
- `client/src/pages/company/CompanyPage.test.tsx`

---

## 4. Concorrência e limitações

| Camada | Mitigação |
|--------|-----------|
| Delete | Check `hasOpenAppointments` + `softDelete` na mesma `withCompanyLifecycleTransaction` |
| Create | `CompanyRepository.findById(companyId, { session })` no início de `withBookingTransaction` em `schedule` |

**Residual (documentado):** entre commit do delete e insert do appointment, uma reserva que já entrou na transação antes do soft delete ainda pode concluir se não houver re-leitura imediatamente antes de `create`. Não foi adicionado lock em Company nem `touchBookingSerialization` — decisão de âmbito mínimo conforme plano.

---

## 5. Validação executada

```text
# Backend (B2)
cd server && npm run test -- tests/unit/companies tests/unit/appointments/AppointmentRepository.open-for-company-delete.test.ts tests/integration/routes/multi-tenant-companies.routes.test.ts tests/integration/companies/company-soft-delete-policy.mongo.test.ts
→ 12 ficheiros, 127 testes passed (~47s)

cd server && npm run typecheck && npm run build
→ exit 0

# Frontend
cd client && npm run test -- company errors
→ 11 ficheiros, 131 testes passed (~79s)

cd client && npm run typecheck && npm run build
→ exit 0

git diff --check
→ exit 0 (sem conflict markers)
```

---

## 6. Decisões

1. **`isActive: false` no soft delete** — aplicado no repository para alinhar estado lógico com encerramento.
2. **DELETE em empresa inactiva** — permitido removendo apenas o middleware operacional da rota DELETE.
3. **Mensagem FE** — constante dedicada; prioridade por `code` em `getFriendlyErrorMessage` (evita fallback genérico de conflito).

---

## 7. Git

- Branch: `feat/company-safe-soft-delete`
- **Sem commit / push / PR** (conforme brief).
- Untracked adicional: `docs/tasks/company-management-b2-soft-delete-audit.md` (pré-existente na working tree).

---

*B2 implementação concluída na branch indicada; aguarda revisão e commit pelo autor.*