# Stage 43 — Página 404 e navegação (FE-003)

Data: 17/10/2026  
Branch: `feature/stage-43-not-found-page` (base: `develop` com Stage 42 merged — PR #84)  
Sem commit, merge ou push.

## 1. Objetivo e âmbito

Substituir o redirect genérico `*` → `/` por uma página **Página não encontrada** com ação de regresso contextual (convidado, staff, CLIENT, alteração de senha obrigatória). Sem alterar autenticação, RBAC, rotas válidas nem erros 404 de API nas páginas públicas.

## 2. Branch e estado inicial do Git

- `develop` atualizado; Stage 42 confirmado em `develop` (`7289b1e`).
- Branch: `feature/stage-43-not-found-page`.

## 3. Comportamento anterior e causa

- [`AppRoutes.tsx`](client/src/routes/AppRoutes.tsx): `<Route path="*" element={<Navigate to="/" replace />} />`.
- URLs desconhecidas redirecionavam para `/`; utilizadores não autenticados acabavam no login **sem** mensagem de 404 (FE-003 no relatório Stage 37).

## 4. Decisões técnicas

1. **Catch-all único** no fim da árvore → [`NotFoundPage`](client/src/pages/NotFoundPage.tsx) (não aninhado em `ProtectedRoute`, para convidados verem 404 em vez de redirect para login).
2. **Helper** [`getNotFoundHomePath`](client/src/config/notFoundNavigation.ts) + `getNotFoundHomeLabel` — sem API.
3. **UI:** `EmptyState` + `Link` Bootstrap; convidados com `public-shell` / `public-brand` (alinhado a `GuestRoute`); autenticados em `container` centrado **sem** `app-shell` (escopo mínimo).
4. CSS: `.public-layout-not-found { min-height: 50vh; }` em `index.css` (secção pública apenas).

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/config/notFoundNavigation.ts` | **Novo** — destino e rótulo do CTA |
| `client/src/config/notFoundNavigation.test.ts` | **Novo** — 8 testes |
| `client/src/pages/NotFoundPage.tsx` | **Novo** — página 404 |
| `client/src/pages/NotFoundPage.test.tsx` | **Novo** — 5 testes |
| `client/src/routes/AppRoutes.tsx` | `*` → `NotFoundPage`; removido import `Navigate` não usado |
| `client/src/routes/AppRoutes.test.tsx` | 404 convidado/staff/CLIENT; removido teste de redirect para login |
| `client/src/index.css` | `.public-layout-not-found` |

## 6. Testes e resultados

**Baseline:** `AppRoutes.test.tsx` — **52** testes.

**Focal pós-implementação:**

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/routes/AppRoutes.test.tsx \
  src/pages/NotFoundPage.test.tsx \
  src/config/notFoundNavigation.test.ts
# → 67 testes passados
```

**Suite completa:**

```bash
npm run test -- --pool=forks --maxWorkers=1
# → 113 ficheiros, 1276 testes passados (~500s)
```

Referência pré-Stage 43: **1261** testes (pós-Stage 42).

## 7. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 8. Validação visual

**Não realizada** nesta sessão (sem smoke browser em `/unknown` convidado/autenticado, 1280px / 390px).

## 9. Problemas conhecidos e adiado

- 404 autenticado **fora** do `AppLayout` (sem sidebar/navbar) — melhoria futura com catch-all aninhado + política de ranking de rotas.
- `PageHeader` no 404 admin — adiado.

## 10. Preservação de autenticação, permissões e rotas válidas

- `ProtectedRoute`, `GuestRoute`, `AppLayout`, rotas `/agendar/*`, `/convite/*`, portal e admin inalterados.
- Erros HTTP 404 em `PublicAppointmentPage` / booking — inalterados (não confundidos com rota SPA).

## 11. Resumo

FE-003 **fechado** para rotas SPA inexistentes: mensagem clara + CTA contextual.

---

## CONTEXTO PARA A PRÓXIMA IA

**Router:** última rota em [`AppRoutes.tsx`](client/src/routes/AppRoutes.tsx):

```tsx
<Route path="*" element={<NotFoundPage />} />
```

**CTA:** usar `getNotFoundHomePath` / `getNotFoundHomeLabel` de [`notFoundNavigation.ts`](client/src/config/notFoundNavigation.ts).

| Auth | Path | Label |
|------|------|-------|
| guest | `/login` | Ir para o início |
| `mustChangePassword` | `/change-password` | Alterar senha |
| `CLIENT` | `/portal` | Ir para o portal |
| staff | `/` | Ir para o painel |

**Testes client:** 1276 após Stage 43.

**Próximos passos sugeridos:** 404 dentro do shell admin; validação visual; FE-004 / FE-007 conforme auditoria Stage 37.
