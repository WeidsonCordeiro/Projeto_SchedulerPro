# SchedulerPro — Disponibilidade mobile (Etapa 2)

**Data:** 02/11/2026  
**Tipo:** Implementação frontend (CSS responsivo) — sem alterações de negócio, API ou Redux

---

## 1. Objetivo

Melhorar a experiência mobile da secção **Exceções de disponibilidade** em [`AvailabilityExceptionsSection.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.tsx): tamanho e alinhamento do botão **Nova exceção**, layout legível das exceções cadastradas e acções **Editar** / **Excluir**, reutilizando tokens da [Etapa 1](./schedulerpro-button-standardization-step-1.md).

Referências: [auditoria global de botões](./schedulerpro-global-button-ui-audit.md) (I2, I3), plano de implementação por etapas §12.

---

## 2. Git

| Item | Valor |
|------|--------|
| Branch | Criada pelo utilizador para esta etapa (não alterada pelo agente) |
| Commit / push / merge / PR | **Não executados** (manual pelo utilizador) |

---

## 3. Problemas identificados

| ID auditoria | Problema | Estado antes desta etapa |
|--------------|----------|-------------------------|
| **I2** | «Nova exceção» compacto no mobile | Markup já corrigido (`btn btn-primary` + `.section-actions`); faltava paridade com `.page-actions` (`flex: 1` no botão) |
| **I3** | Editar/Excluir desalinhados no mobile | Regra obsoleta `margin-left: 4rem` já removida; persistiam indentação da timeline vs. linha de acções, título+badge a quebrar mal, data+detalhes apertados em ~320px |

**Fora de scope (inalterado):** calendário semanal (`.availability-board`, `.availability-timeline` de dias), regras desktop base de `.exception-item` (≥768px), lógica de exceções e modais.

---

## 4. Ficheiros analisados

| Ficheiro | Papel |
|----------|--------|
| [`client/src/index.css`](../../client/src/index.css) | Estilos `exception-*`, `.section-actions`, media queries |
| [`AvailabilityExceptionsSection.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.tsx) | Markup header, timeline, acções |
| [`AvailabilityExceptionsSection.test.tsx`](../../client/src/components/availability/AvailabilityExceptionsSection.test.tsx) | Regressão funcional |
| [`AvailabilityPage.tsx`](../../client/src/pages/availability/AvailabilityPage.tsx) | Integração da secção (sem alteração) |
| [`AvailabilityDayEditor.tsx`](../../client/src/components/availability/AvailabilityDayEditor.tsx) | Calendário semanal (sem alteração) |
| Relatórios Etapa 1 e auditoria | Tokens e causas I2/I3 |

---

## 5. Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/index.css`](../../client/src/index.css) | Regras responsivas `@767.98px` e `@575.98px` (exceções + `.section-actions .btn`) |
| `docs/reports/schedulerpro-availability-mobile-step-2.md` | Este relatório |

**Nenhum** ficheiro TSX alterado nesta etapa (markup já alinhado à auditoria §10.3).

---

## 6. Causa técnica dos desalinhamentos

1. **Timeline vs. acções:** `.exception-timeline` usa `margin-left` + `padding-left`; cada `.exception-item` empilha conteúdo e acções em coluna no mobile, mas a linha de botões ocupava 100% da largura do item enquanto o texto ficava visualmente «recuado» pela coluna de data — sensação de desalinhamento.
2. **Marcador `::before`:** Posição `left: -1.35rem` calibrada para indentação desktop; ao reduzir padding no mobile, o ponto da timeline deslocava-se em relação à borda.
3. **Título + badge:** Badge com `ms-2` inline sem `flex-wrap` controlado quebrava o título em ecrãs estreitos.
4. **Data em coluna fixa (3.4rem):** Com `.exception-item-main` em row dentro de item já em coluna, sobrava pouco espaço horizontal para detalhes entre ~320–375px.

---

## 7. Solução implementada

### 7.1 `@media (max-width: 767.98px)`

| Selector | Alteração |
|----------|-----------|
| `.section-actions .btn` | `flex: 1` (paridade com `.page-actions .btn`) |
| `.exception-timeline` | `margin-left: 0.35rem`, `padding-left: 0.75rem` |
| `.exception-item::before` | `left: -1.05rem`, `top: 1.1rem` |
| `.exception-item-main` | `width: 100%`, `align-items: flex-start` |
| `.exception-title` | `display: flex`, `flex-wrap: wrap`, `gap: 0.35rem`, `align-items: center` |
| `.exception-title .badge` | `margin-inline-start: 0` (evita duplicar espaço com `gap`) |
| `.exception-item-actions` | `max-width: 100%`, `justify-content: flex-end` |
| `.exception-item-actions.table-actions` | `flex-wrap: wrap` |

Regras já existentes mantidas: `.exception-section-header` em coluna, `.section-actions` / botão `width: 100%`, `.exception-item` em coluna.

### 7.2 `@media (max-width: 575.98px)` (scoped a exceções)

| Selector | Alteração |
|----------|-----------|
| `.exception-item-main` | `flex-direction: column`, `gap: 0.5rem` |
| `.exception-date` | `flex-direction: row`, `gap: 0.35rem`, `align-items: baseline` |
| `.exception-date-text` | `text-align: start` |

### 7.3 Tokens Etapa 1 reutilizados

- `--sp-btn-min-height` via `.btn` no CTA **Nova exceção**
- `--sp-btn-action-min-width` e `--sp-btn-action-gap` via `.exception-item-actions.table-actions .btn` (herança de `.table-actions`)

Nenhum token novo criado.

### 7.4 Desktop preservado

Regras base L708–772 (`.exception-timeline`, `.exception-item`, `::before`, etc.) **inalteradas**. Efeitos limitados a `max-width` media queries.

---

## 8. Responsividade

| Faixa | Comportamento esperado |
|-------|------------------------|
| ≥768px | Layout row do item; header exceções row; timeline indent original |
| ≤767px | Header stack; Nova exceção full-width; item em coluna; timeline indent reduzido |
| ≤575px | Data em linha compacta; main em coluna (data acima dos detalhes) |

**Tablet 768px:** Bootstrap `md` — header «Nova exceção» permanece ao lado do título (comportamento desktop do breakpoint); apenas ≤767px recebe stack. Limitação conhecida, alinhada ao padrão `.page-header` existente.

---

## 9. Testes executados

### 9.1 Dirigidos

```text
npm test -- --run src/components/availability/AvailabilityExceptionsSection.test.tsx
→ exit 0
→ 1 ficheiro, 11 testes passados (~28s)
```

### 9.2 Suite completa

```text
npm test -- --run
→ exit 0
→ 131 ficheiros, 1439 testes passados (~499s)
```

### 9.3 Build

```text
npm run build
→ exit 0
→ tsc -b && vite build (~16s build)
→ aviso Rollup: chunk JS > 500 kB (pré-existente)
```

TypeScript: sem erros reportados pelo `tsc -b`.

---

## 10. Validação visual

| Item | Estado |
|------|--------|
| Browser manual 375 / 430 / 768 px | **Pendente** — tentativa em `http://localhost:5173/availability` sem sessão autenticada; snapshot vazio (redirecionamento/carregamento sem UI acessível ao agente) |
| Checklist manual sugerido | Ver §11 |

O agente **não** afirma validação visual concluída.

---

## 11. Checklist manual sugerido (utilizador)

- [ ] Mobile ~375px — **Nova exceção** altura/largura confortável, texto legível
- [ ] Mobile ~375px — exceções: data, título, badge e período legíveis; **Editar** / **Excluir** alinhados à direita, mesma largura mínima (Etapa 1)
- [ ] Mobile ~430px — sem overflow horizontal no card de exceções
- [ ] Tablet ~768px — header exceções aceitável; lista com timeline (pontos + linha vertical)
- [ ] Desktop ≥992px — layout row inalterado vs. antes da etapa
- [ ] Quadro semanal (Salvar dia, `.availability-timeline` de períodos) — sem regressão

---

## 12. Limitações e pendências

- Validação visual manual pendente (§10).
- Em 320px, dois botões com `min-width: 6.75rem` podem ocupar quase toda a largura — `flex-wrap` mitiga sobreposição; ajuste fino de token só se o utilizador reportar aperto.
- Motivo duplicado no subtítulo (`exception-period`) mantido — markup existente, fora de scope.
- Operações Git: responsabilidade do utilizador.

---

## 13. Contexto para outra IA

1. **Problema:** mobile da lista de exceções — CTA pequeno (I2 parcial), timeline indent vs. acções, informação apertada (I3).
2. **Solução:** apenas CSS em [`index.css`](../../client/src/index.css) dentro de `@767.98px` e `@575.98px`; TSX já tinha `.section-actions`, `.exception-item-main`, `.exception-item-actions.table-actions`.
3. **Não tocar:** blocos `.availability-board*` / `.availability-day-save` (Etapa 1 + header fix).
4. **Próximas etapas (auditoria):** harmonizar toolbars Agendamentos/Relatórios (etapa 5), Company (etapa 6) — fora deste relatório.
5. **Regressão funcional:** 1439/1439 testes verdes; build OK; zero alterações TSX nesta entrega.

---

*Fim do relatório — alterações na working tree, sem commit.*
