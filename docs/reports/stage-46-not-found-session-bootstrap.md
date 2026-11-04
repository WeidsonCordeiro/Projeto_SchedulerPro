# Stage 46 — Bootstrap da sessão na página 404

Data: 20/10/2026  
Branch: `feature/stage-46-not-found-session-bootstrap` (base: `develop` @ `3cccb3e`, PR #87 Stage 45)  
Sem commit, merge ou push.

## 1. Objetivo e referência

Corrigir o comportamento descrito na [Stage 45](stage-45-authenticated-visual-validation.md): em hard reload de rota inexistente com cookie de sessão válido, a `NotFoundPage` podia renderizar o shell e CTA de **convidado** enquanto `SessionBootstrap` ainda não tinha concluído `getMe`.

## 2. Diagnóstico — causa confirmada

| Peça | Observação |
|------|------------|
| [`authSlice`](../client/src/store/slices/authSlice.ts) | Inicial: `isInitializing: true`, `isAuthenticated: false`. |
| [`SessionBootstrap`](../client/src/app/SessionBootstrap.tsx) | `getMe` em `useEffect`; filhos renderizam imediatamente. |
| [`ProtectedRoute`](../client/src/routes/ProtectedRoute.tsx) / [`GuestRoute`](../client/src/routes/GuestRoute.tsx) | `isInitializing` → `FullPageLoader`. |
| [`AppRoutes`](../client/src/routes/AppRoutes.tsx) | `path="*"` → `NotFoundPage` **fora** de `ProtectedRoute`. |
| [`NotFoundPage`](../client/src/pages/NotFoundPage.tsx) (antes) | Decidia guest vs autenticado só com `isAuthenticated`, ignorando `isInitializing`. |

### Sequência (hard reload em `*` com cookie válido)

1. Redux: `isInitializing=true`, `isAuthenticated=false`.
2. **Antes:** `NotFoundPage` → `public-shell` + “Ir para o início”.
3. `getMe` resolve → `setCredentials` → re-render com CTA staff/CLIENT (correto, mas tarde).
4. **Depois:** passo 2 substituído por `FullPageLoader` até `isInitializing=false`.

Não é falha de `getMe` tratada como autenticado: em erro, `clearCredentials` põe `isInitializing=false` e `isAuthenticated=false` → 404 convidado (comportamento preservado).

## 3. Correção aplicada

**Ficheiro:** [`client/src/pages/NotFoundPage.tsx`](../client/src/pages/NotFoundPage.tsx)

- Import de `FullPageLoader`.
- Se `isInitializing`, retornar `<FullPageLoader />` (mesmo padrão das rotas guardadas).
- Sem atrasos artificiais; sem mudanças em JWT, cookies, API, RBAC ou `notFoundNavigation`.

**Testes:**

| Ficheiro | Alteração |
|----------|-----------|
| [`NotFoundPage.test.tsx`](../client/src/pages/NotFoundPage.test.tsx) | Caso `isInitializing: true` → loader, sem 404/CTA convidado. |
| [`AppRoutes.test.tsx`](../client/src/routes/AppRoutes.test.tsx) | `renderAt("/unknown", {})` → loader durante bootstrap. |

## 4. Testes, typecheck e build

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/NotFoundPage.test.tsx \
  src/routes/AppRoutes.test.tsx \
  src/config/notFoundNavigation.test.ts
# → 69 testes passados (+2)

npm run test -- --pool=forks --maxWorkers=1
# → 113 ficheiros, 1278 testes passados (~391s)

npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

Baseline anterior: **1276** testes (Stage 45).

Cobertura automatizada mantida para: guest, staff, CLIENT, `mustChangePassword` (testes existentes em `NotFoundPage` / `AppRoutes` com `isInitializing: false`).

## 5. Verificação em browser

Ambiente: `localhost:5173` + API `localhost:3000` (health 200).

| Cenário | Resultado |
|---------|-----------|
| Hard reload `/rota-inexistente-stage46` **sem** sessão no MCP | Após bootstrap: 404 convidado (“Ir para o início”, `public-footer`) — **OK** |
| Hard reload com sessão staff no MCP | **Não verificável** nesta sessão (login no browser MCP não persistiu cookie; redirecionou para `/login` ao abrir `/`) |
| SPA após sessão | Não repetido; sem regressão esperada (lógica inalterada quando `isInitializing=false`) |

A correção do cenário staff em hard reload fica **coberta pelos testes** e pelo alinhamento com `ProtectedRoute`/`GuestRoute`. Repetir smoke manual com login estável no browser local é recomendado.

## 6. Limitações e riscos remanescentes

- 404 autenticado continua **fora** do `app-shell` (Stage 43) — fora do escopo.
- Durante `isInitializing`, qualquer rota `*` mostra loader de página inteira (igual a `/` protegido).
- Carregamento de empresa após `setCredentials` não afeta o 404.

## 7. Preservação

- [x] Sem alterações de auth backend, cookies ou contratos API.
- [x] Rotas públicas, login, portal e `mustChangePassword` inalterados na árvore de rotas.
- [x] Sem commit/merge/push.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Branch:** `feature/stage-46-not-found-session-bootstrap`.
- **Fix:** `NotFoundPage` respeita `isInitializing` com `FullPageLoader` antes de guest vs autenticado.
- **Testes client:** **1278** após Stage 46 (+2).
- **Smoke manual sugerido:** login OWNER → hard reload em URL desconhecida → loader breve → “Ir para o painel” **sem** footer público.
- **Pendência produto:** 404 staff dentro do `AppLayout` (Stage 43).
