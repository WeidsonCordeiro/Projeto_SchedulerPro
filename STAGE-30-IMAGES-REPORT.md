# STAGE 30 — IMAGES (PARTE 1) — RELATÓRIO

**Data:** 28/09/2026
**Âmbito:** Backend apenas. Infraestrutura reutilizável de imagens.
**Estado:** Concluído e validado.

---

## 1. OBJETIVO

Preparar a base de imagens do sistema (funcionários, clientes e logótipo da
empresa) reutilizando o Cloudinary, **sem** ainda expor endpoints, sem
alterar modelos e sem tocar no frontend.

Entregas desta parte:

- Um único ponto de entrada para `upload`, `remove` e `replace`.
- Validação do ficheiro **antes** de qualquer chamada externa.
- Formato de dados `{ url, publicId }` para futura persistência.
- Comportamento definido para entidade sem imagem.
- Testes unitários com o Cloudinary mockado.
- Nenhum controller chama o SDK diretamente.

---

## 2. AUDITORIA PRÉVIA (infraestrutura existente)

| Item | Estado encontrado | Decisão |
| --- | --- | --- |
| `cloudinary@1.41.3` | Instalado, nunca importado | Reutilizado |
| `multer` / `@types/multer` | `multer` instalado, sem tipos | Reutilizado + `@types/multer` adicionado |
| `multer-storage-cloudinary` | Instalado, nunca usado | **Não usado** (ver 5.2) |
| `env.cloudinary.*` | Já existia em `src/config/env.ts` | Reutilizado tal como está |
| `.env.example` | Já documentava as 3 variáveis | Sem alterações |
| `validateEnv()` | Só exige Mongo/JWT | **Mantido opcional** |
| `logger.upload()` / `LogCategory.UPLOAD` | Já existiam | Reutilizados |
| `src/config/cloudinary.ts` | Ficheiro vazio (0 bytes) | **Não usado**, ver 9 |
| `User.avatar` | `avatar?: string \| null` (String simples) | **Não alterado**, ver 8 |
| `Company.logo` | Inexistente | **Não criado**, ver 8 |
| Employee | Não existe model próprio (é `User` com `Role.EMPLOYEE`) | Entidade é um rótulo de pasta, não um model |
| `providers/mail` | `EmailProvider` abstrato + `ResendProvider` + teste | **Padrão replicado** |

**Nenhuma integração paralela foi criada:** o padrão de `providers/mail` foi
seguido, e o SDK do Cloudinary está isolado num único ficheiro.

---

## 3. FICHEIROS CRIADOS

```
server/src/providers/images/
├── ImageProvider.ts               Classe abstrata (contrato)
├── CloudinaryImageProvider.ts     Única implementação; único import do SDK
├── imageValidation.ts             Validação pura (presença/tamanho/assinatura)
├── imageUpload.middleware.ts      multer.memoryStorage() + tradução de erros
└── types.ts                       Tipos, DTOs e limites

server/tests/unit/providers/images/
├── CloudinaryImageProvider.test.ts   21 testes
├── imageValidation.test.ts           11 testes
└── imageUpload.middleware.test.ts     4 testes
```

## 4. FICHEIROS ALTERADOS

| Ficheiro | Alteração |
| --- | --- |
| `server/src/constants/http-messages.ts` | +16 linhas: bloco `/*Imagens*/` (12 mensagens) |
| `server/package.json` | +1 devDependency: `@types/multer@^2.2.0` |
| `server/package-lock.json` | Reflexo da dependência anterior |

**Nenhum outro ficheiro foi alterado.** `client/` está intacto.

---

## 5. DECISÕES E ARQUITETURA

### 5.1 Contrato único para as três entidades

```ts
interface StoredImage {
  url: string;
  publicId: string;
}
```

`ImageEntity.EMPLOYEE | CLIENT | COMPANY` apenas escolhe a pasta no
Cloudinary (`schedulerpro/<entidade>/`). A forma dos dados é **idêntica** para
funcionário, cliente e empresa, pelo que os próximos passos são uma repetição
do mesmo padrão.

### 5.2 `multer.memoryStorage()`, e não `multer-storage-cloudinary`

O `multer-storage-cloudinary` envia o ficheiro para o Cloudinary *durante* o
parse do multipart. Isso impediria validar o conteúdo real antes da chamada
externa (um payload de 5 MB inválido já teria ocupado o storage) e não
permitiria um `destroy()` controlado.

Com `memoryStorage()`:
1. O multer interrompe o stream acima de 5 MB (`limits.fileSize`);
2. O provider valida assinatura, tamanho e presença;
3. Só depois há rede.

### 5.3 `replace` valida antes de destruir

Este ponto é crítico e foi alvo de teste dedicado. A implementação **valida o
ficheiro novo antes de apagar a imagem atual**. A versão inicial removia
primeiro, o que faria um upload inválido deixar a entidade sem imagem nenhuma.

A ordem é: `validar` → `remover anterior` → `enviar nova`.

### 5.4 Falha na remoção não bloqueia a substituição

Se `destroy()` falhar, o upload continua e o `publicId` órfão é registado no
log (`orphanPublicId`). Perder a imagem antiga é preferível a deixar a entidade
sem imagem. O órfão fica recuperável a partir do log para uma limpeza futura.

### 5.5 `remove` é idempotente

O Cloudinary devolve `result: "not found"` para recursos já removidos; isso é
tratado como sucesso. Sem isto, limpar uma entidade cuja imagem já não
existia devolveria 500.

### 5.6 Erros sempre como `AppError`

O `error.middleware.ts` só conhece `AppError`; qualquer `MulterError` ou erro
do SDK cairia num 500 genérico. Por isso:
- erros do multer são traduzidos em `AppError` **no próprio middleware**;
- erros do SDK são normalizados em `toAppError()`;
- mensagens técnicas do provider nunca chegam ao cliente (ficam no log).

| Situação | HTTP |
| --- | --- |
| Ficheiro ausente, vazio, formato inválido ou > 5 MB | 400 |
| Cloudinary mal configurado | 500 |
| Falha de rede/credenciais do Cloudinary | 500 |
| Resposta incompleta do provider | 500 |

### 5.7 Não confiar no MIME declarado

A validação inspeciona os **primeiros bytes** (assinatura binária):

| Formato | Assinatura |
| --- | --- |
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `RIFF????WEBP` |

Um ficheiro que se declare `image/png` mas comece por `MZ` (executável) é
rejeitado. O MIME detetado — não o declarado — é o enviado ao Cloudinary.
GIF é recusado de forma explícita (ver 6).

### 5.8 Importações de segurança

- `overwrite: false` e `unique_filename: true`: um pedido repetido nunca
  destrói silenciosamente a imagem de outra entidade.
- `invalidate: true` no `destroy()`: remove o recurso e as transformações.
- `secure: true`: apenas HTTPS.
- Nada é enviado para a internet sem passar pela validação.

---

## 6. LIMITES ADOTADOS

| Regra | Valor |
| --- | --- |
| Tamanho máximo | **5 MB** (`5 * 1024 * 1024`) |
| Formatos aceites | `image/jpeg`, `image/png`, `image/webp` |
| Formatos recusados | GIF, SVG, AVIF, HEIC, PDF, executáveis |
| Campo multipart (convenção) | `image` / `photo` / `logo` (configurável) |
| Ficheiros por pedido | 1 (`limits.files`) |
| Campos não-ficheiro por pedido | 4 |

**Porquê não GIF:** gif animados com `5 MB` podem degradar muito o
desempenho do browser. **Porquê não SVG:** é um documento XML que pode conter
script, servindo de vetor de XSS quando servido a partir do mesmo domínio.
**Porquê não HEIC/AVIF:** compressão melhor, mas suporte inconsistente entre
navegadores e maior risco de rejeição do lado do utilizador.

O limite de 5 MB está centralizado em `IMAGE_LIMITS.MAX_FILE_SIZE_BYTES`;
aumentar ou reduzir é uma alteração de uma linha, em `types.ts`.

---

## 7. COMPORTAMENTO DE ENTIDADE SEM IMAGEM

- **Base de dados:** o campo fica `null` (ou ausente). Não é criada nenhuma
  imagem por defeito.
- **Cloudinary:** não se copia ficheiro de placeholder para a conta. Um
  ficheiro genérico guardado N vezes seria custo e limpeza permanentes.
- **Frontend (futuro):** placeholder ou iniciais, a definir na etapa do
  frontend. Nada foi implementado agora.

---

## 8. O QUE FICOU DE FORA (deliberadamente)

Esta parte é **apenas a infraestrutura**. Não foi feito, de propósito:

- Rotas, controllers e serviços de upload/remo para employees, clients e
  company.
- Alterações a `User.model.ts` (o `avatar` continua a ser `String | null`) e
  a `Company.model.ts` (sem `logo`).
- Qualquer alteração de autenticação, sessão, RBAC ou tenancy.
  `MANAGER -> USER_READ` mantém-se exatamente como está.
- Qualquer alteração no frontend.
- Transformações/derivadas do Cloudinary (redimensionamento, `f_auto`, `q_auto`).
- Rotinas de limpeza de imagens órfãs.

### Migração de `User.avatar` (para os próximos passos)

`User.avatar` é hoje um `String` simples. O formato decidedo é
`{ url, publicId }`, porque sem o `publicId` **não é possível remover** a
imagem do Cloudinary quando o funcionário é eliminado.

Quando o próximo passo integrar os modelos, há duas opções a decidir
explicitamente:

- **Substituir** `avatar?: string | null` por `avatar?: StoredImage | null` —
  coerente com o resto do sistema, mas exige migração de dados existentes.
- **Adicionar** `avatarPublicId?: string | null` ao lado do `avatar` atual —
  sem migração, mas mantém dois campos para a mesma informação.

**Nenhuma das duas foi aplicada agora.** A decisão fica para a etapa de
integração, e o provider não depende dela: `StoredImage` é um tipo local.

---

## 9. PENDENTE / FORA DO ÂMBITO

| Item | Nota |
| --- | --- |
| `src/config/cloudinary.ts` | Ficheiro vazio de 0 bytes, preexistente. A configuração é feita pelo provider a partir de `env`, por isso **não foi usado nem apagado**. |
| `src/providers/security/` | Vários ficheiros vazios, preexistentes. Fora do âmbito. |
| `express` sem entrada em `dependencies` | Só existe `@types/express`; o pacote é resolvido por transitive. Bug de empacotamento preexistente, **não corrigido**. |
| `multer-storage-cloudinary` | Mantido instalado por não fazer parte do âmbito, apesar de não ser usado. |
| Limpeza de órfãos | Só existe registo em log (`orphanPublicId`). |

---

## 10. VALIDAÇÃO EXECUTADA

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` (servidor) | **Passou**, 0 erros |
| `npm run build` (servidor) | **Passou** |
| `npx vitest run tests/unit/providers/images/` | **36/36 passaram** |
| `npx vitest run` (suíte completa) | **51 ficheiros, 542/542 passaram** |

Cobertura dos ficheiros novos:

| Ficheiro | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `types.ts` | 100% | 100% | 100% | 100% |
| `ImageProvider.ts` | 100% | 100% | 100% | 100% |
| `imageValidation.ts` | 96.55% | 89.47% | 100% | 96.15% |
| `CloudinaryImageProvider.ts` | 88.63% | 82.6% | 100% | 88.63% |
| `imageUpload.middleware.ts` | 84.61% | 70% | 100% | 84.61% |

### 542 testes = 506 anteriores + 36 novos. Nenhuma regressão.

### Casos cobertos

**Upload:** sucesso devolve `{url, publicId}`; configuração do SDK com HTTPS;
pasta por entidade; data URI com MIME detetado; `overwrite: false`; erro do
provider; resposta incompleta; mensagem técnica não exposta ao cliente.

**Validação (sem chamada à rede):** ficheiro ausente; buffer vazio; acima de
5 MB; exatamente no limite; tamanho validado antes do formato; deteção de PNG,
JPEG e WebP por assinatura; MIME declarado falso (`MZ` como PNG) recusado; GIF
recusado; buffer curto; `RIFF` que não seja `WEBP`.

**Remove:** remove pelo `publicId`; idempotência com `not found`; erro do
provider; estado inesperado.

**Replace:** remove e devolve só os dados novos; `publicId` antigo não
sobrevive; primeira imagem (`previous: null`) sem `destroy`; remoção que falha
mantém o upload e regista o órfão; **ficheiro inválido não destrói a imagem
atual**.

**Middleware:** ficheiro aceite e mantido em memória; ausência não bloqueada
aqui (tratada pelo provider, para a mensagem ser igual em todas as rotas);
excesso de tamanho responde **400 e não 500**; campo inesperado → 400.

**Configuração:** credenciais em falta → 500 sem qualquer tentativa de rede;
importar o módulo sem credenciais não lança.

---

## 11. EXEMPLO DE USO (para as próximas etapas)

```ts
import imageProvider from "../../../providers/images/CloudinaryImageProvider";
import { ImageEntity } from "../../../providers/images/types";
import { uploadSingleImage } from "../../../providers/images/imageUpload.middleware";

// Rota (a autenticação e o RBAC continuam a ser aplicados antes)
router.post(
  "/employees/:id/photo",
  authenticate,
  requirePermission(Permission.USER_UPDATE),
  uploadSingleImage("photo"),
  employeeController.uploadPhoto,
);

// Controller
const file = req.file;                       // já em memória, já com limite de 5 MB
const image = await imageProvider.upload({ file, entity: ImageEntity.EMPLOYEE });

await userService.updateAvatar(req.params.id, image);   // { url, publicId }
```

---

## CONTEXTO PARA A PRÓXIMA IA

### Onde está o que foi feito

- Provider (não importar SDK fora daqui): `server/src/providers/images/CloudinaryImageProvider.ts`
- Contrato: `server/src/providers/images/ImageProvider.ts` e `types.ts`
- Validação pura: `server/src/providers/images/imageValidation.ts`
- Receção do ficheiro: `server/src/providers/images/imageUpload.middleware.ts`
- Testes: `server/tests/unit/providers/images/`
- Sem alterações no frontend, nos modelos e nas rotas.

### Como usar

`imageProvider` é uma instância única (default export) com três operações:

| Operação | Assinatura | Comportamento |
| --- | --- | --- |
| `upload` | `({ file, entity }) => Promise<StoredImage>` | Valida, envia, devolve `{url, publicId}` |
| `remove` | `({ image }) => Promise<void>` | Idempotente; `not found` = sucesso |
| `replace` | `({ file, entity, previous }) => Promise<StoredImage>` | `previous: null` = primeiro upload |

Todas lançam `AppError`. A validação corre **sempre** antes da rede, em todas
as três. `entity` só escolhe a pasta (`schedulerpro/employee`,
`/client`, `/company`).

### Regras que não devem ser invertidas

1. **Nenhum controller, rota ou model importa `cloudinary`.** Passam sempre
   pelo `imageProvider`.
2. **Validar antes de destruir** (o `replace` já faz; não reordenar).
3. **Nunca confiar no MIME declarado** — a assinatura binária é a fonte.
4. **`remove` é idempotente**; não converter `not found` em erro.
5. **Entidade sem imagem = `null`**, sem ficheiro por defeito no storage.
6. **Credenciais continuam opcionais** em `validateEnv()`; a falta delas é um
   500 de configuração, detectado na operação, não na arranque.
7. **Limite de 5 MB** em `IMAGE_LIMITS.MAX_FILE_SIZE_BYTES`; mudar o valor
   muda o `HttpMessages.IMAGE_FILE_TOO_LARGE` e vice-versa (estão alinhados
   manualmente, ambos em 5 MB).

### Decisões em aberto para a próxima etapa

1. **Persistência:** substituir `User.avatar` por `StoredImage` (com migração)
   ou adicionar `avatarPublicId` ao lado do `String` atual. Ver secção 8.
2. **Entidades reais:** `company.logo` ainda não existe; `Client` também não
   tem imagem. Definir os campos e as rotas.
3. **RBAC por operação:** `USER_UPDATE` para employees/clients e o que usar
   para o logótipo da empresa. `MANAGER -> USER_READ` não muda.
4. **Derivadas:** decidir se o upload guarda o original ou já uma versão
   redimensionada (`f_auto`, `q_auto`) para a listagem de funcionários.
5. **Limpeza:** rotina para `orphanPublicId` e para as imagens de entidades
   eliminadas.
6. **Frontend:** placeholder/iniciais para `null`. Fora do âmbito desta parte.
