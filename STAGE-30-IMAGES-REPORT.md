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
