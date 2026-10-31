# SchedulerPro — CI com GitHub Actions

**Data:** 30/10/2026  
**Branch local no momento da implementação:** `develop`  
**Âmbito:** Continuous Integration (backend `server/`) — **sem** CD, deploy ou publicação.

---

## 1. Objetivo

Automatizar validação do backend (instalação reprodutível, testes Vitest, compilação TypeScript) em cada push para `develop`, em Pull Requests para `develop`, e via execução manual (`workflow_dispatch`).

Relacionado ao backlog **GW-5** (saúde/CI) e à entrega **GW-3**, cujos testes ACC dependem de `MongoMemoryReplSet` em CI.

---

## 2. Contexto técnico

| Item | Valor |
|------|--------|
| Raiz do repositório | `Projeto_SchedulerPro/` |
| Backend | `server/` — Node **≥22** (`engines` em [`package.json`](../../server/package.json)) |
| Testes | Vitest **4.1.11** — `npm run test` → `vitest run` |
| Build | `npm run build` → `tsc` |
| Lockfile | `server/package-lock.json` — instalação CI via **`npm ci`** |
| Setup de testes | [`server/tests/setup.ts`](../../server/tests/setup.ts) define chaves de encriptação de tokens **em memória** (não exige `.env`) |
| GitHub Actions pré-existente | **Nenhum** (pasta `.github/workflows/` criada nesta tarefa) |

### 2.1 Inspeção Git (pré-implementação)

- Branch actual: **`develop`**
- Working tree: apenas `?? docs/reports/schedulerpro-gw-3-server-test-build-execution.md` (relatório anterior); **sem** alterações tracked inesperadas que impedissem a tarefa.
- **Não** executados: `git add`, commit, merge, push.

---

## 3. Estrutura criada

```text
.github/
└── workflows/
    └── ci.yml
```

Ficheiro: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

---

## 4. Eventos que disparam o CI

| Evento | Condição |
|--------|----------|
| `push` | Branch **`develop`** |
| `pull_request` | Target **`develop`** |
| `workflow_dispatch` | Manual no separador Actions do GitHub |

**Concurrency:** grupo `schedulerpro-ci-${{ github.ref }}` com `cancel-in-progress: true` (execuções mais recentes cancelam as anteriores na mesma ref).

**Permissions:** `contents: read` apenas.

---

## 5. Job `backend`

| Propriedade | Valor |
|-------------|--------|
| Runner | `ubuntu-latest` |
| Timeout | 20 minutos |
| Working directory default | `server/` |

### 5.1 Etapas

1. **Checkout** — `actions/checkout@v4`
2. **Node.js 22** — `actions/setup-node@v4`, cache npm com `cache-dependency-path: server/package-lock.json`
3. **Install** — `npm ci`
4. **Test** — `npm run test`
5. **Build** — `npm run build`

Não foram adicionados secrets, variáveis de ambiente de produção, Docker, deploy nem serviços externos (Redis, Atlas, etc.).

---

## 6. Compatibilidade — testes GW-3 (ACC)

Ficheiro: [`appointment-booking-concurrency.test.ts`](../../server/tests/integration/appointments/appointment-booking-concurrency.test.ts)

| Aspecto | Conclusão |
|---------|-----------|
| MongoDB Atlas em CI | **Não necessário** — default usa `MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } })` |
| `GW3_TEST_MONGO_URI` | Opcional; se **ausente** (caso normal no CI), usa memória |
| `.env` local | **Não obrigatório** — setup Vitest injecta chaves de teste |
| Credenciais reais | **Não** usadas pela suite ACC |
| Runner Ubuntu | `mongodb-memory-server@^10.4.3` descarrega binário MongoDB compatível; padrão comum em Actions (sem dependência VC++ do Windows) |
| Enfraquecimento de testes | **Nenhum** — workflow não altera testes |

**Risco documentado (não bloqueante na implementação):** primeira execução no GitHub pode demorar mais por download do binário MongoDB em cache frio; timeout de 20 min é superior à suite local (~93 s em 30/10/2026).

---

## 7. Ficheiros criados ou alterados nesta tarefa

| Ficheiro | Acção |
|----------|--------|
| `.github/workflows/ci.yml` | **Criado** |
| `docs/reports/schedulerpro-ci-github-actions.md` | **Criado** (este documento) |

**Implementação GW-3 / `server/src`:** **não** alterada nesta tarefa.

---

## 8. Validações executadas localmente (30/10/2026)

| Validação | Resultado |
|-----------|-----------|
| Scripts em `package.json` (`test`, `build`, lockfile presente) | Confirmado |
| Sintaxe YAML (`ci.yml`) | Estrutura válida; alinhada ao template aprovado |
| `npm ci` + `npm run test` + `npm run build` em `server/` | **`npm ci` exit 0** (~12,9 min, 30/10); **test/build** exit 0 — 82 ficheiros, **1239** testes, ~93 s; `tsc` OK (ver também [`schedulerpro-gw-3-server-test-build-execution.md`](schedulerpro-gw-3-server-test-build-execution.md)) |
| `git diff --check` | Sem erros após criar workflow + relatório |

**Não confirmado:** execução verde no GitHub Actions (requer push/PR pelo utilizador).

---

## 9. Limitações e pendências

1. **CI no GitHub:** só fica **aprovado** após workflow real com resultado verde.
2. **Scope:** apenas backend `server/` — `client/` fora deste workflow.
3. **Secrets:** nenhum configurado; se testes futuros exigirem APIs externas reais, será necessário job condicional ou mocks (hoje não aplicável à suite actual).
4. **npm `allow-scripts` (local):** `npm ci` emitiu aviso sobre postinstall de `esbuild` e `mongodb-memory-server`; **exit 0** — no GitHub Actions o comportamento pode diferir conforme versão npm; monitorizar primeira execução.
5. **Branch protection:** configurar no GitHub (exigir check `Backend - Test and Build`) — **manual**, fora desta tarefa.
6. **Node 22 patch:** Actions usa canal 22; alinhar com `engines` local se a equipa fixar versão patch exacta.

---

## 10. Instruções para o utilizador (GitHub)

1. Rever diff: `.github/workflows/ci.yml` e este relatório.
2. `git add .github/workflows/ci.yml docs/reports/schedulerpro-ci-github-actions.md` (+ outros ficheiros do PR, se aplicável).
3. Commit e **push** para `develop` ou abrir **PR** para `develop`.
4. No repositório GitHub: **Actions** → workflow **SchedulerPro CI** → confirmar job **Backend - Test and Build**.
5. (Opcional) **Actions** → **SchedulerPro CI** → **Run workflow** (`workflow_dispatch`) para validar manualmente.
6. (Recomendado) Em **Settings → Branches**, exigir o status check antes de merge em `develop`.

---

## 11. Handoff (outra IA)

- Workflow mínimo GW-5/backend: test + build em `server/` com Node 22 e `npm ci`.
- ACC/GW-3 deve passar no Ubuntu sem `.env` se `MongoMemoryReplSet` conseguir arrancar (expectativa alta).
- Próximos passos possíveis: workflow separado para `client/`, matriz Node, artefactos de coverage — **fora** do âmbito actual.
