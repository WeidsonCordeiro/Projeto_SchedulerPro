# SchedulerPro — Ajustes finais UX do Dashboard (mobile 2 colunas + header)

**Data:** 2026-11-06  
**Referências:** [`schedulerpro-dashboard-mobile-ux-improvements.md`](./schedulerpro-dashboard-mobile-ux-improvements.md), [`schedulerpro-dashboard-status-column-fix.md`](./schedulerpro-dashboard-status-column-fix.md)

---

## 1. Problemas identificados na validação manual

1. **Mobile:** a linha compacta do accordion mostrava **hora, cliente, serviço** e badge — demasiadas colunas; o serviço na linha inicial não era necessário e o nome do cliente podia truncar depressa (`text-truncate`).
2. **Header (tablet):** o utilizador queria o **layout original** — título à esquerda e **Abrir agenda** à direita na mesma linha, sem quebras forçadas entre 768px e 1200px causadas por regras específicas `.dashboard-page`.

---

## 2. Causa técnica

| Problema | Causa |
|----------|--------|
| Serviço na linha | Markup com 5 células lógicas no grid (`hora \| cliente \| serviço \| badge \| chevron`) em [`.dashboard-appointment-mobile-row`](../../client/src/index.css) |
| Truncagem do cliente | `text-truncate` na linha compacta |
| Header em duas linhas | Em `@media (min-width: 768px) and (max-width: 1199.98px)`, regras `.dashboard-page .page-actions { flex: 1 1 100% }` e `flex-wrap` no header — herdadas da rodada UX |

**Comportamento original do header:** apenas as regras globais [`.page-header`](../../client/src/index.css) e [`.page-actions`](../../client/src/index.css) (flex row, `justify-content: space-between`, sem overrides `.dashboard-page`). O wrapper `section.dashboard-page` em [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx) permanece para testes; **sem** regras CSS de layout associadas após esta etapa.

---

## 3. Alterações — lista mobile

**Ficheiro:** [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx)

- Linha compacta em **duas colunas**:
  - **Coluna 1:** `dashboard-appointment-mobile-primary` — hora + nome do cliente (sem `text-truncate`).
  - **Coluna 2:** `dashboard-appointment-mobile-meta` — badge de status + chevron.
- **Serviço removido** da linha compacta.
- **Painel expandido:** ordem Dia → **Serviço** → Profissional (detalhes preservados; dados da API inalterados).

**Ficheiro:** [`index.css`](../../client/src/index.css)

- `.dashboard-appointment-mobile-row`: `grid-template-columns: minmax(0, 1fr) auto`.
- Novos: `.dashboard-appointment-mobile-primary`, `.dashboard-appointment-mobile-meta`.
- Cliente: `overflow-wrap: anywhere`, `word-break: break-word`, multi-linha.
- Removido uso de `.dashboard-appointment-mobile-service` na linha compacta.

---

## 4. Alterações — header

**Removido** da media query 768–1199.98px:

- `.dashboard-page .page-header`
- `.dashboard-page .page-actions`
- `.dashboard-page .page-actions .btn`

**Preservado** no mesmo media query: bloco **`.dashboard-agenda-card`** (tabela tablet, coluna Status, scroll interno, `min-width` da tabela) — conforme aprovação anterior.

**Não alterado:** [`PageHeader.tsx`](../../client/src/components/common/PageHeader.tsx).

---

## 5. Preservação tablet / desktop / mobile

| Área | Estado |
|------|--------|
| Tablet 768–1199 tabela | Regras `.dashboard-agenda-card` **intactas** |
| Desktop ≥1200 | Tabela + seis colunas **inalteradas** |
| Mobile | Accordion, um item aberto, scroll interno, cabeçalho fora da lista rolável |

---

## 6. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`DashboardAppointments.tsx`](../../client/src/pages/dashboard/DashboardAppointments.tsx) | Estrutura 2 colunas; Serviço no `<dl>` |
| [`index.css`](../../client/src/index.css) | Grid mobile + remoção overrides header `.dashboard-page` |
| [`DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | Asserts linha compacta vs painel; Serviço ao expandir |
| `docs/reports/schedulerpro-dashboard-final-ux-adjustments.md` | Este relatório |

---

## 7. Testes e build

| Comando | Resultado |
|---------|-----------|
| `npm test -- DashboardPage.test.tsx` | **22 passed**, 0 failed |
| `npm run build` | **exit 0** (`tsc -b` + Vite) |

**Limitação:** JSDOM não valida posicionamento visual do header; regressão de layout é **checklist manual**.

---

## 8. Checklist — validação visual manual

- [ ] **360 / 390 / 430 / 767px:** duas colunas; serviço só no painel; nome legível com quebra em várias linhas
- [ ] **768–1199px:** header uma linha (título esquerda, botão direita) quando viewport permite
- [ ] **Tablet tabela:** coluna Status e scroll horizontal interno preservados
- [ ] **≥1200px:** tabela desktop inalterada

---

## 9. Pendências

- Confirmar em `npm run dev` o header com sidebar aberta/fechada em larguras estreitas.
- **Sem commit** (operado pelo responsável).
