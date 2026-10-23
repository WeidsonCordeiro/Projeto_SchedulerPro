# Stage 51.2.1 — Validação visual do popover de agendamento

Data: 23/10/2026  
Âmbito: validação manual no browser — **sem alterações de código**, dados persistentes ou operações Git (exceto este relatório).

Referências: [stage-51-2-appointment-details-popover.md](./stage-51-2-appointment-details-popover.md), [stage-51-1-1-visual-validation.md](./stage-51-1-1-visual-validation.md).

## 1. Ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` + CDP `Emulation.setDeviceMetricsOverride` |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/api (`/health` → 200) |
| Git | Branch `Stage-51.2-Popover-de-detalhes-do-agendamento`; working tree com alterações 51.2 locais + este relatório (`??`); **sem commit** |
| Desktop | 1280×900, `mobile: false` |
| Mobile | 390×844, `mobile: true`, `deviceScaleFactor: 2` |

## 2. Autenticação

| Item | Estado |
|------|--------|
| Conta | OWNER autenticado (perfil «Weidson», menu completo incl. Funcionários) |
| Acesso | `/appointments` carrega «Agendamentos» sem redirecionamento para login |
| Credenciais no relatório | Nenhuma |

## 3. Dados utilizados (sem criação de registos)

- Semana validada: **19/10 – 25/10** (`Hoje` na toolbar).
- Dia com blocos: **19/10/2026** (3 marcações de 30 min observadas na grelha).
- Marcação inspecionada no popover (Semana/Dia): **João da Silva Cordeiro teste**, 19/10/2026 09:00–09:30, **Confirmado**.
- **Funcionário** e **preço** presentes nos dados OWNER: Maria Silva, **20,00 €** (linhas visíveis no painel).
- Slot vazio: clique em `.week-slot` futuro → formulário **Novo agendamento**; fechado com **Cancelar** (sem submeter).
- **Limitação conhecida (dados/UI):** em vista **Dia**, dias **21/10** e **22/10** mostraram brevemente «Nenhum agendamento…» apesar de existirem marcações no mês/semana; ao regressar a **19/10** os blocos voltaram (mesmo padrão notado em 51.1.1 — fora do âmbito 51.2).

## 4. Desktop (1280×900)

### 4.1 Vista Semana

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D1 | Clique no bloco abre painel | **A** | `h2` «Detalhes do agendamento»; `.appointment-quick-details-popover` |
| D2 | Cliente, serviço, data/hora, estado | **A** | CDP: Cliente, Serviço «Corte Masculino Geral», Data 19/10/2026 09:00–09:30, badge Confirmado |
| D3 | Funcionário e preço | **A** | Funcionário Maria Silva; Preço 20,00 € |
| D4 | Popover não cortado no viewport | **A** | `getBoundingClientRect` dentro de 1280×900 com margem ≥ 8px (`inViewport: true`) |
| D5 | Fechar botão | **A** | `aria-label="Fechar"` remove painel |
| D6 | Fechar Escape | **A** | Segundo ciclo: Escape → popover ausente no DOM |
| D7 | Sem formulário de edição no bloco | **A** | `editHeading: false`; sem «Editar agendamento» |

Screenshot: `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-51-2-1-desktop-week-popover.png`

### 4.2 Vista Dia (19/10/2026)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D1–D7 | Mesmos critérios Semana | **A** | Popover read-only; campos equivalentes; fecho por botão testado |

Screenshot: `stage-51-2-1-desktop-day-popover.png`

### 4.3 Slot vazio (Semana)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D8 | Slot vazio → criação | **A** | «Novo agendamento» + comboboxes; cancelado sem gravar |

### 4.4 Mês e Lista (fluxos anteriores)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| D9 | Mês — clique na marcação | **A** | `AppointmentForm` modal (`appointmentForm: true`); **sem** `.appointment-quick-details-popover`; título «Detalhes do agendamento» no form read-only (passado) |
| D10 | Lista — Visualizar | **A** | Form modal; `quickPopover: false` |

Screenshots: `stage-51-2-1-desktop-month-flow.png`, `stage-51-2-1-desktop-list-flow.png`

## 5. Mobile (390×844)

### 5.1 Vista Semana

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M1 | Detalhes em modal | **A** | `.appointment-quick-details-modal`; sem popover desktop |
| M2 | Conteúdo legível | **A** | 6 linhas dt (Cliente … Preço); screenshot |
| M3 | Overflow horizontal página | **A** | `documentElement` scrollWidth 390 = clientWidth 390 |
| M4 | Scroll grelha | **A** (esperado) | `.week-calendar` 620 vs 358 — horizontal da grelha, não do painel |
| M5 | Botão fechar | **A** | `Fechar` no snapshot com modal aberto |
| M6 | Escape | **A** | Escape remove modal (`hasModal: false`) |
| M7 | Após fechar — UI utilizável | **A** | Vista Dia seleccionável; sem backdrop órfão observado |

Screenshot: `stage-51-2-1-mobile-week-modal.png`

### 5.2 Vista Dia (19/10/2026)

| ID | Critério | Resultado | Evidência |
|----|----------|-----------|-----------|
| M1–M2 | Modal + conteúdo | **A** | CDP click no bloco; modal com mesmos campos |
| M4 | Scroll grelha dia | **A** (esperado) | `.day-calendar` 620 vs 358 |
| M6 | Escape | **A** | Fecho após screenshot |

Screenshot: `stage-51-2-1-mobile-day-modal.png`  
**Nota:** clique MCP no bloco exigiu scroll CDP na grelha do dia (limite do container); interação manual normal após scroll.

## 6. Problemas e limitações

| Severidade | Descrição | Recomendação |
|------------|-----------|----------------|
| Info | Vista Dia em alguns dias (21–22/10) estado vazio transitório | Investigar intervalo de fetch no hook (fora 51.2.1); não bloqueia popover em 19/10 |
| Baixa | Screenshots desktop podem cortar visualmente o card se a página não estiver scrolled; CDP confirmou rect dentro do viewport | Opcional: scroll automático ao abrir popover (melhoria futura, não pedida em 51.2) |
| Info | Mês/Lista partilham título «Detalhes do agendamento» com o quick panel | Distinção correta por DOM: form modal vs `.appointment-quick-details-*` |

## 7. Confirmação de escopo

| Item | Estado |
|------|--------|
| Código / testes / configs | **Inalterados** |
| Dados BD | **Sem** creates/updates/deletes |
| Git write | **Nenhum** |
| Filtros agenda (Stage 50) | **Não iniciados** |

## 8. Recomendação final

**Aceitar a Stage 51.2** para o objetivo do popover read-only em **Semana** e **Dia** (desktop e mobile): campos corretos, fecho por botão e Escape, sem abrir `AppointmentForm` no clique do bloco; Mês e Lista mantêm o fluxo anterior; posicionamento dentro do viewport na marcação testada.

**Seguro avançar** para a etapa seguinte da Fase A — **filtros client-side na toolbar** — do ponto de vista desta validação visual.

---

## CONTEXTO PARA A PRÓXIMA IA

- **51.2.1 concluída** com sessão OWNER; popover/modal validado em Semana e Dia (1280 e 390×844).
- **Evidência forte:** marcação João 19/10 09:00 — popover desktop + modal mobile com funcionário e preço.
- **Distinção:** quick panel = `.appointment-quick-details-popover` ou `.appointment-quick-details-modal`; Mês/Lista = `AppointmentForm` (mesmo título possível).
- **Screenshots:** prefixo `stage-51-2-1-*` em `%TEMP%\cursor\screenshots\`.
- **Próximo passo sugerido:** implementar filtros client-side na toolbar (Stage 50 Fase A restante), após confirmação do utilizador.
