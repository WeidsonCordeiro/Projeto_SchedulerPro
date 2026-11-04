# SchedulerPro — GW-1.3: Grupo C — Cloudinary (execução)

**Data:** 26/10/2026  
**Projeto:** `C:\Users\Weidson Cordeiro\Desktop\Front-End\Projetos\Projeto_SchedulerPro`  
**Âmbito:** Apenas Grupo C (Cloudinary + higiene `multer-storage-cloudinary`). Sem Grupo D, sem commits.

---

## 1. Estado inicial Git e branch

| Item | Valor |
|------|--------|
| Branch **ativa** no início | `develop` (`develop...origin/develop`) |
| Branch **de referência** na tarefa | `fix/gw-1.2-dependency-updates` (GW-1.2 já reflectida no `server/package.json` em `develop`: `express@^5.3.0`, overrides A+B, etc.) |
| Working tree inicial | **Limpo** (sem modificações rastreadas) |
| Working tree final | `M server/package.json`, `M server/package-lock.json` |

Nenhum commit, merge ou push foi executado. Alterações locais anteriores não existiam; nada foi descartado.

---

## 2. Diagnóstico — referências e utilização

### 2.1 Dependências (antes)

| Pacote | Versão manifest / lock | Uso em runtime |
|--------|----------------------|----------------|
| `cloudinary` | **1.41.3** | **Sim** — único import executável: [`server/src/providers/images/CloudinaryImageProvider.ts`](../../server/src/providers/images/CloudinaryImageProvider.ts) (`import { v2 as cloudinary } from "cloudinary"`) |
| `multer-storage-cloudinary` | **4.0.0** | **Não** — apenas em `package.json` / lock; **zero** `import` em `server/src` ou `server/tests` |

### 2.2 Fluxo de upload (integração)

```mermaid
flowchart LR
  routes[UserRoutes ClientRoutes CompanyRoutes] --> mw[imageUpload.middleware memoryStorage]
  mw --> ctrl[Controllers]
  ctrl --> svc[UserService ClientService CompanyService]
  svc --> prov[CloudinaryImageProvider]
  prov --> sdk[cloudinary.uploader upload destroy]
```

- **Multer:** `multer.memoryStorage()` em [`imageUpload.middleware.ts`](../../server/src/providers/images/imageUpload.middleware.ts) — validação de imagem antes de rede (`validateImageFile`).
- **Credenciais:** `env.cloudinary.*` em [`server/src/config/env.ts`](../../server/src/config/env.ts) (não tornadas obrigatórias no arranque).
- **Testes principais:** `tests/unit/providers/images/*`, `ClientService.photo`, `UserService.photo`, `CompanyService.logo`, rotas de foto/logo.

### 2.3 Vulnerabilidade alvo

| GHSA | Pacote | Condição | Fix mínimo |
|------|--------|----------|------------|
| [GHSA-g4mf-96x5-5m2c](https://github.com/advisories/GHSA-g4mf-96x5-5m2c) | `cloudinary` | `< 2.7.0` | `>= 2.7.0` |

`multer-storage-cloudinary@4.x` puxava `cloudinary@^1.21.0`, mantendo a árvore vulnerável mesmo sem uso em código.

### 2.4 Compatibilidade API

O código **já** usava a API **v2** do SDK (`v2 as cloudinary`, `uploader.upload`, `uploader.destroy`, `cloudinary.config`). A major 1.x → 2.x no **pacote npm** alinha-se ao import existente; **não** foi necessário alterar TypeScript de produção.

---

## 3. Implementação

### 3.1 Versão escolhida

| | |
|--|--|
| **Selecionada** | `cloudinary@^2.11.0` |
| **Resolvida no lockfile** | `cloudinary@2.11.0` (`registry.npmjs.org/.../cloudinary-2.11.0.tgz`) |
| **Justificação** | Última **2.x** estável no npm na data da tarefa (`npm view cloudinary version` → **2.11.0**); satisfaz `>= 2.7.0` para GHSA-g4mf-96x5-5m2c; recomendada nos relatórios GW-1 / GW-1.1 |

### 3.2 Dependências alteradas

| Pacote | Antes | Depois |
|--------|-------|--------|
| `cloudinary` | `^1.41.3` → lock **1.41.3** | `^2.11.0` → lock **2.11.0** |
| `multer-storage-cloudinary` | `^4.0.0` | **Removido** (não utilizado) |

### 3.3 Ficheiros alterados

| Ficheiro | Motivo |
|----------|--------|
| `server/package.json` | Bump `cloudinary`; remoção `multer-storage-cloudinary` |
| `server/package-lock.json` | Resolução npm consistente (incl. remoção de `cloudinary-core` da árvore 1.x) |

**Nenhum** outro ficheiro de código, testes ou config foi modificado.

### 3.4 Comandos de instalação (Grupo C)

```bash
cd server
npm uninstall multer-storage-cloudinary
npm install cloudinary@^2.11.0
```

**Não executado:** `npm audit fix --force`.

---

## 4. Validação

Diretório: `server/`.

| # | Comando | Exit | Resultado |
|---|---------|------|-----------|
| 1 | `npx vitest run tests/unit/providers/images/ tests/unit/clients/client-photo.routes.test.ts tests/unit/companies/company-logo.routes.test.ts tests/unit/users/UserService.photo.test.ts tests/unit/clients/ClientService.photo.test.ts tests/unit/companies/CompanyService.logo.test.ts` | **0** | **8** ficheiros, **140** testes, **0** falhas (~16,4 s) |
| 2 | `npm run test` | **0** | **81** ficheiros, **1232** testes, **0** falhas (~82,6 s) |
| 3 | `npm run build` (`tsc`) | **0** | OK |
| 4 | `npm audit --omit=dev` | **0** | **`found 0 vulnerabilities`** |
| 5 | `npm ls cloudinary multer-storage-cloudinary` | **0** | `cloudinary@2.11.0`; `multer-storage-cloudinary` **(empty)** |
| 6 | `git diff --check` (raiz) | **0** | Sem conflitos de whitespace bloqueantes |

### 4.1 Auditoria — antes vs depois (produção, `--omit=dev`)

| Momento | Exit | High / Critical (cloudinary) |
|---------|------|------------------------------|
| Antes GW-1.3 | **1** | **2 high** (`cloudinary`, `multer-storage-cloudinary`) |
| Depois GW-1.3 | **0** | **0** vulnerabilidades reportadas |

A correção do GHSA-g4mf-96x5-5m2c está **confirmada** pela versão instalada **2.11.0** e pelo audit limpo em dependências de produção.

`npm audit` **sem** `--omit=dev` pode ainda listar avisos em devDependencies; a aceitação GW-1.3 foca `--omit=dev` conforme GW-1.2.

---

## 5. Critérios de aceitação

| Critério | Estado |
|----------|--------|
| Cloudinary corrigido instalado e validado | **Sim** — `2.11.0` + testes + build |
| `multer-storage-cloudinary` removido por ser dispensável | **Sim** — sem imports em código |
| Testes e build passam | **Sim** |
| Audit reflecte estado real | **Sim** (`--omit=dev` → 0 vulns) |
| Sem alterações fora do Grupo C | **Sim** — só `package.json` + lockfile |
| Sem commit/merge/push | **Sim** |

---

## 6. Limitações, riscos e recomendações

| Tópico | Nota |
|--------|------|
| **Upload real Cloudinary** | Testes mockam o SDK; não houve upload E2E contra API Cloudinary nesta tarefa. Recomendado smoke manual em ambiente com credenciais após deploy. |
| **Comentários em código** | `CloudinaryImageProvider.ts` / `imageUpload.middleware.ts` ainda mencionam `multer-storage-cloudinary` em documentação inline (decisão de desenho); opcional alinhar texto numa tarefa de docs. |
| **Grupo D** | `follow-redirects` no **client** permanece pendente. |
| **Branch** | Trabalho feito em `develop`; se o fluxo do utilizador exige branch `fix/gw-1.2-dependency-updates`, aplicar/cherry-pick destes dois ficheiros ou repetir GW-1.3 nessa branch antes do commit. |
| **Próximo passo** | Commit manual sugerido: mensagem citando `cloudinary@2.11.0`, remoção `multer-storage-cloudinary`, GHSA resolvido, gates 1232 testes + audit prod 0. |

---

## 7. Contexto para continuação (outra IA / revisão humana)

1. **Único ponto SDK:** `CloudinaryImageProvider.ts` — `upload` / `remove` / `replace` com `memoryStorage` upstream.
2. **GW-1.2** já estava em `develop` (Express directo, overrides); GW-1.3 **não** mexeu nisso.
3. **Relatórios relacionados:** GW-1 triagem (sec. Grupo C), GW-1.2 execução (cloudinary excluído), GW-1.2.1/1.2.2 (testes estáveis).
4. **Estado Git para commit:** apenas `server/package.json` e `server/package-lock.json` modificados + este relatório `??`.

---

## 8. Declaração

- Relatório global de auditoria **não** alterado.
- Segredos Cloudinary **não** registados neste documento.
