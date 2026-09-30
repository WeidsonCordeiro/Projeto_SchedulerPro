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

## PARTE 2 — FOTOS DOS FUNCIONÁRIOS

**Data:** 28/09/2026
**Âmbito:** Backend. Integração da infraestrutura de imagens no domínio de
funcionários (User com `Role.EMPLOYEE`).
**Estado:** Concluído e validado.

### Objetivo

Tornar a API de funcionários capaz de enviar, substituir e remover a foto,
guardando sempre o contrato `{ url, publicId }`, nunca uma string avulsa.
Funcionário não tem model próprio: a foto é armazenada no próprio `User`.

Não implementou: foto de clientes, logo da empresa, frontend, placeholder,
geração de imagem por defeito, limpeza de órfãos, alteração de RBAC/autenticação.

### Arquitetura utilizada

```
POST /users/:id/photo   (multipart, campo "photo")
  -> AuthMiddleware.authenticate
  -> validateObjectId("id")
  -> PasswordChangeMiddleware.requirePasswordChangeCompleted
  -> hasPermission(Permission.USER_UPDATE)
  -> uploadSingleImage("photo")          (multer.memoryStorage + 5 MB)
  -> UserController.uploadPhoto
    -> UserService.updatePhoto
      -> UserRepository.findById            (filtra deletedAt: null)
      -> Valida tenant (companyId) e role (EMPLOYEE)
      -> imageProvider.replace({ file, entity: EMPLOYEE, previous })
      -> UserRepository.update({ avatar })

DELETE /users/:id/photo
  -> mesmos middlewares (sem uploadSingleImage)
  -> UserService.removePhoto
    -> valida tenant/role
    -> se não há foto: retorna (idempotente, sem storage)
    -> imageProvider.remove({ image })
    -> UserRepository.update({ avatar: null })
```

O Cloudinary continua acessível **apenas** através do `imageProvider`; nenhuma
camada fora dele importa o SDK. O controller é uma fachada fina — toda a regra
está no serviço.

### Alteração de `User.avatar`

| Antes | Depois |
| --- | --- |
| `avatar?: string \| null` | `avatar?: StoredImage \| null` |

```ts
interface StoredImage { url: string; publicId: string; }
```

- No schema foi criado um sub-objecto (`new Schema<StoredImage>`) com `url` e
  `publicId` obrigatórios e `_id: false`; o campo continua `default: null`.
- `users/types.ts` (`CreateUserData`) e `auth/types.ts` (`AuthUser`) também
  passaram a usar `StoredImage`.
- A migração de dados foi **avaliada e não é necessária**: neste ambiente não
  existem documentos com `avatar` preenchido (greps por `avatar` não
  encontraram dados/fixtures em código nem em testes). O sub-documento passa a
  ser gravado pelo Mongoose de forma natural. Não foi criada migração complexa.
- O `auth/mapper/AuthMapper.ts` e `auth/services/AuthService.ts` (endpoint
  `/auth/me`) passam o objeto sem outra alteração necessária — o tipo agora é
  `StoredImage | null`.

### `avatar` removido do `PUT /users/:id` (decisão)

O `UpdateUserDto` e o `update-user.validator` **deixaram de aceitar `avatar`**.

Motivo: aceitar uma URL avulsa permitiria gravar uma imagem sem `publicId`
(impossível de remover do storage) e apontar a foto para um domínio externo.
Só existe **um caminho** para alterar a foto: os endpoints de foto, via
`imageProvider`. O campo é ignorado no `PUT` de forma silenciosa e intencional.

### Endpoints criados

| Método | Rota | Permission | Resposta de sucesso |
| --- | --- | --- | --- |
| `POST` | `/api/users/:id/photo` | `USER_UPDATE` | 200 com o utilizador; `avatar` = `{ url, publicId }` |
| `DELETE` | `/api/users/:id/photo` | `USER_UPDATE` | 200 com o utilizador; `avatar` = `null` |

O prefixo `/api/users` segue o registo central (`routes/index.ts`). Usou-se a
convenção de sub-recursos do módulo (`/:id/activate`, `/:id/deactivate`).

### Permissions utilizadas

- Apenas `Permission.USER_UPDATE`, a mesma já usada em `PUT /users/:id`.
- **Nenhuma permission nova foi criada** e a matriz de `rbac.ts` **não foi
  alterada**. `MANAGER -> USER_READ` mantém-se intacta.
- Consequência direta (testada): OWNER e ADMIN enviarem/removerem foto;
  MANAGER, EMPLOYEE e CLIENT recebem **403**. Isto significa que um MANAGER
  não consegue trocar a própria foto — decisão deliberada e documentada, que
  só muda se a matriz de RBAC for revista numa etapa futura.

### Regras de tenant

O recurso nunca é identificado só por `:id`:

```ts
const user = await userRepository.findById(id);      // deletedAt: null
if (user.companyId.toString() !== companyId) 403;    // tenant
if (user.role !== Role.EMPLOYEE)              403;    // só funcionário
```

- Erros de tenant e de perfil são os dois **403** (não revelam se o registo
  existe). Funcionário inexistente (ou soft-deleted, que o repository nunca
  devolve) é **404**.
- `companyId` vem de `req.user.companyId` (token), nunca do corpo/pedido.

### Comportamento de upload/substituição

- **Primeira foto**: `imageProvider.replace({ ..., previous: null })` — não há
  `destroy`, só upload.
- **Substituição**: o serviço entrega `previous` = imagem atual; o provider
  valida o ficheiro **antes** de destruir a anterior (regra da Parte 1). O
  serviço **não** implementa remove+upload à mão.
- Persistência: `UserRepository.update(id, { avatar })` com o novo
  `{ url, publicId }`. O `publicId` antigo é descartado (deixa de existir no
  storage).
- Se o provider falhar → 400/500 conforme a Parte 1, **nada é gravado** e a
  imagem atual permanece.
- Corrida rara "storage gravou mas Mongo não" → 404 + log `orphanPublicId`
  (a imagem foi enviada mas não associada ao registo).

### Comportamento de remove

- Remove no storage (`imageProvider.remove`) e só depois persiste
  `avatar: null`. **Nunca** se apaga só o campo deixando o recurso no
  Cloudinary.
- Idempotente: funcionário sem foto devolve o utilizador sem tocar no
  storage nem no MongoDB.
- Se o `remove` do storage falhar, o campo do MongoDB **não** é apagado (a
  referência continua válida; pode-se tentar de novo).
- Corrida rara "storage removeu mas Mongo não" → 404 + log `stalePublicId`.

### Funcionário sem foto

`avatar: null` na base de dados; resposta `avatar: null`. Nenhum ficheiro por
defeito é copiado para o Cloudinary.

### Funcionário eliminado (soft delete)

O `UserService.delete` **não** remove a imagem do Cloudinary, por duas razões
combinadas e documentadas:

1. O sistema tem restauro (repo `updateIncludingDeleted` usado para
   restaurar contas); apagar a imagem no soft-delete destruiria de forma
   permanente a foto de um funcionário que pode voltar.
2. O `softDelete` é uma operação única do MongoDB, sem transação: adicionar
   uma chamada de rede ao meio introduziria um estado inconsistente sem
   rollback.

A fotada dos utilizadores eliminados permanece no storage até uma futura
rotina global de limpeza — que continua conscientemente fora do âmbito.
A imagem de um funcionário eliminado só é apagada se a entidade for
reativada e o `removePhoto` for executado.

### Testes

3 novos ficheiros, **40 novos testes** (a suíte toda passou de 542 para 582):

| Ficheiro | Cobre |
| --- | --- |
| `tests/unit/users/UserService.photo.test.ts` (22) | primeiro upload, substituição, tenant, perfis não-EMPLOYEE, inexistente, erro do provider sem persistir, validação que não apaga a anterior, remove com/sem foto, remove com erro do provider, corridas "Mongo não gravou" |
| `tests/unit/users/user-photo.routes.test.ts` (13) | cadeia real de middlewares: OWNER/ADMIN permitidos, MANAGER/EMPLOYEE/CLIENT 403, `:id` inválido 400, ficheiro >5 MB 400, sem ficheiro 400, campo inesperado 400, ficheiro entregue em memória com a company do token, erro do serviço propagado |
| `tests/unit/users/UserMapper.avatar.test.ts` (5) | `avatar` object/null, exposição apenas de `url` e `publicId` (projeção explícita), `passwordHash` nunca exposta |

O mock `UserController` do teste integração
`tests/integration/users/create-user.route.test.ts` foi atualizado com os dois
handlers novos (necessário para o router registar as rotas — regressão evitada).

O `imageProvider` é 100% mockado; nenhum teste usa Cloudinary real.

### Coverage, typecheck e build

| Item | Resultado |
| --- | --- |
| `npx tsc --noEmit` | **Passou**, 0 erros |
| `npm run build` | **Passou** |
| `npx vitest run` | **54 ficheiros, 582/582 passaram** (nenhuma regressão) |
| `UserService.ts` | Statements 66.37% / Branches 56.45% (subiu de 63.39%/53.22%); os ramos da foto estão cobertos; os ramos descobertos são métodos pré-existentes (activate/deactivate/changePassword) |
| Total da suíte | Statements 77.42% / Branches 75.7% / Lines 77.62% (subiu face aos 76.91% da Parte 1) |

### Arquivos alterados

| Ficheiro | Alteração |
| --- | --- |
| `src/modules/users/models/User.model.ts` | `avatar: StoredImage \| null` + sub-schema |
| `src/modules/users/types.ts` | `CreateUserData.avatar: StoredImage \| null` |
| `src/modules/auth/types.ts` | `AuthUser.avatar: StoredImage \| null` |
| `src/modules/users/dto/UpdateUser.dto.ts` | removido `avatar` |
| `src/modules/users/validators/update-user.validator.ts` | removida regra de `avatar` |
| `src/modules/users/mappers/UserMapper.ts` | expõe `avatar` projetado (`{url, publicId}`/null) |
| `src/modules/users/services/UserService.ts` | `updatePhoto`, `removePhoto`, `findEmployeeForPhoto` |
| `src/modules/users/controllers/UserController.ts` | `uploadPhoto`, `removePhoto` |
| `src/modules/users/routes/UserRoutes.ts` | `POST`/`DELETE /:id/photo` |
| `src/constants/http-messages.ts` | `EMPLOYEE_PHOTO_UPDATED`, `EMPLOYEE_PHOTO_REMOVED`, `USER_NOT_EMPLOYEE` |
| `tests/integration/users/create-user.route.test.ts` | mock do controller com handlers novos |

### Limitações e decisões técnicas

- **MANAGER não envia foto** (só `USER_READ` na matriz). Deliberado.
- **A operação exige `Role.EMPLOYEE`** no alvo, mesmo que o autor seja
  ADMIN/OWNER. Logo, o ADMIN hoje não consegue trocar a própria foto. Decisão
  literal da especificação; se o domínio exigir "staff", a condição terá de
  ser revista numa etapa própria.
- Não há transação entre Cloudinary e MongoDB; os dois ramos de corrida são
  registados em log (`orphanPublicId` / `stalePublicId`) para observabilidade.
- Foto de utilizador soft-deleted não é apagada automaticamente.
- O `publicId` é devolvido ao cliente junto com a `url`. É necessário para o
  próximo controlo; não expõe metadados internos do storage.

---

## CONTEXTO PARA A PRÓXIMA IA

### `User.avatar` a partir desta etapa

```ts
avatar?: { url: string; publicId: string } | null;
```

- O sub-documento tem `_id: false` e `default: null`; os dois campos são
  obrigatórios dentro do objeto.
- Foi removido de `UpdateUserDto`/`update-user.validator`: o `PUT /users/:id`
  **ignora avatar**. A foto só muda pelos endpoints de foto.
- A API devolve sempre object ou `null` através de `UserMapper`, que projeta
  apenas `url` e `publicId` (nada de bytes/versão/assinatura do storage).
- `/auth/me` e o `AuthMapper` já recebem o novo contrato.

### Endpoints existentes

- `POST /api/users/:id/photo` — envio/substituição (`multipart`, campo
  `photo`). Utilizador atualizado com o novo avatar.
- `DELETE /api/users/:id/photo` — remoção (idempotente). Avatar passa a `null`.

### Como fazer upload

```ts
// multipart/form-data, campo "photo", max 5 MB, JPEG/PNG/WebP
// O ficheiro passa por uploadSingleImage("photo") -> controller -> serviço.
await UserService.updatePhoto(id, file, companyId);
```

Internamente `UserService.updatePhoto` chama:

```ts
imageProvider.replace({ file, entity: ImageEntity.EMPLOYEE, previous: user.avatar ?? null });
```

Nunca duplicar remove+upload: o `replace` já valida, remove e envia.

### Como remover

```ts
await UserService.removePhoto(id, companyId);
// sem foto -> retorna utilizador, sem tocar no storage
// com foto -> imageProvider.remove({ image }) + persist avatar: null
```

### Permissions necessárias

- `USER_UPDATE` (existe; não criar outra). OWNER e ADMIN a têm; MANAGER **não**.
- Nenhuma alteração em `rbac.ts`, `roles.ts`, `permissions.ts`.
- `MANAGER -> USER_READ` intocada.

### Como o tenant é validado

```
findById(id)  -> filtra deletedAt: null
companyId do token  != user.companyId  -> 403
user.role !== EMPLOYEE                  -> 403
```

Nunca confiar no `:id` sozinho. O `companyId` vem do `req.user` (token).

### Integração futura com Clientes

O padrão repete-se por inteiro:

1. `Client` ganha um campo `avatar?: StoredImage | null` (ou similar).
2. Endpoints `POST/DELETE /clients/:id/photo` com os mesmos middlewares.
3. `UserService`/router: no caso CLIENT convém decidir se a foto vive no
   `Client` ou no `User` com `role CLIENT` — o `UserMapper`/`AuthUser` já
   suporta `StoredImage`.
4. `ImageEntity.CLIENT` já existe no provider (pasta `schedulerpro/client`).
5. Replicar os testes de tenant/RBAC com a matriz de CLIENT (`CLIENT_UPDATE`).

### Decisões que NÃO devem ser alteradas

1. `StoredImage` é o único formato persistido de imagem. Sem `publicId`, a
   imagem não pode ser removida.
2. Nenhuma camada fora de `providers/images/CloudinaryImageProvider.ts`
   importa o SDK do Cloudinary.
3. `replace` valida a nova **antes** de destruir a anterior.
4. `remove` é idempotente; `not found` não é erro.
5. Foto só entra por `imageProvider`; o `PUT /users/:id` não aceita avatar.
6. Soft-delete não apaga a imagem (existe restauro e não há transação).
7. Entidade sem imagem = `null`, sem ficheiro por defeito no storage.
8. Credenciais Cloudinary continuam opcionais; ausência delas é 500 na
   operação, detectado pelo provider.
9. O `publicId` é devolvido no contrato da API (necessário ao cliente), mas
   nenhum outro metadado do storage é exposto.
10. A matriz RBAC atual não muda por causa desta funcionalidade.

---

# SchedulerPro — Parte 3: Foto dos Clientes

## Objetivo

Implementar o upload, a substituição e a remoção da foto de um `Client`,
reutilizando integralmente a infraestrutura de imagens da Parte 1 (provider,
validação por assinatura binária, limite de 5 MB, `multer.memoryStorage`,
`uploadSingleImage`) e o padrão de integração da Parte 2. **Backend only.**

## Escopo

- `Client.avatar?: StoredImage | null` (sub-schema, `_id: false`).
- `POST /api/clients/:id/photo` — envio/substituição via provider.
- `DELETE /api/clients/:id/photo` — remoção idempotente.
- Tenant isolation, soft-delete, `CLIENT_UPDATE`, contrato da API com `avatar`.
- Fora do escopo (ver "Itens não implementados"): frontend, company logo,
  employee photo, refactors.

## Arquitetura

```
Route (POST/DELETE /clients/:id/photo)
  → Controller (ClientController.uploadPhoto/removePhoto)
    → Service (ClientService.updatePhoto/removePhoto)
      → Repository (ClientRepository.updateAvatar) → Model (Client.avatar)
      → ImageProvider (CloudinaryImageProvider.replace/remove)
```

Somente `providers/images/CloudinaryImageProvider.ts` conhece o SDK do
Cloudinary. `ClientService`, `ClientController`, `ClientRepository`,
`ClientRoutes` e `Client.model` **não** importam `cloudinary`.

## Alterações no Model

`server/src/modules/Clients/models/Client.model.ts`:

```ts
avatar?: StoredImage | null;
```

Sub-schema Mongoose com `_id: false`, `url` obrigatório, `publicId`
obrigatório e `default: null`. Reutiliza o tipo `StoredImage` da parte de
imagens (não duplica). Nada de `avatarUrl`/`avatarPublicId`/`photoUrl`/etc.

## Alterações no Repository

`ClientRepository.updateAvatar(id, companyId, avatar: StoredImage | null)`:
`findOneAndUpdate` com `{ _id, companyId, deletedAt: null }` (respeita tenant
e soft-delete), `new: true`, `runValidators: true`. O repository não conhece
o storage; apenas persiste `StoredImage | null`.

## Alterações no Service

- `findClientForPhoto(id, companyId)`: `findById` (filtra `deletedAt: null`),
  `!client → 404`; `client.companyId.toString() !== companyId → 403`.
- `updatePhoto(id, file, companyId)`: chama `imageProvider.replace({ file,
  entity: ImageEntity.CLIENT, previous: client.avatar ?? null })` e persiste o
  resultado via `updateAvatar`. Sem sequência manual remove+upload. Se o Mongo
  não gravar (corrida), loga `orphanPublicId` e devolve 404.
- `removePhoto(id, companyId)`: idempotente. Sem foto → devolve o cliente sem
  tocar no storage. Com foto → `imageProvider.remove({ image })` + persistir
  `avatar: null`. Corrida pós-storage loga `stalePublicId` e devolve 404.

## Alterações no Controller

`uploadPhoto` (400 de segurança quando `req.file` ausente, usando
`IMAGE_LIMITS.FIELD`) e `removePhoto`. Sem regra de negócio. **Nota:**
declarados como propriedades `arrow function` do mesmo modo que os restantes
handlers do controller (os métodos "normais" perderiam o `this` ao serem
passados por referência ao router).

## Alterações nas Routes

```ts
POST   /api/clients/:id/photo   → authenticate, validateObjectId, requirePasswordChangeCompleted, hasPermission(CLIENT_UPDATE), uploadSingleImage("photo")
DELETE /api/clients/:id/photo   → authenticate, validateObjectId, requirePasswordChangeCompleted, hasPermission(CLIENT_UPDATE)
```

Ordems dos middlewares igual à das rotas de Users. Reutiliza o middleware
`uploadSingleImage("photo")` existente — nenhum middleware novo para Client.

## RBAC

Permission **existente** `CLIENT_UPDATE` (não foi criada
`CLIENT_PHOTO_UPDATE`/`CLIENT_IMAGE_UPDATE`/`CLIENT_AVATAR_UPDATE`).
`rbac.ts`, `roles.ts` e `permissions.ts` **intocados**.

Matriz que se aplica (já existente):
- **OWNER**, **ADMIN**, **MANAGER** → têm `CLIENT_UPDATE` → podem.
- **EMPLOYEE**, **CLIENT** → não têm → 403.
- Sem token → 401 (`hasPermission`).

## Tenant Isolation

```
findById(id) -> filtra deletedAt: null
companyId do token != client.companyId -> 403 (CLIENT_ACCESS_DENIED)
```

O tenant vem sempre de `req.user.companyId` (token). Nunca confiar só no `:id`.
Os testes garantem 403 para foto de cliente de outra empresa (upload e remoção)
sem tocar no storage e sem devolver dados do cliente.

## Upload

- `POST /api/clients/:id/photo`, `Content-Type: multipart/form-data`, campo
  obrigatório `photo`.
- `uploadSingleImage("photo")`: memory storage, 1 ficheiro, max 5 MB, erros
  Multer normalizados (400).
- Validação real por assinatura binária no provider: JPEG/PNG/WebP. Recusa
  SVG/GIF/AVIF/HEIC/PDF/executáveis/ficheiros renomeados.
- Nenhuma validação duplicada no `ClientService`.

## Remoção

- Com foto: `imageProvider.remove({ image })` → persistir `avatar: null`.
- Sem foto: sucesso idempotente, sem chamar o Cloudinary e sem erro.
- Provider `remove` é idempotente (`not found` não é erro).

## Testes

Novos (46):
- `tests/unit/clients/ClientService.photo.test.ts` — 17 casos: primeiro envio,
  substituição (previous null/anterior), `ImageEntity.CLIENT`, nunca remove
  manualmente, erro do provider propagado, coerência 404 (`orphanPublicId`/
  `stalePublicId`), tenant 403, inexistente 404, soft-deleted 404; remoção com
  foto, `avatar: null` persistido, idempotência sem storage, erro do provider
  mantém referência, tenant 403; contrato: `update` ignora `avatar`.
- `tests/unit/clients/client-photo.routes.test.ts` — 21 casos: 401 sem token,
  RBAC real (OWNER/ADMIN/MANAGER OK; EMPLOYEE/CLIENT 403), ObjectId inválido,
  ficheiro >5 MB, ficheiro ausente, campo multipart inesperado, entrega
  `req.file`/`companyId` ao serviço, resposta contém `avatar`, propagação do
  erro do serviço (500) — para POST e DELETE.
- `tests/unit/clients/ClientMapper.avatar.test.ts` — 5 casos: `avatar: null`,
  campo ausente, par `{url, publicId}`, projeção sem metadados do storage,
  preservação do contrato existente do cliente.
- Adaptado: `tests/integration/routes/object-id.routes.test.ts` recebeu os
  handlers `uploadPhoto`/`removePhoto` no mock do controller (rotas reais
  exigem a existência dos handlers).

Testes existentes: todos passaram (628/628). Nenhuma regressão.
- A validação de formato em si (assinatura binária) é coberta pelos testes do
  provider (Parte 1) — na cadeia HTTP testa-se o que é da camada HTTP.

## Coverage

- Total da suíte: **Statements 77.9%** (1562/2005) | Branches 76.25% |
  Functions 65.82% | Lines 78.1%.
- Subiu face à Parte 2 (77.42% statements) — sem redução.
- `ClientService.ts`: 84.16% stmts / 85.88% branches (subiu bastante com os
  testes de foto).
- `ClientMapper.ts`: 100% stmts (novo teste de contrato + regressão).
- `ClientController.ts`: 18.75% (herdado: o controller nunca teve teste direto;
  os testes de rotas exercitam agora os handlers de foto).
- `ClientRepository.ts`: 0% (pré-existente: os repositórios são mockados em
  todos os testes; não há suíte direta de repository — não é regressão).

## Typecheck

`npx tsc --noEmit` → sem erros.

## Build

`npm run build` (tsc) → OK.

## Arquivos alterados

- `server/src/modules/Clients/models/Client.model.ts`
- `server/src/modules/Clients/repositories/ClientRepository.ts`
- `server/src/modules/Clients/mappers/ClientMapper.ts`
- `server/src/modules/Clients/services/ClientService.ts`
- `server/src/modules/Clients/controllers/ClientController.ts`
- `server/src/modules/Clients/routes/ClientRoutes.ts`
- `server/src/constants/http-messages.ts` (`CLIENT_ACCESS_DENIED`,
  `CLIENT_PHOTO_UPDATED`, `CLIENT_PHOTO_REMOVED`)
- `server/tests/unit/clients/ClientService.photo.test.ts` (novo)
- `server/tests/unit/clients/client-photo.routes.test.ts` (novo)
- `server/tests/unit/clients/ClientMapper.avatar.test.ts` (novo)
- `server/tests/integration/routes/object-id.routes.test.ts` (mock adaptado)

## Decisões técnicas

1. A foto do cliente vive no `Client`, **não** no `User` (separação de
   domínio; um `Client` pode existir sem conta de acesso).
2. `StoredImage` é o único contrato persistido; `publicId` obrigatório para
   permitir a remoção futura no storage.
3. `replace()` valida a nova antes de destruir a anterior (ordem imposta pelo
   provider da Parte 1 — mantida, sem alteração).
4. `remove()` é idempotente.
5. O endpoint genérico de atualização (`PATCH /clients/:id`) **ignora**
   `avatar` (DTO/validator/service não o tocam). Foto exclusivamente pelos
   endpoints de foto.
6. Soft-delete não apaga a imagem (restauro existe; sem transação).
7. Estado sem imagem = `null` (nunca string vazia/falso).
8. Credenciais Cloudinary continuam opcionais: a ausência provoca 500 na
   operação, detectado pelo provider.
9. `publicId` aparece na resposta da API; nenhum outro metadado do storage é
   exposto (projeção explícita no mapper).
10. Diferença intencional face à Parte 2: aqui a falha de tenant devolve **403**
    (padrão de segurança de photo, sem revelar a existência do cliente de outro
    tenant); os restantes fluxos de `ClientService` mantêm o seu padrão 404.

## Limitações

- MANAGER **pode** alterar foto de cliente (tem `CLIENT_UPDATE` já existente).
- ADMIN/OWNER/MANAGER não conseguem alterar a *própria* foto via estes
  endpoints (não é o caso de uso desta etapa).
- Soft-deleted não recebe/remove foto (404 pelo repository ativo).
- `ClientRepository` sem teste direto (0% — pré-existente).
- Corridas "storage OK / Mongo falhou" não têm compensação automática; apenas
  logging (sem transação entre Mongo e Cloudinary).

## Itens não implementados

- Frontend (nenhuma alteração em `client/`; listas, modais, placeholders,
  iniciais, previews, upload visual).
- Company Logo (`ImageEntity.COMPANY` intocado; sem `POST/DELETE
  /companies/:id/logo`).
- Employee Photo inalterada (`User.avatar` e endpoints `POST/DELETE
  /users/:id/photo` intactos).
- Nenhum refactor geral (Client/User/RBAC/ImageProvider), sem limpeza de
  órfãos, sem transformations/resize/thumbnails/compressão, sem novos
  papéis/permissions/autenticação.

---

## CONTEXTO PARA A PRÓXIMA IA

### `Client.avatar` a partir desta etapa

```ts
avatar?: { url: string; publicId: string } | null;
```

- Sub-schema com `_id: false`, `url` e `publicId` obrigatórios, `default: null`.
- Reutiliza o tipo `StoredImage` (único formato persistido).
- A foto pertence ao **Client**, não ao User (User = acesso; Client = cliente
  de negócio). `User.avatar` (Parte 2) permanece intocado.
- `UpdateClientDto`/`update-client.validator`/`ClientService.update` **não**
  tocam `avatar`; o `PATCH /clients/:id` ignora qualquer `avatar` recebido.
- `ClientMapper.toResponse` projeta apenas `{ url, publicId }` ou `null`
  (nunca bytes/versão/assinatura do storage).

### Endpoints implementados

- `POST /api/clients/:id/photo` — envio/substituição (`multipart/form-data`,
  campo `photo`, max 5 MB, JPEG/PNG/WebP por assinatura binária).
- `DELETE /api/clients/:id/photo` — remoção idempotente (sem foto = sucesso,
  sem chamar o storage).

### Permission utilizada

- `CLIENT_UPDATE` (existente). Nenhuma permission nova. Matriz RBAC intocada:
  OWNER/ADMIN/MANAGER podem; EMPLOYEE/CLIENT 403; sem token 401.

### `ImageEntity.CLIENT`

- O provider usa a pasta `schedulerpro/client` (entity `ImageEntity.CLIENT`),
  passada como `entity` em `replace()`.

### Tenant isolation

```
findById(id) -> filtra deletedAt: null
companyId do token != client.companyId -> 403
```

O `companyId` vem sempre de `req.user` (token). Nunca confiar no `:id`.

### Comportamento de replace

`imageProvider.replace({ file, entity: ImageEntity.CLIENT, previous: client.avatar ?? null })`
valida a nova imagem **antes** de destruir a anterior, e trata o primeiro
upload (`previous: null`). Nunca fazer remove+upload manual no service.

### Comportamento de remove

`imageProvider.remove({ image })` é idempotente. `removePhoto` persiste
`avatar: null` apenas depois do storage confirmar.

### Soft-delete

- Cliente soft-deleted não recebe/remove foto (404 pelo repository ativo,
  que filtra `deletedAt: null`).
- O soft-delete **não** apaga a imagem do Cloudinary (existe restauro e não há
  transação) — mesma decisão da Parte 2.

### Contrato da API

```json
{ "avatar": { "url": "https://...", "publicId": "schedulerpro/client/..." } }
```
ou
```json
{ "avatar": null }
```

### Corridas pós-storage (sem transação)

- Upload: storage OK, Mongo não gravou → log `orphanPublicId` + 404.
- Remoção: storage removeu, Mongo não gravou → log `stalePublicId` + 404.
- Nenhuma compensação automática; o log permite localizar órfãos manualmente.

### Testes realizados

- 628/628 testes passam. Novos: `ClientService.photo.test.ts` (17),
  `client-photo.routes.test.ts` (21), `ClientMapper.avatar.test.ts` (5).
  `object-id.routes.test.ts` adaptado (handlers de foto no mock).
- `npx tsc --noEmit` OK; `npm run build` OK; coverage 77.9% statements (subiu).
- Nenhuma alteração em `client/` (frontend) nem em Company Logo.
- Git intocado: sem commit/merge/push. Todos os padrões de `/users/:id/photo`
  foram replicados; para Employee e Company Logo, siga o mesmo fluxo.
---

# SchedulerPro — Parte 4: Logo da Empresa

> Continuação de `STAGE 30 — IMAGES`. Leia primeiro as Partes 1–2–3 deste mesmo
> ficheiro (infraestrutura, foto de empregados e foto de clientes).

## Objetivo

Implementar a logo da empresa no backend, movendo para dentro da aplicação aquilo
que hoje estaria fora (URL arbitrária). Reutiliza 100% da infraestrutura de imagens
das Partes 1–3 — nada de código novo de storage.

## Arquitetura

Mantém-se o fluxo das Partes 2–3:

```
multipart -> uploadSingleImage("logo") -> multer em memória (limite 5 MB)
  -> CompanyController.uploadLogo -> CompanyService.updateLogo
    -> imageProvider.replace({ file, entity: ImageEntity.COMPANY, previous })
      -> CompanyRepository.updateLogo(id, logo) -> Mongo
```

A **empresa é o próprio tenant**: não existe `companyId` na Company; a empresa é
identificada pelo `_id`, e o `companyId` do token tem de ser igual a esse `_id`.
A barreira de tenant segue o padrão já existente do módulo Company (404, não 403).

## Alterações no Model

`Company.model.ts`:

- `ICompany.logo?: StoredImage | null`.
- Sub-schema embutido idêntico ao de `User.avatar`/`Client.avatar`:
  `{ url: required, publicId: required }` com `_id: false` e `default: null`.
- Único formato persistido: `StoredImage`. Nenhuma URL arbitrária é aceite.

## Alterações no Repository

`CompanyRepository.ts`:

- `updateLogo(id: string, logo: StoredImage | null)`:
  `findOneAndUpdate({ _id: id, deletedAt: null }, { logo }, { new: true, runValidators: true })`.
- O repository não conhece o storage: recebe o `StoredImage | null` pronto a gravar.

## Alterações no Service

`CompanyService.ts`:

- `imageProvider` injetado como field (`CloudinaryImageProvider`).
- `findCompanyForLogo(id, companyId)`: `ensureTenant(id, companyId)` (off-tenant -> 404)
  seguido de `findById` (filtra `deletedAt: null`); sem empresa -> 404.
- `updateLogo(id, file, companyId)`: `replace({ file, entity: ImageEntity.COMPANY, previous: company.logo ?? null })`
  e depois `updateLogo(id, logo)`. Corrida pós-storage -> `Logger.error` com
  `orphanPublicId` + 404.
- `removeLogo(id, companyId)`: idempotente. Sem logo -> devolve a empresa sem tocar
  no storage. Com logo -> `remove({ image })` e `updateLogo(id, null)`. Corrida ->
  `Logger.error` com `stalePublicId` + 404.
- `update` continua a ignorar `logo` (só `name`/`timezone` entram no `updateData`).

## Alterações no Controller

`CompanyController.ts`:

- `uploadLogo(req, res)`: `req.file` obrigatório (rede de segurança, mesma mensagem
  `IMAGE_FILE_REQUIRED`); delega em `CompanyService.updateLogo`.
- `removeLogo(req, res)`: delega em `CompanyService.removeLogo`.
- Segue o estilo do ficheiro: métodos regulares que chamam o singleton
  `CompanyService` estaticamente (sem `this`), por isso a passagem por referência
  ao router é segura.

## Alterações nas Routes

`CompanyRoutes.ts`:

- `POST /:id/logo` — `authenticate -> validateObjectId -> requirePasswordChangeCompleted
  -> hasPermission(COMPANY_UPDATE) -> uploadSingleImage("logo")`.
- `DELETE /:id/logo` — idem, sem o middleware de upload.
- Não colide com nenhuma rota existente (métodos/segmentos diferentes de `/:id`,
  `/activate`, `/deactivate`).

## Alterações no Mapper e mensagens

- `CompanyMapper.toResponse`: projeta `logo: { url, publicId } | null`.
- `http-messages.ts` (bloco /*Empresa*/): `COMPANY_LOGO_UPDATED`,
  `COMPANY_LOGO_REMOVED`.

## RBAC

- Reutiliza `Permission.COMPANY_UPDATE` (existente). Matriz RBAC intocada.
- OWNER e ADMIN têm `COMPANY_UPDATE` -> logo disponível.
- MANAGER / EMPLOYEE / CLIENT não têm -> 403.
- Sem token -> 401.

## Tenant Isolation

```
ensureTenant(id, companyId): id !== companyId -> 404 (padrão Company)
findById(id) -> filtra deletedAt: null
```

O `:id` tem de ser a própria empresa do token. Não há exposição de outras empresas:
off-tenant devolve o mesmo 404 de "não encontrada".

## Upload

- `multipart/form-data`, campo `logo`, max 5 MB (limite do multer + validação real
  por assinatura binária no provider).
- Substituição integral: `replace()` valida a nova antes de destruir a anterior;
  primeiro envio (`previous: null`) não apaga nada.

## Remoção

- Idempotente: sem logo = sucesso sem chamar o storage.
- `remove()` é idempotente; o campo `logo: null` só é persistido depois do storage confirmar.

## Testes

```
npm test -> 675/675 passam (60 ficheiros). Novos:
  - CompanyService.logo.test.ts     (20) tenant(404), soft-delete, replace/remove,
                                      corridas pós-storage (orphan/stalePublicId),
                                      contrato "update ignora logo".
  - company-logo.routes.test.ts     (21) RBAC real (OWNER/ADMIN ok;
                                      MANAGER/EMPLOYEE/CLIENT 403), 401,
                                      ObjectId inválido, >5MB, sem ficheiro,
                                      campo inesperado, propagação de erro.
  - CompanyMapper.logo.test.ts      (4)  projeção { url, publicId } / null /
                                      ausente + lista.
  - CompanyRepository.test.ts       (+2) updateLogo grava logo e logo null (remoção).
```

Foram usados o router e o controller reais com o `CompanyService` mockado
(exatamente como `client-photo.routes.test.ts` faz para cliente).

## Coverage

```
Statements: 78.28% (1597/2040)  Branches: 76.55%  Functions: 66.28%  Lines: 78.48%

Módulo companies:
  CompanyService.ts     97.06% stmts / 93.75% branches
  CompanyMapper.ts     100.00%
  CompanyRoutes.ts     100.00%
  CompanyRepository.ts  70.00%
  CompanyController.ts  33.33% (só o logo é exercitado; sem suíte direta, igual a ClientController)
  Company.model.ts      62.50%
```

Subiu face aos 77.9% da Parte 3.

## Typecheck / Build

- `npx tsc --noEmit` OK.
- `npm run build` (`tsc`) OK.

## Arquivos alterados

- `server/src/modules/companies/models/Company.model.ts`
- `server/src/modules/companies/repositories/CompanyRepository.ts`
- `server/src/modules/companies/services/CompanyService.ts`
- `server/src/modules/companies/controllers/CompanyController.ts`
- `server/src/modules/companies/routes/CompanyRoutes.ts`
- `server/src/modules/companies/mappers/CompanyMapper.ts`
- `server/src/constants/http-messages.ts`
- `server/tests/unit/companies/CompanyService.logo.test.ts` (novo)
- `server/tests/unit/companies/company-logo.routes.test.ts` (novo)
- `server/tests/unit/companies/CompanyMapper.logo.test.ts` (novo)
- `server/tests/unit/companies/CompanyRepository.test.ts`

## Decisões técnicas

- Tenancy 404 (não 403): a empresa é o próprio tenant e `ensureTenant` já é a
  barreira existente do módulo; manter 403 para Client/Employee (que têm `companyId`
  próprio) e 404 para Company evita revelar a existência de outra empresa.
- `logo` NUNCA entra no `PATCH /companies/:id`: o `updateData` no service só
  propaga `name`/`timezone`, blindado por contrato em teste. Só os endpoints
  dedicados a logo mexem no campo.
- `publicId` é exposto na resposta por consistência com `avatar` (Partes 2–3),
  embora seja tecnicamente um detalhe de storage; decisão já aceite anteriormente.
- Permissions: nenhuma permission nova. Reutilizou-se `COMPANY_UPDATE`.

## Limitações

- Sem transação: corridas pós-storage são registadas (`orphanPublicId`/`stalePublicId`),
  sem compensação automática.
- Soft-delete não apaga a logo do Cloudinary (existe fluxo de restauro; mesma
  decisão das Partes 2–3).
- `CompanyController` com 33% de coverage (só os handlers de logo são exercitados
  pelas rotas; o resto do controller não tem suíte direta — pré-existente).

## Itens não implementados

- Frontend (`client/`) — fora do âmbito.
- Upload em lote / várias logos / crop server-side.
- Validação de dimensões (apenas formato/magic bytes e tamanho).
- Configuração/ambiente do Cloudinary (depende de env, fora do scope).

## CONTEXTO PARA A PRÓXIMA IA

### `Company.logo` a partir desta etapa

```ts
logo?: { url: string; publicId: string } | null;
```

- Sub-schema `_id: false`, `url`/`publicId` obrigatórios, `default: null` (mesmo
  formato de `User.avatar` e `Client.avatar`).
- `UpdateCompanyDto`/`CompanyService.update` **não** tocam `logo`; o
  `PATCH /companies/:id` ignora qualquer `logo` recebido no body.
- `CompanyMapper.toResponse` projeta `logo: { url, publicId } | null`.

### Endpoints implementados

- `POST /api/companies/:id/logo` — envio/substituição (`multipart/form-data`,
  campo `logo`, max 5 MB, JPEG/PNG/WebP por assinatura binária).
- `DELETE /api/companies/:id/logo` — remoção idempotente.

### Permission utilizada

- `COMPANY_UPDATE` (existente). OWNER/ADMIN permitem; MANAGER/EMPLOYEE/CLIENT 403;
  sem token 401. Matriz RBAC intocada.

### `ImageEntity.COMPANY`

- Provider usa a pasta `schedulerpro/company` (entity `ImageEntity.COMPANY`).

### Tenant isolation (padrão Company, 404)

```
ensureTenant(id, companyId): id !== companyId -> 404 COMPANY_NOT_FOUND
findById(id) -> filtra deletedAt: null
```

A empresa É o tenant — não há `companyId` na Company. Diferente de Employee/Client
(403 quando `companyId` diverge), Company devolve 404 para não revelar outra empresa.

### Comportamento de replace/remove

- `replace({ file, entity: ImageEntity.COMPANY, previous: company.logo ?? null })`
  valida a nova antes de destruir a anterior; primeiro upload = `previous: null`.
- `remove({ image })` idempotente; `logo: null` só é persistido após storage confirmar.
- Nunca fazer remove+upload manual no service.

### Soft-delete

- Empresa soft-deleted não recebe/remove logo (404 pelo repository ativo).
- O soft-delete **não** apaga a logo do Cloudinary (não há transação com o storage) —
  mesma decisão das Partes 2–3.

### Contrato da API

```json
{ "logo": { "url": "https://...", "publicId": "schedulerpro/company/..." } }
```
ou
```json
{ "logo": null }
```

### Corridas pós-storage (sem transação)

- Upload: storage OK, Mongo não gravou → log `orphanPublicId` + 404.
- Remoção: storage removeu, Mongo não gravou → log `stalePublicId` + 404.

### Testes realizados

- 675/675 testes passam. Novos: `CompanyService.logo.test.ts` (20),
  `company-logo.routes.test.ts` (21), `CompanyMapper.logo.test.ts` (4),
  `CompanyRepository.test.ts` (+2).
- `npx tsc --noEmit` OK; `npm run build` OK; coverage 78.28% statements (subiu).
- Nenhuma alteração em `client/` (frontend). Git intocado: sem commit/merge/push.
- Para outras entidades, o fluxo é idêntico (as Partes 2–3 serviram de molde).
---

# STAGE 30 — IMAGES (PARTE 5) — RELATÓRIO

**Data:** 29/09/2026
**Âmbito:** Frontend apenas (`client/`). Backend, Models, Services, Controllers,
Routes, RBAC, contratos HTTP e Cloudinary **intactos**.
**Estado:** Concluído e validado (testes, typecheck, build e coverage executados).

---

## 1. OBJETIVO

Entregar a experiência frontend completa de imagens do SchedulerPro, consumindo
os endpoints já existentes das Partes 1–4:

- **Foto do Funcionário** (`User.avatar`) — visualizar, placeholder com iniciais,
  enviar, substituir e remover.
- **Foto do Cliente** (`Client.avatar`) — idêntico, na área staff.
- **Logótipo da Empresa** (`Company.logo`) — idêntico, na área staff e no shell
  (barra lateral).

Com entrega de: validação imediata no cliente, pré-visualização, estados de
carregamento/erro/sucesso, acessibilidade, responsividade e suíte de testes
Vitest. Sem qualquer alteração de backend.

---

## 2. ÂMBITO, RESTRIÇÕES E NÃO-OBJETIVOS

Restrições respeitadas integralmente:

| Restrição | Cumprimento |
| --- | --- |
| Só frontend (`client/`) | Sim — `git status` só mostra `client/**` + este relatório |
| Sem alterar backend/DB/permissões/contratos | Sim — nenhum ficheiro em `server/` foi tocado |
| Sem criar endpoints/permissões | Sim — apenas consumidos os 6 endpoints existentes |
| Sem `localStorage`/`sessionStorage` para imagens | Sim — apenas `FormData` e URLs do Cloudinary |
| `multipart/form-data` via `apiClient` (já tem `withCredentials`) | Sim — sem `Content-Type` manual (boundary do axios) |
| Sem `git add/commit/merge/push` | Sim — Git intocado |
| Sem corrigir problemas pré-existentes não relacionados | Sim — documentados, não "arremendados" |
| Sem refatorações/redesenho do shell/calendário/dashboard | Sim — apenas mediações mínimas |

Não objetivos (fora do âmbito): crop/rotação/redimensionamento no cliente,
compressão no cliente, drag & drop, barra de progresso, cache offline, múltiplas
imagens por entidade, galeria, zoom/modal de pré-visualização, edição da foto
pelo próprio cliente no portal.

---

## 3. AUDITORIA PRÉVIA DO FRONTEND

Estado encontrado antes da implementação:

| Item | Estado encontrado | Decisão |
| --- | --- | --- |
| `types/employee.ts` / `client.ts` / `company.ts` | Sem qualquer campo de imagem | Adicionado `avatar`/`logo` |
| `AuthUser.avatar` | **Já existia** como `string` (inconsistente com o backend, que devolve `{ url, publicId } \| null`) | Corrigido para `StoredImage \| null` |
| `api/endpoints/employees.api.ts` | Só CRUD + activate/deactivate | Adicionado upload/remove photo |
| `api/endpoints/clients.api.ts` | Só CRUD + credentials + `getClientMe` | Adicionado upload/remove photo |
| `api/endpoints/company.api.ts` | Só `getCompany` + `updateCompany` | Adicionado upload/remove logo |
| `EmployeesPage` / `ClientsPage` | Iniciais calculadas à mão (`initials()` local em `EmployeesPage`) | Substituído por `ImageAvatar` reutilizável |
| `Sidebar` | `<div className="sidebar-context-mark">{inicial}</div>` | `ImageAvatar kind="company"` (mostra a logo) |
| `Navbar` | Sem avatar do utilizador | `ImageAvatar` com `AuthUser.avatar` |
| `PortalProfilePage` | Sem foto do cliente | `ImageAvatar` (leitura) no cartão "Dados cadastrais" |
| CSS | `.person-avatar` (iniciais) e `.sidebar-context-mark` (inicial) | Substituídos por `.entity-avatar*`; regras mortas removidas |
| Componente de imagem reutilizável | **Não existia nenhum** | Criados `ImageAvatar` + `ImageUploader` |
| `URL.createObjectURL` em jsdom | Não implementado (quebraria qualquer teste de pré-visualização) | Shim defensivo em `test/setup.ts` |

---

## 4. CONTRATO BACKEND CONSUMIDO (imutável)

Verificado diretamente no código do servidor antes de escrever qualquer linha:

| Entidade | Upload | Remoção | Campo multipart | Middleware |
| --- | --- | --- | --- | --- |
| Funcionário | `POST /users/:id/photo` | `DELETE /users/:id/photo` | `photo` | `uploadSingleImage("photo")` (`UserRoutes.ts:116`) |
| Cliente | `POST /clients/:id/photo` | `DELETE /clients/:id/photo` | `photo` | `uploadSingleImage("photo")` (`ClientRoutes.ts:113`) |
| Empresa | `POST /companies/:id/logo` | `DELETE /companies/:id/logo` | `logo` | `uploadSingleImage("logo")` (`CompanyRoutes.ts:97`) |

- Todos os `POST` são **envio/substituição** (não existe endpoint dedicado de
  "replace").
- Todos os `POST`/`DELETE` devolvem **`ApiResponse<Entidade>` completa** (não um
  `{ publicId }` solto): `UserController.uploadPhoto/removePhoto`,
  `ClientController.uploadPhoto/removePhoto`,
  `CompanyController.uploadLogo/removeLogo` → os `*Mapper.toResponse` já projetam
  `avatar`/`logo: { url, publicId } | null`.
- Limites: 5 MB, JPEG/PNG/WebP validados por **assinatura binária** no backend
  (`server/src/providers/images/types.ts`).
- Permissões: as mesmas do CRUD da entidade (`USER_UPDATE`, `CLIENT_UPDATE`,
  `COMPANY_UPDATE`). O frontend nunca envia `companyId` — o backend filtra pela
  sessão.

Consequência prática: como o `POST` já substitui, o frontend **não** faz
`remove` + `upload` (que geraria estado intermédio inconsistente e o risco de
ficar sem imagem).

---

## 5. ARQUITETURA DA SOLUÇÃO

Três camadas, com responsabilidades estritas:

```
config/imageUpload.ts     -> regras de validação (fonte única, sem UI nem API)
components/common/        -> ImageAvatar (apresentação) + ImageUploader (ações)
api/endpoints/*.api.ts    -> 1 método por endpoint (FormData, sem UI)
forms / pages             -> liga as três camadas e atualiza o estado
```

Regras de desenho aplicadas:

1. **`ImageAvatar` é puramente visual** — não conhece a API, nem o Redux, nem
   faz pedidos. Pode ser usado em qualquer lista, formulário ou shell.
2. **`ImageUploader` não sabe qual entidade é** — recebe `upload(file)` e
   `remove()` como callbacks. Quem chama decide a API e a atualização de estado.
3. **O componente controlado pelo pai** — depois do sucesso, o pai passa a
   entidade devolvida pelo backend; o preview local é sempre descartado. Não
   existe estado de imagem "otimista" que possa divergir do servidor.
4. **O backend é a autoridade** — a validação do cliente é UX (evita ida/volta
   inútil), não segurança.

---

## 6. MODELO DE DADOS NO FRONTEND

Novo ficheiro `client/src/types/image.ts`:

```ts
export interface StoredImage {
  url: string;
  publicId: string;
}
```

Propagado para:

```ts
// types/employee.ts e types/client.ts
avatar?: StoredImage | null;

// types/company.ts
logo?: StoredImage | null;

// types/auth.ts (antes: avatar?: string)
avatar?: StoredImage | null;
```

**Decisão: campos opcionais (`?`) e não obrigatórios.** O backend garante sempre
`avatar`/`logo` em `toResponse`, mas tornar o campo obrigatório no tipo
obrigaria a adicionar `avatar: null`/`logo: null` a ~17 ficheiros de
fixtures/factories e mocks de testes, além de qualquer consumidor futuro que
construa entidades literais. `?` é mais fiel ao formato real do payload
(`string | null` vs. campo ausente é irrelevante na leitura) e mantém
retrocompatibilidade. `AuthUser.avatar` **já** era opcional — a correção de
`string` para `StoredImage` eliminou a inconsistência com o backend.

`publicId` não é usado na UI (serve para o storage) mas é tipado para que o
objeto seja um espelho exato da resposta do backend.

---

## 7. CONFIGURAÇÃO E VALIDAÇÃO DE IMAGENS

`client/src/config/imageUpload.ts` (fonte única, espelha `types.ts` do backend):

```ts
ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_IMAGE_SIZE_BYTES     = 5 * 1024 * 1024
IMAGE_FILE_ACCEPT        = "image/jpeg,image/png,image/webp"
IMAGE_FORMAT_HINT        = "Formatos aceitos: JPEG, PNG ou WebP. Tamanho máximo: 5 MB."
IMAGE_ERRORS = {
  empty:    "O ficheiro selecionado está vazio.",
  format:   "Formato não suportado. Utilize JPEG, PNG ou WebP.",
  tooLarge: "A imagem deve ter no máximo 5 MB.",
}
```

`validateImageFile(file)` devolve a mensagem ou `null`, com **ordem fixa**
(vazio → formato → tamanho) e sem efeitos colaterais. Aceita
`Pick<File, "type" | "size">` para ser testável sem ficheiros reais.

O `accept` do `<input type="file">` restringe o seletor nativo, mas **não** é
considerado segurança: a validação em JS continua a ser executada (um
`accept` pode ser contornado, um `type`Mentido também).

---

## 8. COMPONENTE `ImageAvatar`

`client/src/components/common/ImageAvatar.tsx` — 103 linhas, sem dependências
externas além de `StoredImage`.

| Prop | Tipo | Efeito |
| --- | --- | --- |
| `image` | `StoredImage \| null` | Se ausente/`null` → placeholder |
| `name` | `string` | Iniciais / inicial e alt por omissão |
| `alt` | `string` | `""` marca a imagem como decorativa |
| `kind` | `"person" \| "company"` | `person` → 2 iniciais; `company` → 1 inicial |
| `size` | `"sm" \| "md" \| "lg"` | 2.25rem / 3.25rem / 5rem |
| `shape` | `"rounded" \| "circle"` | 0.65rem / 50% |
| `className` | `string` | Permite reusar a classe no shell |
| `fallbackIcon` | `ReactNode` | Alternativa às iniciais |

Comportamento de robustez:

- **`onError` permanente** — se a URL falhar ao carregar, o estado
  `hasFailed` passa a `true` e o componente volta ao placeholder. O efeito
  `useEffect([url])` só reverte quando a **URL muda**, portanto nunca existe
  ciclo de recarregamento de uma imagem quebrada.
- **Acessibilidade sem duplicação** — o `<img>` recebe o `alt`; o placeholder é
  um `<span role="img" aria-label="...">` quando há rótulo, e
  `aria-hidden="true"` quando `alt=""` (decorativo). Nunca existem dois nós com
  o mesmo papel acessível.
- **`getInitials(name)` exportado** — 2 primeiras palavras, `trim` + split por
  espaço, uppercase (`"Ana Maria Silva"` → `"AM"`, `"  ana   silva  "` → `"AS"`).
  Devolve `""` para nome vazio, caso em que o componente usa `fallbackIcon` ou `"?"`.

---

## 9. COMPONENTE `ImageUploader`

`client/src/components/common/ImageUploader.tsx` — 204 linhas.

Contrato: recebe `image`, `canManage`, `upload(file)`, `remove()` e rótulos
(opcionais, com omissões em português). Não sabe se é foto ou logótipo.

Comportamento:

1. **Pré-visualização instantânea** — `URL.createObjectURL(file)` é show de
   imediato (a perceived latency é quase nula). A object URL é revogada em
   `finally` (sucesso **e** erro) e no `unmount` (`useEffect(() => revokePreview, [])`),
   para não vazar memória.
2. **Feedback de sucesso inline** — `<p role="status">` com
   "Foto/Logo atualizado(a) com sucesso." / "removido(a) com sucesso.".
3. **Feedback de erro inline** — `<p role="alert">` com
   `getFriendlyErrorMessage(getApiError(e))` (mesma camada usada no resto da
   aplicação, logo as mensagens são consistentes com 400/401/403/404/409/5xx e
   com falhas de rede).
4. **Bloqueio de ações duplicadas** — `isBusy = isUploading || isRemoving`
   desativa o botão, o input e o botão de remover. O spinner entra dentro do
   botão, mantendo a largura estável.
5. **Recomeçar o mesmo ficheiro** — `event.target.value = ""` permite escolher
   de novo exatamente o mesmo ficheiro numa tentativa seguinte (sem isso o
   `change` não dispararia).
6. **`canManage=false`** — mostra apenas a imagem/placeholder, sem input, sem
   botões, sem dica (modo leitura).
7. **Input `visually-hidden`** com `aria-label` dinâmico ("Adicionar foto" /
   "Substituir foto"), para que o fluxo continue a ser testável e acessível por
   teclado; o botão visível apenas faz `inputRef.current?.click()`.

---

## 10. FLUXO DE UPLOAD (passo a passo)

1. Utilizador clica "Adicionar foto"/"Adicionar logo" → abre o seletor nativo.
2. `onChange` → se não houver ficheiro, nada acontece (testado).
3. `event.target.value = ""` (permite reescolher o mesmo ficheiro).
4. `validateImageFile(file)` → se inválido, mensagem `role="alert"` e **zero
   pedidos HTTP**.
5. `URL.createObjectURL` → pré-visualização imediata; `isUploading = true`.
6. `await upload(file)` → o pai chama a API e faz `setState` com a entidade
   devolvida.
7a. Sucesso → mensagem de sucesso, preview revogado, preview volta à imagem do
   servidor (ou placeholder se a resposta trouxer `null`).
7b. Erro → mensagem de erro; o preview é revogado e a imagem anterior continua
   intacta (a operação é atómica do ponto de vista do utilizador).

---

## 11. FLUXO DE REMOÇÃO

1. Só aparece quando existe imagem (`hasImage`), para não oferecer uma ação
   inútil.
2. `await remove()` → o pai chama `DELETE` e atualiza o estado com a entidade
   devolvida (`avatar`/`logo` = `null`).
3. Sucesso → "Foto/Logo removido(a) com sucesso." e a imagem passa a
   placeholder.
4. Erro → mensagem de erro; a imagem continua visível (o backend é a
   autoridade, a UI não mente sobre o estado real).

O `DELETE` é idempotente no backend, mas a UI nunca o chama sem imagem
existente, evitando pedidos inúteis.

---

## 12. CAMADAS DE API

Seis métodos novos, todos com o mesmo padrão (`FormData`, sem `Content-Type`
manual, devolvendo `ApiResponse<Entidade>`):

```ts
// employees.api.ts
async uploadEmployeePhoto(id: string, file: File)   // POST   /users/:id/photo
async removeEmployeePhoto(id: string)               // DELETE /users/:id/photo
// clients.api.ts
async uploadClientPhoto(id: string, file: File)     // POST   /clients/:id/photo
async removeClientPhoto(id: string)                 // DELETE /clients/:id/photo
// company.api.ts
async uploadCompanyLogo(id: string, file: File)     // POST   /companies/:id/logo
async removeCompanyLogo(id: string)                 // DELETE /companies/:id/logo
```

Todos usam `formData.append("photo"|"logo", file)` — o nome do campo foi
confirmado nos middlewares do servidor (`UserRoutes.ts:116`,
`ClientRoutes.ts:113`, `CompanyRoutes.ts:97`). Nenhum envia `companyId`.

---

## 13. INTEGRAÇÃO — FUNCIONÁRIOS

- `EmployeeForm`: novo estado `photo` (inicializado com `employee?.avatar`) e
  `onPhotoUpdated?`. `ImageUploader` só é renderizado em modo edição (não faz
  sentido enviar foto antes de o funcionário existir). `handlePhotoUpload` /
  `handlePhotoRemove` chamam a API e fazem `setPhoto(updated.avatar ?? null)`
  + `onPhotoUpdated?.(updated)`.
- `EmployeesPage`: `handlePhotoUpdated` faz `map` sobre a lista e substitui
  **apenas o `avatar`** da linha afetada — **sem reload** (mantém scroll, foco
  e evita um `GET /users` extra). A célula "Funcionário" usa
  `<ImageAvatar image={employee.avatar} name={employee.name} size="sm" shape="rounded" alt="" />`
  (decorativo, porque o nome já está em texto forte ao lado).

---

## 14. INTEGRAÇÃO — CLIENTES

Espelha exatamente a integração dos funcionários:

- `ClientForm`: estado `photo`, `onPhotoUpdated?`, `ImageUploader` só em edição.
- `ClientsPage`: `handlePhotoUpdated` atualiza a linha sem reload; célula com
  `ImageAvatar`.
- O `POST /clients/:id/credentials` **não** foi tocado (a foto do cliente não
  é a foto do utilizador de portal — são entidades diferentes).

---

## 15. INTEGRAÇÃO — EMPRESA (LOGÓTIPO)

- `CompanyForm`: estado `logo` (inicializado com `company.logo`), callbacks
  `uploadCompanyLogo`/`removeCompanyLogo` e `onLogoChanged?`. O `ImageUploader`
  é montado **no topo do formulário** (é a identidade visual da empresa), com
  `kind="company"` (placeholder = inicial) e rótulos próprios: "Adicionar logo",
  "Substituir logo", "Remover logo".
- `CompanyPage`:
  - `handleLogoChanged` faz `setCompanyData(updated)` **e**
    `dispatch(setCompany(updated))` — o `companySlice` global passa a ser a
    fonte de verdade, portanto a barra lateral reflete a logo imediatamente,
    sem novo `GET /companies`.
  - `handleSaved` (PATCH de nome/timezone) continua a atualizar o slice — e o
    `PATCH` **ignora** `logo` (o backend nunca o toca), pelo que não há risco
    de overwrite.
  - O ramo de leitura (sem `COMPANY_UPDATE`) mostra a logo com `ImageAvatar`
    em vez de apenas texto.

Nota de RBAC: `getCompanyAbilities` devolve `canView` e `canUpdate` para
OWNER/ADMIN, pelo que o ramo `canView && !canUpdate` é defensivo (inalcançável
com os papéis atuais) — manteve-se por simetria com o resto da página.

---

## 16. INTEGRAÇÃO — SHELL E PORTAL

- `Sidebar`: `sidebar-context-mark` (div com inicial) →
  `<ImageAvatar image={company?.logo} name={company?.name ?? "S"} kind="company" size="sm" shape="rounded" alt="" className="sidebar-context-avatar" />`.
  Usa `selectCompany` (já existente), com fallback seguro quando o slice está
  vazio (roles sem `COMPANY_READ`). Reaproveita a classe `.sidebar-context-avatar`
  (2rem, raio 0.5rem) para não alterar o layout do shell.
- `Navbar`: avatar do utilizador autenticado
  (`user.avatar`, `size="sm"`, `shape="circle"`, `className navbar-user-avatar`),
  com `flex-shrink-0` para não ser esmagado em ecrãs estreitos. Fixtures
  existentes com `avatar: null` continuam a renderizar o placeholder.
- `PortalProfilePage`: avatar do cliente autenticado (leitura) no cartão "Dados
  cadastrais", com `alt={`Foto de ${profile.name}`}`. Sem ações — o cliente não
  tem endpoint próprio para a própria foto.

---

## 17. CSS E DESIGN TOKENS

Adicionado ao fim de `client/src/index.css` (1371→1469 linhas), sem tocar nas
regras existentes:

| Classe | Papel |
| --- | --- |
| `.entity-avatar` | Base do avatar/logo (flex, `overflow: hidden`, fundo `#eaf0ff`, `var(--sp-primary)`, uppercase) |
| `.entity-avatar-sm/md/lg` | 2.25rem / 3.25rem / 5rem |
| `.entity-avatar-rounded/circle` | 0.65rem / 50% |
| `.entity-avatar-img` | `object-fit: cover`, 100%×100% |
| `.sidebar-context-avatar` | 2rem, raio 0.5rem (substitui `.sidebar-context-mark`) |
| `.navbar-user-avatar` | Fundo translúcido sobre a navbar escura |
| `.image-uploader` + `-body/-actions/-hint/-success/-error` | Bloco de upload, dica e mensagens |
| `@media (max-width: 575.98px)` | Alinha ao topo, botões a largura total e `flex: 1 1 auto` |

Limpeza de CSS morto introduzido pela migração: `.person-avatar` e
`.sidebar-context-mark` foram removidos e o seletor
`.person-cell > :not(.person-avatar)` passou a `:not(.entity-avatar)` (para que
o `min-width: 0` continue a aplicar-se **apenas** ao contentor textual).

---

## 18. ACESSIBILIDADE

| Aspeto | Implementação |
| --- | --- |
| Imagem significativa | `alt` explícito; nos avatares decorativos `alt=""` |
| Placeholder | `role="img"` + `aria-label` (nome) ou `aria-hidden` (decorativo) |
| Ficheiro | `<input type="file">` com `aria-label` = ação corrente; o botão é que é visível |
| Botões | `<button type="button">` com rótulo textual (não só ícone) |
| Sucesso | `role="status"` (polite, não interrompe) |
| Erro | `role="alert"` (assertivo) |
| Foco | Nada é movido programaticamente; os botões entram na ordem natural |
| Contraste | `#b42318` (erro) e `#1a7f52` (sucesso) sobre fundo branco |
| Texto | `text-transform: uppercase` só no placeholder (iniciais), nunca no `alt` |

---

## 19. RESPONSIVIDADE

- `ImageUploader` usa `flex-wrap`, por isso o preview (5rem) e o bloco de ações
  quebram para baixo em ecrãs estreitos.
- Abaixo de 576px: `align-items: flex-start` e botões a `width: 100%` com
  `flex: 1 1 auto` (alvos de toque confortáveis).
- Avatares têm tamanho fixo por variante e `flex: 0 0 auto` — nunca esticam nem
  encolhem com o texto ao lado.
- `object-fit: cover` garante que fotos verticais ou panorâmicas não deformam o
  círculo/quadrado.
- `min-width: 0` no contentor textual da `.person-cell` mantém nomes longos de
  funcional/cliente de partir a tabela.

---

## 20. SEGURANÇA, PRIVACIDADE E LIMITES

- **Nada de `localStorage`/`sessionStorage`/`base64`**: o URL do Cloudinary fica
  apenas em memória (estado React/Redux). Não há cópia do binário no browser.
- **Sem credenciais no pedido**: o `apiClient` já envia `withCredentials: true`;
  nada foi alterado nesse sentido.
- **Sem `Content-Type` manual** no multipart — deixar o axios gerar o `boundary`
  evita o bug clássico de ficheiros enviados como `multipart/form-data` sem
  boundary.
- **RBAC só como UX**: a interface esconde/mostra ações, mas quem autoriza é o
  `permission.middleware` do backend. Um `EMPLOYEE` sem `USER_UPDATE` recebe
  403 mesmo que force o pedido pela DevTools.
- **Isolamento de tenant**: o frontend nunca envia `companyId`; os ids vêm do
  estado/da lista devolvida pelo servidor.
- **Validação dupla por desenho**: o cliente evita a ida/volta; o backend
  valida assinatura binária e tamanho e é a autoridade.
- **Nenhum segredo** (nem `CLOUDINARY_*`) exposto no frontend: as upload
  signatures não são usadas — o upload passa pelo backend.
- **Preview revogado** sempre, evitando retenção de memória com blobs.

---

## 21. ESTADOS DE UI E FEEDBACK

| Estado | Onde | Comportamento |
| --- | --- | --- |
| Sem imagem | Listas, shell, portal, formulários | Placeholder com iniciais (empresa: inicial) |
| Imagem carregada | Toda a parte | `<img object-fit: cover>` |
| URL inválida/404 | `ImageAvatar` | Fallback permanente para placeholder (sem loop) |
| A enviar | `ImageUploader` | Spinner no botão + `disabled` (botões e input) |
| A remover | `ImageUploader` | Spinner no botão de remover + `disabled` |
| Sucesso | `ImageUploader` | `role="status"` verde |
| Erro | `ImageUploader` | `role="alert"` vermelho, mensagem amigável |
| Erro de validação | `ImageUploader` | `role="alert"` sem pedido HTTP |
| Sem permissão | Páginas | Puxões já existentes (`canEdit`/`canUpdate`); o uploader só aparece em edição |
| Shell sem empresa | `Sidebar`/`Navbar` | Placeholder com fallback (`"S"`) |

---

## 22. TESTES AUTOMATIZADOS

**56 testes novos** (de 864 → 920), todos em arquivos dedicados (exceto as
adições aos 3 ficheiros de API existentes), sem alterar o comportamento dos
testes anteriores.

| Ficheiro | Testes | Cobre |
| --- | --- | --- |
| `config/imageUpload.test.ts` | 5 | JPEG/PNG/WebP aceitos, vazio, MIME não suportado/vazio, >5 MB, constantes |
| `components/common/ImageAvatar.test.tsx` | 9 | `getInitials` (2/1 palavras, espaços, vazio), imagem com `alt`, iniciais, inicial de empresa, tamanho/formato/`className`, `fallbackIcon`, `onError` permanente, `alt=""` decorativo |
| `components/common/ImageUploader.test.tsx` | 14 | placeholder vs. imagem, `canManage=false`, upload válido, `change` sem ficheiro, clique abre o picker, vazio/formato/5 MB sem pedido, erro de upload, substituir/remover presentes, remoção com sucesso, erro de remoção, bloqueio de upload duplicado, limpeza de preview no unmount |
| `api/endpoints/employees.api.test.ts` | +2 | `POST /users/:id/photo` (URL + `FormData` + campo `photo` = o `File`), `DELETE` |
| `api/endpoints/clients.api.test.ts` | +2 | idem para `/clients/:id/photo` |
| `api/endpoints/company.api.test.ts` | +2 | idem para `/companies/:id/logo` (campo `logo`) |
| `components/employees/EmployeeForm.photo.test.tsx` | 5 | sem uploader em criação, upload + `onPhotoUpdated`, remoção + `avatar: null`, formato inválido, erro de upload |
| `components/clients/ClientForm.photo.test.tsx` | 4 | criação sem uploader, upload, remoção, ficheiro >5 MB |
| `components/company/CompanyForm.logo.test.tsx` | 3 | upload (`kind="company"`), substituir/remover com logo existente, formato inválido |
| `pages/employees/EmployeesPage.photo.test.tsx` | 3 | foto na lista, iniciais sem `avatar`, **upload reflete na lista sem reload** (`getEmployees` chamado 1×) |
| `pages/clients/ClientsPage.photo.test.tsx` | 3 | idem para clientes |
| `pages/company/CompanyPage.logo.test.tsx` | 2 | upload propaga ao `companySlice` global, remoção limpa o slice |
| `components/layout/Sidebar.logo.test.tsx` | 2 | logo na barra lateral, inicial sem logo |

Infra de teste: shim de `URL.createObjectURL`/`revokeObjectURL` em
`src/test/setup.ts` (só se ausentes), porque o jsdom não os implementa.

**Resultado:** 918/920 testes passam. As 2 falhas são **pré-existentes** (ver
secção 25).

---

## 23. COVERAGE, TYPECHECK E BUILD

```
TESTES:   918/920 (2 falhas pré-existentes, nenhuma regressão)
TYPECHECK: PASS  (tsc -b --noEmit)
BUILD:     PASS  (tsc -b && vite build)
COVERAGE:  Statements 96.24% | Branches 90.29% | Functions 96.56% | Lines 96.42%
```

Cobertura por ficheiro novo/alterado (lido de `coverage/coverage-final.json`):

| Ficheiro | Stmts | Branches | Functions |
| --- | --- | --- | --- |
| `types/image.ts` (sem runtime) | — | — | — |
| `config/imageUpload.ts` | 100% | 100% | 100% |
| `components/common/ImageAvatar.tsx` | 100% | 100% | 100% |
| `components/common/ImageUploader.tsx` | 100% | 100% | 100% |
| `components/employees/EmployeeForm.tsx` | 100% | 91.7% | 100% |
| `components/clients/ClientForm.tsx` | 100% | 94.1% | 100% |
| `components/company/CompanyForm.tsx` | 98.1% | 86.4% | 100% |
| `pages/employees/EmployeesPage.tsx` | 100% | 89.5% | 100% |
| `pages/clients/ClientsPage.tsx` | 93.0% | 93.8% | 90.9% |
| `pages/company/CompanyPage.tsx` | 100% | 88% | 100% |
| `components/layout/Sidebar.tsx` | 100% | 100% | 100% |
| `components/layout/Navbar.tsx` | 100% | 100% | 100% |
| `pages/portal/PortalProfilePage.tsx` | 94.4% | 80% | 80% |
| `api/endpoints/{employees,clients,company}.api.ts` | 100% | 100% | 100% |

Linhas por baixo dos 100% **não são código novo**: `CompanyForm.tsx:35`
(timezone obrigatório), `ClientsPage.tsx:103-107,253`
(`SetClientCredentialsModal`), `PortalProfilePage.tsx:54` (perfil não
encontrado) — ramos pré-existentes sem suíte.

Nota: o baseline de coverage do **frontend** não foi medido antes desta parte
(as Partes 1–4 registaram apenas o backend, 78.28%). O número acima é a
medição final.

O `vite build` emite o aviso padrão de *chunk > 500 kB* (544 kB) — pré-existente
e não introduzido aqui.

---

## 24. FICHEIROS ALTERADOS E DECISÕES TÉCNICAS

**Criados (14):**

```
client/src/types/image.ts
client/src/config/imageUpload.ts
client/src/config/imageUpload.test.ts
client/src/components/common/ImageAvatar.tsx
client/src/components/common/ImageAvatar.test.tsx
client/src/components/common/ImageUploader.tsx
client/src/components/common/ImageUploader.test.tsx
client/src/components/employees/EmployeeForm.photo.test.tsx
client/src/components/clients/ClientForm.photo.test.tsx
client/src/components/company/CompanyForm.logo.test.tsx
client/src/components/layout/Sidebar.logo.test.tsx
client/src/pages/employees/EmployeesPage.photo.test.tsx
client/src/pages/clients/ClientsPage.photo.test.tsx
client/src/pages/company/CompanyPage.logo.test.tsx
```

**Alterados (21):**

```
client/src/types/{auth,employee,client,company}.ts
client/src/api/endpoints/{employees,clients,company}.api.ts
client/src/api/endpoints/{employees,clients,company}.api.test.ts
client/src/components/employees/EmployeeForm.tsx
client/src/components/clients/ClientForm.tsx
client/src/components/company/CompanyForm.tsx
client/src/components/layout/Sidebar.tsx
client/src/components/layout/Navbar.tsx
client/src/pages/employees/EmployeesPage.tsx
client/src/pages/clients/ClientsPage.tsx
client/src/pages/company/CompanyPage.tsx
client/src/pages/portal/PortalProfilePage.tsx
client/src/index.css
client/src/test/setup.ts
STAGE-30-IMAGES-REPORT.md
```

**Backend:** `server/` **intacto**.

Decisões técnicas (com o porquê):

1. **Campos opcionais** em vez de obrigatórios — evita churn em ~17 fixtures e
   é mais fiel ao payload real.
2. **`ImageUploader` controlado pelo pai** — o componente não mantém a imagem
   "oficialmente"; quem sabe é o estado do pai, alimentado pela resposta do
   servidor. Evita divergência entre o que se vê e o que está gravado.
3. **Sem `remove` + `upload` manual ao substituir** — o `POST` já substitui
   (Partes 1–4). Fazer os dois criaria um estado intermédio sem imagem e o
   risco de ficar sem foto se a segunda chamada falhasse.
4. **Sucesso por operação, não por entidade** — após a foto, a mensagem é
   "Foto atualizada com sucesso."; o formulário continua aberto (não faz
   sentido fechar um modal por causa de uma foto).
5. **Atualização local da lista em vez de reload** — o `POST`/`DELETE` já
   devolve a entidade completa, logo não há necessidade de um `GET` extra
   (testado explicitamente: `getEmployees` chamado exatamente 1×).
6. **`companySlice` reutilizado** para a logo — a barra lateral passa a ser
   automaticamente consistente, sem store novo nem fetch.
7. **Testes em ficheiros separados (`*.photo.test.tsx` / `*.logo.test.tsx`)** —
   não é preciso tocar nos mocks dos testes de formulário existentes, o que
   torna o diff mais seguro e o histórico mais legível.
8. **CSS morto removido** (`.person-avatar`, `.sidebar-context-mark`) — limpo o
   que a migração deixou órfão, com o `:not()` ajustado para não regredir o
   `min-width: 0` do texto.

---

## 25. PROBLEMAS, LIMITAÇÕES E ITENS NÃO IMPLEMENTADOS

### Problemas pré-existentes (não introduzidos, não corrigidos)

1. **`DashboardPage.test.tsx` — 2 falhas determinísticas.** O teste espera 6
   elementos `data-testid="card-value"` (`["1","2","1","1","1","1"]`) mas
   `DashboardPage.tsx` renderiza **3** `DashboardCard` (Hoje/Pendentes/
   Confirmados, `DashboardPage.tsx:230-252`). Teste e componente estão
   desalinhados **desde antes desta parte** (`git status` confirma que nenhum
   dos dois ficheiros foi tocado nesta parte; a falha reproduz-se em execuções
   isoladas). Não corrigido por estar fora do âmbito.
2. **`AvailabilityPage.test.tsx` — flake sob carga.** Numa das execuções
   paralelas, "loads and renders the exceptions of the selected employee" falhou
   (`getAvailabilityExceptions` com 0 chamadas). Em isolamento passa 22/22 e
   passou em 2 das 3 execuções completas — é instabilidade de timing do teste
   (`maxWorkers: 3` + ambiente jsdom lento), não uma regressão: nenhum
   ficheiro de disponibilidade foi alterado.

### Problemas introduzidos

**Nenhum.**

### Limitações

- Sem compressão/redimensionamento no cliente: um PNG de 4,9 MB segue para o
  servidor (que é quem valida).
- Sem barra de progresso de upload (`XMLHttpRequest`/axios progress) — só
  spinner. Consistente com o resto da aplicação.
- O preview é criado com `createObjectURL` e descartado no fim: em ligações
  muito lentas o utilizador vê a pré-visualização "saltar" para o URL do
  Cloudinary no fim (por conceção — o servidor é a autoridade).
- O cliente do portal **não** pode enviar a própria foto (não existe endpoint
  próprio; `POST /clients/:id/photo` exige `CLIENT_UPDATE` da empresa). O
  frontend mostra-a em leitura.
- `ImageAvatar` não faz cache em disco nem revalidação: URLs antigos do
  Cloudinary que já não existam caem no placeholder.
- Sem MÉTRICA de acessibilidade automática (Lighthouse/axe) — a conformidade
  foi verificada por leitura do markup e por asserções em testes.

### Itens não implementados (deliberadamente)

- Drag & drop, colar imagem do clipboard, webcamera.
- Crop/rotação, remover fundo, filtro.
- Galeria de várias imagens, imagem de capa + galeria.
- Modal de pré-visualização em ecrã grande (lightbox) / zoom.
- Envio em lote.
- Compressão/redimensionamento no cliente (`canvas`).
- Exif orientation/remoção de metadados.
- Avatares no dashboard/calendário (fora do âmbito desta parte; hoje mostram
  apenas texto).

---

## CONTEXTO PARA A PRÓXIMA IA

### O que existe agora (frontend)

- `client/src/types/image.ts` → `StoredImage { url: string; publicId: string }`.
- `Employee.avatar?: StoredImage | null`, `Client.avatar?: StoredImage | null`,
  `Company.logo?: StoredImage | null`, `AuthUser.avatar?: StoredImage | null`
  (era `string` — corrigido).
- `client/src/config/imageUpload.ts` → `ACCEPTED_IMAGE_MIME_TYPES`,
  `MAX_IMAGE_SIZE_BYTES` (5 MB), `IMAGE_FILE_ACCEPT`, `IMAGE_FORMAT_HINT`,
  `IMAGE_ERRORS`, `validateImageFile(file)`.
- `client/src/components/common/ImageAvatar.tsx` → props `image`, `name`,
  `alt`, `kind` (`person|company`), `size` (`sm|md|lg`), `shape`
  (`rounded|circle`), `className`, `fallbackIcon`; exporta `getInitials`.
  100% coberto. `onError` → placeholder **permanente**.
- `client/src/components/common/ImageUploader.tsx` → props `id`, `name`,
  `image`, `kind`, `size`, `canManage`, `upload`, `remove`, rótulos
  opcionais. 100% coberto. Controlado pelo pai; preview com `createObjectURL`
  revogado em `finally` + `unmount`; `role="status"`/`role="alert"`.
- APIs: `uploadEmployeePhoto`/`removeEmployeePhoto` (campo `photo`),
  `uploadClientPhoto`/`removeClientPhoto` (campo `photo`),
  `uploadCompanyLogo`/`removeCompanyLogo` (campo `logo`). Sem `Content-Type`
  manual; sem `companyId`.
- CSS: `.entity-avatar*`, `.sidebar-context-avatar`, `.navbar-user-avatar`,
  `.image-uploader*` (+ media query 575.98px). `.person-avatar` e
  `.sidebar-context-mark` removidos (morto).

### Padrão a seguir para nova entidade com imagem

1. `types/<x>.ts`: `<x>Image?: StoredImage | null` (nome do campo igual ao do
   backend).
2. `api/endpoints/<x>.api.ts`: `upload<X>Image(id, file)` com
   `formData.append("<campo do middleware>", file)` + `remove<X>Image(id)`,
   ambos a devolver `ApiResponse<X>`.
3. No formulário: `useState<XImage>(entity?.<campo> ?? null)` + handlers que
   fazem `setXImage(response.data.<campo> ?? null)` e chamam
   `onXImageChanged?.(entity)`.
4. Na página: handler que faz `map` na lista **sem reload**, passando a
   entidade ao formulário.
5. Na lista: `<ImageAvatar image={entity.<campo>} name={entity.name} size="sm" shape="rounded" alt="" />`.
6. Se for exibida no shell, usar `selectCompany`/slice equivalente em vez de
   criar store novo.

### Contratos HTTP consumidos (inalteráveis)

```
POST   /api/users/:id/photo      multipart campo "photo"  -> ApiResponse<Employee>
DELETE /api/users/:id/photo                            -> ApiResponse<Employee>
POST   /api/clients/:id/photo    multipart campo "photo"  -> ApiResponse<Client>
DELETE /api/clients/:id/photo                          -> ApiResponse<Client>
POST   /api/companies/:id/logo    multipart campo "logo"   -> ApiResponse<Company>
DELETE /api/companies/:id/logo                          -> ApiResponse<Company>
```

Resposta da imagem (quando existe):
`{ "avatar": { "url": "https://...", "publicId": "schedulerpro/user/..." } }` ou
`{ "avatar": null }`.

Limites (frontend espelha, backend autoritativo): 5 MB, JPEG/PNG/WebP por
assinatura binária.

### Notas de implementação para a próxima

- O upload **substitui** (o `POST` é idempotente quanto ao anterior): nunca
  chamar `remove` antes de `upload`.
- `ImageUploader` é **controlado**: se uma entidade nova precisar de preview
  otimista permanente, criar uma variante ou estender as props com cuidado
  (não introduzir estado de imagem dentro do componente sem decidir onde fica
  a fonte de verdade).
- Mensagens de sucesso/erro do uploader são independentes do `errorMessage` do
  formulário (que é para o `PATCH`/`POST` de dados).
- `URL.createObjectURL` não existe no jsdom: o shim está em
  `client/src/test/setup.ts` — não remover.
- Ao testar páginas com avatares, preferir
  `container.querySelector(".person-cell img")` — o `alt` é `""` (decorativo)
  para não duplicar o nome que já está em texto na célula.
- Os mocks de API dos testes existentes foram deixados intactos; os testes de
  imagem vivem em `*.photo.test.tsx`/`*.logo.test.tsx`/`*.avatar*.test.tsx` com
  os seus próprios mocks.

### Estado do Git

Nenhum `commit`, `merge` ou `push`. `git status` mostra 14 ficheiros novos e 21
alterados, todos em `client/` (mais este relatório). `server/` intacto.

### Pendências conhecidas para o futuro

1. Corrigir o desalinhamento `DashboardPage.test.tsx` vs `DashboardPage.tsx`
   (6 cartões esperados vs 3 renderizados) — pré-existente.
2. Estabilizar o timing de `AvailabilityPage.test.tsx` (flake sob carga).
3. Opcional: endpoint para o cliente do portal enviar a própria foto.
4. Opcional: avatares no dashboard/calendário (mesmo componente, sem trabalho
   de backend).

---

### Bloco final

```
TESTES: 918/920 (2 falhas PRÉ-EXISTENTES em DashboardPage.test.tsx; nenhuma
        regressão. 89 ficheiros de teste. 56 testes novos.)
TYPECHECK: PASS (tsc -b --noEmit)
BUILD: PASS (tsc -b && vite build)
COVERAGE: Statements 96.24% | Branches 90.29% | Functions 96.56% | Lines 96.42%
          (ficheiros novos: 100% em stmts/branches/functions)
ARQUIVOS ALTERADOS: 14 criados + 21 alterados, todos em client/ (+ este relatório)
PROBLEMAS PREEXISTENTES: DashboardPage.test.tsx (2 falhas, desalinhamento
          teste/componente) e flake de timing em AvailabilityPage.test.tsx sob
          carga paralela. NÃO corrigidos (fora do âmbito).
PROBLEMAS INTRODUZIDOS: nenhum
LIMITAÇÕES: sem compressão/cliente, sem progresso de upload, sem drag&drop, sem
          crop/lightbox, sem múltiplas imagens; o cliente do portal não envia a
          própria foto; sem MÉTRICA automática de acessibilidade.
```
