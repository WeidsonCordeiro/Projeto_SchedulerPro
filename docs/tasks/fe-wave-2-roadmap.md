# Onda FE — Wave 2 (pós FE-FU)

**Data:** 27/11/2026  
**Política:** uma branch por tema; testes obrigatórios; merge em `develop` por PR ou merge local acordado.

| Branch | ID | Entrega | Testes |
|--------|-----|---------|--------|
| `feat/fe-perf-004-client-cache` | FE-PERF-004 + O5 | Cache in-memory com `staleTime = DASHBOARD_AUTO_REFRESH_MIN_MS`; dashboard + listas piloto; O5 só refetch se stale | `queryCache.test.ts`, `useCachedQuery.test.ts`, O5 existentes |
| `feat/fe-wave-2-copy-pt-pt` | FE-UX-002 | Migração cópia PT-PT (grep-driven) | Atualizar testes por página |
| `feat/fe-fu-001-css-phase-2` | CSS fase 2 | ✅ Calendário fora do critical path | ver `fe-fu-001-css-phase-2-implementation.md` |
| `feat/fe-fu-001-css-phase-3` | CSS fase 3 | ✅ Público, relatórios, picker | ver `fe-fu-001-css-phase-3-implementation.md` |
| `feat/fe-a11y-wave-2` | A11y | ✅ Landmarks + headings (piloto) | ver `fe-a11y-wave-2-implementation.md` |
| `feat/fe-a11y-headings` | FE-A11Y-05 | Auditoria + fixes headings | Testes RTL onde aplicável |
| `feat/fe-a11y-mobile-landmarks` | FE-A11Y-06 | Landmarks listas mobile | RTL |
| `feat/fe-stage37-calendar-tests` | FE-016 | ✅ Subvistas + switcher | `CalendarView.fe016-subviews.test.tsx` |

**Ordem sugerida:** PERF-004 → cópia → CSS → a11y (paralelizável após PERF-004).