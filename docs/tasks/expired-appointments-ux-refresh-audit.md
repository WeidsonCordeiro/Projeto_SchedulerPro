# TASK 2 — Auditoria: atualização da lista de agendamentos (tempo real / relógio)

**Data da auditoria:** 2026-11-17  
**Branch analisada:** `feat/expired-appointments-confirmation-guard`  
**HEAD analisado:** `d3d56707ab6ef7122b82d9a7c4cacfb091bf0486`  
**Âmbito:** UX de agendamentos expirados (pós-guard de confirmação UX-01)  
**Tipo:** READ-ONLY — nenhum código de produção nem teste foi alterado nesta tarefa (apenas criação deste documento).

**Documentação relacionada (não editada):**

- [`expired-appointments-ux-audit.md`](./expired-appointments-ux-audit.md)
- [`expired-appointments-confirmation-guard-implementation.md`](./expired-appointments-confirmation-guard-implementation.md)

---

## 1. Ficheiros consultados

| Área | Ficheiros |
|------|-----------|
| Página | `client/src/pages/appointments/AppointmentsPage.tsx` |
| Lista | `client/src/components/appointments/AppointmentsListView.tsx` |
| Ações / tempo | `client/src/config/appointmentStatus.ts`, `client/src/config/appointmentCalendar.ts` (`isInstantInPast`) |
| Dados | `client/src/hooks/useAppointmentsSchedule.ts`, `client/src/api/endpoints/appointments.api.ts` |
| Navegação | `client/src/hooks/useAppointmentsNavigation.ts` |
| Referência (outro módulo) | `client/src/hooks/useDashboardVisibilityRefresh.ts` (comparação de padrão) |
| Backend (autoridade) | `server/src/modules/appointments/services/AppointmentService.ts` (`confirm`) |

**Pesquisas no repositório:** ausência de React Query em `client/src`; `visibilitychange` / refetch automático apenas no dashboard, não em appointments.

---

## 2. Mecanismos de atualização encontrados

### 2.1 Carregamento de dados (`useAppointmentsSchedule`)

- Estado local `appointments` preenchido por `appointmentsApi.getAppointments(params)` em `loadAppointments` (`client/src/hooks/useAppointmentsSchedule.ts`, ~L89–116).
- **Disparo inicial / re-fetch:**
  - `useEffect` (~L156–160): executa `loadAppointments()` e `loadRelated()` quando mudam `canList`, `loadAppointments`, `loadRelated`, `staffCompanyAccessSuspended`.
  - `loadAppointments` é recriado quando mudam `range.startAt`, `range.endAt` ou `companyIsActive` (~L116).
  - Vista **lista:** `computeAppointmentsRange` com `viewType === "list"` devolve `{ startAt: "", endAt: "" }` (~L44–45) — pedido sem filtro de intervalo; o intervalo **não** muda com o relógio.
- **Não existe:** `refetchInterval`, polling, `setInterval`, React Query, ou listener de `visibilitychange` neste hook ou em `AppointmentsPage`.

### 2.2 Re-fetch por ação do utilizador (`AppointmentsPage`)

`loadAppointments()` é chamado de novo após:

- Guardar / apagar agendamento (`handleSaved`, `handleDeleted`, ~L169, L175).
- Transição de status com sucesso (`handleStatusAction`, ~L200).
- Retry de erro de carga na lista / calendário (~L296, L305).
- Conflito no formulário (~L382).

**Não** há re-fetch quando o relógio passa `startAt` sem interação.

### 2.3 Navegação e “hoje” (`useAppointmentsNavigation`)

- `todayKey` é `useMemo(() => DateTime.now()…, [timezone])` (~L120–123) — calculado no mount (e se mudar o timezone), **não** atualizado periodicamente ao passar a meia-noite ou minutos.
- Efeito (~L131–137) só alinha `currentDateKey` quando `todayKey` **muda** (dependência memo); sem tick do relógio, `todayKey` permanece o valor do primeiro render.

### 2.4 Padrão existente noutra página (não reutilizado aqui)

- `useDashboardVisibilityRefresh` refresca ao tornar a aba visível (com throttle). **`AppointmentsPage` não usa este hook.**

### 2.5 Avaliação temporal na UI (não é refresh de API)

| Função | Onde | Comportamento |
|--------|------|----------------|
| `isInstantInPast(startAt, nowISO?)` | `appointmentCalendar.ts` ~L77–84 | Compara `startAt` com `DateTime.now()` se `nowISO` omitido; condição `start <= now`. |
| `getAppointmentStatusActions(status, startAt?, nowISO?)` | `appointmentStatus.ts` ~L81–91 | Para `scheduled`, omite `confirm` se `startAt` e `isInstantInPast(startAt, nowISO)`. |
| `AppointmentsListView` | ~L132–141, L186–232 | Calcula `statusActions` e `confirmBlocked` **no render** de cada linha. |

**Conclusão:** a comparação temporal é **pura** (sem estado de “agora”). Só é reavaliada quando React **re-renderiza** o componente. O passar do tempo, por si só, **não** provoca re-render.

### 2.6 Fluxo de confirmação (produção)

- UI lista: `onStatusAction` → `AppointmentsPage.handleStatusAction` → `appointmentsApi.confirmAppointment` → `PATCH /appointments/:id/confirm` (`AppointmentsPage.tsx` ~L186–187; `appointments.api.ts` ~L75–77).
- Backend: `AppointmentService.confirm()` valida `startAt < now` antes de `changeStatus` (implementação no branch em análise).

Não foi identificado outro caminho de produção que contorne `AppointmentService.confirm()`.

---

## 3. Respostas aos pontos de investigação

### 3.1 Atualização da lista

| Pergunta | Resposta |
|----------|----------|
| Atualização periódica? | **Não.** |
| Atualização ao recuperar foco da página? | **Não** (ao contrário do dashboard). |
| Atualização automática por mudança de estado persistido (`scheduled` → `cancelled` pelo scheduler)? | **Não**, sem novo `getAppointments` ou ação do utilizador — o cliente mantém o payload antigo em memória. |
| A lista depende só de API ou também de render? | **Ações** (Confirmar, Editar/Visualizar, mensagem de bloqueio) dependem do **render** atual + `isInstantInPast`; **status** no badge vem dos dados da última API (`appointment.status`). |

### 3.2 Atualização da hora

- Enquanto a página fica aberta **sem** eventos React (state, Redux, props, resize media query, etc.), **não há** novo cálculo de `getAppointmentStatusActions` / `isInstantInPast`.
- O estado persistido **Agendado** (`scheduled`) mantém-se no badge até refetch ou ação que altere dados — coerente com o modelo “scheduler cancela depois”.

### 3.3 Cenário prático (14:55 → 15:00+, lista aberta, sem interação)

Premissas: agendamento `scheduled` com início às 15:00; vista lista; permissão `canStatus`; guard UX-01 ativo.

| Pergunta | Comportamento esperado |
|----------|-------------------------|
| O botão **Confirmar** desaparece sozinho às 15:00? | **Não**, enquanto não houver re-render. Permanece visível como na renderização das 14:55. |
| A mensagem de bloqueio aparece sozinha? | **Não**, pelo mesmo motivo (`confirmBlocked` só existe quando `confirm` já foi omitido no render). |
| O estado visual no badge? | **Agendado** (`scheduled`) — dados da API não mudam até scheduler/backend/outro refetch. |
| Clicar **Confirmar** com UI desatualizada (já passou 15:00)? | Pedido à API; backend rejeita com `400` + `APPOINTMENT_CONFIRM_START_PASSED` se `startAt < now`. `handleStatusAction` define `actionError` com mensagem amigável (`getFriendlyErrorMessage`, ~L202–203). `loadAppointments` **não** corre em caso de erro. O `finally` limpa `pendingStatusAction` (~L204–205), o que **provoca re-render** — nesse momento `isInstantInPast` passa a refletir a hora atual e a UI **pode** atualizar (sumir Confirmar, mostrar mensagem, trocar Editar por Visualizar). |

**Nota de fronteira (instante exato):** frontend usa `startAt <= now` (`isInstantInPast`); backend no confirm usa `startAt < now`. No instante exacto de início, a UI (após re-render) pode bloquear confirm um pouco antes do backend — não cria bypass; é conservador na UI.

---

## 4. Impacto para o utilizador

- Utilizador com a lista parada pode ver **Confirmar** e **Editar** para um agendamento que já entrou no horário de início, até interagir ou ocorrer outro re-render.
- O **badge** continua “Agendado” até cancelamento automático visível na próxima carga — comportamento já conhecido da auditoria UX (sem estado `expired`).
- Tentativa de confirmar na janela desatualizada: falha clara no backend + mensagem de erro na página; **não** há confirmação indevida.

---

## 5. Classificação do problema

**Problema apenas visual (UX desatualizada por falta de tick / refetch temporal).**

- **Não** classificado como problema funcional: a regra de negócio está garantida no `AppointmentService.confirm()`.
- **Não** classificado como “sem problema”: não há atualização automática alinhada ao relógio na lista.

---

## 6. Recomendação técnica mínima (não implementada)

Objetivo: forçar reavaliação de `isInstantInPast` / `getAppointmentStatusActions` sem alterar o modelo de dados nem depender do scheduler.

**Opção A (mínima, só UI temporal)** — alinhada à arquitetura actual:

- Pequeno hook em `client/src/hooks/` (ex.: `usePeriodicTick`) com `setInterval` apenas enquanto a página de agenda está montada e existir pelo menos um agendamento `scheduled` com `startAt` futuro ou há pouco passado (opcional: intervalo 30–60 s, ou timeout único agendado para o próximo `startAt` mais próximo).
- Consumir o tick em `AppointmentsPage` (passar `nowISO` opcional a `AppointmentsListView`) **ou** fazer o tick `setState` local que re-renderiza a lista sem chamar API.
- **Não** altera necessidade de backend como autoridade no clique.

**Opção B (complementar, baixo custo):**

- Reutilizar o padrão de `useDashboardVisibilityRefresh` para chamar `loadAppointments` quando a aba fica visible (com throttle), actualizando status após o scheduler cancelar vencidos — melhora consistência de **dados**, não substitui tick para o minuto exacto de `startAt`.

**Fora do mínimo (não recomendado como primeira linha):** React Query, polling contínuo da API, ou alterar scheduler só por causa da lista.

Aguardar aprovação explícita antes de qualquer implementação.

---

## 7. Diagrama — fontes de re-render vs. relógio

```
Relógio (tempo real)
    |
    |  (sem listener)
    v
[Estado React inalterado] ---> ListView render congelado
    |
    |  interação: filtro, vista, status OK, click (pending),
    |  Redux, formulário, retry API
    v
[Novo render] ---> isInstantInPast / getAppointmentStatusActions (DateTime.now())
    |
    +---> API loadAppointments ---> appointment.status actualizado (se scheduler já correu)
```

---

## 8. Confirmação de conformidade da auditoria

- Nenhum ficheiro de **produção** ou **teste** foi modificado para produzir esta auditoria.
- Apenas foi **criado** este relatório: `docs/tasks/expired-appointments-ux-refresh-audit.md`.
- Não foram criados commits, branches, PRs, hooks, timers nem componentes de implementação.

---

## 9. Resumo das conclusões

1. A lista de agendamentos **não** se atualiza automaticamente quando `startAt` é ultrapassado; não há polling nem refetch ao foco na página de agenda.
2. O botão **Confirmar** e a mensagem de bloqueio dependem de **re-render**; com a página idle, **Confirmar pode permanecer visível** após as 15:00.
3. O badge **Agendado** permanece até nova carga de dados ou mudança no servidor.
4. Clicar **Confirmar** após o horário: **backend bloqueia**; o utilizador vê erro amigável; o re-render subsequente tende a corrigir a UI.
5. Classificação: **problema visual**; **não** funcional.
6. Solução mínima sugerida: **tick de render** (e opcionalmente refresh ao `visibilitychange` como no dashboard), sem implementar nesta tarefa.

---

## 10. Estado Git após a auditoria

Comando: `git status --short`

```
 M client/src/api/errors.test.ts
 M client/src/api/errors.ts
 M client/src/components/appointments/AppointmentForm.test.tsx
 M client/src/components/appointments/AppointmentForm.tsx
 M client/src/components/appointments/AppointmentsListView.test.tsx
 M client/src/components/appointments/AppointmentsListView.tsx
 M client/src/config/appointmentStatus.test.ts
 M client/src/config/appointmentStatus.ts
 M client/src/pages/appointments/AppointmentsPage.test.tsx
 M server/src/constants/error-codes.ts
 M server/src/constants/http-messages.ts
 M server/src/modules/appointments/services/AppointmentService.ts
 M server/tests/integration/availability-appointment.routes.test.ts
 M server/tests/unit/appointments/AppointmentService.test.ts
 M server/tests/unit/notifications/AppointmentNotificationDispatch.test.ts
?? docs/tasks/expired-appointments-confirmation-guard-implementation.md
?? docs/tasks/expired-appointments-ux-audit.md
?? docs/tasks/expired-appointments-ux-refresh-audit.md
```

As entradas `M` / `??` acima (excepto `expired-appointments-ux-refresh-audit.md`) já existiam antes desta auditoria; **esta tarefa adicionou apenas** o ficheiro `expired-appointments-ux-refresh-audit.md` sem alterar código.