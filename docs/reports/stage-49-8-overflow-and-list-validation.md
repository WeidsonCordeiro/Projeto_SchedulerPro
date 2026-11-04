# Stage 49.8 — Overflow, lista responsiva e diagnóstico de login

Data: 21/10/2026  
Âmbito: validação manual e diagnóstico — **sem alterações de código** nem operações Git (exceto este relatório).

## 1. Ambiente e Git

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` + CDP `Emulation.setDeviceMetricsOverride` |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/api (`/health` → 200; API reiniciada nesta sessão via `tsx --watch`) |
| Sessão | OWNER já autenticado no browser (e-mail `weidson.acc@gmail.com`; **senha não registada**) |
| Desktop | 1280×900 (`mobile: false`) |
| Mobile | 390×844 (`mobile: true`, `deviceScaleFactor: 2`) |
| Git | Branch `develop`; `git diff` vazio; untracked: `docs/reports/stage-49-7-integrated-visual-validation.md` (pré-existente). **Nenhum commit desta etapa.** |

## 2. Dados de teste (`Stage49-8-overflow-test`)

| Campo | Valor |
|-------|--------|
| **Dia de validação** | **2026-11-04** (quarta-feira) |
| Cliente / serviço / colaborador | Celina Cordeiro / Corte Masculino Geral / Weidson Cordeiro (`employeeId` `6a687c5618c225255bdd7621`) |
| **Mecanismo** | UI (1ª marcação via formulário) + `POST /api/appointments` via `fetch` na origem (cookies de sessão), após falhas parciais em 18/11 |
| **Marcações no dia** | 5 (horários UTC: 09:00, 09:30, 10:00, 11:00, 11:30) |
| IDs criados (apenas estes foram apagados na limpeza) | `6ad8f1fbbebbca2029636c29`, `6ad8f210bebbca2029636c3d`, `6ad8f202bebbca2029636c2e`, `6ad8f203bebbca2029636c33`, `6ad8f208bebbca2029636c38` |
| Tentativas descartadas | 3 marcações em 2026-11-18 (UI + API) — **removidas** antes do teste final (`DELETE` 200) |
| **Limpeza** | `DELETE /api/appointments/{id}` para os 5 IDs acima → **200**; `remainingCount` com `notes` de teste = **0** |

## 3. Overflow desktop (1280×900)

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| 5 eventos no dia 04/11/2026 | **A** | API + grelha mensal (Novembro 2026) |
| Indicador `+N mais` (`MAX_VISIBLE_ITEMS` = 4) | **A** | DOM: `.calendar-overflow` texto **`+1 mais ›`** (5−4) |
| Clique no overflow | **A** | Vista **Dia** ativa (`aria-pressed`); título período **`04/11/2026`**; 5 blocos «Agendamento Celina Cordeiro» |
| Toolbar mantém data | **A** | Heading `04/11/2026` após navegação |

Screenshots:

- `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-8-desktop-overflow.png`
- `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-8-desktop-day-after-overflow.png`

## 4. Overflow mobile (390×844)

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| Badge / célula dia 4 (`5`, `1 mais`) | **A** | Snapshot: botão `4 5 1 mais` |
| Painel `#month-day-agenda-panel` | **A** | Região «Quarta-feira, 4 de novembro»; 5 itens (09:00–11:30) |
| Clique «Ver todas…» / overflow | **A** | Dia permanece selecionado; lista completa no painel (sem mudar para vista Dia global) |
| Scroll / clip horizontal | **A** | `body.scrollWidth` 390 = viewport; painel `scrollWidth` 358 = `clientWidth`; `overflow-x: visible`; sem scroll horizontal da página |
| Scroll suave do painel | **P** | Painel `scrollTop` 0 (conteúdo cabe na altura); não foi necessário scroll vertical |

Screenshot:

- `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-8-mobile-overflow.png`

**Limitação:** captura MCP pode mostrar faixa estreita do painel embed; árvore de acessibilidade e métricas CDP reflectem layout mobile esperado (cf. Stage 49.7).

## 5. Lista desktop — scroll horizontal

Vista **Lista**, contentor `.card.table-card` > `.table-responsive` > `table` ([`AppointmentsListView.tsx`](../../client/src/components/appointments/AppointmentsListView.tsx)).

### 5.1 Viewport 1280×900 (alvo do plano)

| Métrica | Valor |
|---------|--------|
| `.table-responsive` `overflow-x` | `auto` ([`index.css`](../../client/src/index.css) L1191–1196) |
| `scrollWidth` / `clientWidth` | **935 / 935** (iguais) |
| `scrollLeft` após tentativa | 0 |
| `document.documentElement.scrollLeft` | 0 |

**Resultado:** **P** — com sidebar expandida a 1280px a tabela **cabe** na área útil; scroll horizontal **não é necessário** (diferente do painel estreito da 49.7). Regra global `.table-responsive { overflow-x: auto; }` confirmada.

### 5.2 Viewport 1024×900 (complemento — overflow induzido)

| Métrica | Antes | Depois `scrollLeft = 200` |
|---------|--------|---------------------------|
| `scrollWidth` / `clientWidth` | 798 / 679 | igual |
| `.table-responsive` `scrollLeft` | 0 | **119** (máx. útil) |
| `document.documentElement.scrollLeft` | 0 | **0** |

**Resultado:** **A** — quando o conteúdo excede o contentor, o scroll ocorre **dentro** de `.table-responsive`, sem deslocar a página. Cabeçalho **Ações** e botões `.table-actions` permanecem acessíveis após scroll.

Screenshot (lista após testes, 1280):

- `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-49-8-desktop-list-scroll.png`

## 6. Diagnóstico login HTTP 500 (Stage 49.7 P3)

| Item | Conclusão |
|------|-----------|
| Reprodução nesta sessão | **Não** — sessão já autenticada; **não** foi repetido logout/login (sem credenciais no ambiente do agente). |
| Logs servidor (sessão atual) | Sem `POST /api/auth/login` 500. Observado: **reinício** da API (`tsx --watch`, ~18:08:30) após alteração em `node_modules`; sequência **401** «Não autenticado» seguida de **`POST /refresh` 200** (~18:07:55–56). |
| Hipótese (baixa confiança) | Falha intermitente na UI pode correlacionar com **janela de indisponibilidade** no restart do dev server ou pedido com cookie expirado antes do refresh automático — **não** comprovado como 500 de login. |
| Classificação | **Inconclusivo** para causa raiz do 500; evidência parcial favorece **transiente de infraestrutura/sessão** em desenvolvimento, não alteração de código nesta etapa. |

## 7. Evidências e limitações

- Overflow **desktop e mobile** validados com dados reais (5 marcações/dia).
- Lista a **1280px**: scroll **não exercitado** por falta de overflow; comportamento com overflow validado a **1024px** de largura útil.
- Diagnóstico de login **sem** nova tentativa controlada de login.
- Nenhuma alteração a `MAX_VISIBLE_ITEMS`, CSS ou regras de negócio.

## 8. Preservação

- [x] Sem commit / merge / push.
- [x] Dados `Stage49-8-overflow-test` removidos (5/5).
- [x] Sem credenciais, tokens ou cookies no relatório.
- [x] Código da aplicação inalterado (apenas este ficheiro em `docs/reports/`).

---

## CONTEXTO PARA A PRÓXIMA IA

- **Série 49.x:** refactor (49.1–49.6) + validações 49.7–49.8 podem ser **encerradas** do ponto de vista de validação manual pedida: overflow `+N mais` (desktop → Dia; mobile → painel diário) e scroll da lista **confirmados** nas condições acima.
- **Follow-ups opcionais (fora do âmbito 49.8):** (1) investigar login 500 com captura de rede durante restart do `npm run dev`; (2) lista admin em painel IDE muito estreito (&lt; ~1000px útil) — alinhar com Stage 48/49.7; (3) cards de lista em mobile admin (auditoria 49.x).
- **Baseline de testes:** continua **1331 / 119 ficheiros** (sem execução nesta etapa).
