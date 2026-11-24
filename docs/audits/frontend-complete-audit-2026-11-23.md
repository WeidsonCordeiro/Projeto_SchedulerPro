# Auditoria completa do frontend — SchedulerPro (`client/`)

| Campo | Valor |
|-------|--------|
| **Data** | 23/11/2026 |
| **Tipo** | Read-only (código do `client/` inalterado; apenas este relatório criado) |
| **Branch / HEAD** | `develop` @ `d010de4fba1b9a73b1a095715eaa721c328131df` |
| **Âmbito** | Performance, segurança (camada browser), UX e acessibilidade |
| **Referencias** | [`docs/SchedulerPro-Resumo-Geral.md`](../SchedulerPro-Resumo-Geral.md), [`docs/reports/stage-37-frontend-audit-setmore-comparison.md`](../reports/stage-37-frontend-audit-setmore-comparison.md), [`docs/reports/frontend-quality-status-2026-11-16.md`](../reports/frontend-quality-status-2026-11-16.md) |
| **Verificação visual / Lighthouse** | **Não realizada** nesta auditoria |

---

## 1. Resumo executivo

### Veredicto

**APROVADO COM OBSERVAÇÕES**

O frontend do SchedulerPro está **maduro para MVP B2B**: sessão por cookies, RBAC espelhado em `config/*Permissions.ts`, fluxos públicos de booking e convites bem testados, estados de loading/erro/vazio consolidados na maior parte das páginas admin, e suite Vitest **1642 testes / 137 ficheiros** verdes nesta HEAD.

As observações **não bloqueantes** concentram-se em **performance de entrega** (bundle monolítico ~625 kB JS minificado), **lacuna de ícones Bootstrap** (`bi-*` sem dependência `bootstrap-icons`), **hardening de CSP** no HTML estático, e melhorias incrementais de **acessibilidade e consistência editorial** (PT-BR vs PT-PT, títulos de documento).

### Top 5 ações sugeridas (P1 — por impacto / esforço)

| # | ID | Tema | Esforço |
|---|-----|------|---------|
| 1 | FE-UX-001 | Adicionar `bootstrap-icons` (CSS no `main.tsx`) ou remover referências `bi-*` | Baixo |
| 2 | FE-PERF-001 | Code-splitting de rotas (`React.lazy` + `Suspense` em `AppRoutes.tsx`) | Médio |
| 3 | FE-SEC-001 | CSP e cabeçalhos de segurança no deploy do static host (ou meta CSP mínima documentada) | Baixo–médio |
| 4 | FE-A11Y-04 | Título por rota (`document.title` / hook) | Baixo |
| 5 | FE-PERF-003 | Avaliar `manualChunks` (vendor: react, redux, luxon, bootstrap) | Médio |

**Não reabrir** sem pedido explícito: refresh O5 do dashboard (`useDashboardVisibilityRefresh`) — ver resumo geral §8.

---

## 2. Baseline técnica (executada nesta auditoria)

Comandos em `client/` na HEAD indicada.

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | Exit **0** |
| `npm run build` | Exit **0** — ver tabela de assets |
| `npm test` | Exit **0** — **137** ficheiros, **1642** testes, ~458 s (Vitest **4.1.11**) |

### Build — assets de produção

| Ficheiro | Tamanho | Gzip |
|----------|---------|------|
| `dist/index.html` | 0.41 kB | 0.27 kB |
| `dist/assets/index-*.css` | **280.02 kB** | 39.73 kB |
| `dist/assets/index-*.js` | **625.36 kB** | 184.00 kB |

Vite emitiu aviso: chunk JS **> 500 kB** após minificação; sugere `import()` dinâmico e/ou `build.rollupOptions.output.manualChunks` — confirmado ausente em [`client/vite.config.ts`](../../client/vite.config.ts).

Aviso de ambiente npm: `Unknown env config "devdir"` — não afetou exit codes.

### Comparação com documentação anterior

| Métrica | 16/11/2026 (doc) | 23/11/2026 (esta auditoria) |
|---------|------------------|----------------------------|
| Testes | 1610 | **1642** (+32) |
| Ficheiros teste | 136 | **137** |
| Chunk JS | > 500 kB (reportado) | **625.36 kB** (medido) |

---

## 3. Inventário (amostra estática)

| Item | Contagem / notas |
|------|------------------|
| Stack | React 19, Vite 7.3.7, Redux Toolkit, React Router 7, Bootstrap 5, Luxon, Axios |
| Rotas | ~22 entradas em [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx) (públicas, auth, protegidas, portal, `*`) |
| Páginas (`pages/`) | ~25 componentes de produção (+ testes dedicados) |
| Componentes (`components/`) | ~117 ficheiros `.tsx` (incl. testes) |
| Módulos API (`api/endpoints/*.ts`) | **13** módulos de produção |
| Estado global Redux | `auth` + `company` apenas |
| ESLint / Prettier | **Ausente** no `client/package.json` |
| TypeScript | `strict: true`, `noUnusedLocals`, sem `: any` em produção (grep em `src/` excl. testes: **0**) |

### Rotas (resumo)

| Grupo | Rotas |
|-------|--------|
| Público booking | `/agendar/empresa/:companyId`, `/agendar/:token`, `/agendar` |
| Convite | `/convite/cliente/:token` |
| Auth guest | `/login`, `/register`, `/forgot-password` |
| Auth link | `/reset-password`, `/verify-email`, `/change-password` |
| Admin (Protected + AppLayout) | `/`, `/clients`, `/services`, `/employees`, `/availability`, `/appointments`, `/reports`, `/company` |
| Portal CLIENT | `/portal`, `/portal/agendamentos`, `/portal/perfil` |
| Catch-all | `*` → [`NotFoundPage`](../../client/src/pages/NotFoundPage.tsx) |

---

## 4. Performance

### Síntese

| ID | Título | S | P | Esforço |
|----|--------|---|---|---------|
| FE-PERF-001 | Bundle JS único > 500 kB (625 kB medidos) | S3 | **P1** | M |
| FE-PERF-002 | Sem lazy-loading de rotas | S3 | **P1** | M |
| FE-PERF-003 | CSS global peso (~280 kB: Bootstrap completo + `index.css` ~2336 linhas + calendário) | S3 | P2 | M |
| FE-PERF-004 | Sem camada de cache de dados (fetch por página em `useEffect`) | S4 | P3 | H |
| FE-PERF-005 | Timers de UI: `useAppointmentsUiTick` 30 s; dashboard refresh visibilidade 45 s throttle | S4 | — | — |

### Evidência

- [`AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx): imports **eager** de todas as páginas; grep `React.lazy` / `Suspense` em `src/`: **0**.
- [`main.tsx`](../../client/src/main.tsx): `bootstrap/dist/css/bootstrap.min.css` + [`index.css`](../../client/src/index.css) + [`appointments-calendar.css`](../../client/src/styles/appointments-calendar.css) no critical path de todas as rotas.
- Páginas CRUD: padrão `useState` + `useCallback` + `useEffect` para listagens (ex.: [`ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx)); revisitar rota **repete** pedidos HTTP.
- `useMemo` / `useCallback`: concentrados em calendário, dashboard e pickers; listagens tabulares re-renderizam com o componente pai (aceitável para listas médias; monitorizar escala).
- Luxon e React no mesmo chunk — candidatos a `manualChunks`.

### Critérios de aceitação (futuro)

- **FE-PERF-001/002:** Após build, chunk principal < 500 kB **ou** pelo menos rotas pesadas (`appointments`, `reports`, `public`) em chunks separados; FCP perceptível melhor em cold load.
- **FE-PERF-003:** Documentar decisão Bootstrap full vs. imports parciais; opcional purge de CSS não usado (sem Tailwind, por decisão de projeto).

---

## 5. Segurança (camada browser / SPA)

### Síntese

| ID | Título | S | P | Classificação actual |
|----|--------|---|---|---------------------|
| FE-SEC-001 | Sem Content-Security-Policy no [`index.html`](../../client/index.html) | S3 | P1 | Lacuna de hardening (deploy) |
| FE-SEC-002 | RBAC UI: URL directa a `/reports` monta shell sem redirect | S4 | P2 | Defesa em profundidade parcial |
| — | Sessão / tokens | — | — | **Forte** |
| — | Multi-tenant na API client | — | — | **Forte** |
| — | XSS (`dangerouslySetInnerHTML`) | — | — | **Nenhuma ocorrência** em produção |
| — | Upload imagens | — | — | **Boa** (validação client em [`imageUpload.ts`](../../client/src/config/imageUpload.ts)) |

### Pontos fortes (confirmados)

| Tema | Evidência |
|------|-----------|
| Cookies HttpOnly | [`apiClient.ts`](../../client/src/api/apiClient.ts) `withCredentials: true`; refresh partilhado anti-loop; logout em sessão expirada |
| Tokens fora de storage | [`authSlice.ts`](../../client/src/store/slices/authSlice.ts) documenta ausência de localStorage; [`authStorage.security.test.tsx`](../../client/src/routes/authStorage.security.test.tsx) |
| `companyId` na sessão | Testes `company.api.test.ts`; [`publicBooking.api.ts`](../../client/src/api/endpoints/publicBooking.api.ts) — `companyId` só na URL pública, não no body |
| Fluxos públicos | Testes garantem tokens de link **não** persistidos (`BookingConfirmation.test.tsx`, `PublicAppointmentPage.test.tsx`) |
| Env | [`env.ts`](../../client/src/config/env.ts) — apenas `VITE_API_URL`, `VITE_APP_URL` |
| Logout completo | [`completeSessionLogout.ts`](../../client/src/app/completeSessionLogout.ts) — backend + Redux + redirect |
| Sem `console.log` em `src/` produção | grep: 0 |

### FE-SEC-001 — CSP

`index.html` contém apenas charset, viewport e título. Em produção, CSP deve ser imposta pelo reverse proxy / CDN / servidor estático; documentar política mínima (default-src 'self'; connect-src API; img-src Cloudinary; etc.).

### FE-SEC-002 — RBAC de rotas

[`ReportsPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx) L270–280: `!canView` mostra `PageHeader` + `alert-warning` (melhor que Stage 37). Menu oculta item para EMPLOYEE ([`menu.ts`](../../client/src/config/menu.ts)), mas **não há** guard de rota dedicado — API continua autoridade.

---

## 6. UX e consistência de produto

### Síntese

| ID | Título | S | P |
|----|--------|---|---|
| FE-UX-001 | Classes `bi bi-*` sem pacote `bootstrap-icons` | **S2** | **P1** |
| FE-UX-002 | Mistura lexical PT-BR ("cadastrado", "você") e PT-PT ("utilizadores") | S4 | P3 |
| FE-UX-003 | Título único "SchedulerPro" em todas as rotas | S3 | P2 |
| FE-UX-004 | Dashboard: listas vazias com mensagem inline, não `EmptyState` | S4 | P2 |

### FE-UX-001 — Ícones Bootstrap (crítico de produto visual)

- Documentação do projeto cita Bootstrap Icons ([`SchedulerPro-Resumo-Geral.md`](../SchedulerPro-Resumo-Geral.md) §3).
- [`package.json`](../../client/package.json): **sem** `bootstrap-icons`; `package-lock.json`: **sem** entrada.
- Uso em produção: [`DashboardCard.tsx`](../../client/src/components/common/DashboardCard.tsx), KPIs em [`DashboardPage.tsx`](../../client/src/pages/reports/ReportsPage.tsx), chevron em [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx), etc.
- **Impacto:** ícones decorativos provavelmente **invisíveis** no browser; testes RTL apenas verificam presença do elemento `<i class="bi ...">`, não o glifo.

**Aceitação:** `npm i bootstrap-icons` + `import "bootstrap-icons/font/bootstrap-icons.css"` em `main.tsx`, ou substituir por SVG/unicode e remover classes `bi`.

### Estados de UI (vs. Stage 37)

| Padrão | Estado actual |
|--------|----------------|
| Loading admin | Predominante [`LoadingState`](../../client/src/components/common/LoadingState.tsx) |
| Erro admin | [`ErrorState`](../../client/src/components/common/ErrorState.tsx) com `onRetry` na maioria das páginas |
| Excepções | Auth: `spinner-border-sm` no botão; [`ClientInvitePage`](../../client/src/pages/public/ClientInvitePage.tsx): spinner standalone |
| 404 | [`NotFoundPage`](../../client/src/pages/NotFoundPage.tsx) + `EmptyState` |
| Relatórios sem dados | `EmptyState` quando `overview.total === 0` (L398–402) |
| Dashboard listas vazias | Texto muted em card ([`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) L206–209) |

### Timezone

- Redux: `selectCompanyTimezone`, sync em `loadSessionCompany` / `companySlice`.
- Fallback: [`APPOINTMENT_TIMEZONE`](../../client/src/config/appointmentTime.ts) = `Europe/Lisbon`; registo default em [`RegisterPage.tsx`](../../client/src/pages/RegisterPage.tsx).
- Alinhado ao backlog do resumo geral (timezone dinâmico multi-região).

---

## 7. Acessibilidade

**Nota:** análise **estática** + testes existentes; sem NVDA/VoiceOver, axe ou Lighthouse.

### Pontos fortes

| Área | Evidência |
|------|-----------|
| `lang` | [`index.html`](../../client/index.html) `lang="pt"` |
| Layout mobile | [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx): `inert` no `main`, focus trap Tab na sidebar, Escape, `aria-label` em fechar menu |
| Cabeçalhos | [`PageHeader`](../../client/src/components/common/PageHeader.tsx) usa `<h1>` por página |
| Alertas | `role="alert"` em erros/sucesso (ampla cobertura) |
| Booking | [`BookingProgressSteps.tsx`](../../client/src/components/public/booking/BookingProgressSteps.tsx): `aria-live="polite"` |
| Calendário | `aria-live="polite"` no label de período ([`AppointmentsViewSwitcher.tsx`](../../client/src/components/appointments/AppointmentsViewSwitcher.tsx)) |
| Modais destrutivos | [`DestructiveConfirmModal`](../../client/src/components/common/DestructiveConfirmModal.tsx): foco opcional, Escape configurável |
| Avatares | [`ImageAvatar.tsx`](../../client/src/components/common/ImageAvatar.tsx): padrão `alt=""` decorativo documentado |

### Lacunas catalogadas

| ID | Achado | S | P |
|----|--------|---|---|
| FE-A11Y-01 | Sem link "saltar para o conteúdo" | S3 | P2 |
| FE-A11Y-02 | Sem `@media (prefers-reduced-motion)` apesar de `transition` em CSS (ex. `index.css` L1475) | S4 | P3 |
| FE-A11Y-03 | Ícones `<i class="bi ...">` sem `aria-hidden` em `DashboardCard` | S4 | P3 |
| FE-A11Y-04 | Sem `document.title` por rota | S3 | P2 |
| FE-A11Y-05 | Páginas com múltiplos `<h2>` após `<h1>` do `PageHeader` — aceitável se hierarquia for lógica; revisão manual pendente (FE-012) | S4 | P2 |
| FE-A11Y-06 | Cards mobile (`entity-list-mobile`) sem landmarks/list semantics explícitas; conteúdo legível por texto visível | S4 | P3 |
| FE-A11Y-07 | Testes a11y fortes em auth/booking; subcalendários cobertos sobretudo via `CalendarView` / `DayView` / `WeekView` — não `WeekCalendar.tsx` isolado | S4 | P3 |

---

## 8. Qualidade e manutenção

| Tema | Avaliação |
|------|-----------|
| Suite Vitest | **1642/1642** — regressão não detetada nesta HEAD |
| Tipagem | Strict; sem `any` em produção |
| Modais delete | Consolidados sobre `DestructiveConfirmModal` (FE-005 **parcialmente** melhorado vs. copy-paste Bootstrap puro) |
| Testes de componentes | Lacunas menores: `SidebarItem`, calendários de baixo nível — ver §9 FE-016 |
| CSS morto | Não auditado |
| Refresh dashboard O5 | Implementação e testes estáveis — **não alterar** sem autorização |

---

## 9. Reconciliação FE-001–016 (Stage 37)

| ID | Título original | Estado 23/11/2026 | Evidência |
|----|-----------------|-------------------|-----------|
| FE-001 | Loading/erro admin vs público | **Parcial** | `LoadingState`/`ErrorState` na maioria admin; auth/convite ainda `spinner-border` |
| FE-002 | Reports cabeçalho acesso negado | **Resolvido** | `ReportsPage.tsx` L270–280 + `PageHeader` |
| FE-003 | Catch-all redirect `/` | **Resolvido** | `NotFoundPage` em `path="*"` |
| FE-004 | Empty states dashboard/relatórios/disponibilidade | **Parcial** | Reports: `EmptyState`; Dashboard agenda: texto inline; Availability: grelha sempre visível |
| FE-005 | Modais delete duplicados | **Parcial** | `DestructiveConfirmModal` + wrappers `Delete*Modal` por entidade |
| FE-006 | `RankingTable` local | **Aberto** | `ReportsPage.tsx` |
| FE-007 | URL `/reports` sem permissão | **Aberto** | UI de aviso; sem route guard |
| FE-008 | Notificações sem preferências UI | **Aberto** | `NotificationBell` apenas |
| FE-009 | Multi-empresa / troca tenant | **Aberto** | Documentado — fora MVP |
| FE-010 | Pagamentos | **N/A** | Produto |
| FE-011 | Sync calendário externo | **N/A** | Produto |
| FE-012 | Verificação visual responsiva | **Não verificado** | Fora de âmbito |
| FE-013 | ErrorState sem retry no admin | **Largamente resolvido** | CRUD, dashboard, portal, company com `onRetry` |
| FE-014 | Auth sem PageHeader | **Aceitável** | Intencional |
| FE-015 | Sem `any` em src | **Mantido** | grep produção: 0 |
| FE-016 | Subcalendários sem teste dedicado | **Parcial** | `WeekView`/`DayView`/`CalendarView`/`MonthCalendar.test.tsx`; `WeekCalendar.tsx` direto: não |

---

## 10. Matriz consolidada de achados (novos + persistentes)

Legenda: **S** severidade (S0 crítico … S4 baixo), **P** prioridade (P0 … P3).

| ID | Área | Título | S | P | Esforço | Ficheiros / área |
|----|------|--------|---|---|---------|------------------|
| FE-UX-001 | UX | Ícones `bi-*` sem `bootstrap-icons` | S2 | **P1** | L | `DashboardCard`, `DashboardPage`, `package.json` |
| FE-PERF-001 | Perf | Chunk JS 625 kB | S3 | **P1** | M | `vite.config.ts`, `AppRoutes.tsx` |
| FE-PERF-002 | Perf | Sem code-splitting de rotas | S3 | **P1** | M | `AppRoutes.tsx` |
| FE-SEC-001 | Sec | Sem CSP no HTML estático | S3 | **P1** | L–M | `index.html`, deploy |
| FE-A11Y-04 | A11y | Título de documento por rota | S3 | P2 | L | `App.tsx` ou hook por página |
| FE-A11Y-01 | A11y | Skip link | S3 | P2 | L | `AppLayout.tsx` |
| FE-UX-004 | UX | Dashboard empty não usa `EmptyState` | S4 | P2 | L | `DashboardAppointments.tsx` |
| FE-SEC-002 | Sec | Route guard RBAC opcional | S4 | P2 | M | `routes/`, `*Permissions.ts` |
| FE-PERF-003 | Perf | CSS 280 kB global | S3 | P2 | M | `main.tsx`, `index.css` |
| FE-UX-002 | UX | PT-BR / PT-PT misturado | S4 | P3 | M | Cópia UI |
| FE-PERF-004 | Perf | Sem cache HTTP client-side | S4 | P3 | H | páginas CRUD / RTK Query |
| FE-A11Y-02 | A11y | `prefers-reduced-motion` | S4 | P3 | L | `index.css` |
| FE-A11Y-03 | A11y | `aria-hidden` em ícones decorativos | S4 | P3 | L | `DashboardCard` |
| FE-A11Y-06 | A11y | Semântica listas mobile | S4 | P3 | M | páginas CRUD |
| FE-A11Y-07 | A11y | Cobertura teste subcalendários | S4 | P3 | M | `components/appointments/` |

---

## 11. Ondas sugeridas para Cursor Agent (não executadas)

| Onda | Foco | Achados |
|------|------|---------|
| **1** | Correções rápidas visíveis + perf inicial | FE-UX-001, FE-PERF-002 (lazy mínimo: appointments + reports + public), FE-A11Y-04 |
| **2** | UX + segurança deploy | FE-SEC-001 (doc + headers exemplo), FE-UX-004, FE-SEC-002 (guard reports opcional), FE-A11Y-01 |
| **3** | Consolidação | FE-PERF-003, FE-005 wrappers → props em `DestructiveConfirmModal`, FE-UX-002, FE-A11Y-02/03 |
| **4** | Escala / produto | FE-PERF-004, FE-009, integrações Setmore-like (fora MVP) |

Cada implementação futura deve gerar relatório em `docs/tasks/` conforme processo do projeto.

---

## 12. Limitações da auditoria

- Sem validação em browser real, leitores de ecrã, Lighthouse ou Percy.
- Backend (Helmet, rate limits, JWT) revisto apenas onde impacta contratos do client.
- `dist/` gerado localmente para medição; não comitado.
- Políticas de concorrência/transações e refresh O5 do dashboard não reavaliados.

---

## 13. Comandos executados

```bash
cd client && npm run typecheck
cd client && npm run build
cd client && npm test
git rev-parse HEAD && git branch --show-current
```

Análise estática adicional: leitura/grep em `client/src/` (rotas, apiClient, permissões, componentes comuns, páginas principais).

---

## 14. CONTEXTO PARA A PRÓXIMA IA

**Estado:** Auditoria read-only concluída. Frontend **apto para evolução incremental**; prioridade máxima recomendada: **FE-UX-001** (ícones) e **FE-PERF-001/002** (bundle).

**Primeira tarefa sugerida (após aprovação do utilizador):** corrigir FE-UX-001 — adicionar `bootstrap-icons` e import CSS em [`client/src/main.tsx`](../../client/src/main.tsx); correr `npm test` em ficheiros que referenciam `.bi-`; validar visualmente dashboard e relatórios.

**Ficheiros de referência obrigatória:**

- Rotas: [`client/src/routes/AppRoutes.tsx`](../../client/src/routes/AppRoutes.tsx)
- HTTP/sessão: [`client/src/api/apiClient.ts`](../../client/src/api/apiClient.ts)
- Layout/a11y: [`client/src/components/layout/AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx)
- Padrões UI: [`client/src/components/common/LoadingState.tsx`](../../client/src/components/common/LoadingState.tsx), [`ErrorState.tsx`](../../client/src/components/common/ErrorState.tsx), [`EmptyState.tsx`](../../client/src/components/common/EmptyState.tsx)
- Build: [`client/vite.config.ts`](../../client/vite.config.ts)

**Não fazer sem pedido:** alterar `useDashboardVisibilityRefresh`, contratos API de datas/timezone (Stage 36), políticas de refresh O5.

---

## 15. Confirmação read-only

- Nenhum ficheiro em `client/` alterado nesta auditoria.
- Nenhum commit, merge ou push executado pelo auditor.
- Único artefacto criado: este ficheiro.