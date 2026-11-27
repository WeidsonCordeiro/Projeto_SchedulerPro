# FE-FU-009 — Remover alias `@/` não usado

**Branch:** `feat/fe-fu-009-path-alias`

Opção A do plano: remover `paths` em `tsconfig.app.json` e `resolve.alias` em `vite.config.ts` (0 imports `@/` no código).

Imports relativos mantidos — sem mudança de comportamento.