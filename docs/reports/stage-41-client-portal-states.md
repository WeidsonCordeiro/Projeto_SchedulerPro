# Stage 41 — Consistência dos Estados do Portal do Cliente

Data: 17/10/2026  
Branch: `feature/stage-41-client-portal-states` (base: `develop` — working tree limpo no início)  
Sem commit, merge ou push.

## 1. Objetivo e âmbito

Alinhar as três rotas do portal do cliente (`/portal`, `/portal/agendamentos`, `/portal/perfil`) com os componentes partilhados `LoadingState` e `ErrorState` (padrão Stages 39–40), mantendo fluxos de leitura, retry, `EmptyState` na lista de agendamentos e comportamento funcional. Sem alterações a API, auth, RBAC, regras de negócio, rotas ou layout global (Stage 38).

## 2. Branch e estado inicial do Git

- Branch criada a partir de `develop` (`origin/develop` atualizado).
- Estado inicial: sem alterações locais pendentes além do trabalho desta stage.
- Stage 40 (`feature/stage-40-calendar-ux`) não integrada em `develop` no momento da branch; Stage 41 limita-se ao portal.

## 3. Problemas identificados

| Problema | Onde | Impacto |
|----------|------|---------|
| FE-001 (portal) | Três páginas portal | Spinner Bootstrap + `alert-danger` ad hoc vs admin/público |
| Retry manual duplicado | Home, agendamentos, perfil | Mesmo comportamento que `ErrorState`, markup inconsistente |
| Risco loading vs vazio | Agendamentos | Gating já existia por `isLoading`; reforçado em testes |

## 4. Decisões técnicas

1. **Substituição UI apenas** — `loadAppointments` / `loadProfile` e `useEffect` inalterados; um pedido no mount.
2. **Retry** — `ErrorState.onRetry` → `void loadAppointments()` / `void loadProfile()`; sem `window.location.reload()`.
3. **Labels PT** — `A carregar agendamentos…` (home + lista); `A carregar perfil…` (perfil).
4. **`PageHeader`** sempre visível durante loading/erro (como admin Stage 39).
5. **Portal home — vazio** — manter texto muted no card «Próximos agendamentos»; não usar `EmptyState` full-page para preservar «Acesso rápido».
6. **Perfil `profile === null`** — após sucesso, manter «Perfil do cliente não encontrado.» (não confundir com `loadError`).
7. **Filtros na lista** — permanecem no header durante loading (não implicam dados carregados).

## 5. Ficheiros alterados

| Ficheiro | Justificação |
|----------|----------------|
| `client/src/pages/portal/PortalHomePage.tsx` | `LoadingState` + `ErrorState` |
| `client/src/pages/portal/PortalAppointmentsPage.tsx` | Idem; `EmptyState` preservado |
| `client/src/pages/portal/PortalProfilePage.tsx` | Idem |
| `client/src/pages/portal/PortalHomePage.test.tsx` | Label loading, gating, retry, 1× API |
| `client/src/pages/portal/PortalAppointmentsPage.test.tsx` | Loading vs vazio/tabela, retry, 1× API |
| `client/src/pages/portal/PortalProfilePage.test.tsx` | Label loading, gating, retry, 1× API |

Componentes comuns (`LoadingState`, `ErrorState`, `EmptyState`) **não** modificados.

## 6. Testes

**Baseline portal (pré-código):** 3 ficheiros, **18** testes passados.

**Focal portal (pós-implementação):**

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/portal/PortalHomePage.test.tsx \
  src/pages/portal/PortalAppointmentsPage.test.tsx \
  src/pages/portal/PortalProfilePage.test.tsx
# → 21 testes passados (+3: retry home, agendamentos, perfil)
```

**Suite completa:**

```bash
npm run test -- --pool=forks --maxWorkers=1
# → 109 ficheiros, 1248 testes passados (~514s)
```

Referência documentada pós-Stage 40: 1245 testes; delta +3 desta stage (retry).

## 7. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 8. Validação visual

**Não realizada** nesta sessão (sem smoke browser em `/portal/*` a 1280px / ~390px). Recomendado: `npm run dev` com utilizador `CLIENT` — confirmar legibilidade de loading/erro/vazio e layout Stage 38.

## 9. Problemas conhecidos e trabalho adiado

- Validação visual portal + PDF Setmore.
- FE-005 (modais), FE-003 (catch-all 404), booking público — fora de âmbito.
- `EmptyState` na home do portal — adiado por desenho (dashboard parcial).

## 10. Preservação de API e regras de negócio

- Endpoints: `getMyAppointments`, `getClientMe` — contratos inalterados.
- Filtros próximos/passados, badges de status, formatação de datas — inalterados.
- Autenticação, cookies, redirects `AppLayout` — inalterados.

## 11. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Loading claro (`LoadingState`) | Cumprido |
| Erro distinto de vazio + retry | Cumprido |
| Vazio só após sucesso | Cumprido |
| Sem pedidos duplicados no mount | Cumprido (testado) |
| Testes + typecheck + build | Cumprido |
| Relatório + CONTEXTO | Cumprido |

## 12. Resumo

FE-001 **fechado para o portal** nas três rotas. Diff restrito a páginas e testes do portal + este relatório.

---

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 41 em `feature/stage-41-client-portal-states`. Portal CLIENT deve usar:

```tsx
{isLoading && <LoadingState label="A carregar …" />}
{!isLoading && loadError && (
  <ErrorState message={loadError} onRetry={() => void loadFn()} />
)}
{!isLoading && !loadError && ( /* conteúdo */ )}
```

- **Home:** vazio parcial no card; links «Acesso rápido» só após load OK.
- **Agendamentos:** `EmptyState` quando lista filtrada vazia após load OK.
- **Perfil:** `profile === null` após 200 ≠ `loadError`.

**Admin / agenda:** Stages 39–40 em branches ou `develop` conforme merge; não reverter padrões ao editar portal.

**Testes client:** 1248 testes após Stage 41.

**Próximos passos sugeridos:** FE-005 modais; FE-003 rota 404; validação visual cruzada; merge ordenado Stage 40 → 41 se ainda em branches separadas.
