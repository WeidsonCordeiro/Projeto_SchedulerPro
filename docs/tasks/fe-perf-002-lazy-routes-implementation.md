# FE-PERF-002 (+ FE-PERF-001) — Lazy routes

**Data:** 2026-11-24  
**Branch sugerida:** `feat/fe-perf-002-lazy-routes`

## Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/routes/RouteSuspense.tsx` | `Suspense` + `FullPageLoader` |
| `client/src/routes/AppRoutes.tsx` | `React.lazy` para todas as páginas |
| `client/src/routes/AppRoutes.test.tsx` | `findBy*` para chunks assíncronos |

## Build pós-lazy

Chunk principal `index-*.js`: **412.93 kB** (min), gzip **135.66 kB** — abaixo do limiar 500 kB (FE-PERF-001). Páginas em chunks separados (`AppointmentsPage` ~49.7 kB, etc.).

## Checklist manual

- [ ] Cold load `/login` — bundle inicial menor que monólito anterior
- [ ] Navegar para `/appointments` — chunk adicional na rede