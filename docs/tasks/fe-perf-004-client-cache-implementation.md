# FE-PERF-004 — Cache client-side + unificação O5

**Branch:** `feat/fe-perf-004-client-cache`

## Desenho

- Cache in-memory por chave (`queryCache.ts`), TTL alinhado a `DASHBOARD_AUTO_REFRESH_MIN_MS` (45 s).
- Dashboard e listas partilham chaves (`cacheKeys.ts`): clientes, serviços, funcionários, summary do dia.
- **O5:** `useDashboardVisibilityRefresh` aceita `shouldRefresh`; o dashboard só refaz pedidos se alguma chave estiver stale (mesma janela que o throttle).
- `refreshDashboard` força rede só quando necessário; `force: true` quando invalida.

## Piloto

- `DashboardPage` — summary + related data.
- `ClientsPage` — lista com invalidação após create/update/delete.

## Próximas branches (wave 2)

Ver [`fe-wave-2-roadmap.md`](./fe-wave-2-roadmap.md).