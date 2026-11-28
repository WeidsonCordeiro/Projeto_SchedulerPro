# FE-FU-001 — CSS global fase 2

**Branch:** `feat/fe-fu-001-css-phase-2`

## Alteração

`appointments-calendar.css` deixou o critical path (`main.tsx`) e passou a importar-se apenas em `AppointmentsPage.tsx` (rota lazy). Login, dashboard e portal deixam de pagar ~20 kB de estilos de calendário no primeiro paint.

## Medição

Executar `cd client && npm run build` e comparar:

| Métrica | Antes (develop pré-fase-2) | Depois |
|---------|---------------------------|--------|
| `index-*.css` | 361.16 kB (53.96 kB gzip) | **346.68 kB** (51.67 kB gzip) |
| `AppointmentsPage-*.css` | — | **14.48 kB** (2.96 kB gzip), carregado com a rota lazy |

Bootstrap full + `bootstrap-icons` + `index.css` mantêm-se globais (risco alto de partial Bootstrap).

## Fora de âmbito

- Purge de `index.css`
- O5 / `dashboard-refreshing`
- Subset de ícones Bootstrap