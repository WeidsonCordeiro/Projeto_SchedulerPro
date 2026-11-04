# Stage 51.3.1 — Validação visual dos filtros da agenda

Data: 23/10/2026  
Âmbito: validação manual no browser dos filtros client-side (Stage 51.3) — **sem alterações de código** (exceto este relatório), dados persistentes ou operações Git.

Referências: [stage-51-3-appointment-filters.md](./stage-51-3-appointment-filters.md), [stage-51-2-1-visual-validation.md](./stage-51-2-1-visual-validation.md), [stage-50-visual-reference-audit.md](./stage-50-visual-reference-audit.md).

## 1. Ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` + CDP `Emulation.setDeviceMetricsOverride` |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/api (`/health` → 200) |
| Git | Branch `Stage-51.3-Filtros-client-side-por-estado-e-funcionário` (WIP 51.3 local + este relatório `??`); **sem commit** |
| Desktop | ~1280×900 (viewport CDP ~1130px largura útil) |
| Mobile | 390×844, `mobile: true`, `deviceScaleFactor: 2` |

## 2. Autenticação

| Item | Estado |
|------|--------|
| Conta | OWNER autenticado (perfil «Weidson Cordeiro», menu com **Funcionários**) |
| Acesso | `/appointments` carrega «Agendamentos» sem redirecionamento para login |
| Credenciais no relatório | Nenhuma |

## 3. Dados utilizados (sem criação de registos)

- Período principal: **Outubro 2026** (mês); semana **19/10 – 25/10**; dia de referência **23/10/2026** (sem marcações nesse dia).
- Filtros testados: **Confirmado**, **Agendado** (multi OR), **Cancelado**, **Concluído** (empty filtrado); funcionário **Maria Silva** (AND com estados).
- Marcação de referência (popover): **João da Silva Cordeiro teste**, 19/10/2026 09:00–09:30, **Confirmado**, funcionário **Maria Silva**, preço **20,00 €**.
- Período vazio (navegação): **Dezembro 2026** (mês sem marcações no grid).
- **Nenhum** submit de formulário de criar/editar — apenas **Cancelar** / **Escape** após abrir modais.
- **Sem** creates/updates/deletes na base de dados.

## 4. Desktop

### 4.1 Toolbar e filtros (D1)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D1 | Toolbar + 5 chips Estado + select Funcionário (OWNER) | **A** | `.appointments-schedule-toolbar`; 5 chips; combobox «Todos os funcionários»; CDP: `statusChips: 5`, `employeeSelect: true` |

Screenshot: `%TEMP%\cursor\screenshots\stage-51-3-1-desktop-toolbar-filters.png`

### 4.2 Estados 0 / 1 / N (D2)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D2a | Nenhum chip pressed → todas as marcações do mês visíveis | **A** | Estado inicial: múltiplos dias com pills (ex. 19, 25, 28) |
| D2b | Só **Confirmado** → apenas marcações confirmadas | **A** | Mês: único bloco 19/10 Confirmado; `aria-pressed` em Confirmado |
| D2c | **Agendado** + **Confirmado** (OR) | **A** | Dias 19, 25 e 28 com marcações; screenshot multi-status |

Screenshot: `stage-51-3-1-desktop-filter-multi-status-month.png`

### 4.3 Funcionário + estado (AND) (D3)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D3 | Maria Silva + Agendado/Confirmado | **A** | Select «Maria Silva»; mantêm-se dias 19, 25, 28 (funcionário da marcação); combinação AND coerente com dados |

### 4.4 Limpar filtros (D4)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D4 | «Limpar filtros» repõe chips e select | **A** | Botão visível com filtros activos; após clique: chips released, «Todos os funcionários», calendário completo |

### 4.5 Quatro vistas + persistência (D5)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D5a | **Semana** com filtro Confirmado activo | **A** | Um bloco João; chip pressed mantido ao mudar vista |
| D5b | **Lista** com filtro Concluído | **A** | Empty filtrado + tabela vazia; chip pressed |
| D5c | **Dia** (23/10) | **A** | Filtros visíveis; grelha do dia sem blocos (dia sem marcações) |
| D5d | **Mês** | **A** | Coberto em D2–D4 |

Screenshot: `stage-51-3-1-desktop-filter-multi-status-week.png`

### 4.6 Empty período vs empty filtro (D6)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D6a | Empty **filtro** | **A** | Semana/Lista: «Nenhum agendamento corresponde aos filtros…» + «Limpar filtros»; lista usa título EmptyState distinto |
| D6b | Empty **período** | **A** | Dezembro 2026: «Nenhum agendamento encontrado para este período» + «Cadastrar agendamento» (copy diferente) |

Screenshots: `stage-51-3-1-desktop-filter-empty.png`, `stage-51-3-1-desktop-list-filtered.png`, `stage-51-3-1-desktop-period-empty.png`

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D6c | «Hoje» em Outubro 2026 (mês) | **P** | Após **Hoje**, mês Outubro mostrou empty de **período** apesar de marcações noutros dias do mês (padrão semelhante a 51.2.1 / fetch); **Dezembro** validou D6b de forma fiável |

### 4.7 Popover + filtro (D7)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D7 | Quick details aberto → filtro exclui marcação → popover fecha | **A** | Semana: popover com `Detalhes do agendamento`; CDP: filtro só **Cancelado** → `popover: false`, bloco Confirmado ausente |

Screenshot: `stage-51-3-1-desktop-popover-closed-after-filter.png` (estado após filtro Cancelado na semana)

**Nota:** Com popover aberto, o backdrop bloqueia cliques nos chips; filtro aplicado via CDP no DOM (comportamento esperado de overlay). Fecho do popover confirmado após exclusão lógica da marcação.

### 4.8 Criação / edição (D8)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D8a | Lista → **Editar** → **Cancelar** | **A** | Modal «Editar agendamento»; fechado sem gravar |
| D8b | Semana → slot vazio → criar | **A** | CDP clique `.week-slot` → «Novo agendamento»; **Escape** sem gravar |
| D8c | Filtros não bloqueiam fluxos | **A** | Formulários abrem com filtros na toolbar |

Overflow horizontal (desktop): CDP `scrollWidth === clientWidth` (1130) — **sem** overflow de página.

## 5. Mobile (390×844)

### 5.1 Legibilidade e a11y (M1)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M1 | Chips Estado, label Funcionário, select utilizável | **A** | Chips em várias linhas (wrap); combobox Funcionário visível após scroll da toolbar |

Screenshots: `stage-51-3-1-mobile-week-filters.png`, `stage-51-3-1-mobile-week-view-filters.png`

### 5.2 Overflow horizontal (M2)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M2 | Sem overflow da página | **A** | CDP: `390 === 390`, `hasOverflow: false` |

### 5.3 Vistas + limpar (M3)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M3 | Mês / Semana / Lista com filtro e «Limpar filtros» | **A** | Semana com Concluído + empty + limpar; Mês e Lista alternados na sessão |

### 5.4 Empty filtrado (M4)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M4 | Copy de filtro na vista calendário | **A** | «Nenhum agendamento corresponde aos filtros seleccionados.» + «Limpar filtros» |

Screenshot: `stage-51-3-1-mobile-filter-empty.png`

### 5.5 Popover/modal detalhes (M5)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M5a | Semana → modal detalhes | **A** | «Detalhes do agendamento»; João, serviço, data, Maria Silva, Confirmado, 20,00 € |
| M5b | Fechar modal | **A** | **Escape** remove painel |
| M5c | Popover fecha ao filtrar (mobile) | **N** | Não repetido em mobile (validado em desktop D7) |

Screenshot: `stage-51-3-1-mobile-day-modal-details.png`

## 6. Problemas e limitações

| Severidade | Descrição | Confiança | Recomendação |
|------------|-----------|-----------|--------------|
| Info | «Hoje» no mês Outubro mostrou empty de período com marcações noutros dias | Média | Alinhar com investigação 51.2.1 (hook/fetch); **não** bloqueia filtros 51.3 |
| Baixa | Backdrop do quick details impede clicar chips com popover aberto | Alta | UX aceitável; fechar painel antes de filtrar (ou melhoria futura) |
| Info | Rótulo «Não compareceu» partilhado entre chip de filtro e acção na lista | Alta | Distinção por contexto (toolbar vs linha da tabela) |
| Info | Grelha semana mobile exige scroll para blocos (`scrollIntoView`) | Alta | Igual 51.2.1 |

## 7. Confirmação de escopo

| Item | Estado |
|------|--------|
| Código / testes / configs / deps | **Inalterados** |
| Dados BD | **Sem** persistência de testes |
| Git write | **Nenhum** |
| Stage 51.4 | **Não iniciada** |

## 8. Recomendação final

**Aceitar a Stage 51.3** para filtros client-side (estado multi-toggle + funcionário): comportamento OR/AND, persistência entre vistas, distinção empty filtro vs período (validada em Dezembro 2026 e empty filtrado), regressão do popover 51.2 (fecho ao excluir marcação) e fluxos criar/editar preservados. Desktop e mobile (~390px) com filtros legíveis e sem overflow horizontal da página.

---

## CONTEXTO PARA A PRÓXIMA IA

- **51.3.1 concluída** com sessão OWNER; filtros validados em Mês, Semana, Dia e Lista.
- **Evidência forte:** chips `aria-pressed`, select funcionário, «Limpar filtros», empty filtrado vs «encontrado para este período» (Dezembro 2026).
- **Popover 51.2:** fecho automático quando filtro exclui marcação (desktop, CDP após overlay).
- **Screenshots:** prefixo `stage-51-3-1-*` em `%TEMP%\cursor\screenshots\`.
- **Risco conhecido:** empty intermitente ao navegar «Hoje»/dia vazio (51.2.1) — fora do âmbito salvo regressão de filtros.
- **Stage 51.3:** **aceite** do ponto de vista desta validação visual; não iniciar 51.4 automaticamente.
