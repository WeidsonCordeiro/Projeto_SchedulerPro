# Stage 51.4 — Cores por serviço na agenda

Data: 23/10/2026  
Âmbito: diferenciação visual por **tipo de serviço** (client-side), preservando semântica de **estado** — sem backend/API.

## 1. Objetivo e âmbito executado

- Paleta determinística por `appointment.serviceId` nas vistas **Mês**, **Semana**, **Dia** e indicação na **Lista**.
- **Estado:** faixa esquerda 4px (cores existentes) + texto/badge de status onde já existia; lista mantém badges Bootstrap.
- Sem novas dependências, sem alteração de fetch/hooks, sem commits.

## 2. Git

| Item | Valor |
|------|--------|
| Branch criada | `Stage-51.4-Cores-por-servico-na-agenda` (a partir de `develop`) |
| Estado final | Ficheiros modificados/novos locais; **sem** `commit`, `merge` ou `push` |
| Dados de teste persistentes | **Nenhum** |

## 3. Análise prévia (resumo)

| Ponto | Conclusão |
|-------|-----------|
| [stage-50-visual-reference-audit.md](./stage-50-visual-reference-audit.md) | Fase A item 1 — cores por serviço; risco dual-encoding mitigado com dois canais visuais |
| [stage-51-3-appointment-filters.md](./stage-51-3-appointment-filters.md) | Filtros inalterados; cores só na camada de apresentação |
| [stage-51-3-1-visual-validation.md](./stage-51-3-1-visual-validation.md) | 51.3 aceite; empty intermitente fora de âmbito |
| `Service` | Sem campo `color` — paleta hash em frontend |
| `useAppointmentsSchedule` | `serviceId` em cada `Appointment`; nomes já carregados — **zero** chamadas API extra |

## 4. Decisão visual

| Canal | Serviço | Estado |
|-------|---------|--------|
| Mês / Semana / Dia | Fundo claro da paleta (`getServiceCalendarStyle`) | Classe `calendar-status-stripe--{status}` (border-left 4px, hex alinhados a `.status-*`) + rótulo de estado nos tiers 51.1 |
| Lista | Swatch `.appointment-service-swatch` na coluna Serviço | Coluna Status com `APPOINTMENT_STATUS_BADGE_CLASS` (inalterada) |
| Quick details | Swatch junto ao nome do serviço | Badge de estado no painel |

**Fallback:** `serviceId` ausente/vazio → `#e8ecf1` / texto `#334155`.  
**Terminais** (`cancelled`, `no-show`): classe `calendar-event--muted` (opacity 0.88).  
**A11y:** serviço e estado continuam em texto/`aria-label`; swatch `aria-hidden`.

## 5. Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/config/appointmentServiceColor.ts` | **Novo** — paleta, hash, estilo, classes de faixa |
| `client/src/config/appointmentServiceColor.test.ts` | **Novo** |
| `client/src/components/appointments/CalendarTimeGridEvent.tsx` | Fundo serviço + faixa estado |
| `client/src/components/appointments/AppointmentCalendarItem.tsx` | Idem (mês / painel dia) |
| `client/src/components/appointments/AppointmentsListView.tsx` | Swatch na coluna Serviço |
| `client/src/components/appointments/AppointmentQuickDetails.tsx` | Swatch no serviço |
| `client/src/styles/appointments-calendar.css` | `.calendar-status-stripe--*`, swatch, muted |
| `client/src/components/appointments/CalendarTimeGridEvent.test.tsx` | Assert faixa + fundo |
| `client/src/components/appointments/CalendarView.test.tsx` | Assert faixas por status |
| `client/src/components/appointments/AppointmentsListView.test.tsx` | Swatch na tabela |

**Não alterado:** `appointmentFilters`, `AppointmentsPage` (filtros/form), hooks de agenda, backend.

## 6. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm run test` | **1368** testes, **125** ficheiros — OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

**Baseline (51.3):** 1364 / 124. **Delta:** +4 testes, +1 ficheiro de teste.

Cobertura adicionada: determinismo de cor, fallback, faixa de status na grelha, swatch na lista; regressão de filtros/popover via suite existente.

## 7. Validação visual

**Não executada** nesta sessão (sem smoke browser documentado).

**Pendente (recomendado):** OWNER em `/appointments`, 1280×900 e 390×844 — 2+ serviços, vários estados, filtros activos, popover, contraste faixa vs fundo.

## 8. Limitações e riscos

| Item | Nota |
|------|------|
| Paleta fixa (10 slots) | Serviços distintos podem partilhar cor (hash); nomes de serviço mitigam ambiguidade |
| `.status-*` em CSS | Mantidas para referência/legado; blocos de calendário já não usam fundo status |
| Validação visual | Pendente até smoke manual |

## 9. Confirmação de escopo

| Item | Estado |
|------|--------|
| Commits / merge / push | **Nenhum** |
| Backend / API | **Inalterado** |
| Dados persistentes de teste | **Nenhum** |
| Stage 51.5 | **Não iniciada** |

## 10. Recomendação

Implementação pronta para revisão e commit na branch `Stage-51.4-Cores-por-servico-na-agenda`; smoke visual recomendado antes de merge.

---

## CONTEXTO PARA A PRÓXIMA IA

- **Feito:** cores por `serviceId` (fundo claro) + faixa de estado nas vistas de calendário; swatch na lista e quick details; testes 1368/125.
- **Branch:** `Stage-51.4-Cores-por-servico-na-agenda` (WIP local, sem commit).
- **Módulo central:** `getServiceCalendarStyle` / `APPOINTMENT_STATUS_STRIPE_CLASS` em `appointmentServiceColor.ts`.
- **Testes de UI:** deixar de assertar `.status-scheduled` no bloco; usar `calendar-status-stripe--*`.
- **Pendente:** validação visual 51.4-style; não corrigir empty intermitente da agenda salvo regressão.
- **Próximo passo sugerido:** smoke visual + commit pelo utilizador; Fase A Stage 50 restante (ex. KPIs) só se pedido — **não** iniciar 51.5 automaticamente.
