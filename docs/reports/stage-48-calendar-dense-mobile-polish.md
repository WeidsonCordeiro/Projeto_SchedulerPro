# Stage 48 — Agenda densa e correções mobile pontuais

Data: 20/10/2026  
Branch: `feature/stage-48-calendar-dense-mobile-polish` (base: `develop` @ `4e43c17`, PR **#90** / Stage 47)  
HEAD: `4e43c17023a50744b9ba4d7a98b5dd42e358b742` (= `develop` @ `4e43c17`; sem commits na branch).  
`git status` (sincronizado 20/10/2026): `M` — `client/src/index.css`, `ClientsPage.tsx`, `PortalAppointmentsPage.tsx`; `??` — este relatório.  
Sem commit, merge ou push.

## 1. Objetivo

Fechar a pendência **M4** (`+N mais`) da [Stage 47](stage-47-mobile-visual-validation.md) e aplicar correções mobile pontuais (e-mail clientes, filtros portal), validando lista admin sem alteração se o scroll existente bastar.

## 2. Git e ambiente

| Item | Valor |
|------|--------|
| Branch | `feature/stage-48-calendar-dense-mobile-polish` |
| HEAD | `4e43c17` — Merge PR #90 (relatório Stage 47); working tree com alterações Stage 48 não commitadas |
| Base `develop` | `4e43c17` — Merge PR #90 (relatório Stage 47) |
| API | `http://localhost:3000/api/health` → 200 |
| Frontend | `http://localhost:5173/` (Vite) |
| Browser | MCP `cursor-ide-browser`; mobile 390×844 via CDP `Emulation.setDeviceMetricsOverride` |

## 3. Dados de teste (agenda densa)

**Dia:** 15/11/2026 (futuro, dedicado).  
**Mecanismo:** criação via API autenticada OWNER (mesmo contrato que a UI), `notes: "Stage48-dense-test"`, 5 marcações no mesmo dia (cliente Celina Cordeiro, serviço Corte Masculino Geral, funcionária Maria Silva). Horários: 09:00, 09:40, 10:20, 11:00 e 14:00 UTC (quinto após falha de disponibilidade às 11:40).

**Limpeza (executada após validação visual):** `DELETE /api/appointments/{id}` para:

- `6ad79885bfe814e28de833a4`
- `6ad79886bfe814e28de833a9`
- `6ad79888bfe814e28de833ae`
- `6ad79889bfe814e28de833b3`
- `6ad79892bfe814e28de833b8`

Nenhuma alteração a utilizadores; apenas marcações de teste removidas.

## 4. Resultados — agenda densa (`+N mais`)

`MAX_VISIBLE_ITEMS` permanece **4** ([`MonthCalendar.tsx`](../client/src/components/appointments/MonthCalendar.tsx)).

| Verificação | Desktop | Mobile 390×844 | Evidência |
|-------------|---------|----------------|-----------|
| 4 cartões + indicador overflow | **A** | **A** | CDP: texto `+1 mais ›`; `stage-48-dense-month-desktop.png`, `stage-48-dense-month-mobile-390.png` |
| Legibilidade `.calendar-overflow` | **A** | **A** | Sem sobreposição grosseira no screenshot mobile |
| Acesso às marcações extra | **A** (parcial) | **A** (parcial) | Clique na célula do dia **15** abre modal **Novo agendamento** (prefill), não vista Dia — comportamento atual do produto; lista admin e vista Dia manual mostram todas as marcações |
| Mudança de mês / vista | **A** | **A** | Navegação Nov/2026; vistas Mês/Semana/Dia/Lista alternadas sem regressão óbvia |

**Conclusão M4:** validação densa **concluída** para o indicador `+N mais` (5 marcações/dia).

## 5. Correções mobile

### A — E-mail `/clients` (Stage 47 M2-P1)

| | |
|-|-|
| **Causa** | Coluna EMAIL com quebra de linha apesar de `min-width` da tabela |
| **Correção** | `className="text-nowrap"` no `<td>` do e-mail em [`ClientsPage.tsx`](../client/src/pages/clients/ClientsPage.tsx) |
| **Re-test** | **A** — `stage-48-diagnose-clients-after-mobile.png` (scroll horizontal da tabela preservado) |

### B — Lista `/appointments` (Stage 47 M3-P1)

| | |
|-|-|
| **Diagnóstico** | `.table-responsive`: `scrollWidth` 835 vs `clientWidth` 785; após `scrollLeft`, cabeçalhos incluem **Funcionário** completo |
| **Correção** | **Nenhuma** — scroll horizontal existente resolve |
| **Resultado** | **A** |

### C — Filtros portal (Stage 47 M6-P1)

| | |
|-|-|
| **Causa** | `btn-group` em `.page-actions` mobile com `flex: 1` e labels quebrando |
| **Correção** | Wrapper `.filter-bar` em [`PortalAppointmentsPage.tsx`](../client/src/pages/portal/PortalAppointmentsPage.tsx); regras em [`index.css`](../client/src/index.css) (`.filter-bar .btn-group` nowrap) |
| **Re-test** | **A** — `stage-48-portal-filters-after-mobile.png` (Próximos/Passados numa linha) |

## 6. Estado de erro da agenda (Fase 4)

| Tentativa | Resultado |
|-----------|-----------|
| CDP `Network.emulateNetworkConditions` offline + navegação | Falha: página `chrome-error://` (offline afetou também o Vite); sem `ErrorState` isolado observado |

**Classificação:** **NV** — simulação não fiável no MCP (igual limitação Stages 45–47). Comportamento continua coberto por testes de `ErrorState` nas páginas.

## 7. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/pages/clients/ClientsPage.tsx` | `text-nowrap` na coluna e-mail |
| `client/src/pages/portal/PortalAppointmentsPage.tsx` | Filtros dentro de `.filter-bar` |
| `client/src/index.css` | Estilos `.filter-bar .btn-group` / `.btn` (nowrap, flex-shrink) |

Sem alterações a `appointmentCalendar.ts`, auth, API de negócio ou `MAX_VISIBLE_ITEMS`.

## 8. Testes, typecheck e build

```text
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/clients/ClientsPage.test.tsx \
  src/components/appointments/CalendarView.test.tsx
→ 48 testes passados

npm run test -- --pool=forks --maxWorkers=1
→ 113 ficheiros, 1278 testes passados (~382s)

npm run typecheck → OK
npm run build → OK (aviso chunk > 500 kB — pré-existente)
```

## 9. Screenshots

Diretório: `%TEMP%\cursor\screenshots\`

- `stage-48-dense-month-mobile-390.png`
- `stage-48-dense-month-desktop.png`
- `stage-48-diagnose-clients-after-mobile.png`
- `stage-48-portal-filters-after-mobile.png`

## 10. Limitações

- Erro + retry na agenda: **NV** em browser MCP.
- Clique no dia futuro no mês abre criação, não vista Dia (não alterado nesta stage).

## 11. Preservação

- [x] Sem commit/merge/push.
- [x] Dados de teste removidos após validação.
- [x] Sem credenciais no relatório.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Branch:** `feature/stage-48-calendar-dense-mobile-polish` @ `4e43c17` + patches Stage 48 (3 ficheiros client + este relatório).
- **Testes:** **1278** verdes após patches; typecheck/build OK.
- **M4:** validado com 5 marcações em 15/11/2026; indicador `+1 mais` confirmado desktop + mobile.
- **Mobile polish:** e-mail clientes + filtros portal corrigidos; lista admin sem diff (scroll OK).
- **Próximo passo sugerido:** PR com os 3 ficheiros + relatório; opcional smoke `ErrorState` com API parada manualmente (fora do MCP offline global); produto: clarificar se clique no dia no mês deve ir para vista Dia vs. novo agendamento.
