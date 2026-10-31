# SchedulerPro — Correção de variáveis de ambiente no CI (Vitest)

**Data:** 31/10/2026  
**Contexto:** Falha do GitHub Actions em `npm run test` — [`schedulerpro-ci-github-actions.md`](schedulerpro-ci-github-actions.md)  
**Branch:** `develop` (estado local verificado antes da alteração)

---

## 1. Causa raiz

| Camada | Comportamento |
|--------|----------------|
| [`src/config/env.ts`](../../server/src/config/env.ts) | `dotenv.config()` + **`validateEnv()`** no carregamento do módulo |
| [`src/config/validateEnv.ts`](../../server/src/config/validateEnv.ts) | Exige `MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET` e chaves de token público; **`process.exit(1)`** se faltar alguma |
| [`tests/setup.ts`](../../server/tests/setup.ts) (antes) | Definia **apenas** `PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_*` |
| Ambiente local | `server/.env` preenchia as restantes variáveis → testes passavam |
| GitHub Actions | **Sem** `.env` → importação de rotas/serviços/logger via `env.ts` / `logger.ts` falhava **antes** de correr testes (~27 suites) |

Não é falha do workflow YAML: falta de bootstrap de ambiente de **teste** partilhado com o Vitest.

O aviso Vite `configLoader: 'native'` é **independente** desta falha (não tratado aqui).

---

## 2. Solução aplicada

Expandir [`server/tests/setup.ts`](../../server/tests/setup.ts) para definir **valores exclusivos de teste** para todas as variáveis exigidas por `validateEnv()`, **antes** de qualquer import da aplicação.

- `setTestEnv` só atribui se a variável estiver **vazia/ausente** — permite override local explícito (ex.: `GW3_TEST_MONGO_URI`) sem alterar `validateEnv`.
- **`MONGO_URI`:** placeholder `mongodb://127.0.0.1:27017/schedulerpro_vitest_env_placeholder` — satisfaz validação; **não** aponta para Atlas/produção.
- **`JWT_SECRET` / `REFRESH_SECRET`:** strings longas fixas, apenas para testes/CI.
- **`RESEND_API_KEY`:** placeholder `re_vitest_schedulerpro_ci_placeholder_key` — evita erro do SDK Resend ao importar `ResendProvider` sem `.env` (não envia e-mail real).
- Chaves de encriptação públicas: mantidas (Base64 32 bytes, versão `v1`).

**Não alterado:** `validateEnv.ts`, regras de produção, workflow `.github/workflows/ci.yml` (configuração pertence ao ambiente de testes).

---

## 3. Garantia — sem base de dados de produção

| Mecanismo | Detalhe |
|-----------|---------|
| URI placeholder | Nome de base `schedulerpro_vitest_env_placeholder`; localhost — não é connection string de produção |
| Testes ACC GW-3 | [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts) usa **`MongoMemoryReplSet`** ou `GW3_TEST_MONGO_URI` opcional; `mongoose.connect(replSet.getUri())` substitui a ligação efectiva |
| Maioria dos testes | Mocks / sem `MongoDatabase.connect`; nunca leem Atlas por causa do placeholder |
| Segredos | Valores inventados para Vitest; **não** secrets do GitHub nem `.env` real |

A validação **Fail Fast** da aplicação permanece activa.

---

## 4. Como as variáveis são carregadas

1. Vitest lê [`vitest.config.ts`](../../server/vitest.config.ts) → `setupFiles: ["tests/setup.ts"]`.
2. **`tests/setup.ts`** executa primeiro e preenche `process.env`.
3. Ficheiros de teste importam código da app → `env.ts` corre `dotenv.config()` (no CI, `.env` ausente) e `validateEnv()` → **sucesso**.
4. Testes de integração com Mongo em memória ligam-se ao URI do replSet **depois**, independentemente do placeholder em `env.mongo.MONGO_URI` para código que ainda não reconectou.

---

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/tests/setup.ts`](../../server/tests/setup.ts) | Bootstrap completo de env de teste |
| [`docs/reports/schedulerpro-ci-env-fix.md`](schedulerpro-ci-env-fix.md) | Este relatório |

---

## 6. Comandos executados e resultados

| Comando | Exit | Notas |
|---------|------|-------|
| `npm run test` | **0** | **82** ficheiros, **1239** testes (~146 s, 31/10/2026) |
| `npm run build` | **0** | `tsc` OK |
| `git diff --check` | **0** | Sem avisos de whitespace (excepto aviso CRLF normal em `setup.ts` no Windows) |

**Simulação sem `.env`:** após corrigir `MONGO_URI` / JWT / refresh, suites deixam de falhar em `validateEnv`. Algumas rotas de integração falhavam a seguir por **`RESEND_API_KEY` vazia** (singleton `ResendProvider`); acrescentado placeholder `re_vitest_…` em `setup.ts` (não é chave real).


---

## 7. Pendências

1. **GitHub Actions:** confirmar workflow verde após push (utilizador).
2. **Opcional:** documentar em README que testes dependem de `tests/setup.ts`, não de `.env` commitado.
3. **Segredos JWT opcionais** (`RESET_PASSWORD_SECRET`, etc.): não estão em `REQUIRED_ENV_VARIABLES`; se algum teste passar a exigir-los, acrescentar placeholders em `setup.ts` com o mesmo padrão `setTestEnv`.

---

## 8. Handoff (outra IA)

- CI não precisa de secrets para a suite actual se `setup.ts` estiver completo.
- Não desactivar `validateEnv()` nem injectar secrets reais no workflow.
- GW-3 ACC: continua a usar `MongoMemoryReplSet`; não mudar testes para “passar CI”.
