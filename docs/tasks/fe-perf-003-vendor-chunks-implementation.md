# FE-PERF-003 — manualChunks (Vite)

**Data:** 2026-11-24  
**Ficheiro:** `client/vite.config.ts` — `build.rollupOptions.output.manualChunks`

Vendor splits: `vendor-luxon`, `vendor-redux`, `vendor-react`, `vendor-axios`.

Build (`npm run build`): `index-*.js` **36.23 kB**; vendors `vendor-react` 231.98 kB, `vendor-luxon` 71.39 kB, `vendor-axios` 51.44 kB, `vendor-redux` 22.81 kB (min). Nenhum chunk único > 500 kB.