# Auditoria de sincronização documental — SchedulerPro

**Data da auditoria:** 2026-11-16  
**Tipo:** Read-only (único ficheiro criado; sem alterações a código, testes, config ou documentação existente)  
**Operações Git de escrita:** nenhuma

---

## 1. Git — início e fim

| Campo | Início | Fim |
|-------|--------|-----|
| Branch | `develop` | `develop` |
| HEAD | `35856e752f529fd6663b4207c3f981500b5c944a` | **Idêntico** |
| Tracking | `origin/develop` (up to date) | idem |
| Working tree | Limpo | Limpo + **este relatório** (untracked até commit) |

**Commits recentes relevantes:** merge PR #142 (estabilização O5 F1–F4), PR #141 (ListView T3/T4), validações documentais intermédias.

---

## 2. Âmbito inspecionado

### 2.1 Inventário global `docs/`

| Pasta | Ficheiros (aprox.) |
|-------|-------------------|
| `docs/tasks/` | 35 `.md` + 1 `.txt` |
| `docs/audits/` | 11 `.md` |
| `docs/reports/` | 141 `.md` |
| **Total** | **188** (187 `.md` + 1 `.txt`) |

### 2.2 Documentos analisados em profundidade (Tier 1 — canónico)

| # | Documento | Área |
|---|-----------|------|
| 1 | [`docs/tasks/ROADMAP_AUDIT_2026-11-11.md`](ROADMAP_AUDIT_2026-11-11.md) | Roadmap / O1–O7 / E1–E4.1 |
| 2 | [`docs/audits/ROADMAP_AUDIT_2026-11-11.md`](../audits/ROADMAP_AUDIT_2026-11-11.md) | Stub → tasks |
| 3 | [`docs/audits/roadmap-audit-post-o6.md`](../audits/roadmap-audit-post-o6.md) | Pós-O6 |
| 4 | [`docs/reports/schedulerpro-dashboard-o1-active-clients.md`](../reports/schedulerpro-dashboard-o1-active-clients.md) | O1 |
| 5 | [`docs/reports/schedulerpro-dashboard-o2-status-distribution.md`](../reports/schedulerpro-dashboard-o2-status-distribution.md) | O2 |
| 6 | [`docs/reports/schedulerpro-dashboard-o5-refresh.md`](../reports/schedulerpro-dashboard-o5-refresh.md) | O5 |
| 7 | [`docs/audits/dashboard-o5-refresh-audit.md`](../audits/dashboard-o5-refresh-audit.md) | O5 auditoria |
| 8 | [`docs/tasks/appointment-expiration-documentation-sync.md`](appointment-expiration-documentation-sync.md) | E1–E4.1 sync |
| 9 | [`docs/tasks/appointment-expiration-documentation-validation.md`](appointment-expiration-documentation-validation.md) | E validação |
| 10 | [`docs/audits/appointment-expiration-audit.md`](../audits/appointment-expiration-audit.md) | Expiration |
| 11 | [`docs/tasks/o6-appointment-visibility-by-role.md`](o6-appointment-visibility-by-role.md) | O6 |
| 12 | [`docs/audits/appointment-visibility-by-role-audit.md`](../audits/appointment-visibility-by-role-audit.md) | O6 |
| 13 | [`docs/tasks/o7-appointment-write-scope-by-role.md`](o7-appointment-write-scope-by-role.md) | O7 |
| 14 | [`docs/audits/o7-appointment-write-scope-audit.md`](../audits/o7-appointment-write-scope-audit.md) | O7 |
| 15 | [`docs/tasks/company-management-e1-api-permissions.md`](company-management-e1-api-permissions.md) | Company E1 |
| 16 | [`docs/tasks/company-management-e2-soft-delete-ui.md`](company-management-e2-soft-delete-ui.md) | Company E2 |
| 17 | [`docs/reports/schedulerpro-timezone-picker-step-6-4b-6-final-validation.md`](../reports/schedulerpro-timezone-picker-step-6-4b-6-final-validation.md) | Timezone (amostra) |
| 18 | [`client/.env.example`](../../client/.env.example) / [`server/.env.example`](../../server/.env.example) | Config |

**Tier 2 (amostra Nov 2026 — qualidade / flakes):** 14 relatórios em `docs/tasks/` (`frontend-final-quality-audit`, `frontend-suite-flakes-diagnostic`, `frontend-suite-post-t3-t4-validation`, `appointments-listview-date-tests-fix`, `dashboard-o5-*`, etc.).

**Total documentos com leitura ou cruzamento explícito:** **32** Tier 1/2 + inventário dos **188** restantes por título/pasta.

### 2.3 Funcionalidades verificadas no código (`develop` @ `35856e7`)

| ID | Verificação | Evidência código |
|----|-------------|------------------|
| O1 | KPI clientes ativos | `server/src/modules/dashboard/repositories/DashboardRepository.ts` — `countActiveClients`; consumido em `DashboardService.ts` |
| O2 | Distribuição por estado | `findStatusCounts`; UI `client/src/pages/dashboard/DashboardStatusDistribution.tsx` |
| O5 | Refresh visibilidade 45 s | `client/src/config/dashboardRefresh.ts` — `DASHBOARD_AUTO_REFRESH_MIN_MS = 45_000`; `useDashboardVisibilityRefresh.ts`; `DashboardPage.tsx` — `refreshDashboard`, `loadGenerationRef`, `dashboard-refresh-warning` |
| O5 tests | Bloco 13 + stabilização F1–F4 | `DashboardPage.test.tsx` — `describe("automatic refresh (O5)")` L1057+; `waitForDashboardReady`, `mockReset` no `beforeEach` (pós-PR #142) |
| O6 | Escopo leitura | `server/src/modules/appointments/utils/appointment-read-scope.ts` |
| O7 | Escrita por role | `server/src/modules/appointments/utils/appointment-write-access.ts` — `assertEmployeePatchAllowed` |
| E4 | GET sem expiração | `AppointmentService.findAll` L720–736 — `void now`; só `findByCompanyId` + mapper |
| E2/E2.1 | Scheduler + shutdown | `AppointmentExpirationScheduler` em `server.ts` L39 `start()`, L58 `await stop()` |
| E3/E4.1 | Testes Mongo | `appointment-expiration-full-cycle.mongo.test.ts`, `find-all-no-expiration.mongo.test.ts` |
| Expire método legacy | `expireOverdueScheduled` ainda no service L747 | Alinhado com nota de risco no ROADMAP |
| Appointments UI passado | Visualizar vs Editar | `AppointmentsListView.tsx` L178 — `isInstantInPast(appointment.startAt)` |
| ListView T3/T4 | Datas futuras | `AppointmentsListView.test.tsx` — `futureAppointmentTimes()` |
| Company E2 | Soft delete UI | `CompanyPage.test.tsx` L490 — `describe("soft delete")` |
| Env | Mongo | `server/src/config/env.ts` — `MONGO_URI: process.env.MONGO_URI!` ↔ `server/.env.example` |
| Client API | Proxy dev | `client/.env.example` — `VITE_API_URL=/api`; `vite.config.ts` proxy `/api` → `:3000` |
| Execução | Scripts | `client/package.json` — `npm test`, `typecheck`, `build`; `server/package.json` — Node `>=22`, `vitest run` |

**Não reexecutado nesta auditoria:** `npm test`, builds, contagens exactas de testes na máquina actual.

---

## 3. Resumo executivo

A documentação **canónica de produto** (relatórios O1/O2/O5, sync de Appointment Expiration, ROADMAP com evidências de paths) está **largamente alinhada** com o código em `develop`. Os mecanismos descritos (throttle 45 s, geração de carga, GET sem side-effect de expiração, escopos O6/O7) **existem** nos ficheiros citados.

As maiores lacunas são **estruturais**: ausência de `README.md` na raiz, ausência de índice navegável para ~188 ficheiros, e **muitos relatórios de tarefa** com HEAD/datas de Novembro que descrevem estados de suite (**1604–1606/1610**) **anteriores** ao merge PR #142. Sem leitura cronológica, podem parecer **contraditórios** com [`dashboard-o5-refresh-tests-stabilization.md`](dashboard-o5-refresh-tests-stabilization.md) (1610/1610).

**Avaliação global da auditoria:** **APROVADA COM RESSALVAS**

---

## 4. Ocorrências classificadas

Legenda: cada entrada inclui documento, problema, impacto e recomendação.

### 4.1 CORRETO

| ID | Documento | Evidência | Notas |
|----|-----------|-----------|-------|
| C-01 | [`schedulerpro-dashboard-o5-refresh.md`](../reports/schedulerpro-dashboard-o5-refresh.md) §2–5 | Ficheiros e fluxos existem; testids `dashboard-refresh-warning`, `dashboard-refreshing` | Não descreve `waitForDashboardReady` (detalhe de teste pós-#142) — comportamento prod OK |
| C-02 | [`appointment-expiration-documentation-sync.md`](appointment-expiration-documentation-sync.md) §2 | Fluxo scheduler → service → repo; GET sem expiração | `findAll` confirma |
| C-03 | [`ROADMAP_AUDIT_2026-11-11.md`](ROADMAP_AUDIT_2026-11-11.md) §3.3 E4 | GET só leitura | Código L720–736 |
| C-04 | [`ROADMAP_AUDIT_2026-11-11.md`](ROADMAP_AUDIT_2026-11-11.md) §3.1 O5 | Hook + 45 s | `dashboardRefresh.ts`, hook |
| C-05 | [`o6` / `o7` audits + tasks](o6-appointment-visibility-by-role.md) | Paths `appointment-read-scope`, `appointment-write-access` | Ficheiros presentes |
| C-06 | [`company-management-e2-soft-delete-ui.md`](company-management-e2-soft-delete-ui.md) | Suíte `soft delete` em `CompanyPage.test.tsx` | L490 |
| C-07 | [`appointments-listview-date-tests-fix.md`](appointments-listview-date-tests-fix.md) | `futureAppointmentTimes` em teste | Código integrado |
| C-08 | [`docs/audits/ROADMAP_AUDIT_2026-11-11.md`](../audits/ROADMAP_AUDIT_2026-11-11.md) | Stub aponta para relatório completo + sync expiration | Padrão útil |
| C-09 | `client/.env.example` | `VITE_API_URL=/api` + comentário proxy | Coerente com Vite |
| C-10 | `server/.env.example` | `MONGO_URI`, JWT, chaves públicas | Usado em `env.ts` |

### 4.2 DESATUALIZADO

| ID | Documento | Evidência documental | Evidência código / Git | Problema | Impacto | Recomendação |
|----|-----------|----------------------|-------------------------|----------|---------|----------------|
| D-01 | [`ROADMAP_AUDIT_2026-11-11.md`](ROADMAP_AUDIT_2026-11-11.md) cabeçalho | HEAD `527a623`, 11/11/2026 | HEAD actual `35856e7` (PRs #141, #142) | Snapshot antigo como referência de `develop` “actual” | Onboarding/liderança pode subestimar entregas recentes | Adicionar secção “Actualização” ou novo snapshot; manter histórico |
| D-02 | [`appointment-expiration-documentation-sync.md`](appointment-expiration-documentation-sync.md) | HEAD `438de5e` | `35856e7` | Metadados Git desactualizados | Baixo se lido como histórico | Actualizar cabeçalho ou marcar “congelado em 438de5e” |
| D-03 | [`frontend-final-quality-audit.md`](frontend-final-quality-audit.md) | HEAD `438de5e`; §6 O5 flake “não corrigido definitivamente” | PR #142 alterou `DashboardPage.test.tsx` | Parecer de Nov 13 não reflecte fix O5 F1–F4 | Leitores podem assumir suite ainda vermelha | Criar addendum ou `frontend-quality-status-2026-11-16.md` (P1) |
| D-04 | [`dashboard-o5-refresh-tests-stabilization.md`](dashboard-o5-refresh-tests-stabilization.md) | HEAD final `f6d9f8d` | Merge em `35856e7` | Relatório anterior à merge final | Metadados Git incorrectos pós-merge | Uma linha “Integrado em 35856e7 (PR #142)” |
| D-05 | [`frontend-suite-post-t3-t4-validation.md`](frontend-suite-post-t3-t4-validation.md) | 1606/1610, HEAD `f29b0b9` | Estado posterior com PR #142 | Desactualizado como “última suite” | Médio | Referenciar validação posterior (stabilization) |
| D-06 | [`docs/tasks/_npm-test-output-post-t3t4.txt`](_npm-test-output-post-t3t4.txt) | Log 1606/1610 falhas | Ficheiro **tracked** no repo | Artefacto de corrida falhada permanece no índice Git | Confusão em buscas/diffs | Remover do repo ou mover para anexo não versionado (pedido explícito ao utilizador) |
| D-07 | [`schedulerpro-dashboard-o5-refresh.md`](../reports/schedulerpro-dashboard-o5-refresh.md) §6 | Resultados build/testes na data do relatório | Sem `waitForDashboardReady` / `mockReset` | Detalhe de testes não reflecte PR #142 | Baixo (prod inalterada) | Nota de rodapé “pós-#142 ver stabilization” |

### 4.3 EM FALTA

| ID | Âmbito | Evidência | Impacto | Recomendação |
|----|--------|-----------|---------|--------------|
| F-01 | README raiz | Não existe `README.md` no repositório | Novos devs sem entrypoint único | README com client+server, env, testes (P0) |
| F-02 | Arquitectura | Sem `ARCHITECTURE.md` / diagrama único | Conhecimento disperso em 188 MDs | Doc curta Controller→Service→Repository + multi-tenant (P1) |
| F-03 | Índice `docs/` | Só stubs pontuais (ROADMAP, expiration) | Dificuldade navegar `reports/` | `docs/README.md` com mapa tasks/audits/reports (P1) |
| F-04 | Estado qualidade **actual** | Vários relatórios parciais | Sem “fonte única” em `35856e7` | Um parágrafo canónico: suite 1610/1610 pós-#142 com data (P0 doc) |
| F-05 | CI / instalação | Espalhado em reports (`schedulerpro-ci-github-actions.md`) | NÃO VERIFICÁVEL se workflow actual | Cruzar com `.github/workflows` numa sync futura |

### 4.4 CONTRADITÓRIO

| ID | Documentos | Problema | Impacto | Recomendação |
|----|------------|----------|---------|--------------|
| X-01 | [`frontend-final-quality-audit.md`](frontend-final-quality-audit.md) §6 vs [`dashboard-o5-refresh-tests-stabilization.md`](dashboard-o5-refresh-tests-stabilization.md) | “O5 não corrigido definitivamente” vs “APROVADO 1610/1610” | **Temporal** — ambos podem ser verdade em datas diferentes; **contraditório** se interpretados como estado corrente | Etiquetar relatórios com “válido até HEAD X” |
| X-02 | [`frontend-suite-flakes-diagnostic.md`](frontend-suite-flakes-diagnostic.md) (1604/1610) vs stabilization (1610/1610) | Contagens de suite | Esperado em linha do tempo; contraditório sem cronologia | Secção “Linha do tempo qualidade frontend” num doc canónico |
| X-03 | [`dashboard-o5-stale-response-fix.md`](dashboard-o5-stale-response-fix.md) (`npm test` falhou) vs stabilization | Suite integral | Mesma ressalva temporal | Idem X-02 |
| X-04 | Duplicação conceptual | `docs/tasks/ROADMAP_AUDIT_2026-11-11.md` vs `docs/audits/ROADMAP_AUDIT_2026-11-11.md` | Risco de editar stub e esquecer corpo | Manter só stub em audits (já **CORRETO**); não duplicar conteúdo futuro |

### 4.5 NÃO VERIFICÁVEL (nesta auditoria)

| ID | Afirmação | Motivo |
|----|-----------|--------|
| N-01 | Suite client **1610/1610** em `35856e7` | Não executado `npm test` nesta sessão |
| N-02 | ROADMAP — “133 testes backend críticos passaram” | Não reexecutado |
| N-03 | Resultados build nos reports O5 (Nov 10) | Não reexecutado |
| N-04 | Conteúdo integral de 141 ficheiros em `docs/reports/` (mobile steps 6.x) | Amostragem por título; UI pode ter evoluído |
| N-05 | [`STAGE_34_1_FORECAST_VALUE_DIAGNOSTIC.md`](../reports/STAGE_34_1_FORECAST_VALUE_DIAGNOSTIC.md) vs código forecast | Código tem `forecastRevenue` em Reports; diagnóstico específico não relido linha a linha |

---

## 5. Documentação a preservar (alto valor)

- [`docs/tasks/ROADMAP_AUDIT_2026-11-11.md`](ROADMAP_AUDIT_2026-11-11.md) — matriz de funcionalidades com paths.
- Cadeia Appointment Expiration: sync + validation + audits E4.
- Relatórios implementação: [`schedulerpro-dashboard-o1-active-clients.md`](../reports/schedulerpro-dashboard-o1-active-clients.md), O2, O5.
- Audits O6/O7 e company-management.
- Relatórios de tarefa Nov 2026 (flakes, T3/T4, O5 diagnostic/stabilization) — **como histórico**, não apagar.

---

## 6. Recomendações por prioridade

### P0

1. Criar **README.md** na raiz (client + server, `.env.example`, comandos `npm test` / `typecheck` / `build`).
2. Publicar **parágrafo canónico** do estado de qualidade frontend em `35856e7` (referência: PR #142 + stabilization), sem reescrever todos os relatórios antigos.
3. Decidir destino de [`docs/tasks/_npm-test-output-post-t3t4.txt`](_npm-test-output-post-t3t4.txt) (tracked, conteúdo obsoleto).

### P1

4. `docs/README.md` — índice: tasks (entregas), audits (gates), reports (implementações por área).
5. Addendum a `frontend-final-quality-audit.md` ou novo snapshot pós-PR #141/#142.
6. Actualizar cabeçalhos HEAD em `dashboard-o5-refresh-tests-stabilization.md` e sync expiration (metadados).

### P2

7. Novo snapshot ROADMAP ou secção “Changelog develop” pós-11/11.
8. Revisão amostral de `docs/reports/schedulerpro-mobile-*` vs UI actual (fora do âmbito imediato).
9. Documentar `expireOverdueScheduled` como API legacy não usada no fluxo E4 (já mencionado no ROADMAP).

---

## 7. Itens que exigem esclarecimento do utilizador

1. **Política de versão de relatórios `docs/tasks/`:** congelar com HEAD ou actualizar após cada merge em `develop`?
2. **Artefacto `_npm-test-output-post-t3t4.txt`:** remover do Git ou mover para pasta não versionada?
3. **Documento canónico de qualidade:** novo ficheiro único vs. actualizar `frontend-final-quality-audit.md`?
4. **README:** idioma PT only ou PT+EN?

---

## 8. Contagens por categoria

| Categoria | Quantidade (ocorrências registadas) |
|-----------|-------------------------------------|
| CORRETO | 10 |
| DESATUALIZADO | 7 |
| EM FALTA | 5 |
| CONTRADITÓRIO | 4 |
| NÃO VERIFICÁVEL | 5 |

**Documentos analisados em profundidade:** 32  
**Inventário total `docs/`:** 188 ficheiros

---

## 9. Problemas críticos

Nenhum **desalinhamento grave regra-de-negócio vs código** foi encontrado nas áreas O1–O7 e E1–E4.1 verificadas.  
**Risco principal:** operacional — onboarding e interpretação de **estado da suite** sem README/índice e com relatórios datados a parecerem mutuamente exclusivos.

---

## 10. Conclusão

| Critério | Resultado |
|----------|-----------|
| Código vs docs canónicos (produto) | Coerente |
| Docs de tarefa vs HEAD `35856e7` | Frequentemente desactualizados (esperado como histórico; mal se lido como “agora”) |
| Lacunas estruturais | README raiz, índice, snapshot qualidade actual |
| Alterações nesta auditoria | **Apenas** este ficheiro |
| **Estado da auditoria** | **APROVADA COM RESSALVAS** |

---

## 11. Confirmação de restrições

- Nenhum código de produção, teste ou configuração alterado.
- Nenhum documento existente editado ou removido.
- Nenhuma operação Git de escrita.
- Nenhuma instalação de dependências ou execução de suite completa.

**Próximo passo (fora desta tarefa):** sincronização documental aprovada explicitamente pelo utilizador — não iniciada aqui.