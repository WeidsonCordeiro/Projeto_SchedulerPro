# Stage 49.7 — Validação visual integrada (calendário e agendamentos)

Data: 21/10/2026  
Âmbito: validação manual no browser — **sem alterações de código** nem operações Git.

## 1. Ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` (Chromium) |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/api (`/health` → 200) |
| Sessão | OWNER (`weidson.acc@gmail.com`) — login via UI; **senha não registada** |
| Desktop | CDP `Emulation.setDeviceMetricsOverride` **1280×900** (após teste inicial em painel estreito) |
| Mobile | CDP **390×844**, `mobile: true`, `deviceScaleFactor: 2` |
| Git | `git status` / `git diff` vazios no momento do relatório (sem commit desta etapa) |

**Nota de login:** a primeira submissão do formulário mostrou *«Erro interno do servidor»*; nova tentativa (digitação + clique em Entrar) autenticou com sucesso e redirecionou para `/`. Não foi alterada BD nem configuração.

**Dados:** não foram criados agendamentos `Stage49-7-overflow-test` (não havia dia com ≥5 marcações nos meses navegados).

## 2. Evidências (screenshots)

Ficheiros guardados pelo browser MCP:

| Ficheiro | Conteúdo |
|----------|----------|
| `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-7-desktop-month.png` | Mês com painel IDE estreito — grelha comprimida (ver problema P1) |
| `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-7-desktop-month-1280.png` | Mês a 1280px (incl. estado de loading observado) |
| `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-7-desktop-list.png` | Vista Lista + toolbar |
| `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-7-mobile-month-agenda.png` | Mês mobile + toolbar empilhada |
| `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-7-mobile-modal.png` | Modal «Detalhes do agendamento» (mobile) |

## 3. Desktop (~1280px)

| ID | Resultado | Observações |
|----|-----------|-------------|
| D1 | **A** | `/appointments` com toolbar única (`Anterior` / `Hoje` / `Próximo`, período, Mês/Semana/Dia/Lista) |
| D2 | **A** | Quatro vistas alternam; `aria-pressed` em Mês/Semana/Dia/Lista verificado no snapshot |
| D3 | **A** | `Anterior` → título «Setembro 2026»; `Próximo` → «Outubro 2026» |
| D4 | **P** | Grelha mensal, cartões por estado e contagens OK a 1280px; **overflow `+N mais` NV** — nenhum `.calendar-overflow` no DOM (máx. 3 eventos/dia observados) |
| D5 | **A** | Semana: colunas e blocos de agendamento; Dia: grelha do dia corrente |
| D6 | **P** | Lista com `.table-card`, ações Visualizar/Excluir; colunas à direita cortadas no painel — scroll horizontal da tabela **não revalidado pixel a pixel** (comportamento histórico Stage 47) |
| D7 | **A** (parcial) | Spinner «A carregar agendamentos…» visto ao mudar de vista com métricas 1280px; erro de API **não** simulado |

## 4. Mobile (390×844)

| ID | Resultado | Observações |
|----|-----------|-------------|
| M1 | **A** | `flex-direction: column` em `.calendar-toolbar`; `document.body.scrollWidth` ≤ viewport (sem scroll horizontal da página) |
| M2 | **A** | Grelha compacta com badges de contagem (`19 3`, `21 2`, …) |
| M3 | **A** | Dia 19 selecionado → região `#month-day-agenda-panel` / «Segunda-feira, 19 de outubro» + 3 itens |
| M4 | **NV** | Sem dia com ≥5 eventos; nenhum controlo overflow para testar scroll do painel |
| M5 | **A** | Itens da agenda legíveis no snapshot (hora, cliente, serviço, estado) |
| M6 | **P** | Mês validado com evidência; Semana/Dia/Lista em mobile **não** capturados em screenshot separado (navegação não bloqueada) |
| M7 | **A** | Toque em agendamento → modal «Detalhes do agendamento» (somente leitura); Fechar funcional |

**Limitação de captura:** screenshots mobile no MCP podem mostrar faixa estreita à esquerda (tamanho do painel embed) apesar da emulação 390px; a árvore de acessibilidade e estilos calculados reflectem layout mobile esperado.

## 5. Cascata CSS (pós-49.6)

| ID | Resultado | Evidência |
|----|-----------|-----------|
| C1 | **A** | Ordem Vite dev: `bootstrap.min.css` → `index.css` → `appointments-calendar.css` |
| C2 | **A** | Regras `month-day-agenda-list` presentes em `styleSheets`; `panelId` = `month-day-agenda-panel`; toolbar `column` em mobile |
| C3 | **A** | `/clients` renderiza tabela e ações (smoke shell/tabela) |
| C4 | **P** | Sem anomalia clara de cascata atribuível ao parcial; ver P1 (viewport estreito **sem** emulação) |

Não foi detectada regressão óbvia da carga de `appointments-calendar.css` após `index.css` em desenvolvimento.

## 6. Problemas registados (correção fora do âmbito 49.7)

| ID | Severidade | Descrição | Relação provável |
|----|------------|-----------|------------------|
| P1 | Baixa (contexto) | Grelha mensal **ilegível** com viewport real do painel IDE &lt; largura útil (~&lt;768px) **antes** de `setDeviceMetricsOverride(1280)` | Comportamento responsivo / painel estreito; não reproduzido a 1280px |
| P2 | Baixa | Lista desktop: colunas truncadas sem confirmar scroll interno | `index.css` `.table-responsive` (global), não `appointments-calendar.css` |
| P3 | Info | Login UI: um pedido falhou com 500, retry OK | Investigar API/logs se recorrente — **não** alterado nesta etapa |

## 7. Cenários bloqueados / NV

- **D4 / M4 overflow desktop e mobile** — falta de dia com ≥5 marcações na BD local nos meses Outubro/Setembro 2026 navegados.
- **D7 erro de carga** — não reproduzido (throttle/offline não aplicado).
- **M6 completo** — screenshots só para Mês (+ modal).

## 8. Confirmações

- **Nenhuma** alteração a componentes, CSS, hooks, testes ou dados (além de leitura/navegação).
- **Nenhum** `git commit`, `merge` ou `push` executado para esta etapa.

## CONTEXTO PARA A PRÓXIMA IA

- Stages **49.1–49.6** integradas no código local; validação visual **49.7** concluída com lacunas em **overflow (M4/D4)** por dados.
- CSS agenda em [`client/src/styles/appointments-calendar.css`](../../client/src/styles/appointments-calendar.css), import em [`main.tsx`](../../client/src/main.tsx) após `index.css`.
- **Prioridade sugerida (se o utilizador quiser corrigir):** (1) smoke overflow com 5 marcações temporárias num dia futuro; (2) investigar 500 intermitente no login UI; (3) revalidar lista desktop com scroll horizontal explícito.
- **Não** é obrigatória nova refatoração estrutural; série 49.x pode encerrar após overflow manual ou aceitação do gap de dados.
- Testes automatizados baseline: **1331** / **119** (inalterados nesta etapa).
