# Stage 47 — Validação visual mobile do frontend

Data: 20/10/2026  
Branch: `feature/stage-47-mobile-visual-validation` (base: `develop` @ `b67ac61`, Stage 46 / PR **#88** merged)  
HEAD: `b67ac61978c6735828bec25fa9a2f90938c4ba18`  
`git status`: branch limpa; apenas este relatório (sem diff de código).  
Sem commit, merge ou push.

## 1. Objetivo

Exercitar a matriz **M1–M8** em viewport **390×844** (CDP `Emulation.setDeviceMetricsOverride`, `mobile: true`), com conta **OWNER** (`weidson.acc@gmail.com`) e **CLIENT** (`weidson.ac525@gmail.com`). Credenciais apenas no ambiente local — **não documentadas aqui**.

Relatórios de contexto lidos: Stage **37** (auditoria / FE backlog), **44** (público), **45** (autenticado desktop + pendências mobile P1), **46** (`NotFoundPage` + `isInitializing` → `FullPageLoader`).

## 2. Git e merges 38–46

| Commit | Notas |
|--------|--------|
| `b67ac61` | Merge PR #88 — Stage 46 |
| `3cccb3e` | Merge PR #87 — Stage 45 |
| `12fae73` | Merge PR #86 — Stage 44 |
| `131119c` | Merge PR #85 — Stage 43 (`NotFoundPage`) |
| … | #80–#84 — Stages 38–42 em `develop` |

## 3. Ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Browser | MCP `cursor-ide-browser` (Chromium), tab bloqueada durante OWNER/CLIENT |
| Emulação | 390×844, touch habilitado |
| API | http://localhost:3000/ (health 200) |
| Frontend | http://localhost:5173/ (Vite) |

## 4. Legenda

**A** Aprovado · **P** Problema visual (sem regressão funcional) · **R** Regressão funcional · **NV** Não verificável

Colunas **Desktop (44–45)** resumem o que já constava nos relatórios anteriores; **Mobile (47)** é o resultado desta sessão.

## 5. Matriz M1–M8

| ID | Cenário | Desktop (44–45) | Mobile (47) | Evidência / notas |
|----|---------|-----------------|-------------|-------------------|
| **M1** | Shell admin (navbar, drawer, overflow body) | G1 **A** (OWNER desktop); drawer OWNER mobile **NV** na 45 | **A** | `stage-47-m1-shell-dashboard-mobile.png`, `stage-47-m1-drawer-open-mobile.png` — “Abrir menu”, links de navegação, badge notificações (23), logout sem corte; navegação para `/clients` OK. Sem scroll horizontal no `body` observado. |
| **M2** | Tabelas `/clients` | G3 **A** desktop; mobile **NV** na 45 | **P** (leve) | `stage-47-m2-clients-table-mobile.png` — `.table-responsive` com scroll interno e ações por linha **A**; coluna **EMAIL** com quebra agressiva de endereços longos (legibilidade). Sem **R**. |
| **M3** | Agenda `/appointments` (Mês, Semana, Dia, Lista) | A1 **A** parcial desktop; mobile admin **NV** na 45 | **A** (lista **P** leve) | `stage-47-m3-appointments-month-mobile.png`, `-week-`, `-day-`, `-list-`. Toolbar e vistas alternam corretamente. Mês/semana mostram grelha com colunas adicionais via scroll horizontal (esperado). Vista **lista**: tabela útil mas cabeçalho “FUNCIONÁRIO” truncado no primeiro frame — scroll horizontal da tabela não revalidado pixel a pixel. Loading/erro API: **NV** (não simulado). |
| **M4** | `+N mais` (`MonthCalendar`, `.calendar-overflow`) | A4 **NV** desktop | **NV** | Dia **19/10/2026** com **3** marcações visíveis; `MAX_VISIBLE_ITEMS = 4` — sem overflow “{n} mais”. Não alterar limites sem dados com ≥5 marcações/dia. |
| **M5** | Notificações (lista longa) | G2 **A** desktop; mobile **NV** na 45 | **A** | `stage-47-m5-notifications-mobile.png` — painel `position: fixed`, scroll interno, “Marcar todas como lidas”; sem scroll duplo evidente em `main`. |
| **M6** | Portal CLIENT (`/portal`, agendamentos, perfil) | S3 **A** desktop; mobile portal drawer **A** na 45; rotas mobile **NV** | **A** | `stage-47-m6-portal-home-mobile.png`, `-agendamentos-`, `-perfil-mobile-v2.png`. Drawer CLIENT com logout. Filtros “Próximos”/“Passados” com quebra de linha no texto (**P** cosmético). |
| **M7** | Modais destrutivos (cancelar) | M1–M2 modais **A** desktop | **A** | `stage-47-m7-modal-client-delete-mobile.png`, `-service-delete-` — `DestructiveConfirmModal` legível, botões Cancelar/Excluir; cancelado sem persistir. |
| **M8** | Login + 404 convidado/staff | N1 **A** convidado; staff reload **NV** na 45/46 | **A** | `stage-47-m8-login-mobile.png`; convidado `stage-47-m8-404-guest-mobile.png` (“Ir para o início”, footer público); staff SPA `stage-47-m8-404-staff-spa-mobile.png` (“Ir para o painel”, **sem** footer público). Hard reload na mesma URL com cookie: 404 staff direto (loader `isInitializing` demasiado breve para captura — comportamento alinhado à Stage 46). |

### Suporte automatizado (não substitui inspeção visual)

- `CalendarView.test.tsx` / overflow `.calendar-overflow` — regras de disposição cobertas em Vitest; inspeção mobile do texto “N mais” permanece **NV** (dados).
- `NotFoundPage.test.tsx` / `AppRoutes.test.tsx` — loader em `isInitializing` (Stage 46).

## 6. Problemas P confirmados (sem correção nesta stage)

| ID | Observação | Causa provável | Ação |
|----|------------|----------------|------|
| M2-P1 | E-mail na tabela de clientes parte em várias linhas | Largura de coluna fixa vs. conteúdo longo em 390px | Documentar; possível `word-break` / priorizar scroll horizontal — **fora do diff** (sem **R**) |
| M3-P1 | Lista de agendamentos: coluna funcionário truncada no viewport | Tabela larga em mobile | Verificar scroll `.table-responsive` em follow-up |
| M6-P1 | Labels dos filtros do portal quebram (“Próxim/os”) | Botões segmentados estreitos | CSS pontual em portal (opcional) |

Nenhum **R** reproduzível ligado a Stages 38–46 que justificasse patch imediato sem redesign.

## 7. Correções de código

**Nenhuma.** Critério da spec: diff mínimo só com **P/R** reproduzível e correção clara; itens acima são cosméticos ou **NV** (M4).

## 8. Screenshots (paths locais, não versionados)

Diretório: `%TEMP%\cursor\screenshots\`

- `stage-47-m1-shell-dashboard-mobile.png`
- `stage-47-m1-drawer-open-mobile.png`
- `stage-47-m2-clients-table-mobile.png`
- `stage-47-m3-appointments-month-mobile.png`
- `stage-47-m3-appointments-week-mobile.png`
- `stage-47-m3-appointments-day-mobile.png`
- `stage-47-m3-appointments-list-mobile.png`
- `stage-47-m5-notifications-mobile.png`
- `stage-47-m7-modal-client-delete-mobile.png`
- `stage-47-m7-modal-service-delete-mobile.png`
- `stage-47-m8-login-mobile.png`
- `stage-47-m8-404-guest-mobile.png`
- `stage-47-m8-404-staff-spa-mobile.png`
- `stage-47-m6-portal-home-mobile.png`
- `stage-47-m6-portal-agendamentos-mobile.png`
- `stage-47-m6-portal-perfil-mobile-v2.png` (substitui captura intermédia `-perfil-mobile.png`)

## 9. Testes, typecheck e build

Sem alterações de código: baseline **1278** testes client (Stage 46) — **não reexecutado** nesta stage.

## 10. Pendências NV / follow-up

| Item | Notas |
|------|--------|
| M4 `+N mais` | Requer dia com >4 marcações na BD |
| M3 estados loading/erro | Falha de API não simulada no MCP |
| 404 staff dentro do `app-shell` | Pendência de produto (Stage 43) |
| Comparação PDF Setmore (Stage 37) | Fora do escopo |
| P cosméticos M2/M3/M6 | Opcional onda FE consistência |

## 11. Conclusão

Validação mobile **substancialmente concluída**: M1, M2 (com ressalva P leve), M3 (quatro vistas), M5–M8 (smoke) e M6 exercitados em 390×844 com evidência. **M4** e estados de erro da agenda permanecem **NV** por dados/ambiente. Nenhuma regressão **R** face às Stages 44–46.

## 12. Preservação

- [x] Sem alterações a `appointmentCalendar.ts`, auth, API, RBAC.
- [x] Sem senhas ou tokens no relatório.
- [x] Sem commit/merge/push.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Branch:** `feature/stage-47-mobile-visual-validation` @ `b67ac61`; relatório em `docs/reports/stage-47-mobile-visual-validation.md`.
- **Testes client:** **1278** (Stage 46); typecheck/build OK no último código merged — reexecutar só após patches.
- **Mobile admin P1 da Stage 45:** coberto (G1–G3, G2, agenda, modais); pendência principal restante = **M4** com dados densos e polish cosmético tabelas/filtros portal.
- **404:** staff fora do `app-shell` continua aceite; loader em bootstrap validado em testes + smoke staff SPA/reload.
- **Próximo passo sugerido:** PR só com este relatório, ou micro-PR CSS (email/tabs portal) se o utilizador priorizar **P** cosméticos; opcional seed de marcações para validar `.calendar-overflow` em mobile.
