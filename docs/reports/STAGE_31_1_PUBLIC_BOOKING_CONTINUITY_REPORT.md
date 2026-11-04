# SchedulerPro — Stage 31.1 — Entrada e continuidade do agendamento público

## 1. Objetivo

Duas melhorias pontuais identificadas no teste manual do fluxo público do Stage 31:

1. **"Fazer novo agendamento"** — após o cancelamento de um agendamento público, exibir ação que leva o cliente ao fluxo público normal da mesma empresa (`/agendar/empresa/:companyId`), sem login e sem reutilizar o token antigo.
2. **Link público da empresa no painel administrativo** — seção na Company Page para OWNER/ADMIN visualizar, copiar e abrir o link público de agendamento para divulgação aos clientes.

O fluxo público existente foi validado manualmente no Stage 31 e **não foi refatorado nem redesenhado**.

---

## 2. Implementação

### Parte 1 — "Fazer novo agendamento" após cancelamento

- `PublicAppointmentMapper` passou a incluir `companyId` na resposta pública (GET/PATCH/DELETE por token e resposta de criação).
- O tipo `PublicAppointmentResult` (server) e `PublicAppointment` (client) ganharam o campo obrigatório `companyId: string`.
- `PublicAppointmentPage.tsx`: quando `status === "cancelled"`, as ações são substituídas por um `<Link className="btn btn-primary" to={/agendar/empresa/${companyId}}>Fazer novo agendamento</Link>`.
- Para `scheduled`/`confirmed` o fluxo normal de gerenciamento permanece; para `completed`/`no-show` (somente histórico) o botão **não** é exibido — sem ampliação de escopo.
- O link usa apenas o `companyId` vindo do backend; nenhum campo interno é montado no frontend.

### Parte 2 — Link público no painel administrativo

- Nova seção "Link público de agendamento" dentro do card existente de informações da empresa (`CompanyPage.tsx`), com:
  - campo readonly com a URL;
  - botão **Copiar link** (`navigator.clipboard.writeText`), feedback temporário de 3s via `role="status"` ("Link público copiado." / mensagem de falha) — sem `alert()`;
  - botão **Abrir link** (`<a target="_blank" rel="noopener noreferrer">`).
- URL construída por `getPublicBookingUrl(companyId, appUrl)` em `client/src/config/publicBookingUrl.ts`.
- `env.appUrl = import.meta.env.VITE_APP_URL || window.location.origin` — sem `localhost` hardcoded; documentado em `client/.env.example` e `vite-env.d.ts`.
- A URL usa o `company.id` vindo de `GET /companies` (empresa autenticada), não aceita `companyId` por rota/parâmetro — isolamento multi-tenant preservado; RBAC (`getCompanyAbilities`, OWNER/ADMIN) inalterado.

### Contratos alterados

| Contrato | Alteração |
|---|---|
| `PublicAppointmentResult` (server) | + `companyId: string` (apenas identificador público) |
| `PublicAppointment` (client) | + `companyId: string` |
| `PublicAppointmentMapper.toResponse` | + `companyId: appointment.companyId.toString()` |
| `env` (client) | + `appUrl` (`VITE_APP_URL` ou origem atual) |

**Nenhum endpoint novo.** Nenhum campo interno exposto (`clientId`, `publicAccessTokenHash`, `publicAccessTokenCiphertext`, credenciais, dados administrativos continuam fora da resposta).

### Componentes alterados

- `client/src/pages/public/PublicAppointmentPage.tsx` — botão de novo agendamento (mínimo necessário, layout existente preservado).
- `client/src/pages/company/CompanyPage.tsx` — seção do link público.

### Decisões relevantes

- Preferência por expor apenas `companyId` (menor referência segura) em vez de `publicBookingUrl` pronta no backend — mantém o backend sem conhecer a URL do frontend.
- Link administrativo derivado da empresa já carregada na sessão, sem endpoint administrativo novo.
- Helper puro `getPublicBookingUrl` para permitir teste unitário de construção da URL (inclusive produção sem `localhost`).

---

## 3. Testes

### Execução

| Suíte | Executados | Aprovados | Falhou |
|---|---:|---:|---:|
| Frontend `npm test` (arquivos) | 1205 | 1201 | 4 |
| Backend `npm test` | 1132 | 1132 | 0 |
| Focados (`PublicAppointmentPage` + `CompanyPage`) | 56 | 56 | 0 |

### Falhas preexistentes (4)

- `client/src/pages/dashboard/DashboardPage.test.tsx` — "renders greeting, summary cards and appointment tables with data" e "shows empty state when there are no appointments".
- `client/src/pages/reports/ReportsPage.test.tsx` — "renderiza cards, receita e rankings do período" e "continua exibindo o relatório quando um endpoint relacionado falha".
- **Por que são preexistentes:** verificado executando os mesmos arquivos com `git stash` (HEAD limpo, sem as mudanças do Stage 31.1) — as mesmas 4 falhas ocorrem. Arquivos não tocados por esta tarefa; erro é de contagem de itens renderizados (mock de dados), sem relação com agendamento público ou Company Page. **Não foram afetadas nem modificadas.**

### Testes novos (7)

**Parte 1** (`PublicAppointmentPage.test.tsx`):
1. Cancelado exibe "Fazer novo agendamento".
2. Clique leva para `/agendar/empresa/:companyId` (rota marker), sem login e sem token antigo (`updateByToken`/`cancelByToken` não chamados).
3. `it.each(["scheduled","confirmed"])` — não exibe o botão (mais asserções negativas em `completed`/`no-show` e no fluxo de cancelamento por PATCH).

**Parte 2** (`CompanyPage.test.tsx`):
4. URL pública construída corretamente e sem campos sensíveis.
5. `getPublicBookingUrl` em produção não contém `localhost`.
6. Copiar link + feedback temporário; falha do clipboard tratada com mensagem amigável.
7. "Abrir link" usa o link correto com `target="_blank"` e `rel="noopener noreferrer"`.

### Testes preexistentes ajustados

Somente expectativas de contrato (adição do `companyId` público) em: `publicAppointments.api.test.ts`, `PublicAppointmentCancelDialog.test.tsx`, `PublicAppointmentSummary.test.tsx`, `publicAppointment.test.ts`, `PublicBookingPage.test.tsx`, `public-appointment-link.routes.test.ts`, `public-appointment.routes.test.ts`, `AppointmentService.public-link.test.ts`, `AppointmentService.public.test.ts`. As verificações de ausência de segredos (`not.toContain(TOKEN)`, `not.toHaveProperty("clientId")` etc.) foram mantidas.

---

## 4. Cobertura

Executada com `test:coverage` nos dois pacotes (frontend com `--coverage.reportOnFailure` devido às 4 falhas preexistentes).

| Projeto | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Frontend (atual) | 96,23% | 91,34% | 96,41% | 96,44% |
| Frontend (Stage 31 Part 8 — anterior) | 96,28% | 91,34% | 96,51% | 96,46% |
| Backend (atual) | 81,52% | 80,11% | 72,02% | 81,74% |
| Backend (Stage 31 Part 8 — anterior) | 81,66% | 80,22% | 72,15% | 81,88% |

Queda marginal esperada: o código novo (seção da Company Page, branches de clipboard/feedback e do botão público) amplia o denominador.

Arquivos alterados/novos:

| Arquivo | Statements | Branches | Functions |
|---|---:|---:|---:|
| `client/src/config/publicBookingUrl.ts` | 100% | — | 100% |
| `client/src/config/env.ts` | 100% | 100% | 100% |
| `client/src/pages/company/CompanyPage.tsx` | 97,96% | 90,32% | 91,67% |
| `client/src/pages/public/PublicAppointmentPage.tsx` | 95,56% | 92,00% | 100% |
| `server/.../PublicAppointmentMapper.ts` | 100% | 100% | 100% |

---

## 5. Typecheck

- Frontend `npm run typecheck` (`tsc -b --noEmit`): **passou**.
- Backend `npm run typecheck` (`tsc --noEmit`): **passou**.

## 6. Build

- Frontend `npm run build`: **passou** (~15s). Aviso preexistente de chunk > 500 kB (575 kB) — já presente antes do Stage 31.1.
- Backend `npm run build` (`tsc`): **passou**.

---

## 7. Arquivos alterados

### Criados

| Arquivo | Responsabilidade |
|---|---|
| `client/src/config/publicBookingUrl.ts` | Helper puro de construção da URL pública (`/agendar/empresa/:companyId`). |
| `docs/reports/STAGE_31_1_PUBLIC_BOOKING_CONTINUITY_REPORT.md` | Este relatório. |

### Modificados

| Arquivo | Responsabilidade |
|---|---|
| `client/src/pages/public/PublicAppointmentPage.tsx` | Link "Fazer novo agendamento" quando `cancelled`. |
| `client/src/pages/company/CompanyPage.tsx` | Seção "Link público de agendamento" (URL + Copiar + Abrir). |
| `client/src/types/publicAppointment.ts` | `companyId` no contrato público do client. |
| `client/src/config/env.ts` | `appUrl` (`VITE_APP_URL` ou `window.location.origin`). |
| `client/src/vite-env.d.ts` | Tipagem de `VITE_APP_URL`. |
| `client/.env.example` | Documentação de `VITE_APP_URL`. |
| `server/src/modules/appointments/index.ts` | `companyId` em `PublicAppointmentResult` + comentário do contrato. |
| `server/src/modules/appointments/mappers/PublicAppointmentMapper.ts` | Serialização do `companyId`. |
| `client/src/pages/public/PublicAppointmentPage.test.tsx` | 3 testes novos + asserções dos estados. |
| `client/src/pages/company/CompanyPage.test.tsx` | 4 testes novos (URL, cópia, falha de clipboard, abrir). |
| `client/src/api/endpoints/publicAppointments.api.test.ts` | Mock tipado com `companyId`. |
| `client/src/components/public/PublicAppointmentCancelDialog.test.tsx` | Mock tipado com `companyId`. |
| `client/src/components/public/PublicAppointmentSummary.test.tsx` | Mock tipado com `companyId`. |
| `client/src/config/publicAppointment.test.ts` | Mock tipado com `companyId`. |
| `client/src/pages/public/PublicBookingPage.test.tsx` | Mock tipado com `companyId`. |
| `server/tests/integration/public-appointment-link.routes.test.ts` | Expectativa de `companyId` na resposta pública. |
| `server/tests/integration/public-appointment.routes.test.ts` | Expectativa de `companyId` na criação pública. |
| `server/tests/unit/appointments/AppointmentService.public-link.test.ts` | Expectativa de `companyId`. |
| `server/tests/unit/appointments/AppointmentService.public.test.ts` | Expectativa de `companyId`. |

---

## 8. Limitações

- 4 testes preexistentes quebrados (`DashboardPage.test.tsx`, `ReportsPage.test.tsx`) permanecem; verificados como quebrados também no HEAD limpo, fora do escopo desta tarefa.
- A cobertura do frontend retorna exit code ≠ 0 por causa dessas 4 falhas (relatório gerado via `reportOnFailure`).
- `VITE_APP_URL` precisa ser configurada em produção (senão usa `window.location.origin`, correto em deploy same-origin).
- `navigator.clipboard` exige contexto seguro (HTTPS ou localhost); em contexto inseguro o botão mostra a mensagem de fallback pedindo cópia manual.
- Nenhum commit/merge/push foi feito — branch atual com alterações pendentes para o desenvolvedor.

---

## 9. Validação manual

1. **Botão "Fazer novo agendamento":** abrir `/agendar/:token` de um agendamento cancelado → o botão aparece; clicar → navega para `/agendar/empresa/<companyId>` (sem login, sem novo token, agendamento cancelado inalterado).
2. **Sem botão em outros estados:** agendamentos `scheduled`/`confirmed`/`completed`/`no-show` não exibem a ação.
3. **Link público no painel:** login como OWNER/ADMIN → página da empresa → seção "Link público de agendamento" com a URL da empresa correta.
4. **Copiar:** clicar em "Copiar link" → "Link público copiado." temporário; em contexto inseguro → mensagem de fallback.
5. **Abrir:** "Abrir link" abre nova aba na página pública sem autenticação.
6. **Sem login:** em aba anônima, `/agendar/empresa/<companyId>` carrega o fluxo público completo.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Estado do Stage 31:** fluxo público de agendamento completo e **validado manualmente** (Partes 1–8). Criação de agendamento, alteração de observações, cancelamento, e-mails de confirmação/cancelamento, regras de conflito e token inválido já foram testados manualmente com sucesso. **Lembretes de 24h e 2h também foram validados.**
- **O que o Stage 31.1 implementou:** (1) botão "Fazer novo agendamento" na página pública quando `status = cancelled`, levando a `/agendar/empresa/:companyId` sem login e sem reutilizar o token antigo; (2) seção "Link público de agendamento" na Company Page com URL, "Copiar link" (clipboard + feedback temporário sem `alert()`) e "Abrir link" (nova aba).
- **Contratos finais:**
  - `PublicAppointmentResult` (server) e `PublicAppointment` (client) incluem `companyId: string` — único campo novo; `clientId`, `publicAccessTokenHash`, `publicAccessTokenCiphertext`, credenciais e dados administrativos continuam ocultos.
  - Mapper: `PublicAppointmentMapper.toResponse` serializa `_id` da empresa como `companyId`.
  - Client: `env.appUrl = VITE_APP_URL || window.location.origin`; helper `getPublicBookingUrl(companyId, appUrl)` → `${appUrl}/agendar/empresa/${companyId}`.
  - Nenhum endpoint novo; RBAC inalterado (Company Page: OWNER/ADMIN via `getCompanyAbilities`).
- **Testes executados:** frontend 1205 (1201 passaram, 4 falhas **preexistentes** em `DashboardPage.test.tsx` e `ReportsPage.test.tsx`, reproduzidas em HEAD limpo com `git stash`); backend 1132/1132 passaram; focados 56/56. 7 testes novos (3 página pública + 4 Company Page).
- **Cobertura:** frontend 96,23% S / 91,34% B / 96,41% F / 96,44% L; backend 81,52% S / 80,11% B / 72,02% F / 81,74% L (anterior Part 8: 96,28/91,34/96,51/96,46 e 81,66/80,22/72,15/81,88). Artefatos em `client/coverage/` e `server/coverage/`.
- **Typecheck:** frontend e backend passaram. **Build:** frontend e backend passaram (aviso preexistente de chunk > 500 kB no frontend).
- **Limitações:** as 4 falhas preexistentes de Dashboard/Reports; `VITE_APP_URL` deve ser configurada em produção; clipboard exige contexto seguro; nenhuma alteração nos testes antigos além das expectativas do novo campo `companyId`.
- **Próximos pontos conhecidos:** pendências do Stage 31 que continuam válidas — configurar `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS` e `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION` no `.env` com chave real persistente fora do repositório; validar entrega manual dos e-mails Resend; considerar investigar/corrigir as 4 falhas de Dashboard/Reports em tarefa separada.
- **Git:** nenhum commit/merge/push realizado; alterações pendentes na branch `Disponibilizar-link-publico-na-pagina-inicial-e-melhoria-na-pagina-de-cancelar-agendamento` para o desenvolvedor commitar.
