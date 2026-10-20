# Stage 45 — Validação visual autenticada

Data: 19/10/2026  
Branch: `feature/stage-45-authenticated-visual-validation` (base: `develop` @ `12fae73`, inclui Stage 44 / PR #86)  
Sem commit, merge ou push.

## 1. Objetivo e ligação à Stage 44

Completar a matriz autenticada deixada **NV** em [`stage-44-visual-validation.md`](stage-44-visual-validation.md), usando contas reais da BD local (credenciais fornecidas pelo proprietário do ambiente — **não documentadas neste relatório**). Sem alterar auth, RBAC, nem dados de utilizadores existentes além do uso normal da aplicação.

**Resultado global:** validação autenticada **substancialmente concluída** em desktop; mobile coberto de forma **parcial** (portal CLIENT + drawer); alguns cenários permanecem **NV** (N4, S2, M2, lista/+N mobile admin, 404 staff em reload direto).

## 2. Git e merges 38–43

| Item | Valor |
|------|--------|
| Branch | `feature/stage-45-authenticated-visual-validation` |
| Base | `12fae73` — Merge PR **#86** (relatório Stage 44) |
| Alterações no repo | Apenas este relatório (sem diff de código) |

Merges Stages 38–43 inalterados em relação à Stage 44 (#80–#85 em `develop`).

## 3. Preparação de dados

| Papel | E-mail | `POST /api/auth/login` |
|-------|--------|-------------------------|
| OWNER | `weidson.acc@gmail.com` | 200 — `mustChangePassword: false` |
| MANAGER | `weidson.87ac@gmail.com` | 200 |
| EMPLOYEE | `weidson.ac5696@gmail.com` | 200 — `mustChangePassword: false` |
| CLIENT | `weidson.ac525@gmail.com` | 200 — `clientId` presente |

- **Mecanismo:** contas existentes; sem scripts de seed, sem alteração de `emailVerified` ou flags na BD.
- **Inventário (OWNER):** clientes (5), serviços, colaboradores, agenda com marcações em vários estados; **23** notificações no sino; marcações no dia **19/10/2026** (vista dia/semana).
- **Complemento de dados:** não foi necessário criar entidades `Stage45 teste`.
- **Limpeza:** n/a (nenhum dado novo criado).

## 4. Ambiente browser

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` (Chromium) |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/ (health 200) |
| Desktop | ~1280px (painel integrado) |
| Mobile | CDP `Emulation.setDeviceMetricsOverride` 390×844 |

Evidências: `%TEMP%\cursor\screenshots\stage-45-*.png` (sem credenciais).

## 5. Matriz de resultados

Legenda: **A** Aprovado · **P** Problema visual · **R** Regressão funcional · **NV** Não verificável

### 5.1 Shell global (Stage 38) — OWNER / staff

| ID | Cenário | Desktop | Mobile ~390px | Notas |
|----|---------|---------|---------------|-------|
| G1 | Navbar + sidebar / drawer | **A** | **A** (CLIENT portal) | Desktop: `stage-45-g1-shell-desktop.png`. Mobile: drawer “Abrir menu” no portal — `stage-45-g1-portal-mobile-390.png`. **NV:** drawer OWNER em 390px não repetido nesta sessão. |
| G2 | Notificações, scroll interno | **A** | NV | Lista longa com scroll no painel; badge 23 — `stage-45-g2-notifications-desktop.png`. |
| G3 | Tabela `.table-responsive` (`/clients`) | **A** | NV | `stage-45-g3-clients-table-desktop.png`; scroll horizontal contido na tabela. |
| G4 | Público | — | — | Coberto na Stage 44. |

### 5.2 Estados (Stages 39 + 41)

| ID | Cenário | Desktop | Mobile | Notas |
|----|---------|---------|--------|-------|
| S1 | Loading admin (`/appointments`) | **A** | NV | Spinner “A carregar agendamentos…” ao mudar para vista semana — captura em `stage-45-a1-calendar-month-desktop.png` (transição). |
| S2 | Erro + “Tentar novamente” | NV | NV | Falha de API/offline não simulada de forma fiável no MCP. |
| S3 | Portal CLIENT (`/portal`, agendamentos, perfil) | **A** | NV | `stage-45-s3-portal-home-desktop.png`; `/portal/agendamentos` e `/portal/perfil` navegados com conteúdo. |

### 5.3 Agenda (Stage 40)

| ID | Cenário | Desktop | Mobile | Notas |
|----|---------|---------|--------|-------|
| A1 | Vistas mês / semana / dia / lista | **A** (mês, semana, dia) | NV | `stage-45-a1-calendar-month-desktop.png`, `stage-45-a1-calendar-week-desktop.png`. Vista **lista** não capturada — NV parcial. |
| A2 | Linha “agora” (week/day) | **A** | NV | Vista dia 19/10/2026 com faixas horárias; possível linha atual no intervalo — `stage-45-a2-calendar-day-desktop.png`. |
| A3 | Cartões com texto de estado | **A** | NV | Mês/semana: estados no nome acessível (ex. Confirmado, Cancelado, Agendado). |
| A4 | Dia ocupado / `+N mais` | NV | NV | Dia 19 com 3 marcações visíveis no mês sem overflow `+N mais` explícito nesta amostra. |

### 5.4 Modais (Stage 42)

| ID | Cenário | Desktop | Mobile | Notas |
|----|---------|---------|--------|-------|
| M1 | Excluir cliente/serviço | **A** (cliente) | NV | Modal `DestructiveConfirmModal` — cancelar sem excluir — `stage-45-m1-delete-client-modal-desktop.png`. Modal de **serviço** não aberto — NV parcial. |
| M2 | Cancelamento público com token | NV | NV | Token de gestão pública não recuperado nesta sessão. |

### 5.5 404 (Stage 43)

| ID | Cenário | Desktop | Mobile | Notas |
|----|---------|---------|--------|-------|
| N2 | Staff autenticado | **A** / **P** | NV | SPA com sessão ativa: CTA **“Ir para o painel”**, sem `public-shell` — `stage-45-n2-staff-404-desktop.png` (navegação client-side). **P:** reload direto em `/rota-inexistente` mostrou layout **convidado** (“Ir para o início”) antes da hidratação — race com `SessionBootstrap` / `getMe`. |
| N3 | CLIENT | **A** | NV | CTA **“Ir para o portal”** — `stage-45-n3-client-404-desktop.png`. |
| N4 | `mustChangePassword` | NV | NV | Conta EMPLOYEE com `mustChangePassword: false` na API; não alterar BD. |
| N1, N5, N6 | — | — | — | Stage 44. |

## 6. Problemas e correções

| Problema | Evidência | Correção Stage 45 |
|----------|-----------|-------------------|
| 404 staff em **reload direto** pode renderizar como convidado até `getMe` | Navegação fria vs `history.pushState` | **Nenhuma** (fora do escopo mínimo; relacionado com bootstrap, não redesign 404) |
| 404 autenticado sem `app-shell` | N2 screenshot | Limitação Stage 43 documentada; UX sem sidebar confirmada |

Nenhuma alteração de código nesta stage.

## 7. Testes, typecheck e build

Sem alterações de código: **baseline Stage 44 mantida** — **1276** testes client, typecheck e build OK (não reexecutados nesta sessão).

## 8. Limitações e pendências

| Prio | Item |
|------|------|
| P1 | Mobile admin (G1–G3, A1–A4) em 390px |
| P2 | S2 erro recuperável; M2 com token público; vista lista e `+N mais` |
| P3 | N4 com utilizador `mustChangePassword`; comparativo PDF Setmore |
| P3 | Avaliar 404 em hard reload com sessão cookie (bootstrap + `NotFoundPage`) |

## 9. Preservação auth / API

- [x] Sem mudanças em auth, JWT, cookies, RBAC ou API.
- [x] Sem commit/merge/push.
- [x] Sem senhas ou tokens no relatório.

## 10. Resumo

Contas dev permitiram validar **shell**, **notificações**, **clientes/tabela**, **agenda** (mês/semana/dia), **modais de exclusão (cliente)**, **portal CLIENT** e **404** staff/CLIENT em navegação SPA. Permanecem **NV** ou **parciais:** mobile admin, S2, M2, N4, lista/+N, e comportamento de 404 em entrada direta com sessão.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Branch:** `feature/stage-45-authenticated-visual-validation`; relatório em `docs/reports/stage-45-authenticated-visual-validation.md`.
- **Login local:** quatro contas por papel (e-mails na §3); senha só no ambiente do utilizador.
- **404 staff:** testar com `history.pushState` após dashboard carregado para CTA “Ir para o painel”; hard reload pode mostrar UI convidado temporariamente.
- **EMPLOYEE:** `mustChangePassword: false` — N4 requer outra conta ou aceitar NV.
- **Testes:** 1276 (Stage 44); reexecutar suite só se houver patch visual posterior.
- **Próximo passo sugerido:** P1 mobile OWNER; token público para M2; opcional fix bootstrap em `NotFoundPage` se produto quiser 404 staff correto em deep link.
