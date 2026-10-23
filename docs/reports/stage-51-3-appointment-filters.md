# Stage 51.3 — Filtros client-side (estado + funcionário)

Data: 23/10/2026  
Âmbito: Filtros **client-side** na toolbar da agenda (Opção A — toggles de estado + select de funcionário); quatro vistas; **sem** API/backend.

## 1. Objetivo e âmbito

- Filtrar a lista visível de agendamentos já carregada por `useAppointmentsSchedule` (intervalo/período inalterado).
- **Estado:** chips `btn-sm` com `aria-pressed`; nenhum activo = todos; um ou mais = OR por `status`.
- **Funcionário:** `<select>` «Todos os funcionários» + lista de `employees` quando `canListEmployees` (OWNER/ADMIN/MANAGER).
- **Combinação:** AND entre estado e funcionário.
- **Formulário:** `AppointmentForm` continua a receber `appointments` **sem filtrar** (detecção de conflitos).
- **Fora de âmbito:** cores por serviço, backend, correcção da agenda vazia intermitente (51.2.1), novas dependências.

## 2. Comportamento

| Peça | Dados |
|------|--------|
| `CalendarView` / `AppointmentsListView` | `visibleAppointments` |
| `AppointmentForm` | `appointments` brutos |
| Filtros vazios + período sem dados | Mensagem de período existente |
| Período com dados + filtro sem match | «Nenhum agendamento corresponde aos filtros seleccionados» + **Limpar filtros** |
| `quickDetails` aberto + filtro exclui marcação | `useEffect` fecha o popover |

Filtros **persistem** ao mudar Mês / Semana / Dia / Lista na mesma sessão da página.

## 3. Implementação

### 3.1 Função pura

- `client/src/config/appointmentFilters.ts` — `filterAppointments`, `hasActiveFilters`, `AppointmentFilterCriteria`, `EMPTY_APPOINTMENT_FILTER_CRITERIA`.

### 3.2 UI

- `client/src/components/appointments/AppointmentScheduleFilters.tsx` — `fieldset` Estado, select funcionário, «Limpar filtros» quando `hasActiveFilters`.
- Toolbar: wrapper `appointments-schedule-toolbar` em `AppointmentsPage` (`AppointmentsViewSwitcher` + filtros).
- CSS: `client/src/styles/appointments-calendar.css` (`.calendar-toolbar-filters*`, `.appointments-schedule-toolbar`).

### 3.3 Lista

- `AppointmentsListView`: `emptyVariant: 'period' | 'filters'`, `onClearFilters`.

## 4. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/config/appointmentFilters.ts` | **Novo** |
| `client/src/config/appointmentFilters.test.ts` | **Novo** |
| `client/src/components/appointments/AppointmentScheduleFilters.tsx` | **Novo** |
| `client/src/components/appointments/AppointmentScheduleFilters.test.tsx` | **Novo** |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Estado, `visibleAppointments`, empty filtrado, toolbar |
| `client/src/components/appointments/AppointmentsListView.tsx` | Empty filtrado |
| `client/src/styles/appointments-calendar.css` | Estilos toolbar filtros |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` | Filtros + ajustes (acções scoped à tabela vs chips Estado) |

## 5. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm run test` | **1364** testes, **124** ficheiros — OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

**Baseline pré-51.3 (51.2):** 1350 testes / 122 ficheiros.  
**Delta:** +14 testes, +2 ficheiros de teste (`appointmentFilters`, `AppointmentScheduleFilters`).

Casos principais:

- `appointmentFilters.test.ts`: OR estado, funcionário, AND, critérios vazios, `employeeId` desconhecido.
- `AppointmentScheduleFilters.test.tsx`: `aria-pressed`, limpar, visibilidade do select.
- `AppointmentsPage.test.tsx`: lista filtrada sem chamadas API extra; empty filtrado; filtros ao mudar vista; quick details Semana após filtro de estado; testes de status na tabela isolados dos botões «Cancelado» / «Não compareceu» da toolbar.

## 6. Validação visual

Não executada nesta sessão (sem smoke browser com sessão OWNER).

**Recomendação manual:** desktop + mobile (~390px), quatro vistas — toggles de estado, select funcionário, limpar filtros, empty filtrado vs período vazio; confirmar que criar/editar e popover 51.2 continuam correctos.

## 7. Riscos e notas

| Risco | Mitigação |
|-------|-----------|
| Confundir empty período vs empty filtro | Mensagens e `emptyVariant` distintos |
| Popover órfão | Fechar quando marcação sai de `visibleAppointments` |
| Filtro não afecta conflitos no form | Lista bruta só no `AppointmentForm` |

## 8. Git

Nenhum commit nem push (conforme pedido).

---

## CONTEXTO PARA A PRÓXIMA IA

- **Feito:** filtros client-side estado (multi-toggle Opção A) + funcionário na toolbar; fonte única `filterAppointments` em `AppointmentsPage`.
- **Critérios:** `EMPTY_APPOINTMENT_FILTER_CRITERIA`; `statuses` vazio = todos; `employeeId` null = todos.
- **Permissões:** select funcionário só se `CAN_LIST_EMPLOYEES_ROLES` na página (igual hook `canListEmployees`).
- **Testes:** 1364/124; atenção a queries globais «Agendado»/«Cancelado»/«Não compareceu» — usar `within(table)` na lista.
- **Smoke:** OWNER em `/appointments`, 4 vistas + filtros + popover Semana/Dia (51.2).
- **Não implementar automaticamente:** cores por serviço (Stage 50); fix agenda vazia intermitente salvo regressão de filtros.
