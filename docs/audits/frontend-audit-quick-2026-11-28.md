# Auditoria rápida — frontend pós Wave 2

| Campo | Valor |
|-------|--------|
| **Data** | 28/11/2026 |
| **HEAD** | `develop` @ `ede03ad` |
| **Tipo** | Read-only + comandos locais |

## Baseline

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | **OK** |
| `npm run lint` | **OK** — 0 erros, 5 avisos |
| `npm run build` | **OK** — `index-*.css` **338.27 kB** (50.35 gzip); chunks por rota (agenda, público, relatórios) |
| `npm test` | **OK** — 144 ficheiros, **1675** testes (28/11 ~6m24s) |

## Entregas Wave 2 (em `develop`)

| Tema | Estado |
|------|--------|
| FE-PERF-004 + O5 | ✅ Cache 45s + dashboard; **piloto** clientes |
| FE-UX-002 cópia | ✅ Migração massiva PT-PT; grep BR UI **0** em `.tsx` prod |
| CSS fases 2–3 | ✅ Calendário, público, relatórios, picker fora do `index.css` |
| A11y wave 2 | ✅ `main` label, landmarks CRUD (3 páginas), headings piloto |
| FE-016 calendário | ✅ `CalendarView.fe016-subviews.test.tsx` |
| Onda FE-FU (24/11) | ✅ Encerrada (auditoria 27/11) |

## Veredicto

**Aprovado** para continuar desenvolvimento / MVP. Não há itens **bloqueantes** do roadmap Wave 2 por implementar.

## Backlog opcional (não mapeado como branch ativa)

Ver [`fe-wave-2-roadmap.md`](../tasks/fe-wave-2-roadmap.md) — secção «Pendente».