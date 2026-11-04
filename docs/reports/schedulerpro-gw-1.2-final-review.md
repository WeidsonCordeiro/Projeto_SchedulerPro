# SchedulerPro — GW-1.2: Revisão final antes do commit

**Data da revisão:** 24/10/2026  
**Modo:** Auditoria read-only — **nenhum** ficheiro de código ou dependências foi alterado nesta tarefa.

**Referências consultadas (não editadas):**

- [`schedulerpro-gw-1-dependency-triage.md`](schedulerpro-gw-1-dependency-triage.md)
- [`schedulerpro-gw-1.1-advisory-validation.md`](schedulerpro-gw-1.1-advisory-validation.md)
- [`schedulerpro-gw-1.2-group-a-b-execution.md`](schedulerpro-gw-1.2-group-a-b-execution.md)

---

## 1. Objetivo e âmbito

Validar, antes do commit manual, a consistência de `server/package.json` e `server/package-lock.json`, a razoabilidade dos `overrides`, o estado de `npm audit --omit=dev`, e a aderência ao relatório de execução GW-1.2.

**Fora do âmbito:** correções, Grupos C/D, reinstalação de dependências, novos commits.

---

## 2. Branch analisado

| Item | Valor |
|------|--------|
| Branch | **`fix/gw-1.2-dependency-updates`** (confirmado) |
| Base conhecida | `0de6529` (relatório de execução) |

---

## 3. Estado Git

### 3.1 Comandos executados

```text
git status --short --branch
git diff --check
git diff --stat
git diff -- server/package.json
git branch --show-current
```

### 3.2 Resultado

| Verificação | Estado |
|-------------|--------|
| Branch | `fix/gw-1.2-dependency-updates` |
| Alterações rastreadas | `M server/package.json`, `M server/package-lock.json` **apenas** |
| `git diff --check` | Sem erros de whitespace bloqueantes (avisos CRLF no working copy) |
| Relatórios GW-1 / GW-1.1 / G / H | **Não** listados como modificados |
| Relatório execução GW-1.2 | `?? docs/reports/schedulerpro-gw-1.2-group-a-b-execution.md` (não rastreado) |
| Commit criado nesta revisão | **Não** |

**Diff stat:** 2 ficheiros, +125 / −183 linhas no lockfile (reorganização + bumps).

Nenhuma alteração inesperada em `client/` ou `server/src/`.

### 3.3 Estado final (após esta revisão)

Inalterado em relação ao início da revisão, exceto a **criação** deste ficheiro `schedulerpro-gw-1.2-final-review.md` (`??`).

---

## 4. Ficheiros inspecionados

- [`server/package.json`](../../server/package.json)
- [`server/package-lock.json`](../../server/package-lock.json) (`lockfileVersion`: **3**)
- Relatório [`schedulerpro-gw-1.2-group-a-b-execution.md`](schedulerpro-gw-1.2-group-a-b-execution.md)

---

## 5. Relatório de execução vs estado actual

| Pacote | Execução GW-1.2 | Lockfile actual | Delta |
|--------|-----------------|-----------------|-------|
| express | 5.3.0 | **5.3.0** | — |
| compression | 1.8.2 | **1.8.2** | — |
| multer | 2.5.0 | **2.5.0** | — |
| morgan | 1.12.1 | **1.12.1** | — |
| mongoose | 9.11.4 | **9.11.4** | — |
| body-parser | 2.4.0 | **2.4.0** | — |
| proxy-addr | 2.0.8 | **2.0.8** | — |
| qs | 6.16.1 | **6.16.1** | — |
| ip-address | 10.7.4 | **10.7.4** | — |
| moment | 2.31.0 | **2.31.0** | — |
| express-rate-limit | 8.7.1 | **8.7.1** | — |
| cloudinary | 1.41.3 | **1.41.3** | — |

**Conclusão:** Tabela do relatório de execução **confirma-se** no lockfile actual.

`package.json` declara `mongoose@^9.7.2`; lockfile resolve **9.11.4** — compatível com o range.

---

## 6. Coerência `package.json` ↔ `package-lock.json`

| Verificação | Resultado |
|-------------|-----------|
| `express` em `dependencies` | **Sim** (`^5.3.0`) — Grupo B satisfeito |
| Root `packages[""].dependencies` no lockfile | Alinhado com `package.json` (sem campo `overrides` duplicado no bloco root do lock — overrides aplicados na resolução) |
| Versões directas vs lockfile | Coerentes para todos os bumps A+B |
| `cloudinary` / `multer-storage-cloudinary` | Inalterados (`^1.41.3`, `^4.0.0`) |
| Duplicação de `express` | Uma versão **5.3.0** (`express-rate-limit` → deduped) |

**Nota:** No metadata de `express@5.3.0` no lockfile, a dependência declarada de `body-parser` é `^2.3.0`, mas a instância resolvida é **2.4.0** via override — comportamento esperado do npm.

---

## 7. Análise dos `overrides`

### 7.1 `body-parser: ^2.4.0`

| Item | Detalhe |
|------|---------|
| Introduzido por | `express@5.3.0` (`body-parser: ^2.3.0` no manifest do express) |
| Versão resolvida | **2.4.0** |
| Intervalo pai | `^2.3.0` aceita **2.4.0** (semver) |
| Árvore | `express@5.3.0` → `body-parser@2.4.0` |
| Compatibilidade | **Presumida compatível** (patch minor dentro de 2.x); **demonstrada** na execução GW-1.2 (1232 testes verdes — ver secção 9) |
| Risco | Baixo; override necessário porque express 5.3.0 ainda declara `^2.3.0` enquanto GHSA exige ≥2.4.0 |

### 7.2 `ip-address: ^10.7.4`

| Item | Detalhe |
|------|---------|
| Introduzido por | `express-rate-limit@8.7.1` (`ip-address: ^10.2.0`) |
| Versão resolvida | **10.7.4** |
| Intervalo pai | `^10.2.0` aceita **10.7.4** |
| Árvore | `express-rate-limit@8.7.1` → `ip-address@10.7.4` |
| Compatibilidade | **Presumida** (semver); testes GW-1.2 passaram com rate-limiters existentes |
| Risco | Médio-baixo — override força versão acima do mínimo declarado pelo rate-limit; monitorar upgrades futuros de `express-rate-limit` |

### 7.3 `moment: ^2.31.0`

| Item | Detalhe |
|------|---------|
| Introduzido por | `file-stream-rotator@0.6.1` (via `winston-daily-rotate-file`) — dependência `moment: ^2.29.1` no lockfile |
| Versão resolvida | **2.31.0** |
| Intervalo pai | `^2.29.1` aceita **2.31.0** |
| Árvore | `winston-daily-rotate-file` → `file-stream-rotator` → `moment@2.31.0` |
| Compatibilidade | **Presumida**; uso limitado a rotação de logs |
| Risco | Baixo |

**Nenhum override contradiz outro.** Os três são justificados na execução GW-1.2 (transitivas não atualizadas só com bumps directos).

---

## 8. Auditoria de segurança (`npm audit --omit=dev`)

**Executado nesta revisão:** sim (diretório `server/`, sem alterar ficheiros).

| Campo | Valor |
|-------|--------|
| Exit code | **1** (vulnerabilidades presentes — esperado) |
| Total (prod) | **2** |
| Critical | **0** |
| High | **2** |
| Moderate | **0** |

**Pacotes afectados (confirmado):**

1. **`cloudinary@1.41.3`** — GHSA-g4mf-96x5-5m2c; fix apenas com major (`cloudinary@2.11.0`, `--force`).
2. **`multer-storage-cloudinary@4.0.0`** — depende de `cloudinary` vulnerável.

**Comparação com relatório GW-1.2:** **Idêntico** (2 high, só Cloudinary). Nenhum advisory novo detectado nesta execução.

**Resolvido face à baseline GW-1.1 (11 vulns):** demais pacotes da tabela secção 5 **não** aparecem no audit actual.

---

## 9. Testes e build

| Comando | GW-1.2 (execução) | Esta revisão |
|---------|-------------------|--------------|
| `npm run test` | 81 ficheiros, **1232** testes, **0** falhas | **Não reproduzido** (instrução: evitar reexecução desnecessária; `node_modules` já presente mas revisão não re-correu a suíte) |
| `npm run build` | `tsc` OK | **Não reproduzido** |

Scripts oficiais em `package.json`: `test` → `vitest run`; `build` → `tsc`.

---

## 10. Cloudinary — âmbito excluído (confirmado)

| Item | Estado |
|------|--------|
| `cloudinary` | **1.41.3** no lockfile |
| `multer-storage-cloudinary` | Presente, **não** removido |
| Vulns remanescentes | Documentadas (secção 8) |
| Grupo C | Migração 2.x **pendente** |
| Testes upload | Requisito futuro Grupo C |

---

## 11. Riscos e verificações ainda necessárias

| Risco / gap | Nota |
|-------------|------|
| Testes/build não reexecutados nesta revisão | Utilizador pode correr `npm run test` e `npm run build` uma vez antes do commit |
| `overrides` | Manter documentados no PR; rever em upgrades de `express` / `express-rate-limit` |
| `mongoose@9.11.4` | Acima do mínimo 9.7.2 — aceitável; changelog Mongoose não revisto linha-a-linha nesta revisão |
| 2 high Cloudinary | **Esperado** até Grupo C |
| CRLF warnings no `git diff` | Ambiente Windows; não bloqueia commit |

---

## 12. Conclusão e recomendação para commit manual

### Classificação: **APTO COM RESSALVAS**

**Motivo:**

- Manifests e lockfile **coerentes** com o relatório de execução; versões confirmadas.
- `express` **direct**; Grupo A+B reflectido no diff.
- Audit prod: **0 critical**, **2 high** Cloudinary (alinhado com GW-1.2).
- Overrides **semanticamente compatíveis** com ranges dos pais; compatibilidade runtime **não revalidada** nesta revisão (apenas reportada na execução anterior).

**Ressalvas antes do commit:**

1. Opcional mas recomendado: uma passagem local `npm run test` + `npm run build` no branch.
2. Mensagem de commit deve mencionar `overrides` e vulns Cloudinary pendentes (Grupo C).
3. Incluir no commit (se desejado): `schedulerpro-gw-1.2-group-a-b-execution.md` e este relatório de revisão.

A classificação **não substitui** a decisão do utilizador.

---

## Anexo — Resumo executivo

| Item | Valor |
|------|--------|
| **Classificação** | **APTO COM RESSALVAS** |
| **Git** | Branch `fix/gw-1.2-dependency-updates`; só `server/package.json` + `server/package-lock.json` modificados (rastreados) |
| **Audit `--omit=dev`** | Exit 1; **2 high** (`cloudinary`, `multer-storage-cloudinary`) |
| **Overrides** | Três; compatibilidade com ranges **confirmada**; testes **não** reexecutados aqui |
| **Testes/build** | **Não reproduzidos** nesta revisão (1232/0 reportados na GW-1.2) |
| **Problemas bloqueantes** | **Nenhum** identificado nos manifests/lockfile |
| **Relatório** | `docs/reports/schedulerpro-gw-1.2-final-review.md` |
