# FE-FU-001 — Análise CSS global (fase 1)

**Branch:** `feat/fe-fu-001-css-global-analysis`  
**Data:** 2026-11-24

## Medição (`npm run build` @ develop)

| Asset | Minificado | Gzip |
|-------|------------|------|
| `index-*.css` | 361.16 kB | 53.96 kB |
| Bootstrap + icons + `index.css` + `appointments-calendar.css` | critical path em `main.tsx` | todas as rotas |

Referência 23/11: 280 kB (+29 %).

## Causas prováveis

1. `index.css` ~2367 linhas (dashboard, empresa, responsivo).
2. `bootstrap-icons` font/CSS no arranque.
3. Bootstrap 5 full bundle.
4. CSS morto não inventariado.

## Fase 2 (branch futura, só após validação)

- Auditar `index.css` por secções órfãs.
- Avaliar import selectivo Bootstrap (alto risco).
- **Não** alterar estilos `dashboard-refreshing` / O5 sem revisão visual.

## Fase 1

Documentação apenas; **sem alteração de código** neste commit.