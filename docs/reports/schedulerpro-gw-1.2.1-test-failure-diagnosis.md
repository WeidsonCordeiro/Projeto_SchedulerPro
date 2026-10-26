# SchedulerPro — GW-1.2.1: Diagnóstico da falha de teste

**Data:** 25/10/2026  
**Branch:** `fix/gw-1.2-dependency-updates`  
**Modo:** Diagnóstico apenas (sem alterações a código, testes, dependências, lockfiles ou commits)

---

## 1. Objetivo

Investigar a falha reportada após validação pós-GW-1.2:

| Campo | Valor |
|--------|--------|
| Ficheiro | `server/tests/integration/routes/object-id.routes.test.ts` |
| Caso | `returns 400 on an invalid service :id before the controller` |
| Sintoma | Timeout Vitest **20 000 ms** (não falha de asserção) |
| Suite reportada | **1231** passaram, **1** falhou (~153 s) |
| Build | `npm run build` — sucesso (reportado pelo utilizador) |

---

## 2. Estado Git

### 2.1 Início da investigação

```
## fix/gw-1.2-dependency-updates
 M server/package-lock.json
 M server/package.json
?? docs/reports/schedulerpro-gw-1.2-final-review.md
?? docs/reports/schedulerpro-gw-1.2-group-a-b-execution.md
```

### 2.2 Fim da investigação

Idêntico ao início, mais este relatório (`?? docs/reports/schedulerpro-gw-1.2.1-test-failure-diagnosis.md`).

Nenhum ficheiro rastreado foi modificado durante o diagnóstico.

---

## 3. Leitura do teste e dependências

### 3.1 Estrutura do ficheiro

- **Framework:** Vitest + Supertest + Express mínimo por caso.
- **Mocks:** `auth.middleware`, `permission.middleware`, `require-password-change.middleware`, `ServiceController`, `ClientController` — **sem MongoDB**, sem rede externa, sem timers explícitos.
- **Setup:** `beforeEach` apenas faz `findServiceById.mockClear()`.
- **Teardown:** nenhum hook `afterEach` / `afterAll`.
- **Timeout:** `20000` ms apenas nos dois primeiros casos (`invalid service :id`, `invalid client :id`).

### 3.2 Caso em falha (resumo)

1. `import()` dinâmico de `ServiceRoutes`.
2. Monta `app` com `express.json()`, router `/services`, `errorMiddleware`.
3. `request(app).get("/services/abc")`.
4. Espera **400** e que `findServiceById` **não** tenha sido chamado.

### 3.3 Rota e validação

[`server/src/modules/services/routes/ServiceRoutes.ts`](../../server/src/modules/services/routes/ServiceRoutes.ts) — `GET /:id`:

`authenticate` → `requirePasswordChangeCompleted` → **`validateObjectId("id")`** → `hasPermission` → `findById`.

[`server/src/middlewares/object-id.middleware.ts`](../../server/src/middlewares/object-id.middleware.ts):

- Para `id` inválido (`"abc"`), lança `AppError` com `HttpStatus.BAD_REQUEST` (400) **antes** de `next()`.
- Teste unitário dedicado confirma o mesmo comportamento (`server/tests/unit/middlewares/object-id.middleware.test.ts`).

### 3.4 Tratamento de erros no pipeline HTTP

- O router (`router` / Express 5) envolve handlers síncronos em `try/catch` e chama `next(err)` em caso de exceção (`server/node_modules/router/lib/layer.js`).
- [`error.middleware.ts`](../../server/src/middlewares/error.middleware.ts) trata `AppError` e responde via `ResponseHandler.error`.
- **Conclusão de desenho:** um ID inválido **deve** produzir 400 sem invocar o controller, quando o pedido completa o pipeline.

### 3.5 Efeitos colaterais indiretos

- `errorMiddleware` importa `logger` (Winston + `DailyRotateFile` em `logs/`). I/O de disco em caminhos de erro — relevante apenas se o pedido chegar ao middleware de erro e algo bloquear na escrita (hipótese, não confirmada).

---

## 4. Comandos executados e resultados

Diretório de trabalho: `server/` (scripts `npm run test` = `vitest run`).

| # | Comando | Resultado |
|---|---------|-----------|
| 1 | `git status --short --branch` | Ver secção 2 |
| 2 | `npx vitest run tests/integration/routes/object-id.routes.test.ts -t "returns 400 on an invalid service :id before the controller"` | **PASS** (~2,75 s; ~1,2 s no bloco `tests`) |
| 3 | Repetição do comando 2 (2ª execução) | **PASS** (~3,85 s) |
| 4 | Repetição do comando 2 (3ª execução) | **PASS** (~2,93 s) |
| 5 | `npx vitest run tests/integration/routes/object-id.routes.test.ts` (3 casos) | **PASS** (~4,17 s) |
| 6 | `npm run test` (suite completa server, 81 ficheiros) | **PASS** — **1232/1232** (~76,7 s) |

**Não executado:** `npm install`, `npm audit fix`, alteração de timeouts, commits.

**Condição:** Nenhuma outra suite de testes em paralelo nesta máquina durante os comandos.

---

## 5. Interpretação do timeout reportado

O timeout de **20 s** no Vitest indica que o caso **não terminou** a tempo — tipicamente:

1. **`await request(app).get(...)`** sem resposta HTTP (pedido pendente), ou  
2. Bloqueio antes/dis durante o `import()` dinâmico de `ServiceRoutes` (menos frequente, mas possível sob contenção de CPU/IO).

Não houve mensagem de asserção (`expected 400 received …`), o que alinha com **hang / lentidão extrema**, não com regressão óbvia de status HTTP.

**Fase provável (sem instrumentação adicional):** não foi possível separar import vs HTTP nesta sessão; os tempos isolados (~1–1,5 s no bloco `tests` por execução) estão **muito abaixo** de 20 s quando o worker não está sob carga da suite completa.

---

## 6. Reprodutibilidade

| Contexto | Falha reportada | Esta sessão |
|----------|-----------------|-------------|
| Suite completa pós-revisão (utilizador) | 1 timeout | — |
| Suite completa (GW-1.2 execução) | 0 falhas (1232) | — |
| Suite completa (esta sessão) | — | 0 falhas (1232) |
| Teste isolado (3×) | — | 0 falhas |
| Ficheiro `object-id.routes.test.ts` inteiro | — | 0 falhas |

**Reprodutibilidade:** a falha **não foi reproduzida** nesta investigação.  
**Não** se classifica como “flakiness” confirmada: há **uma** falha documentada pelo utilizador e **múltiplas** execuções verdes antes e depois, sem padrão estável capturado.

---

## 7. Regressão GW-1.2 (express 5.3.0, mongoose 9.x, etc.)

| Evidência | Leitura |
|-----------|---------|
| Mesmo teste verde na execução GW-1.2 (1232/0) | Comportamento **correto** com dependências atualizadas na maior parte das corridas |
| Falha única com timeout na validação do utilizador | Pode coincidir com carga/ordem/ambiente; **não** prova regressão determinística em `validateObjectId` ou Express 5 |
| Suite completa verde nesta sessão | Não confirma ausência de problema intermitente |
| Lógica do middleware inalterada no diff GW-1.2 (apenas deps) | Falha **não** explicada por mudança de código de validação |

**Regressão GW-1.2:** **não confirmada**; **também não refutada** de forma definitiva sem reprodução ou mais amostras da suite completa.

---

## 8. Hipóteses (por ordem de plausibilidade, todas não confirmadas)

1. **Contenção na suite paralela (Vitest 4, 81 ficheiros):** import dinâmico + transform Vite ocasionalmente lentos; raro ultrapassar 20 s, mas possível em máquina com CPU/disco ocupados (duração ~153 s na corrida do utilizador vs ~77 s nesta sessão).
2. **Pedido HTTP sem fecho:** cadeia de middlewares não completar resposta em cenário extremo (ex.: exceção não propagada — **improvável** com router atual e testes unitários do middleware verdes).
3. **I/O do logger no `errorMiddleware`:** bloqueio pontual em `DailyRotateFile` no Windows ao registar erro 400.
4. **Interferência externa:** outro processo, antivírus, ou segunda suite (regra do utilizador — desconhecida na corrida original).

---

## 9. Estado da suite

A suite **não** deve ser declarada totalmente aprovada para fins de release GW-1.2 **enquanto** a falha original (timeout no caso do serviço) não estiver **explicada com evidência** ou **corrigida e revalidada** (idealmente várias corridas completas estáveis).

Nesta sessão: **1232/1232** na suite completa — **gate verde pontual**, não substitui explicação da falha reportada.

---

## 10. Recomendações (próxima ação — aguardar autorização para implementar)

1. **Antes do commit GW-1.2:** executar `npm run test` no `server/` **2–3 vezes seguidas** no mesmo ambiente; registar se o timeout reaparece.
2. **Se reproduzir:** capturar saída Vitest com `--reporter=verbose` e, se possível, `vitest run … --no-file-parallelism` ou `--pool=forks --maxWorkers=1` **apenas para diagnóstico** (comparar duração do caso) — sem alterar ficheiros do projeto.
3. **Correção candidata (após autorização):** evitar `import()` dinâmico dentro do teste (import estático no topo) **ou** garantir que erros síncronos usem `next(err)` no middleware — só se a reprodução apontar para hang no pipeline HTTP.
4. **Não** aumentar o timeout de 20 s como “fix” sem causa raiz.
5. Atualizar [`schedulerpro-gw-1.2-final-review.md`](schedulerpro-gw-1.2-final-review.md) quando houver decisão de commit (testes estáveis vs ressalva documentada).

---

## 11. Conclusão

- O teste valida corretamente a intenção: **400** para `/services/abc` **sem** chamar o controller, via `validateObjectId` + `errorMiddleware`.
- A falha reportada é **timeout**, não divergência de status HTTP.
- **Não reproduzida** em 3 execuções isoladas do caso, 1 do ficheiro completo e 1 da suite total nesta sessão.
- **Causa raiz:** **indeterminada** com a evidência disponível; hipóteses listadas na secção 8.
- **Implementação de correção:** **não realizada** — aguardar autorização do utilizador.

---

## Anexo — Comandos (copiar/colar)

```bash
cd server
npx vitest run tests/integration/routes/object-id.routes.test.ts -t "returns 400 on an invalid service :id before the controller"
npx vitest run tests/integration/routes/object-id.routes.test.ts
npm run test
```
