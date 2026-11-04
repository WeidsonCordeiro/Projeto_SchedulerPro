# Stage 51.2 — Popover de detalhes do agendamento

Data: 23/10/2026  
Âmbito: Fase A — consulta rápida read-only ao clicar blocos nas vistas **Semana** e **Dia**; **Mês** e **Lista** inalterados.

## 1. Objetivo e âmbito

- Abrir painel **read-only** (popover desktop / modal compacto mobile) com cliente, serviço, data/hora, funcionário (quando disponível), estado e preço (quando `services` já carregado).
- **Sem** abrir `AppointmentForm` nem acções editar/cancelar/eliminar no painel.
- Dados já presentes em `AppointmentsPage` / `useAppointmentsSchedule` — **sem API nova**.
- **Fora de âmbito:** filtros toolbar, refactor Mês/Lista, backend, novas dependências.

## 2. Comportamento por vista

| Vista | Clique no bloco | Notas |
|-------|-----------------|-------|
| Semana / Dia | `AppointmentQuickDetails` | `onTimeGridAppointmentClick` + `anchorRect` |
| Mês | `handleCalendarAppointmentClick` → `AppointmentForm` | Sem alteração |
| Lista | `openDetails` / formulário | Sem alteração |
| Slot vazio / toolbar | Criação / navegação | Sem alteração |

## 3. Implementação

### 3.1 `AppointmentQuickDetails`

- Portal (`createPortal`) com popover estilo card + backdrop (desktop) ou `modal show d-block` (mobile, `isMobilePanel` = `isMobileCalendar` na página).
- Formatação: `formatAppointmentDate` / `formatAppointmentTime`; preço: `formatBookingPrice` + ` €` se `servicePrice` definido.
- A11y: `role="dialog"`, `aria-modal`, Escape, foco no fechar; `stopPropagation` no painel.
- Posicionamento: `computePopoverPosition` (clamp 8px ao viewport).

### 3.2 Grelha temporal

- `WeekCalendar` / `DayCalendar`: `onAppointmentClick(appointment, anchor: HTMLElement)` (`e.currentTarget`).
- `CalendarView`: prop opcional `onTimeGridAppointmentClick`; week/day usam-na; fallback a `onAppointmentClick(appointment)` para testes isolados.

### 3.3 `AppointmentsPage`

- Estado `quickDetails: { appointment, anchorRect } | null`.
- `openQuickDetails` / `closeQuickDetails`; lookup `services.find(...).price` e maps de nomes.

## 4. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/appointments/AppointmentQuickDetails.tsx` | **Novo** — painel read-only |
| `client/src/components/appointments/computePopoverPosition.ts` | **Novo** — posição viewport |
| `client/src/styles/appointments-calendar.css` | Estilos `.appointment-quick-details-*` |
| `client/src/components/appointments/WeekCalendar.tsx` | Callback com âncora |
| `client/src/components/appointments/DayCalendar.tsx` | Callback com âncora |
| `client/src/components/appointments/CalendarView.tsx` | `onTimeGridAppointmentClick` |
| `client/src/pages/appointments/AppointmentsPage.tsx` | Estado + render condicional |
| `client/src/components/appointments/AppointmentQuickDetails.test.tsx` | **Novo** |
| `client/src/components/appointments/computePopoverPosition.test.ts` | **Novo** |
| `client/src/components/appointments/CalendarView.test.tsx` | Âncora + rota week |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` | Quick details vs editar |

## 5. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm run test` | **1350** testes, **122** ficheiros — OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

**Baseline pré-51.2:** 1341 testes / 120 ficheiros.  
**Delta:** +9 testes, +2 ficheiros de teste (`AppointmentQuickDetails`, `computePopoverPosition`).

Casos principais:

- `AppointmentQuickDetails`: campos, omitir preço/funcionário, Fechar + Escape, mobile.
- `CalendarView`: week → `onTimeGridAppointmentClick` com `HTMLElement`; Day/Week passam âncora.
- `AppointmentsPage`: clique bloco Semana → «Detalhes do agendamento», **não** «Editar agendamento»; slot vazio ainda abre criar.

## 6. Validação visual

Não executada nesta sessão (sem smoke browser com sessão autenticada).

**Recomendação manual:** OWNER em `/appointments`, Semana e Dia (1280 e ~390px) — clicar bloco → popover/modal; Mês → formulário como antes.

## 7. Riscos e notas de produto

| Risco | Mitigação |
|-------|-----------|
| Popover cortado com scroll | `computePopoverPosition` + clamp |
| Regressão Mês | Handler separado `onTimeGridAppointmentClick` só week/day |
| Edição rápida na grelha | Edição continua via Mês (futuro) / Lista |

**Próximo passo sugerido (não implementado):** filtros client-side na toolbar (Fase A Stage 50).

## 8. Git

Nenhum commit nem push (conforme pedido).

---

## CONTEXTO PARA A PRÓXIMA IA

- **Feito:** popover/modal read-only Semana/Dia; Mês/List ainda abrem fluxo anterior.
- **Entrada:** `openQuickDetails(appointment, anchor)` → `getBoundingClientRect()`.
- **Preço:** só se `Service` no array `services` da página (mesma regra que nomes de serviço; CLIENT pode não ver).
- **Testes:** 1350/122; componentes novos em `appointments/`.
- **Smoke:** repetir com login em Semana/Dia.
- **Não implementar automaticamente:** filtros toolbar (Stage 50 restante).
