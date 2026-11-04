# SchedulerPro — Preparação GW-2: Validação operacional e de infraestrutura

**Data:** 26/10/2026  
**Modo:** Análise documental e planeamento — **sem** alterações a código, config, dependências, testes, branches ou Git.

**Fonte canónica:** [`schedulerpro-phase-h-final-consolidation.md`](schedulerpro-phase-h-final-consolidation.md) (Fase H, secções 8–12). Complementos: Fase G, relatórios GW-1.x, estado atual de `develop`.

---

## 1. Objetivo deste documento

Preparar a execução do **GW-2 — Validação operacional e de infraestrutura**, tal como definido na Fase H, e responder se continua a ser a **próxima etapa adequada** após conclusão do **GW-1** (grupos A–D integrados em `develop`).

---

## 2. Estado atual do repositório (`develop`)

| Item | Evidência (26/10/2026) |
|------|-------------------------|
| Branch | `develop` |
| HEAD recente | `a1bb839` — Merge PR #112 (`fix/gw-1.4-client-follow-redirects`) |
| GW-1.2 | PR #110 — deps server (Express directo, Grupos A+B) |
| GW-1.3 | PR #111 — `cloudinary@2.11.0`, remoção `multer-storage-cloudinary` |
| GW-1.4 | PR #112 — `follow-redirects@1.16.2` no lockfile do client |
| Working tree | Limpo no momento da verificação Git desta análise |

**GW-1 (CANON-001):** Tratado pelos relatórios de execução GW-1.2–1.4 e merges acima. Critério H de aceitação: `npm audit --omit=dev` sem critical; highs resolvidos ou documentados — **relatórios GW-1.3/1.4 reportam 0 vulnerabilidades em produção** em server e client após C e D. **Não** foi reexecutado `npm audit` nesta preparação (read-only).

**Lacuna GW-1 formal:** Não existe um único relatório “GW-1 encerrado” consolidado; a evidência está dispersa em `schedulerpro-gw-1.2-*`, `schedulerpro-gw-1.3-*`, `schedulerpro-gw-1.4-*`. Recomendável um parágrafo de encerramento GW-1 no PR ou doc ops antes de marcar CANON-001 como fechado em backlog vivo.

---

## 3. Escopo canónico do GW-2 (Fase H)

### 3.1 Definição textual (secção 10, Fase H)

| Campo | Conteúdo |
|-------|----------|
| **Nome** | GW-2 — Validação operacional |
| **IDs backlog** | **CANON-002**, **CANON-029**, **partes de CANON-009** e **CANON-011** |
| **Objetivo** | Confirmar **backups**, **email** e **configuração real** **sem alterar código** (ênfase H) |
| **Pré-requisitos** | Acesso **MongoDB Atlas**, **Resend**, **hosting** (API + frontend) |
| **Aceitação (secção 11)** | Runbook backup com **RPO/RTO**; **restore testado**; **MAIL_FROM** com domínio verificado; (implícito no objetivo) **CORS/cookies documentados para URLs reais** |
| **Natureza** | **Ops obrigatório** — não substituível apenas por mudanças no repo |

### 3.2 Itens de backlog mapeados

| ID | Problema (resumo) | Prio H | Evidência no repo | O que GW-2 deve produzir |
|----|-------------------|--------|-------------------|---------------------------|
| **CANON-002** | Backups/DR não documentados | **P1** | Fase G: ausência de runbook/scripts; Fase D AUD-DATA-006 | Runbook RPO/RTO + **evidência** de restore testado (Atlas/PITR) |
| **CANON-029** | `MAIL_FROM` default sandbox Resend | P2 (ops alto se default) | [`server/src/config/env.ts`](../../server/src/config/env.ts) L121 default `onboarding@resend.dev` | Confirmar valor **em produção**; domínio verificado no painel Resend |
| **CANON-009** (parte) | CORS permissivo no código | P2 | [`server/src/app.ts`](../../server/src/app.ts) L42 `cors()` sem whitelist | **Documentar** comportamento efectivo em prod/staging (`curl`/DevTools); **não** implementar whitelist (isso é **GW-7**) |
| **CANON-011** (parte) | CSRF / cookies | P2 | SameSite strict (C.1); cross-origin não verificado sem URLs | **Threat model** curto: same-site vs cross-origin com `FRONTEND_URL` / API reais |

### 3.3 Riscos e problemas abrangidos

- **Perda de dados** se Atlas sem backup/PITR ou sem procedimento de restore (**CANON-002**).
- **E-mail transacional não entregue** (reset, convites, verificação) com remetente sandbox (**CANON-029**).
- **Falha silenciosa de auth/sessão** em deploy cross-origin (FE e API em domínios diferentes) por CORS/cookies mal alinhados (**CANON-009/011** — validação, não correção de código no GW-2).

### 3.4 Dependências em relação a GW anteriores

| Relação | Detalhe |
|---------|---------|
| **GW-1** | **Concluído** na prática em `develop` (deps prod). GW-2 **não depende** de patches npm; pode correr em paralelo com o fecho documental GW-1. |
| **GW-5** | H sugere **GW-2 ∥ GW-5** após GW-1. GW-5 (CI, health ready, `.env.example`) **facilita** repetibilidade mas **não é pré-requisito** para recolher evidências Atlas/Resend. |
| **GW-7** | Implementação CORS/sanitize/CSRF — **posterior**; GW-2 só recolhe baseline operacional. |
| **CANON-027** | Deploy/hosting documentado — overlap parcial com GW-2 (URLs) mas entrega principal de **CANON-027** está em **GW-5** (`docs/ops/deploy.md`). GW-2 deve **referenciar** URLs sem duplicar runbook completo de deploy. |

### 3.5 Testes e evidências para considerar GW-2 concluído

A Fase H **não** define testes Vitest para GW-2. Critérios são **observáveis e operacionais**:

| Evidência | Como validar | Onde registar (sugestão execução) |
|-----------|--------------|-------------------------------------|
| RPO/RTO definidos | Documento aprovado | `docs/ops/backup-dr.md` ou wiki |
| Restore testado | Ticket/drill Atlas (data, duração, sucesso) | Mesmo doc + anexo redigido (sem secrets) |
| PITR / backups ativos | Screenshot ou export settings (sem credenciais) | Relatório execução GW-2 |
| MAIL_FROM produção | Env checklist vs Resend domain verified | Relatório GW-2 |
| CORS efectivo | `curl -H "Origin: <FE_URL>" -I <API>/api/health` | Relatório GW-2 |
| Cookies / CSRF | DevTools ou doc threat model alinhado a SameSite + origens | Relatório GW-2 |

**Smoke de aplicação** (login, email de teste) é **recomendado** mas não listado explicitamente na tabela H sec. 11; incluir como passo opcional na execução.

---

## 4. O que **não** pertence ao GW-2 (evitar scope creep)

| Grupo / CANON | Motivo da exclusão |
|---------------|-------------------|
| **GW-3** (CANON-003, 016) | Código: double-booking, índices — `AppointmentService` |
| **GW-4** (CANON-006–008, 028) | Rate limit auth, refresh, sessões, Redis |
| **GW-5** (CANON-004, 005, 025–027, 033) | CI workflows, `/ready`, `validateEnv`, `.env.example` |
| **GW-6–10** | Paginação, HTTP hardening completo, observabilidade, testes E2E, FE dívida |
| **CANON-009 implementação** | Whitelist CORS por env → **GW-7** |
| **CANON-011 implementação** | Double-submit CSRF tokens → **GW-7** se necessário |
| **CANON-005** | Readiness Mongo no health → **GW-5** |
| **Cloudinary smoke real** | Ficou como recomendação pós-GW-1.3; pode ser **anexo** GW-2 staging, não core H |

---

## 5. Lacunas e clarificações necessárias

A Fase H define GW-2 de forma **correcta mas de alto nível**. Para execução sem ambiguidade, clarificar com o utilizador:

| # | Lacuna | Pergunta / decisão |
|---|--------|-------------------|
| L1 | **Ambientes** | GW-2 valida só **produção**, ou **staging + produção**? |
| L2 | **Acesso** | Quem fornece acesso Atlas/Resend/hosting (conta SchedulerPro vs IEFP)? Sem acesso, GW-2 fica **bloqueado** — apenas checklist “não verificável”. |
| L3 | **Entregável no repo** | H implica runbook em repo (`docs/ops/` não existe hoje). Autorizar **criação de docs** sem código? (Preparação atual: sim, na fase de execução GW-2.) |
| L4 | **“Restore testado”** | Drill completo vs restauração para cluster de teste — critério mínimo aceite. |
| L5 | **Encerramento CANON-001** | Confirmar re-scan `npm audit --omit=dev` server+client no início de GW-2 ou num relatório GW-1 close-out. |

---

## 6. GW-2 continua a ser a próxima etapa adequada?

| Critério | Avaliação |
|----------|-----------|
| Ordem H | `GW-1 → GW-2 (paralelo) → GW-5 (CI cedo) → …` |
| GW-1 integrado | **Sim** (1.2–1.4 em `develop`) |
| P1 backlog restante sem código | **CANON-002** (ops) e **CANON-004** (CI, GW-5) |
| Bloqueio produto | Double-booking (**GW-3**) é P1 código — **paralelo** a GW-2, não substituto |

**Conclusão:** **Sim**, GW-2 é uma **próxima etapa adequada** e **complementar** ao GW-1 concluído. **GW-5** pode (e na Fase H deve) **arrancar em paralelo** se a prioridade for automatizar testes (CANON-004 P1) enquanto se aguarda janela para drill Atlas/Resend.

**Não** declarar GW-2 “pronto para executar sem humano” se L2 (acesso ops) não estiver resolvido.

---

## 7. Plano de execução sequencial proposto (GW-2 — quando autorizado)

Passos verificáveis; **ficheiros/componentes** entre parênteses.

### Fase 0 — Arranque (repo + baseline)

1. `git status`, branch de trabalho sugerida: `docs/gw-2-operational-validation` ou `ops/gw-2-dr-email` (decisão utilizador).
2. Reconfirmar **CANON-001**: `npm audit --omit=dev` em `server/` e `client/`; `npm run test` + `npm run build` ambos (registo no relatório de execução GW-2).
3. Inventariar variáveis ops vs código: [`server/src/config/validateEnv.ts`](../../server/src/config/validateEnv.ts), [`server/src/config/env.ts`](../../server/src/config/env.ts), [`server/.env.example`](../../server/.env.example), [`client/.env.example`](../../client/.env.example).

### Fase 1 — MongoDB / DR (CANON-002)

4. Atlas: confirmar tier, região, **backup contínuo / PITR** (painel).
5. Redigir **RPO/RTO** alinhados ao negócio (ex.: RPO 24h / RTO 4h — valores **a definir** com stakeholder).
6. Executar **restore drill** (cluster temporário ou restore point-in-time) — registar data, passos, resultado.
7. Criar/atualizar [`docs/ops/backup-dr.md`](../../docs/ops/backup-dr.md) (novo diretório).

### Fase 2 — Email (CANON-029)

8. Resend: domínio verificado, DNS (SPF/DKIM) — evidência no painel.
9. Confirmar `MAIL_FROM` em ambiente alvo ≠ `onboarding@resend.dev`.
10. Envio de teste (reset ou convite) e verificação de entrega/bounce — sem expor API keys no relatório.

### Fase 3 — CORS e cookies (partes CANON-009 / CANON-011)

11. Obter **URLs reais** `VITE_API_URL`, `FRONTEND_URL`, origem do SPA (hosting).
12. `curl` ou equivalente: preflight e resposta com `Origin` do frontend contra rotas com cookies (`/api/auth/*` se exposto).
13. Documentar em [`docs/ops/production-urls-and-cors.md`](../../docs/ops/production-urls-and-cors.md) (sugestão): diagrama FE→API, cookies `httpOnly`/`sameSite`, risco CSRF residual.
14. Listar **gaps** para **GW-7** (ex.: `cors()` aberto no código vs necessidade whitelist).

### Fase 4 — Encerramento GW-2

15. Relatório de execução: `docs/reports/schedulerpro-gw-2-operational-validation-execution.md`.
16. Atualizar tabela de aceitação (secção 11 H) com ✅/❌ por critério.
17. **Sem** alterar código salvo autorização explícita para docs only (permitido pelo objetivo H).

### Componentes de código **referenciados** (leitura / validação externa, não alteração no GW-2)

| Componente | Papel na validação |
|------------|-------------------|
| [`server/src/app.ts`](../../server/src/app.ts) | CORS actual |
| [`server/src/providers/mail/ResendProvider.ts`](../../server/src/providers/mail/ResendProvider.ts) | Uso `MAIL_FROM` |
| [`server/src/modules/auth/services/AuthService.ts`](../../server/src/modules/auth/services/AuthService.ts) | Links `FRONTEND_URL` |
| [`server/src/routes/index.ts`](../../server/src/routes/index.ts) | Health (baseline curl) |
| [`client/vite.config.ts`](../../client/vite.config.ts) | Proxy dev vs prod API |

---

## 8. Referências cruzadas (outra IA)

| Documento | Uso |
|-----------|-----|
| [`schedulerpro-phase-h-final-consolidation.md`](schedulerpro-phase-h-final-consolidation.md) | Sec. 10–12 — definição GW-2, critérios, questões ops |
| [`schedulerpro-phase-g-infrastructure-audit.md`](schedulerpro-phase-g-infrastructure-audit.md) | AUD-INFRA-003, 012; ausência CI/runbook |
| [`schedulerpro-gw-1-dependency-triage.md`](schedulerpro-gw-1-dependency-triage.md) | Sequência GW-1…10 |
| GW-1.2–1.4 execution reports | Estado deps pós-merge |
| [`schedulerpro-global-technical-audit.md`](schedulerpro-global-technical-audit.md) | Contexto histórico (não editar) |

---

## 9. Declaração (esta preparação)

- Nenhum código, config, teste ou dependência foi alterado.
- Nenhuma branch, commit ou push foi criado.
- Nenhuma tarefa GW-2 foi declarada concluída — apenas planeada.
- Relatório global de auditoria **não** foi modificado.

---

## 10. Recomendação de próximo passo

1. **Aprovar** início do GW-2 com confirmação de **acesso ops** (L2) e **ambiente alvo** (L1).
2. **Opcional em paralelo:** abrir GW-5 (`.github/workflows` + health ready) — não conflita com GW-2 se equipas/divisão de trabalho permitir.
3. **Primeira ação executável:** Fase 0 + Fase 1 (backup/DR), por ser **P1** e independente de CI.
4. Produzir, após execução, `schedulerpro-gw-2-operational-validation-execution.md` com evidências redigidas (sem secrets).
