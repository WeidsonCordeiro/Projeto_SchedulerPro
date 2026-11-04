# SchedulerPro — Ajuste B.2: avisos duplicados (OWNER, empresa inactiva)

**Data:** 31/10/2026  
**Git no início:** branch `develop`, commit `534354d80e6ef4f7c2cf26737949cb490eed15b5` (working tree com alterações das Etapas B / B.1).

---

## Problema

Com `company.isActive === false`, o [`AppLayout`](../../client/src/components/layout/AppLayout.tsx) mostra o aviso global [`CompanyInactiveNotice`](../../client/src/components/company/CompanyInactiveNotice.tsx). Várias páginas operacionais tratavam falhas `403` de [`require-operational-company`](../../server/src/middlewares/require-operational-company.middleware.ts) via [`getFriendlyErrorMessage`](../../client/src/api/errors.ts), repetindo o texto longo de `COMPANY_INACTIVE_OPERATION`.

**Caso reportado — Disponibilidade:** em [`AvailabilityPage.tsx`](../../client/src/pages/availability/AvailabilityPage.tsx) (L323–327, antes do fix), o alerta amarelo concatenava:

1. Mensagem amigável genérica («Esta operação não pode ser concluída porque a empresa está suspensa…»).
2. Sufixo fixo «Lista de funcionários indisponível; será exibida a sua própria disponibilidade.»

---

## Abordagem

Helpers centralizados em [`errors.ts`](../../client/src/api/errors.ts) (sem alterar backend):

| Helper | Função |
|--------|--------|
| `isCompanyInactiveOperationFailure` | Detecta `COMPANY_INACTIVE_OPERATION` (code ou message backend) |
| `isDuplicateCompanyInactivePageError` | `company.isActive === false` + erro operacional |
| `resolveAvailabilityEmployeesLoadNotice` | Copy específica de Disponibilidade ou sufixo legado para erros reais |
| `collectRelatedFailureMessages` / `formatRelatedFailuresMessage` | Omite falhas duplicadas em alertas «related» |
| `getPageLoadErrorPresentation` | Suprime `ErrorState` genérico + retry inútil |

**Critério:** só suprimir quando Redux tem `company.isActive === false` (mesmo sinal do banner global). Se `company === null`, comportamento anterior mantido.

---

## Páginas analisadas / alteradas

| Página | Alteração |
|--------|-----------|
| **Disponibilidade** | Aviso específico de lista de funcionários; `ErrorState` sem retry quando bloqueio por empresa |
| **Agendamentos** (`useAppointmentsSchedule`) | `relatedError` e `loadError` filtrados |
| **Dashboard** | `relatedError` / summary |
| **Relatórios** | `loadError` / `relatedError` |
| **Clientes, Serviços, Funcionários** | `ErrorState` sem mensagem/retry duplicados |
| AppLayout / B.1 | Inalterados |

---

## Testes executados

```bash
cd client && npm test -- --run errors.test AvailabilityPage AppointmentsPage DashboardPage ReportsPage AppLayout
cd client && npm run build
```

*(135 testes nos ficheiros indicados OK; `npm run build` OK — 31/10/2026.)*

---

## Pendências

- Se o OWNER navegar antes de `GET /companies` popular o Redux, duplicação pode voltar até o bootstrap (comportamento legado).
- Backend continua a não enviar `code` estruturado para todos os casos Etapa B; fallback por `message` permanece para contextos sem banner global.

---

## Git

Sem commit/push — utilizador gere histórico.
