# Auditoria follow-up do frontend — SchedulerPro (`client/`)

| Campo | Valor |
|-------|--------|
| **Data** | 24/11/2026 |
| **Tipo** | Read-only (código do `client/` inalterado; apenas este relatório criado) |
| **Branch / HEAD** | `develop` @ `e2ddd544b4df2e4613cd3339c1586a74771a5091` |
| **Âmbito** | Follow-up pós-onda P1–P2 (nov/2026) + delta funcional (dashboard, empresa, agendamentos) |
| **Referência anterior** | [`frontend-complete-audit-2026-11-23.md`](./frontend-complete-audit-2026-11-23.md) |
| **Tarefas da onda** | [`docs/tasks/fe-*.md`](../tasks/) (10 entregas documentadas) |
| **Verificação visual / Lighthouse** | **Não realizada** |

---

## Guia legível (leitura rápida)

### O dashboard já actualiza sozinho?

**Sim.** O refresh **O5** está implementado: quando voltas à aba do browser (`visibilitychange`), o painel volta a pedir dados à API, com **intervalo mínimo de 45 segundos** entre actualizações automáticas. Não é um contador que corre enquanto ficas na página — só ao tornar a aba visível.

Implementação: [`useDashboardVisibilityRefresh`](../../client/src/hooks/useDashboardVisibilityRefresh.ts) + [`refreshDashboard`](../../client/src/pages/dashboard/DashboardPage.tsx). Documentação: [`schedulerpro-dashboard-o5-refresh.md`](../reports/schedulerpro-dashboard-o5-refresh.md).

**Política de manutenção:** não alterar O5 (hook, constantes, geração de pedidos, testes de throttle) nas branches de polish/UX salvo branch dedicada e pedido explícito — o comportamento já foi estabilizado e testado.

### Já está bem

- JavaScript partido por página e por vendor (não um ficheiro de 625 kB).
- Ícones, títulos de separador, skip link, motion reduzido, relatórios com redirect por role.
- 1649 testes; TypeScript strict; sessão por cookies.

### Ainda vale melhorar (por prioridade)

| Prioridade | O quê |
|------------|--------|
| P2 | CSS global grande; português misto; empty state no card “Distribuição por estado” |
| P3 | Guards em `/company` e `/employees`; ESLint; extracção `RankingTable`; a11y fina |

Roadmap de branches: ver tarefas [`fe-fu-*`](../tasks/) geradas nesta onda.

---

## 1. Resumo executivo

### Veredicto

**APROVADO COM OBSERVAÇÕES** (inalterado face à auditoria de 23/11, com melhoria material de performance de entrega)

A onda P1–P2 **encerrou** os achados críticos de bundle monolítico (~625 kB JS), ícones invisíveis, ausência de lazy routes, títulos de documento, skip link, guard de `/reports`, `EmptyState` nas listas do dashboard e vendor chunks. O projeto mantém tipagem strict, **zero** `any` / `console.*` / `dangerouslySetInnerHTML` em produção, e a suite Vitest cresceu para **1649 testes / 140 ficheiros**, todos verdes na HEAD auditada.

As observações **não bloqueantes** passam a concentrar-se em: **CSS global maior** (~361 kB minificado, +29% vs. 23/11), **consistência editorial PT**, **guards RBAC por página** (vs. redirect de rota), **empty states parciais** no novo card de distribuição do dashboard, **ausência de ESLint** no pacote `client/`, e dívidas Stage 37 ainda abertas (RankingTable, cache, auth spinners).

### O que a onda P1–P2 fechou (vs. matriz §10 de 23/11)

| ID | Estado |
|----|--------|
| FE-UX-001 | **Resolvido** — `bootstrap-icons` em `package.json`; import em `main.tsx` |
| FE-PERF-001 / FE-PERF-002 | **Resolvido** — `React.lazy` em `AppRoutes.tsx`; maior chunk JS de vendor ~232 kB (não 625 kB) |
| FE-SEC-001 | **Resolvido (documentação)** — comentário em `index.html` + [`docs/operacao/frontend-csp-exemplo.md`](../operacao/frontend-csp-exemplo.md) |
| FE-A11Y-04 | **Resolvido** — `DocumentTitle` + `pageTitles.ts` |
| FE-A11Y-01 | **Resolvido** — skip link em `AppLayout.tsx` |
| FE-UX-004 | **Resolvido (listas agenda)** — `DashboardAppointments.tsx` usa `EmptyState` |
| FE-SEC-002 | **Parcial** — `RoleRestrictedRoute` só em `/reports`; `/company` e `/employees` mantêm guard em página |
| FE-A11Y-02 / FE-A11Y-03 | **Resolvido** — `prefers-reduced-motion` em `index.css`; `aria-hidden` em `DashboardCard` |
| FE-PERF-003 (vendor JS) | **Resolvido** — `manualChunks` em `vite.config.ts` |
| FE-PERF-003 (CSS global) | **Aberto / piorou** — ver §4 |
| FE-PERF-004, FE-UX-002, FE-A11Y-06/07 | **Aberto** |
| FE-007 (Stage 37) | **Resolvido** — redirect via `RoleRestrictedRoute` (`EMPLOYEE` → `/`) |

### Top 5 ações sugeridas (pós-follow-up)

| # | ID | Tema | P |
|---|-----|------|---|
| 1 | FE-FU-001 | Reduzir ou particionar CSS global (~361 kB) | P2 |
| 2 | FE-FU-002 | Unificar cópia PT + localizar "Logout" / "Você" / "cadastrar" | P2 |
| 3 | FE-FU-003 | `EmptyState` na distribuição por estado do dashboard | P2 |
| 4 | FE-FU-005 | Estender `RoleRestrictedRoute` a `/company` e `/employees` | P3 |
| 5 | FE-FU-006 | Adicionar ESLint + typescript-eslint ao `client/` | P3 |

**Refresh O5 (já existe):** auto-actualização por visibilidade de aba — **não refactorizar** `useDashboardVisibilityRefresh` / `dashboardRefresh` / fluxo `refreshDashboard` sem branch dedicada (ver Guia legível acima).

---

## 2. Baseline técnica (executada nesta auditoria)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | Exit **0** |
| `npm run build` | Exit **0** — sem aviso de chunk > 500 kB no bundle único |
| `npm test` | Exit **0** — **140** ficheiros, **1649** testes, ~428 s (Vitest **4.1.11**) |

### Comparação com auditoria de 23/11/2026

| Métrica | 23/11/2026 | 24/11/2026 (follow-up) |
|---------|------------|-------------------------|
| HEAD | `d010de4` | `e2ddd544` |
| Testes | 1642 / 137 ficheiros | **1649** / **140** (+7 testes, +3 ficheiros) |
| Chunk JS principal | 625.36 kB (monolítico) | `vendor-react` **231.98 kB** + `index` **36.23 kB** (+ chunks por rota) |
| CSS bundle | 280.02 kB (39.73 kB gzip) | **361.16 kB** (**54.47 kB** gzip) |
| Lazy routes | 0 | Todas as páginas em `AppRoutes.tsx` |
| `bootstrap-icons` | Ausente | Presente |

### Build — assets de produção (seleção)

| Ficheiro | Tamanho | Gzip (build) |
|----------|---------|----------------|
| `dist/index.html` | 0.85 kB | — |
| `dist/assets/index-*.css` | **361.16 kB** | **54.47 kB** (medido localmente) |
| `dist/assets/vendor-react-*.js` | 231.98 kB | 74.41 kB |
| `dist/assets/index-*.js` (shell) | 36.23 kB | 11.95 kB |
| `dist/assets/vendor-luxon-*.js` | 71.39 kB | 22.23 kB |
| `dist/assets/vendor-axios-*.js` | 51.44 kB | 19.49 kB |
| `dist/assets/AppointmentsPage-*.js` | 49.85 kB | 14.55 kB |
| `dist/assets/DashboardPage-*.js` | 12.13 kB | 4.12 kB |
| `dist/assets/CompanyPage-*.js` | 10.27 kB | 3.63 kB |

Aviso npm `Unknown env config "devdir"` — não afetou exit codes.

---

## 3. Inventário (delta desde 23/11)

| Item | 23/11 | 24/11 |
|------|-------|-------|
| `index.css` (linhas) | ~2336 | **~2367** (+ estilos dashboard distribuição, empresa, etc.) |
| Path alias `@/` | Definido, não usado | **Inalterado** (0 imports `from "@/..."`) |
| ESLint / Prettier | Ausente | **Ausente** em `client/` |
| Testes dedicados novos (exemplos) | — | `DashboardStatusDistribution.test.tsx`, `DocumentTitle.test.tsx`, `RoleRestrictedRoute.test.tsx`, `companyPermissions.test.ts`, … |

### Novas áreas funcionais revistas

| Área | Ficheiros | Avaliação resumida |
|------|-----------|-------------------|
| Distribuição por estado (dashboard) | `DashboardStatusDistribution.tsx`, `DashboardPage.tsx`, `index.css` (~L1149+) | Testes dedicados; vazio com `<p>` inline (não `EmptyState`); mapa `APPOINTMENT_STATUS_PROGRESS_BAR_CLASS` duplicado vs. `appointmentStatus.ts` |
| Empresa (lifecycle / delete / logo) | `CompanyPage.tsx`, `companyPermissions.ts`, `StaffCompanySuspendedView.tsx` | RBAC alinhado ao backend; delete com `completeSessionLogout`; testes extensos (`CompanyPage.test.tsx`, `CompanyPage.logo.test.tsx`) |
| Agendamentos (tick UI) | `useAppointmentsUiTick.ts`, `appointmentCalendar.ts`, `AppointmentsPage.tsx` | Tick 30 s documentado; calendário com testes ampliados |
| Títulos de documento | `DocumentTitle.tsx`, `pageTitles.ts` | Rotas estáticas + prefixos `/agendar/*`, `/convite/*`; fallback título app |

---

## 4. Performance

### Síntese pós-onda

| ID | Título | Estado 24/11 |
|----|--------|--------------|
| FE-PERF-001 | Chunk JS monolítico > 500 kB | **Resolvido** |
| FE-PERF-002 | Sem lazy-loading de rotas | **Resolvido** |
| FE-PERF-003 (JS vendors) | `manualChunks` | **Resolvido** |
| FE-PERF-003 (CSS) | CSS global pesado | **Aberto — aumentou** |
| FE-PERF-004 | Sem cache client-side | **Aberto** |
| FE-PERF-005 | Timers UI (tick, dashboard refresh O5 por visibilidade) | **Estável** — implementado; não refactorizar sem branch O5 |

### FE-FU-001 — CSS global

**Evidência:** `main.tsx` importa Bootstrap completo + `bootstrap-icons` + `index.css` + `appointments-calendar.css` em todas as rotas.

**Hipótese do crescimento:** novos blocos (dashboard status distribution, empresa, responsivo) em `index.css` sem remoção de CSS morto; `bootstrap-icons` no critical path.

**Aceitação sugerida:** medir antes/depois; opcional purge ou split por rota; documentar decisão de manter Bootstrap full.

### Evidência lazy + chunks

- [`client/src/routes/AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx): `lazy()` + `RouteSuspense` para todas as páginas.
- [`client/vite.config.ts`](../../client/vite.config.ts): `vendor-react`, `vendor-redux`, `vendor-luxon`, `vendor-axios`.

---

## 5. Segurança (camada browser / SPA)

### Síntese

| ID | Estado 24/11 |
|----|--------------|
| FE-SEC-001 | **Resolvido (doc/deploy)** — sem meta CSP em dev (intencional) |
| FE-SEC-002 | **Parcial** — `/reports` com `RoleRestrictedRoute`; outras rotas sensíveis com alerta ou redirect em layout |

### Padrões confirmados

| Tema | Evidência |
|------|-----------|
| Sessão HttpOnly | `apiClient.ts` `withCredentials: true` |
| XSS | grep `dangerouslySetInnerHTML` em `src/`: **0** |
| RBAC CLIENT vs admin | `AppLayout.tsx` L117–121: CLIENT fora de `/portal` → redirect; staff fora do portal → `/` |
| Empresa | `getCompanyAbilities` espelha RBAC; API continua autoridade |

### FE-SEC-002 — comportamento por rota

| Rota | Comportamento actual |
|------|----------------------|
| `/reports` | `RoleRestrictedRoute` + `getReportAbilities` — redirect `/` |
| `/company` | `CompanyPage` alerta "Você não tem permissão…" (MANAGER/EMPLOYEE); CLIENT nunca chega (redirect layout) |
| `/employees` | Guard em página (padrão semelhante) |
| Menu | `menu.ts` oculta itens por role — defesa UX, não substituto de API |

---

## 6. UX e consistência

### FE-UX-001 / FE-UX-003 / FE-UX-004

| ID | Estado |
|----|--------|
| FE-UX-001 | **Resolvido** |
| FE-UX-003 (`document.title`) | **Resolvido** via `DocumentTitle` |
| FE-UX-004 | **Resolvido** em listas de agenda no dashboard; **parcial** em `DashboardStatusDistribution` (texto muted) |

### FE-UX-002 / FE-FU-002 — locale e cópia

- Formatadores numéricos/data: **`pt-PT`** (`ReportsPage`, `ServicesPage`, `DashboardStatusDistribution`, etc.) — consistente entre si.
- Cópia UI mista: ocorrências de **"Você"**, **"cadastrar"**, **"Logout"** em dezenas de ficheiros (produção + testes); exemplos: `Navbar.tsx` ("Logout"), `CompanyPage.tsx` (permissão), `ServicesPage.tsx` (empty state).
- Títulos de página e skip link em **português europeu** ("palavra-passe", "Saltar para o conteúdo").

**Recomendação:** guia editorial único (PT-PT vs PT-BR) antes de mass replace.

### Estados de UI (atualizado)

| Padrão | Estado |
|--------|--------|
| Dashboard listas agenda | `EmptyState` em `DashboardAppointments.tsx` |
| Dashboard distribuição | Mensagem inline `Sem agendamentos no período.` |
| Auth | `spinner-border-sm` nos botões (FE-001 parcial) |
| 404 | `NotFoundPage` + navegação por role |

---

## 7. Acessibilidade

### Melhorias desde 23/11

| ID | Estado |
|----|--------|
| FE-A11Y-01 skip link | **Resolvido** |
| FE-A11Y-02 reduced motion | **Resolvido** (`index.css` ~L2358+) |
| FE-A11Y-03 ícones KPI | **Resolvido** (`DashboardCard.tsx`) |
| FE-A11Y-04 títulos | **Resolvido** |

### Lacunas persistentes e novas

| ID | Achado | P |
|----|--------|---|
| FE-A11Y-05 | Hierarquia de headings — revisão manual pendente | P2 |
| FE-A11Y-06 | Listas mobile CRUD sem landmarks explícitas | P3 |
| FE-A11Y-07 | Testes subcalendários parciais | P3 |
| FE-FU-008 | `progressbar` com `aria-valuemax={0}` quando `total === 0` em `DashboardStatusDistribution.tsx` | P3 |

### Pontos fortes mantidos

`lang="pt"`, focus trap sidebar, `PageHeader` com `<h1>`, `role="alert"`, booking `aria-live`, modais destrutivos testados.

---

## 8. Qualidade e manutenção

| Tema | Avaliação 24/11 |
|------|-----------------|
| Vitest | **1649/1649** verde |
| TypeScript strict | Mantido |
| `any` / `@ts-ignore` / `console.*` em `src/` produção | **0** (grep) |
| ESLint | **Ausente** — FE-FU-006 |
| Alias `@/` | Configurado, **não adoptado** — FE-FU-009 |
| CSS morto | **Não auditado** |
| Refresh dashboard O5 | Implementado (visibilidade + 45 s) — **não refactorizar** sem autorização |

### Nota sobre flutuação de testes

Numa execução intermédia da mesma sessão de trabalho (antes desta HEAD ou estado de working tree) foram observados **2 falhos** transitórios (`RegisterPage.test.tsx`, `AvailabilityPage.test.tsx`). Na HEAD `e2ddd544` com árvore limpa, **`npm test` terminou 1649/1649**. Registar no CI se voltarem a aparecer em flakes.

---

## 9. Reconciliação FE-001–016 (Stage 37) — actualizada

| ID | Título | 23/11 | 24/11 |
|----|--------|-------|-------|
| FE-001 | Loading admin vs auth | Parcial | **Parcial** |
| FE-002 | Reports acesso negado | Resolvido | **Resolvido** |
| FE-003 | NotFound | Resolvido | **Resolvido** |
| FE-004 | Empty states | Parcial | **Parcial** (+ distribuição dashboard) |
| FE-005 | Modais delete | Parcial | **Parcial** |
| FE-006 | RankingTable local | Aberto | **Aberto** — `ReportsPage.tsx` ~L731 |
| FE-007 | URL `/reports` | Aberto | **Resolvido** |
| FE-008 | Notificações prefs | Aberto | **Aberto** |
| FE-009 | Multi-tenant | Aberto | **Aberto** — fora MVP |
| FE-010 / FE-011 | Pagamentos / sync | N/A | **N/A** |
| FE-012 | Responsivo visual | Não verificado | **Não verificado** |
| FE-013 | ErrorState retry | Largamente resolvido | **Mantido** |
| FE-014 | Auth sem PageHeader | Aceitável | **Aceitável** |
| FE-015 | Sem `any` | Mantido | **Mantido** |
| FE-016 | Testes subcalendários | Parcial | **Parcial** |

---

## 10. Matriz §10 original — estado final

| ID | Área | Estado 24/11 |
|----|------|--------------|
| FE-UX-001 | Ícones | **Resolvido** |
| FE-PERF-001 | Chunk JS | **Resolvido** |
| FE-PERF-002 | Lazy routes | **Resolvido** |
| FE-SEC-001 | CSP | **Resolvido (doc)** |
| FE-A11Y-04 | Title | **Resolvido** |
| FE-A11Y-01 | Skip link | **Resolvido** |
| FE-UX-004 | Dashboard empty | **Resolvido** (agenda); parcial distribuição |
| FE-SEC-002 | Route guard | **Parcial** |
| FE-PERF-003 | CSS | **Aberto** |
| FE-UX-002 | PT misto | **Aberto** |
| FE-PERF-004 | Cache | **Aberto** |
| FE-A11Y-02 | Motion | **Resolvido** |
| FE-A11Y-03 | aria-hidden ícones | **Resolvido** |
| FE-A11Y-06 / 07 | Mobile / testes | **Aberto** |

---

## 11. Achados novos pós-onda (FE-FU-*)

| ID | Área | Título | S | P | Esforço | Ficheiros |
|----|------|--------|---|---|---------|-----------|
| FE-FU-001 | Perf | CSS global ~361 kB (+29% vs 23/11) | S3 | **P2** | M | `main.tsx`, `index.css` |
| FE-FU-002 | UX | Unificar PT + "Logout" / "Você" / "cadastrar" | S4 | **P2** | M | cópia UI |
| FE-FU-003 | UX | `EmptyState` em distribuição dashboard | S4 | **P2** | L | `DashboardStatusDistribution.tsx` |
| FE-FU-004 | Manutenção | Extrair `RankingTable` | S4 | P3 | M | `ReportsPage.tsx` |
| FE-FU-005 | Sec/UX | `RoleRestrictedRoute` em `/company`, `/employees` | S4 | P3 | M | `AppRoutes.tsx`, `*Permissions.ts` |
| FE-FU-006 | Qualidade | ESLint + typescript-eslint no `client/` | S4 | P3 | M | `package.json` |
| FE-FU-007 | Manutenção | Centralizar `APPOINTMENT_STATUS_PROGRESS_BAR_CLASS` | S4 | P3 | L | `appointmentStatus.ts` |
| FE-FU-008 | A11y | Progress bars com total zero | S4 | P3 | L | `DashboardStatusDistribution.tsx` |
| FE-FU-009 | Convenção | Usar ou remover alias `@/` | S4 | P3 | L | `tsconfig`, imports |

Legenda: **S** severidade (S0…S4), **P** prioridade.

---

## 12. Ondas sugeridas (pós-follow-up)

| Onda | Foco | Achados |
|------|------|---------|
| **A** | Produto visível + perf CSS | FE-FU-001 (análise), FE-FU-002 (guia + quick wins), FE-FU-003 |
| **B** | Consistência arquitectura | FE-FU-005, FE-FU-004, FE-FU-007 |
| **C** | Tooling + a11y fina | FE-FU-006, FE-FU-008, FE-FU-009 |
| **D** | Escala (inalterada) | FE-PERF-004, FE-009 |

Implementações futuras: relatório em `docs/tasks/` por ID; O5 já activo — evitar diff na zona O5 salvo branch dedicada.

---

## 13. Limitações

- Sem Lighthouse, axe, leitores de ecrã ou Percy.
- Backend revisto só onde impacta contratos do client.
- `dist/` medido localmente; não comitado.
- CSS morto não inventariado.

---

## 14. Comandos executados

```bash
git rev-parse HEAD && git branch --show-current
cd client && npm run typecheck
cd client && npm run build
cd client && npm test
```

### Grep estático (produção `client/src/**/*.ts(x)`)

```bash
# Padrões de qualidade — 0 ocorrências em produção (excl. testes na contagem manual de any/console):
rg ': any\b|as any|@ts-ignore|console\.(log|warn|error)|dangerouslySetInnerHTML' client/src
rg 'from "@/' client/src   # 0 imports
```

---

## 15. Referências cruzadas

| Documento | Relação |
|-----------|---------|
| [`frontend-complete-audit-2026-11-23.md`](./frontend-complete-audit-2026-11-23.md) | Baseline e matriz original |
| [`docs/tasks/fe-ux-001-bootstrap-icons-implementation.md`](../tasks/fe-ux-001-bootstrap-icons-implementation.md) | Entrega ícones |
| [`docs/tasks/fe-perf-002-lazy-routes-implementation.md`](../tasks/fe-perf-002-lazy-routes-implementation.md) | Entrega lazy |
| [`docs/tasks/fe-sec-002-reports-route-guard-implementation.md`](../tasks/fe-sec-002-reports-route-guard-implementation.md) | Guard reports |
| [`docs/SchedulerPro-Resumo-Geral.md`](../SchedulerPro-Resumo-Geral.md) | Contexto produto |

---

*Relatório gerado em modo read-only. Nenhum ficheiro em `client/` foi modificado para produzir este documento.*