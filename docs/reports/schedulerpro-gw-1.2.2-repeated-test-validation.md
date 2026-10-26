# SchedulerPro — GW-1.2.2: Validação repetida da suite de testes (server)

**Data:** 26/10/2026  
**Branch:** `fix/gw-1.2-dependency-updates`  
**Diretório do projeto:** `C:\Users\Weidson Cordeiro\Desktop\Front-End\Projetos\Projeto_SchedulerPro`  
**Modo:** Execução de testes apenas (sem alterações a código, dependências ou Git)

---

## 1. Contexto

Após a GW-1.2 (Grupos A+B) e o diagnóstico **GW-1.2.1**, foi reportada uma falha intermitente na validação pós-revisão:

| Item | Detalhe |
|------|---------|
| Ficheiro | `server/tests/integration/routes/object-id.routes.test.ts` |
| Caso | `returns 400 on an invalid service :id before the controller` |
| Sintoma | Timeout Vitest **20 000 ms** |
| Suite nessa corrida | **1231** passaram, **1** falhou (~153 s) |

Na **GW-1.2.1**, o mesmo caso passou em execuções isoladas e numa suite completa (**1232/1232**). O objetivo desta tarefa (**GW-1.2.2**) é obter **duas** corridas completas **sequenciais** da suite do servidor, sem outras suites em paralelo, para medir estabilidade antes do commit manual.

Relatório de diagnóstico anterior: [`schedulerpro-gw-1.2.1-test-failure-diagnosis.md`](schedulerpro-gw-1.2.1-test-failure-diagnosis.md).

---

## 2. Estado Git (antes e depois)

Sem alterações a ficheiros rastreados durante esta validação.

```
## fix/gw-1.2-dependency-updates
 M server/package-lock.json
 M server/package.json
?? docs/reports/schedulerpro-gw-1.2-final-review.md
?? docs/reports/schedulerpro-gw-1.2-group-a-b-execution.md
?? docs/reports/schedulerpro-gw-1.2.1-test-failure-diagnosis.md
?? docs/reports/schedulerpro-gw-1.2.2-repeated-test-validation.md  (este ficheiro)
```

---

## 3. Procedimento

1. `cd server`
2. `npm run test` (execução 1)
3. Após exit 0, `npm run test` (execução 2)
4. Nenhuma outra suite de testes em paralelo nesta sessão

**Não executado:** `npm install`, `npm audit fix`, alteração de timeouts, commits.

**Runner:** Vitest **v4.1.11** (`vitest run`, conforme `server/package.json`).

---

## 4. Resultados

### 4.1 Execução 1

| Métrica | Valor |
|---------|--------|
| Comando | `npm run test` (em `server/`) |
| Ficheiros de teste | **81** passed (**81** total) |
| Testes | **1232** passed (**1232** total) |
| Falhas | **0** |
| Duração (Vitest) | **134,11 s** |
| Código de saída | **0** |
| Início (Vitest) | 14:03:32 (relógio local da máquina) |

Resumo Vitest:

```
Test Files  81 passed (81)
     Tests  1232 passed (1232)
  Duration  134.11s (transform 15.63s, setup 1.68s, import 193.37s, tests 23.86s, environment 32ms)
```

### 4.2 Execução 2

| Métrica | Valor |
|---------|--------|
| Comando | `npm run test` (em `server/`, imediatamente após execução 1) |
| Ficheiros de teste | **81** passed (**81** total) |
| Testes | **1232** passed (**1232** total) |
| Falhas | **0** |
| Duração (Vitest) | **81,03 s** |
| Código de saída | **0** |
| Início (Vitest) | 14:05:49 (relógio local da máquina) |

Resumo Vitest:

```
Test Files  81 passed (81)
     Tests  1232 passed (1232)
  Duration  81.03s (transform 11.40s, setup 1.56s, import 91.92s, tests 21.61s, environment 23ms)
```

### 4.3 Falhas

Nenhuma. Não foi necessário capturar stack trace de falha.

### 4.4 Avisos (não bloqueantes)

- `npm warn Unknown env config "devdir"` (configuração npm local).
- Aviso Vite/Vitest sobre `vitest.config.ts` e `configLoader: 'native'` (já presente em corridas anteriores).

---

## 5. Conclusão

| Pergunta | Resposta |
|----------|----------|
| Ambas as execuções passaram? | **Sim** — **2/2** com exit **0**, **1232/1232** testes em cada uma. |
| O timeout em `object-id.routes.test.ts` reapareceu? | **Não** nestas duas corridas. |
| Problema definitivamente resolvido? | **Não.** Duas corridas verdes **não** explicam a falha única reportada (timeout 20 s) nem eliminam a possibilidade de comportamento intermitente sob outra carga, ordem de workers ou ambiente. |

**Recomendação operacional:** Estas duas execuções **reforçam** a confiança para commit manual GW-1.2, mantendo a ressalva documentada na GW-1.2.1 (causa raiz do timeout **indeterminada**). Se o utilizador quiser mais evidência, repetir mais corridas ou reproduzir com `--reporter=verbose` apenas quando houver nova falha.

---

## 6. Declaração

- Nenhum código, teste, `package.json`, `package-lock.json` ou relatório global de auditoria foi alterado.
- Nenhum commit, merge ou push foi realizado.
