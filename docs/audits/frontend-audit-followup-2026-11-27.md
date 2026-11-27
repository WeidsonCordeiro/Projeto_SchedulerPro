# Auditoria follow-up do frontend — pós onda FE-FU (`client/`)

| Campo | Valor |
|-------|--------|
| **Data** | 27/11/2026 |
| **Tipo** | Read-only (código inalterado; apenas este relatório) |
| **Branch / HEAD** | `develop` @ `fae325beaf120e87dc6c68ddcdec5fbaef285c40` |
| **Âmbito** | Confirmação de encerramento da onda **FE-FU-001…009** + baseline técnica |
| **Referência** | [`frontend-audit-followup-2026-11-24.md`](./frontend-audit-followup-2026-11-24.md) |

---

## Guia legível

### A onda FE-FU está fechada?

**Sim.** Os nove itens planeados em 24/11 estão em `develop` (merge local ou PRs #151–#156 + merges 006/009 + doc follow-up). Nada pendente **dentro desse roadmap**.

### Ainda há dívida no frontend?

**Sim, mas fora do FE-FU** — sobretudo **cópia PT-BR residual**, **CSS global pesado (fase 2 não executada)**, **cache client-side**, e itens **Stage 37 / a11y** que nunca entraram na onda FE-FU. Não bloqueiam MVP; o veredicto global passa a **aprovado**, com backlog de escala e polish editorial.

### O5 (refresh do dashboard)

Inalterado e estável. **Não** alterar `useDashboardVisibilityRefresh` / `dashboardRefresh` sem branch dedicada.

---

## 1. Veredicto

| Âmbito | Veredicto |
|--------|-----------|
| Onda **FE-FU** (24/11) | **Encerrada** — 9/9 entregues |
| Qualidade de release (typecheck, testes, build, lint) | **Verde** |
| Backlog histórico (Stage 37, PERF-004, cópia massiva, a11y manual) | **Aberto** — ver §5 |

---

## 2. Baseline técnica

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | Exit **0** |
| `npm run lint` | Exit **0** — **0 erros**, 5 avisos (`react-refresh`, `react-hooks/exhaustive-deps`) |
| `npm run build` | Exit **0** — sem chunk JS único > 500 kB |
| `npm test` | Exit **0** — **140** ficheiros, **1653** testes |

### Build (seleção)

| Asset | Minificado | Gzip |
|-------|------------|------|
| `index-*.css` | **361.16 kB** | 53.96 kB |
| `vendor-react-*.js` | 231.98 kB | 74.41 kB |
| `index-*.js` (shell) | 36.92 kB | 12.23 kB |

### Grep qualidade (`client/src`, produção)

| Padrão | Ocorrências |
|--------|-------------|
| `: any` / `as any` / `@ts-ignore` | **0** |
| `console.log/warn/error` | **0** |
| `dangerouslySetInnerHTML` | **0** |
| `from "@/..."` | **0** (alias removido da config) |

---

## 3. Reconciliação FE-FU-001…009

| ID | Entrega | Estado em `develop` | Evidência |
|----|---------|---------------------|-----------|
| FE-FU-001 | Fase 1 — análise CSS | **Feito** (doc; CSS **não** reduzido) | [`fe-fu-001-css-global-analysis-implementation.md`](../tasks/fe-fu-001-css-global-analysis-implementation.md) |
| FE-FU-002 | Guia PT + quick win navbar | **Feito** (migração **parcial**) | [`frontend-copy-pt.md`](../guides/frontend-copy-pt.md); `Navbar` → «Terminar sessão» |
| FE-FU-003 | `EmptyState` na distribuição | **Feito** | `DashboardStatusDistribution.tsx` |
| FE-FU-004 | `RankingTable` | **Feito** | `components/reports/RankingTable.tsx` + `ReportsPage.tsx` |
| FE-FU-005 | Guards `/company`, `/employees` | **Feito** | `AppRoutes.tsx` + `RoleRestrictedRoute` |
| FE-FU-006 | ESLint no `client/` | **Feito** | `eslint.config.js`, `npm run lint` |
| FE-FU-007 | Mapa cores progress bar | **Feito** | `appointmentStatus.ts` → `APPOINTMENT_STATUS_PROGRESS_BAR_CLASS` |
| FE-FU-008 | A11y barras `total === 0` | **Feito** | `EmptyState` quando `total === 0`; `progressMax = Math.max(total, 1)` |
| FE-FU-009 | Remover alias `@/` não usado | **Feito** | `vite.config.ts` / `tsconfig` sem `@/` |

---

## 4. Matriz follow-up 24/11 — estado actual

| Tema (24/11) | Antes | Agora |
|--------------|-------|-------|
| CSS global ~361 kB | Aberto / piorou | **Aberto** (só analisado em FE-FU-001) |
| Cópia PT mista | Aberto | **Parcial** — guia + navbar; «Você» / «cadastrar» / «acessar» em várias páginas |
| Empty state distribuição dashboard | Parcial | **Resolvido** |
| Guards `/company`, `/employees` | Parcial | **Resolvido** |
| ESLint | Ausente | **Resolvido** |
| `RankingTable` (FE-006 Stage 37) | Aberto | **Resolvido** |
| Lazy routes / vendor chunks | Resolvido | **Mantido** |
| O5 refresh | Estável | **Mantido** |

---

## 5. Pendências **fora** da onda FE-FU (backlog conhecido)

| ID / tema | Prioridade | Notas |
|-----------|------------|--------|
| **CSS fase 2** (pós FE-FU-001) | P2 | Reduzir/partir `index-*.css`; Bootstrap full + icons no critical path |
| **FE-UX-002 / cópia** | P2 | Guia lista migração gradual; produção ainda com BR em permissões, empty states, portal |
| **FE-PERF-004** | P3 | Sem camada de cache client-side |
| **FE-A11Y-05** | P2 | Hierarquia de headings — revisão manual |
| **FE-A11Y-06 / 07** | P3 | Landmarks mobile; testes subcalendários |
| **FE-001 / FE-004 / FE-005** (Stage 37) | P3 | Loading/empty/modais — parcial em várias páginas |
| **FE-008, FE-009, FE-012, FE-016** | P3 / N/A | Notificações prefs, multi-tenant, responsivo visual não auditado, testes calendário |

Mensagens «Você não tem permissão…» em `CompanyPage` / `EmployeesPage` / etc. podem ser **defesa em profundidade** após `RoleRestrictedRoute`; unificar cópia é polish, não falha de segurança (API mantém autoridade).

---

## 6. Comandos executados

```bash
git rev-parse HEAD
cd client && npm run typecheck
cd client && npm run lint
cd client && npm run build
cd client && npm test
```

---

## 7. Conclusão para planeamento

- **Pendências da auditoria de 24/11 ligadas ao roadmap FE-FU:** **nenhuma**.
- **Pendências de produto/técnica a longo prazo:** **sim** — documentadas em §5; alinhar com `frontend-copy-pt.md` e fase 2 de CSS quando houver branch dedicada.

*Relatório read-only. Nenhum ficheiro em `client/` foi alterado.*