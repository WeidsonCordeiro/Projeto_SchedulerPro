# Stage 51.4.1 — Validação visual das cores por serviço

Data: 23/10/2026  
Âmbito: validação manual no browser da diferenciação por **serviço** + semântica de **estado** (Stage 51.4) — **sem alterações de código** (exceto este relatório), dados persistentes ou operações Git.

Referências: [stage-51-4-service-colors.md](./stage-51-4-service-colors.md), [stage-51-3-1-visual-validation.md](./stage-51-3-1-visual-validation.md), [stage-51-3-appointment-filters.md](./stage-51-3-appointment-filters.md), [stage-51-2-1-visual-validation.md](./stage-51-2-1-visual-validation.md).

## 1. Data e ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` + CDP `Emulation.setDeviceMetricsOverride` |
| Frontend | http://localhost:5173/ (`200`) |
| Backend | http://localhost:3000/api (`/health` → `200`) |
| Desktop | ~1280×900 (viewport útil CDP ~1130px) |
| Mobile | 390×844, `mobile: true`, `deviceScaleFactor: 2` |

## 2. Branch e Git

**Branch (fixa):** `Stage-51.4-Cores-por-servico-na-agenda`

**`git status -sb` inicial e final** (idênticos salvo este ficheiro `??`):

```
## Stage-51.4-Cores-por-servico-na-agenda
 M client/src/components/appointments/AppointmentCalendarItem.tsx
 M client/src/components/appointments/AppointmentQuickDetails.tsx
 M client/src/components/appointments/AppointmentsListView.test.tsx
 M client/src/components/appointments/AppointmentsListView.tsx
 M client/src/components/appointments/CalendarTimeGridEvent.test.tsx
 M client/src/components/appointments/CalendarTimeGridEvent.tsx
 M client/src/components/appointments/CalendarView.test.tsx
 M client/src/styles/appointments-calendar.css
?? client/src/config/appointmentServiceColor.test.ts
?? client/src/config/appointmentServiceColor.ts
?? docs/reports/stage-51-4-service-colors.md
?? docs/reports/stage-51-4-1-visual-validation.md
```

## 3. Perfil (sem segredos)

| Item | Estado |
|------|--------|
| Conta | OWNER autenticado (menu **Funcionários**, workspace «barbearia teste») |
| Acesso | `/appointments` sem redirecionamento para login |
| Credenciais no relatório | Nenhuma |

## 4. Viewports

| Viewport | Uso |
|----------|-----|
| Desktop ~1130px útil | Matriz D1–D5 |
| Mobile 390×844 | Matriz M1–M7 |

## 5. Dados utilizados (sem criação de registos)

- Período: **Outubro 2026** (mês); semana **19/10 – 25/10**; dia **19/10/2026** (3 marcações).
- Serviços observados: **Corte Masculino Geral** (`rgb(219, 234, 254)`), **Corte Geral** (`rgb(226, 232, 240)`); lista também **Corte de cabelo + Barba** (`rgb(252, 231, 243)`).
- Estados observados: **Agendado**, **Confirmado**, **Cancelado** (vários); **Concluído** / **Não compareceu** sem amostra fiável na BD para validar faixa/muted de no-show.
- **Nenhum** submit de criar/editar — **Cancelar** no formulário «Novo agendamento»; **Fechar** / **Escape** nos detalhes rápidos.

## 6. Desktop (D1–D5)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| **D1** | Cor por serviço no mês (≥2 serviços; mesmo `serviceId` → mesmo fundo; nomes legíveis) | **A** | 16 `.calendar-item`; `uniqueBgs: 2` no mês (Corte Geral vs Corte Masculino); nomes no texto/`aria-label` |
| **D2** | Serviço vs estado (Mês/Semana/Dia): faixa 4px + rótulo; terminais muted | **A** | Semana CDP: confirmado `borderLeft 4px rgb(22, 140, 114)`; agendado `rgb(82, 107, 216)`; cancelado `rgb(217, 83, 104)` + `calendar-event--muted` `opacity 0.88`. Dia 19/10: 3 blocos com faixas `confirmed` / `cancelled` |
| **D3** | Lista: swatch + nome; badges Status; layout ações | **A** | 28 swatches; 2–3 cores de serviço distintas; badges «Cancelado»/etc.; `tableOverflow: false` |
| **D4** | Detalhes rápidos: swatch serviço + badge estado; Fechar + Escape | **A** | `.appointment-service-swatch` `aria-hidden`; badge «Confirmado»; Fechar e Escape fecham painel |
| **D5** | Filtros + vistas; cores estáveis; criar e cancelar | **A** | Confirmado + Maria Silva → mês com 1 pill confirmada e fundo serviço mantido; «Limpar filtros»; Novo agendamento → Cancelar. **Nota:** fluxo **Editar** não re-aberto (só apresentação; coberto em 51.3.1) |

Overflow horizontal da **página** com filtros activos: CDP `scrollWidth === clientWidth` (1130) — **sem** overflow.

## 7. Mobile (M1–M7)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| **M1** | Mês: fundos + faixas | **A** | Dia 19 no painel móvel: 3 `.calendar-item` com `calendar-status-stripe--confirmed` / `--cancelled` |
| **M2** | Semana: blocos compactos | **P** | Grelha semanal exige scroll vertical para blocos (igual 51.2.1/51.3.1); cores coerentes quando visível |
| **M3** | Dia: cores + texto | **A** | Vista Dia 19/10/2026 com 3 agendamentos e classes de faixa (CDP alinhado a desktop) |
| **M4** | Lista: swatch + ações | **A** | 28 swatches; botões Visualizar/Excluir visíveis após scroll |
| **M5** | Detalhes: modal, swatch, badge, fecho | **A** | Lista filtrada Confirmado → Visualizar → «Detalhes do agendamento»; swatch presente; badge Confirmado; Fechar |
| **M6** | Filtros: chips/select | **A** | Chip Confirmado `pressed`; combobox Funcionário; «Limpar filtros» |
| **M7** | Overflow página | **A** | CDP repetido: `390 === 390` em lista e painel mês |

## 8. Problemas e limitações

| ID | Vista | Observado vs esperado | Severidade | Confiança | Evidência | Follow-up |
|----|-------|------------------------|------------|-----------|-----------|-----------|
| L1 | Mês mobile | Painel do dia exige seleccionar dia na grelha (comportamento 51.2) | Info | Alta | Snapshot dia 19 | Documentação UX existente |
| L2 | Dados | Sem marcação **Não compareceu** na BD para validar `calendar-event--muted` nesse estado | Info | Alta | Filtro chip sem amostra | Aceitar com limitação ou seed QA |
| L3 | Semana mobile | Scroll para ver blocos na grelha horária | Baixa | Alta | Screenshots toolbar | Não é regressão 51.4 |
| L4 | Quick details | Backdrop bloqueia chips com painel aberto (51.3.1) | Baixa | Alta | Overlay | Fechar antes de filtrar |

Empty intermitente «Hoje»/período (51.2.1/51.3.1): **não observado** nesta sessão focada em cores; **fora de âmbito** salvo regressão de 51.4.

## 9. Screenshots

Pasta: `%TEMP%\cursor\screenshots\`

| Ficheiro | Cenário |
|----------|---------|
| `stage-51-4-1-desktop-month-two-services.png` | D1 mês |
| `stage-51-4-1-desktop-week-stripe-status.png` | D2 semana |
| `stage-51-4-1-desktop-list-swatch.png` | D3 lista |
| `stage-51-4-1-desktop-quick-details-swatch.png` | D4 detalhes |
| `stage-51-4-1-desktop-filter-colors-stable.png` | D5 filtros + mês |
| `stage-51-4-1-mobile-month-day-panel.png` | M1 |
| `stage-51-4-1-mobile-week.png` | M2 |
| `stage-51-4-1-mobile-day.png` | M3 |
| `stage-51-4-1-mobile-list.png` | M4 |
| `stage-51-4-1-mobile-quick-details.png` | M5 |
| `stage-51-4-1-mobile-filters.png` | M6 |

## 10. Confirmação de escopo

| Item | Estado |
|------|--------|
| Código / testes / configs / deps | **Inalterados** nesta sessão 51.4.1 |
| Dados BD | **Sem** persistência de testes |
| Branch nova / commit / merge / push | **Nenhum** |
| Stage 51.5 | **Não iniciada** |

## 11. Recomendação final

**Aceitar a Stage 51.4 com limitações menores:** o modelo «fundo claro por serviço + faixa esquerda por estado» funciona em Mês (células e painel móvel), Semana, Dia, Lista e detalhes rápidos; filtros 51.3 não quebram as cores; terminais cancelados com `calendar-event--muted` confirmados. Limitações: sem amostra visual de **no-show** na BD; grelha semanal mobile requer scroll (pré-existente).

---

## CONTEXTO PARA A PRÓXIMA IA

- **51.4.1 concluída** na branch `Stage-51.4-Cores-por-servico-na-agenda`; WIP 51.4 local **sem commit**.
- **Evidência forte (CDP):** faixas `calendar-status-stripe--scheduled|confirmed|cancelled`; fundos `rgb(219, 234, 254)` vs `rgb(226, 232, 240)` por serviço; lista com `.appointment-service-swatch`; quick details com swatch + badge.
- **Filtros:** combinação Confirmado + funcionário mantém cor de serviço no único pill do mês filtrado.
- **Screenshots:** prefixo `stage-51-4-1-*` em `%TEMP%\cursor\screenshots\`.
- **Stage 51.4:** **aceite** com limitação L2 (no-show não amostrado). **Não** iniciar Stage 51.5 automaticamente.
- Relatório de implementação: [stage-51-4-service-colors.md](./stage-51-4-service-colors.md) (smoke browser pendente lá foi coberto por este 51.4.1).
