# FE-A11Y — Wave 2

**Branch:** `feat/fe-fu-001-css-phase-3` (entregue com CSS fase 3)

## Alterações

| Área | Ficheiros | Detalhe |
|------|-----------|---------|
| Landmarks | `AppLayout.tsx` | `aria-label` em `<main>` |
| Listas CRUD | Clientes, funcionários, serviços | `<section aria-label="Lista de …">` (mobile/tablet); `role="region"` no desktop |
| Headings | `DashboardStatusDistribution`, `ServicesPage` | `h3` → `h2` com classes visuais |

## Fora de âmbito

- Auditoria axe completa
- Testes extra de subcalendário (FE-016)