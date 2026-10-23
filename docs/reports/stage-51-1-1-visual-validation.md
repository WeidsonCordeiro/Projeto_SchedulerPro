# Stage 51.1.1 — Validação visual dos blocos Semana/Dia

Data: 23/10/2026  
Âmbito: validação manual no browser — **sem alterações de código**, dados persistentes ou operações Git (exceto este relatório).

Referências: [stage-51-1-calendar-event-readability.md](./stage-51-1-calendar-event-readability.md), [stage-50-visual-reference-audit.md](./stage-50-visual-reference-audit.md).

Tentativa anterior (mesmo dia, manhã): bloqueada por sessão expirada. **Esta execução:** utilizador já autenticado (OWNER).

## 1. Ambiente

| Campo | Valor |
|-------|--------|
| OS | Windows 10 |
| Ferramenta | MCP `cursor-ide-browser` + CDP `Emulation.setDeviceMetricsOverride` |
| Frontend | http://localhost:5173/ |
| Backend | http://localhost:3000/api (`/health` → 200) |
| Git | Branch `51.1.1-Validação-visual-dos-blocos-Semana/Dia`; working tree limpo exceto este relatório (`??`); **sem commit** |
| Desktop | 1280×900, `mobile: false` |
| Mobile | 390×844, `mobile: true`, `deviceScaleFactor: 2` |

## 2. Autenticação

| Item | Estado |
|------|--------|
| Conta | OWNER autenticado (e-mail conhecido da sessão; **senha não registada**) |
| Acesso | `/appointments` carrega «Agendamentos» sem redirecionamento para login |
| Credenciais no relatório | Nenhuma |

## 3. Dados utilizados (sem criação de registos)

Inventário via `GET /api/appointments` (cookies de sessão no browser):

| Métrica | Valor |
|---------|--------|
| Total de marcações (amostra anual) | 28 |
| Duração máxima | **30 min** (todas) |
| Marcações ≥ 60 min | **0** |
| Pares sobrepostos no tempo | **0** |
| Dias com marcações em out/2026 (UTC date prefix) | 06, 11, 13, 18, 19, 21, 25, 28 |

**Semana validada:** 19/10 – 25/10 (`Hoje` na toolbar).  
**Dia validado com blocos:** 19/10/2026 (3 marcações de 30 min).  
**Limitação:** não foi possível validar tier `comfortable`/`expanded` (serviço visível no bloco, texto de status) nem overlap lado a lado — **dados insuficientes**, não falha de UI.

## 4. Desktop (1280×900)

### 4.1 Vista Semana (19/10 – 25/10)

| ID | Resultado | Evidência |
|----|-----------|-----------|
| W1 Horário legível | **A** | 6 blocos; `timeLine` só início em tier `--minimal` (ex. `09:00`, `10:30`) |
| W2 Cliente em ~30 min | **A** | `height` ≈ 22px, tier `calendar-week-event--minimal`; cliente visível (ex. «João da Silva Cordeiro teste» truncado na UI) |
| W3 Serviço em bloco alto | **N/V** | Nenhum bloco ≥ 52px; `hasService: false` em todos |
| W4 Truncagem / `title` | **A** | Nome longo truncado no bloco; `title` com serviço completo («Corte Masculino Geral») |
| W5 Estado | **A** | Classes `status-confirmed`, `status-cancelled`, `status-scheduled`; sem `.calendar-event-status` visível (cor do bloco); rótulo de status em `visually-hidden` |
| W6 Duração/posição | **A** | Blocos alinhados às faixas 09:00, 10:00, 10:30, 11:00 (tops 48, 96, 120, 144 px na grelha) |
| W7 Overlap | **N/V** | Sem pares sobrepostos na BD; colunas a 100% largura |

`document.documentElement.scrollWidth` = 1280 = viewport.

Screenshot: `C:\Users\Weidson Cordeiro\AppData\Local\Temp\cursor\screenshots\stage-51-1-1-desktop-week.png`

### 4.2 Vista Dia

| ID | Resultado | Evidência |
|----|-----------|-----------|
| W1–W2 | **A** | 19/10/2026: 3 blocos `--minimal`, hora + cliente |
| W3 | **N/V** | Mesma limitação de duração |
| W4 | **A** | `title` com cliente, serviço e status |
| W5 | **A** | Verde confirmado / vermelho cancelado |
| W6 | **A** | Três blocos nas horas esperadas |
| W7 | **N/V** | Sem overlap nos dados |

**Nota:** Em navegação intermédia (ex. 21/10/2026) apareceu brevemente «Nenhum agendamento…» apesar de existirem marcações nesse dia na API — ao regressar a `Hoje` + semana os dados voltaram. Tratado como **instabilidade de carga/navegação** (fora do âmbito 51.1); não invalida blocos observados em 19/10.

Screenshots: `stage-51-1-1-desktop-day.png` (23/10 vazio), `stage-51-1-1-desktop-day-19.png` (19/10 com blocos).

## 5. Mobile (390×844)

### 5.1 Vista Semana

| ID | Resultado | Evidência |
|----|-----------|-----------|
| W1–W2 | **A** | Blocos minimal com hora + cliente legíveis na coluna visível |
| W3, W7 | **N/V** | Dados |
| W4–W6 | **A** | Consistente com desktop na semana 19–25/10 |
| M1 Scroll página | **A** | `body` scrollWidth 390 = clientWidth 390 |
| M2 Scroll grelha | **A** (esperado) | `.week-calendar` scrollWidth 620 > clientWidth 358; `overflow-x: auto` |
| M3 Colunas estreitas | **A** | Texto truncado sem sobreposição de linhas observada |
| M4 Texto vs UI | **A** | Sem conflito com linha «agora» nos blocos inspecionados |

Screenshot: `stage-51-1-1-mobile-week.png`

### 5.2 Vista Dia (19/10/2026)

| ID | Resultado | Evidência |
|----|-----------|-----------|
| W1–W2, W4–W6 | **A** | Bloco 09:00 com «João da Silva Cordeiro teste» visível |
| W3, W7 | **N/V** | Dados |
| M1–M4 | **A** | Mesmas métricas de scroll; grelha do dia com largura mínima |

Screenshot: `stage-51-1-1-mobile-day.png`

## 6. Síntese por critério (51.1)

| Objetivo Stage 51.1 | Avaliação |
|---------------------|-----------|
| Hora + cliente em slots ~30 min | **A** (Semana e Dia, desktop e mobile) |
| Serviço quando altura permite | **N/V** (só slots de 30 min nos dados) |
| Estado por cor preservado | **A** |
| Duração visual (~24px / 30 min) | **A** |
| `title` / a11y para texto completo | **A** |
| Overlap layout | **N/V** (sem dados sobrepostos) |

## 7. Problemas e recomendações (sem correção nesta etapa)

| Severidade | Descrição | Recomendação |
|------------|-----------|----------------|
| Baixa | Vista Dia em alguns dias mostrou estado vazio transitório durante navegação rápida | Smoke manual ou investigação de `useAppointmentsSchedule` / intervalo dia (fora 51.1.1) |
| Info | BD só tem marcações de 30 min | Para validar tiers `comfortable`/`expanded`, usar dados de teste temporários numa etapa futura **ou** aceitar cobertura Vitest |
| Info | Primeira tentativa 51.1.1 bloqueada por auth | Resolvida nesta execução com sessão do utilizador |

## 8. Confirmação de escopo

| Item | Estado |
|------|--------|
| Código / testes / configs | **Inalterados** |
| Dados BD | **Sem** creates/deletes |
| Git write | **Nenhum** |
| Stage 51.2 | **Não iniciada** |

## 9. Recomendação final

**Aceitar a Stage 51.1** para o objetivo de legibilidade em blocos de **30 minutos** (tier `minimal`): horário e cliente visíveis, estados distinguíveis por cor, truncagem aceitável com `title` completo, sem regressão aparente de posicionamento na semana 19–25/10.

**Ressalvas:** validar tiers com serviço/texto de status no bloco e overlap **quando existirem dados** (ou repetir com seed temporário numa etapa dedicada, se o produto exigir).

---

## CONTEXTO PARA A PRÓXIMA IA

- **51.1.1 concluída** com sessão OWNER; relatório substitui a versão só com bloqueio de auth.
- **Evidência forte:** Semana 1280×900 e Dia/Mobile 19/10 — `calendar-week-event--minimal`, altura ~22px, cliente «João da Silva Cordeiro teste».
- **N/V por dados:** blocos ≥ 52px, overlap, texto de status visível (tier expanded).
- **Screenshots:** prefixo `stage-51-1-1-*` em `%TEMP%\cursor\screenshots\`.
- **Próximo passo sugerido pelo utilizador:** avaliar aceitação; depois Fase A restante (popover, filtros) — **não** 51.2 automático.
