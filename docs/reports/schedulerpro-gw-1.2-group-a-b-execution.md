# SchedulerPro — GW-1.2: Execução Grupos A+B (dependências server)

**Data:** 24/10/2026  
**Âmbito:** Apenas backend (`server/`) — Grupo A (patches) + Grupo B (`express` direct). **Sem** Grupo C (Cloudinary 2.x) nem Grupo D (client). **Sem** commit, merge ou push.

**Referências:** [`schedulerpro-gw-1-dependency-triage.md`](schedulerpro-gw-1-dependency-triage.md), [`schedulerpro-gw-1.1-advisory-validation.md`](schedulerpro-gw-1.1-advisory-validation.md).

---

## 1. Objetivo e âmbito

Aplicar correções mínimas de vulnerabilidades de produção no servidor, declarar `express` como dependência directa, e validar com `npm audit --omit=dev`, testes e build.

**Explicitamente excluído:** `npm audit fix --force`; migração `cloudinary` 1.x → 2.x; remoção de `multer-storage-cloudinary`.

---

## 2. Git — estado inicial e final

| Item | Valor |
|------|--------|
| Branch base | `develop` @ `0de6529` (`Auditoria Técnica GlobalAuditorias em GERA`) |
| Branch de trabalho | `fix/gw-1.2-dependency-updates` (criado a partir da base acima) |
| Estado inicial (rastreado) | Limpo |
| Relatórios de auditoria | Preservados (não modificados nesta tarefa) |

### Estado final

```
## fix/gw-1.2-dependency-updates
 M server/package.json
 M server/package-lock.json
```

**Não commitado.** Cliente (`client/`) **sem alterações**.

---

## 3. Pacotes — versões antes / depois (produção)

| Pacote | Antes (lockfile GW-1.1) | Depois (lockfile GW-1.2) | Método |
|--------|-------------------------|--------------------------|--------|
| `express` | 5.2.1 (só transitivo via rate-limit) | **5.3.0** (direct) | Grupo B + bump |
| `compression` | 1.8.1 | **1.8.2** | `package.json` |
| `multer` | 2.2.0 | **2.5.0** | `package.json` |
| `morgan` | 1.11.0 | **1.12.1** | `package.json` |
| `mongoose` | 9.7.1 | **9.11.4** (satisfaz `^9.7.2`) | `npm install` |
| `body-parser` | 2.3.0 | **2.4.0** | `overrides` |
| `proxy-addr` | 2.0.7 | **2.0.8** | via `express@5.3.0` |
| `qs` | 6.15.2 | **6.16.1** | via `express@5.3.0` |
| `ip-address` | 10.2.0 | **10.7.4** | `overrides` + `express-rate-limit@8.7.1` |
| `moment` | 2.30.1 | **2.31.0** | `overrides` |
| `express-rate-limit` | 8.5.2 | **8.7.1** | `package.json` (árvore `ip-address`) |
| `cloudinary` | 1.41.3 | **1.41.3** | Inalterado (Grupo C) |

### Overrides (justificação)

`express@5.3.0` ainda resolvia `body-parser@2.3.0`. `express-rate-limit@8.7.1` mantém range `ip-address@^10.2.0`. Sem `npm audit fix` (proibido no enunciado GW-1.1; não usado aqui), **`overrides`** em `package.json` forçam mínimos GW-1.1: `body-parser@^2.4.0`, `ip-address@^10.7.4`, `moment@^2.31.0`.

---

## 4. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`server/package.json`](../../server/package.json) | Dependências directas + `overrides` |
| [`server/package-lock.json`](../../server/package-lock.json) | Resolução npm |

Nenhum ficheiro de código `server/src/**`, testes, ou `client/**` foi editado.

---

## 5. Vulnerabilidades resolvidas (evidência)

Baseline GW-1.1: **11** vulns prod (1 critical, 6 high, 4 moderate).

Após GW-1.2 (`npm audit --omit=dev`):

| Métrica | Resultado |
|---------|-----------|
| **Total** | **2 high** |
| Critical | **0** |
| Moderate (prod) | **0** |

**Resolvidas (9 entradas de audit anteriores):** `proxy-addr`, `body-parser`, `compression`, `multer`, `mongoose`, `morgan`, `qs`, `ip-address`, `moment` — versões lockfile ≥ mínimos GW-1.1.

---

## 6. Vulnerabilidades restantes

| Pacote | Severidade | Direct / transitiva | Caminho | Motivo |
|--------|------------|---------------------|---------|--------|
| `cloudinary` | High | Direct | `scheduler-api` → `cloudinary@1.41.3` | Grupo **C** — major 2.x não aplicado |
| `multer-storage-cloudinary` | High (audit) | Direct | `scheduler-api` → `multer-storage-cloudinary@4.0.0` → `cloudinary` | Mesmo; pacote não removido por instrução GW-1.2 |

GHSA: [GHSA-g4mf-96x5-5m2c](https://github.com/advisories/GHSA-g4mf-96x5-5m2c). Correção requer `cloudinary@>=2.7.0` (`audit fix --force`).

---

## 7. Comandos de validação (executados)

| Comando | Resultado |
|---------|-----------|
| `npm install` (server) | Exit 0 |
| `npm audit --omit=dev` (server) | Exit 1 — **2 high** (cloudinary apenas) |
| `npm run test` (server) | **81** ficheiros, **1232** testes, **0** falhas (~108 s) |
| `npm run build` (server) | Exit 0 (`tsc`) |

**Não executado:** `npm audit fix`, `npm audit fix --force`, alterações no client.

---

## 8. Testes e build

| Gate | Baseline Fase F (referência) | GW-1.2 |
|------|------------------------------|--------|
| Testes server | 1232 / 0 falhas | **1232 / 0 falhas** |
| Build server | — | **OK** |

---

## 9. Riscos e limitações

- **`mongoose@9.11.4`:** resolução acima do mínimo `9.7.2`; patch minor dentro de 9.x — testes verdes.
- **`express@5.3.0`:** minor bump; testes de integração HTTP passaram.
- **`overrides`:** podem mascarar incompatibilidades futuras se dependências parent fixarem versões; documentado para revisão em upgrades de `express` / `express-rate-limit`.
- **Cloudinary:** risco HIGH permanece até Grupo C.
- **`multer-storage-cloudinary`:** continua no manifesto sem uso em runtime (código usa `memoryStorage`).

---

## 10. Próximos passos

| Grupo | Acção |
|-------|--------|
| **D** | `follow-redirects@1.16.1` via `client` (`axios`) |
| **C** | `cloudinary@^2.7.0+`, QA uploads, opcional remover `multer-storage-cloudinary` |
| **Ops** | Commit manual em `fix/gw-1.2-dependency-updates`; PR com este relatório |

---

## 11. Declaração

- Grupos **A+B** aplicados no server.  
- **`express`** declarado em `dependencies`.  
- **Nenhum** commit, merge ou push nesta tarefa.
