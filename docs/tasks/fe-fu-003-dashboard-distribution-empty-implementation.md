# FE-FU-003 — EmptyState na distribuição do dashboard

**Data:** 2026-11-24  
**Branch:** `feat/fe-fu-003-dashboard-distribution-empty`  
**Ficheiros:** `DashboardStatusDistribution.tsx`, testes associados, `DashboardPage.test.tsx`

## Alterações

- Com `total === 0`, mostrar `EmptyState` em vez de texto muted; ocultar barras de estado.
- Testes alinhados ao padrão de `DashboardAppointments`.

## Fora de âmbito

- Refresh O5 (`useDashboardVisibilityRefresh`) — sem alterações.

## Teste manual

- Dashboard sem agendamentos no dia: card “Distribuição por estado” com empty state; com dados: barras visíveis.