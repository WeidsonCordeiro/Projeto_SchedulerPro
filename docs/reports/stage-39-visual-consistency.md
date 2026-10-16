# Stage 39 — Sistema visual e consistência do frontend

Data: 16/10/2026  
Branch: `feature/stage-39-visual-consistency` (base: `develop` com Stage 38 — `body:has(.app-shell)` presente)  
Sem commit, merge ou push.

## 1. Objetivo e âmbito

Uniformizar estados de carregamento, erro e vazio nas **páginas administrativas** (FE-001, FE-013), corrigir `PageHeader` em acesso negado aos relatórios (FE-002), reutilizando `LoadingState`, `ErrorState` e `EmptyState`. Sem redesign, sem alterações a layout global (Stage 38), API, RBAC ou portal cliente.

## 2. Achados da auditoria analisados

| ID | Tema | Ação nesta stage |
|----|------|------------------|
| FE-001 | Admin usa spinner + `alert-danger`; público usa componentes comuns | Substituído nas 8 páginas admin listadas |
| FE-002 | `ReportsPage` sem `PageHeader` em `!canView` | Corrigido |
| FE-013 | Retry inconsistente (Dashboard com `location.reload`) | `loadAll` + `ErrorState.onRetry` |

Outros FE (modais, portal, etc.) — adiados.

## 3. Problemas confirmados e causas

- **Duplicação de markup:** cada página CRUD repetia o mesmo bloco Bootstrap para loading/erro.
- **Dashboard:** early return sem `PageHeader`; retry destrutivo via reload completo.
- **Reports:** estado vazio como card ad hoc; cabeçalho manual em negação de permissão.

## 4. Decisões técnicas

1. **Padrão único:** `LoadingState` + `ErrorState` com `onRetry` apontando à função `load*` existente (leitura idempotente).
2. **`relatedError` (Dashboard/Reports):** mantido como `alert-warning` — falha parcial, sem retry global.
3. **Erros de ação** (ex. guardar em Appointments): não alterados.
4. **Componentes comuns:** sem alteração a `LoadingState.tsx` / `ErrorState.tsx` / `EmptyState.tsx`.
5. **CSS global:** não modificado (Stage 38 preservada).

## 5. Ficheiros alterados

| Ficheiro | Motivo |
|----------|--------|
| `client/src/pages/dashboard/DashboardPage.tsx` | `loadAll` em `useCallback`; header em loading/erro; componentes comuns; retry sem reload |
| `client/src/pages/clients/ClientsPage.tsx` | FE-001 |
| `client/src/pages/services/ServicesPage.tsx` | FE-001 |
| `client/src/pages/employees/EmployeesPage.tsx` | FE-001 |
| `client/src/pages/appointments/AppointmentsPage.tsx` | FE-001 |
| `client/src/pages/availability/AvailabilityPage.tsx` | FE-001 |
| `client/src/pages/company/CompanyPage.tsx` | FE-001 |
| `client/src/pages/reports/ReportsPage.tsx` | FE-001, FE-002, `EmptyState` período vazio |
| `client/src/pages/dashboard/DashboardPage.test.tsx` | Teste retry sem reload |
| `client/src/pages/reports/ReportsPage.test.tsx` | PageHeader permissão; empty heading |
| `client/src/pages/company/CompanyPage.test.tsx` | Label loading |

## 6. Correções por achado

### FE-002

- `ReportsPage`: `PageHeader` + `alert-warning` quando `!canView`.

### FE-001 / FE-013

- Oito páginas admin: labels PT (`A carregar …`) e `ErrorState` com retry seguro.
- **Dashboard:** `await loadRelated()` no fluxo principal; `PageHeader` visível em todos os estados.

### Estados vazios

- **Reports:** `EmptyState` em vez de card centrado.

## 7. Testes executados

```bash
cd client
# Focal (8 páginas)
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/dashboard/DashboardPage.test.tsx \
  src/pages/reports/ReportsPage.test.tsx \
  src/pages/clients/ClientsPage.test.tsx \
  src/pages/services/ServicesPage.test.tsx \
  src/pages/employees/EmployeesPage.test.tsx \
  src/pages/appointments/AppointmentsPage.test.tsx \
  src/pages/availability/AvailabilityPage.test.tsx \
  src/pages/company/CompanyPage.test.tsx
# → 150 testes passados (após ajustes)

npm run test -- --pool=forks --maxWorkers=1
# → 108 ficheiros, 1240 testes passados (~459s)
```

Novo teste: Dashboard `retries the initial load without reloading the page`. Clients já tinha teste de retry.

## 8. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 9. Validação visual

**Não realizada** com browser nesta sessão. Recomendado: `npm run dev` e smoke em dashboard, clientes, relatórios (incl. EMPLOYEE sem permissão), empresa — desktop e ~390px; confirmar layout Stage 38 (scroll único no shell).

## 10. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| FE-001 nas páginas do âmbito | Cumprido |
| FE-002 ReportsPage | Cumprido |
| FE-013 retry seguro | Cumprido (admin abrangido; portal adiado) |
| Estados distinguíveis | Cumprido (componentes comuns) |
| Componentes reutilizados | Cumprido |
| Stage 38 preservada | Cumprido (sem diff em layout CSS) |
| Testes + typecheck + build | Cumprido |
| Relatório + CONTEXTO | Cumprido |

## 11. Problemas conhecidos / adiado

- **Portal** (`/portal/*`): ainda spinner + alert inline — alinhar numa onda futura.
- **FE-005** modais duplicados, **FE-004** empty em dashboard global — fora de âmbito.
- Validação visual Stage 38/39 pendente.

## 12. Próxima etapa recomendada

**Stage 40 — Melhoria da experiência do calendário** (blocos, toolbar, responsivo da agenda), sem reverter padrões de estado do admin.

---

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** Stage 39 concluída na branch `feature/stage-39-visual-consistency`. Páginas admin devem usar:

```tsx
{isLoading && <LoadingState label="A carregar …" />}
{!isLoading && loadError && (
  <ErrorState message={loadError} onRetry={() => void loadData()} />
)}
```

- **Retry:** só em falhas de **leitura** inicial; não em `relatedError` nem em submits.
- **Dashboard:** `loadAll()` para retry; não usar `window.location.reload()`.
- **Reports:** `!canView` usa `PageHeader`; período sem dados usa `EmptyState`.

**Preservar Stage 38:** não alterar `index.css` do shell/notificações/tabelas sem regressão comprovada.

**Não abrangido:** portal cliente, páginas auth, fluxo público (já estava alinhado).

**Testes:** 1240 testes no client; +1 face à referência 1239 (teste Dashboard retry).

**Stage 40:** foco em `AppointmentsPage`, `CalendarView`, CSS calendário; manter `LoadingState`/`ErrorState` já introduzidos; não refatorar layout global.
