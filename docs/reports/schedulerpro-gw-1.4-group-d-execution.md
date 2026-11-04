# SchedulerPro — GW-1.4: Grupo D — Dependências do cliente (execução)

**Data:** 26/10/2026  
**Âmbito:** Apenas Grupo D — `follow-redirects` na cadeia `axios` do **client**. Sem alterações no server, Cloudinary ou outras fases da auditoria.

**Diretório raiz:** `C:\Users\Weidson Cordeiro\Desktop\Front-End\Projetos\Projeto_SchedulerPro`

---

## 1. Estado inicial Git e branch-base

### 1.1 Antes de qualquer alteração

| Item | Valor |
|------|--------|
| Branch ativa | `develop` (`develop...origin/develop`) |
| Working tree | **Limpo** — sem modificações locais |
| HEAD (commit de origem) | `79eb666dc98824f45ce41c028907347bf48a75b7` |
| Mensagem HEAD | `Merge pull request #111 from WeidsonCordeiro/GW-1.3-Grupo-C-—-Cloudinary-(execução)` |

**GW-1.3:** Integrada em `develop` no commit acima (não presumida sem verificação — confirmada via `git log -1`).

### 1.2 Branch criada

| Item | Valor |
|------|--------|
| Nome | `fix/gw-1.4-client-follow-redirects` |
| Base | `develop` @ `79eb666` |
| Comando | `git checkout -b fix/gw-1.4-client-follow-redirects` |

Nenhum commit, merge ou push foi executado.

---

## 2. Diagnóstico (`client/`)

### 2.1 Árvore de dependências (antes)

```
schedulerpro-frontend@0.1.0
└─┬ axios@1.20.0
  └── follow-redirects@1.16.0
```

- **Direct:** `axios@^1.20.0` em [`client/package.json`](../../client/package.json).
- **Transitiva:** `follow-redirects` — range declarado por axios: `^1.16.0` (confirmado via `npm view axios@1.20.0 dependencies.follow-redirects`).

### 2.2 Avisos analisados

| GHSA | Severidade | Pacote afetado | Condição / nota |
|------|------------|----------------|-----------------|
| [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) | High | `follow-redirects` | Versão **1.16.0** reportada pelo audit |
| [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c) | High | `follow-redirects` | Idem |

**Fix mínimo (triagem GW-1):** `follow-redirects@>=1.16.1`.  
**Última patch 1.x no npm (consulta):** `1.16.2`.

### 2.3 Opções consideradas

| Abordagem | Avaliação |
|-----------|-----------|
| Bump `axios` | `axios@1.20.0` (latest 1.20.0) ainda declara `follow-redirects@^1.16.0` — não garante patch sem resolução do lockfile. |
| `overrides` em `package.json` | Válido, mas mais intrusivo que necessário. |
| **`npm audit fix` (sem `--force`)** | Atualiza apenas a resolução transitiva no lockfile para versão corrigida dentro do range `^1.16.0` — **escolhido**. |

### 2.4 Comportamento da aplicação

- Cliente usa `axios` para API REST; não há imports diretos de `follow-redirects`.
- Nenhum teste referencia versão específica de `follow-redirects`.
- Correção é **supply-chain / redirect handling** no adapter HTTP do axios — sem alteração de código fonte.

---

## 3. Implementação

### 3.1 Comando aplicado

```bash
cd client
npm audit fix
```

**Não executado:** `npm audit fix --force`.

### 3.2 Versões antes / depois

| Pacote | Antes (lock) | Depois (lock) | `package.json` |
|--------|--------------|---------------|----------------|
| `axios` | 1.20.0 | **1.20.0** | `^1.20.0` (inalterado) |
| `follow-redirects` | **1.16.0** | **1.16.2** | *(transitiva; sem entrada directa)* |

### 3.3 Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/package-lock.json` | Resolução `follow-redirects` → `1.16.2` (+ entradas de integridade associadas) |
| `client/package.json` | **Sem alteração** |

Nenhum ficheiro em `server/`, testes server, ou código React/TS do client foi modificado.

---

## 4. Validação

Todos os comandos em `client/`, exceto `git diff --check` na raiz.

| # | Comando | Exit | Resultado |
|---|---------|------|-----------|
| 1 | `npm ls axios follow-redirects` | **0** | `axios@1.20.0` → `follow-redirects@1.16.2` |
| 2 | `npm run test` (`vitest run`) | **0** | **128** ficheiros, **1376** testes, **0** falhas — duração **~239,5 s** |
| 3 | `npm run build` (`tsc -b && vite build`) | **0** | Build OK (Vite 7.3.7; aviso de chunk >500 kB — pré-existente) |
| 4 | `npm audit --omit=dev` | **0** | **`found 0 vulnerabilities`** |
| 5 | `git diff --check` (raiz) | **0** | Sem problemas de whitespace |

### 4.1 Auditoria — interpretação Grupo D

| Escopo | Antes GW-1.4 | Depois GW-1.4 |
|--------|--------------|---------------|
| **`npm audit --omit=dev`** | Exit **1** — **1 high** (`follow-redirects@1.16.0`) | Exit **0** — **0** vulnerabilidades |
| **`npm audit` (com dev)** | — | Exit **0** no report final, mas lista **3 moderate** em `@vitest/mocker` / `vitest` / `@vitest/coverage-v8` (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp) — **fora do Grupo D**, **não** tratadas nesta tarefa |

A correção dos GHSA de `follow-redirects` está **confirmada** pela versão instalada **1.16.2** (≥ 1.16.1) e pelo audit de produção limpo.

**Nota:** `npm audit fix` terminou com exit **1** na primeira execução por causa das vulnerabilidades **moderate** em devDependencies; a alteração de `follow-redirects` foi aplicada com sucesso.

---

## 5. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Branch `fix/gw-1.4-client-follow-redirects` a partir de base segura | **Sim** — `develop` @ `79eb666`, tree limpa |
| Alteração mínima e justificada | **Sim** — só lockfile; `axios` inalterado |
| Lockfile consistente | **Sim** |
| Testes e build | **Sim** — 1376/1376, build OK |
| Audit reflecte correção em prod | **Sim** (`--omit=dev` → 0) |
| Sem alterações fora do Grupo D | **Sim** |
| Relatório criado | **Sim** (este ficheiro) |
| Sem commit/merge/push | **Sim** |

---

## 6. Limitações, riscos e recomendações

| Tópico | Nota |
|--------|------|
| **Pin explícito** | Sem `overrides` em `package.json`; a resolução depende do lockfile. Em CI, usar `npm ci` para garantir `1.16.2`. |
| **Vitest moderate** | Planejar upgrade Vitest/coverage numa tarefa separada (dev-only). |
| **Commit manual** | Incluir `client/package-lock.json` e este relatório; mensagem citando GHSA-q3jh / GHSA-8r9p e `follow-redirects@1.16.2`. |
| **Merge** | PR de `fix/gw-1.4-client-follow-redirects` → `develop` após revisão. |

---

## 7. Estado final Git

```
## fix/gw-1.4-client-follow-redirects
 M client/package-lock.json
?? docs/reports/schedulerpro-gw-1.4-group-d-execution.md
```

---

## 8. Contexto para continuação

1. **Server:** GW-1.2 (deps HTTP) + GW-1.3 (`cloudinary@2.11.0`, sem `multer-storage-cloudinary`) já em `develop`.
2. **Client:** única mudança GW-1.4 é lockfile `follow-redirects` 1.16.0 → 1.16.2.
3. **Próximas fases auditoria:** ver backlog CANON-* em `schedulerpro-phase-h-final-consolidation.md` — não iniciadas nesta tarefa.
4. Relatório global de auditoria **não** foi editado.

---

## 9. Declaração

Nenhum commit, merge ou push. Nenhuma alteração no servidor ou em dependências não relacionadas com `follow-redirects` no client.
