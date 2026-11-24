# FE-UX-001 — Bootstrap Icons

**Data:** 2026-11-24  
**Branch sugerida:** `feat/fe-ux-001-bootstrap-icons`  
**Auditoria:** [frontend-complete-audit-2026-11-23.md](../audits/frontend-complete-audit-2026-11-23.md)

## Objetivo

Corrigir ícones `bi bi-*` invisíveis por ausência do pacote `bootstrap-icons`.

## Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `client/package.json` / lock | dependência `bootstrap-icons` |
| `client/src/main.tsx` | `import "bootstrap-icons/font/bootstrap-icons.css"` após Bootstrap CSS |

## Testes

- `DashboardPage.test.tsx` — asserções existentes em `.bi-chevron-down` e KPIs.
- `npm run typecheck` + testes focados dashboard.

## Checklist manual

- [ ] Dashboard: ícones nos cartões KPI
- [ ] Relatórios: ícones nos cartões
- [ ] Agenda mobile: chevron expandir/recolher