# STAGE 31 — PARTE 1: AGENDAMENTO PÚBLICO (BACKEND SEM AUTENTICAÇÃO)

## CONTEXTO PARA A PRÓXIMA IA

- Objetivo desta etapa: permitir que uma pessoa, pela Internet e sem conta, crie um agendamento numa empresa a partir de um link. Esta entrega é apenas o backend; não há frontend público.
- Endpoint: `POST /api/public/companies/:companyId/appointments`. Sem autenticação, sem permissão, apenas rate limit.
- O tenant vem **só** da URL. O corpo rejeita `companyId` e qualquer campo desconhecido.
- O cliente é um `Client` da empresa, encontrado pelo e-mail. Não há criação de `User` nem login.
- `endAt`, `duration`, `price` e `status` são sempre calculados/definidos pelo servidor a partir do `Service`.
- As regras de agenda não foram duplicadas: o fluxo público entra no mesmo `AppointmentService.schedule()` usado pelo fluxo administrativo.

## 1. O QUE FOI FEITO

### 1.1 Schema

`server/src/modules/Clients/models/Client.model.ts`
- `phone` passou a opcional, com `default: null`. Um cliente criado por agendamento público pode não ter telefone.
- Adicionado índice composto `{ companyId: 1, email: 1 }` para a procura por e-mail dentro da empresa.

Justificativa: o `Client` já não precisa de `User`. O vínculo continua a ser `User.clientId`, pelo que um cliente sem conta é um estado já suportado pelo modelo. A única alteração de schema necessária foi o telefone.

### 1.2 Repositório de clientes

`server/src/modules/Clients/repositories/ClientRepository.ts`
- Novo `findByEmailAndCompany(email, companyId)`, com normalização de e-mail para minúsculas.
- `create()` deixou de depender de `CreateClientDto` (que exige telefone obrigatório) e passou a aceitar telefone opcional.

### 1.3 DTO, validação e mapeamento

`CreatePublicAppointment.dto.ts`
- `PUBLIC_APPOINTMENT_FIELDS`: a lista fechada de campos aceites. Serve de lista branca e alimenta a mensagem de erro.

`create-public-appointment.validator.ts`
- Valida o corpo inteiro, rejeitando campos desconhecidos com `400` e mensagem com a lista exata. Optou-se por rejeitar em vez de ignorar: ignorar esconderia tentativas de sobrescrever `endAt`/`status` e tornaria o contrato silenciosamente diferente do documentado.
- `serviceId`/`employeeId`: ObjectId válido.
- `startAt`: ISO 8601 **com offset explícito** (`Z` ou `±HH:MM`). Sem offset, o valor seria interpretado no fuso do servidor, não no da empresa.
- `clientName`: 2–100 caracteres, `trim` obrigatório.
- `clientEmail`: obrigatório, formato válido, máximo 254.
- `clientPhone`: opcional, 8–20 caracteres.
- `notes`: opcional, máximo 500.

`PublicAppointmentMapper.ts`
- Resposta deliberadamente estreita: `id`, `startAt`, `endAt`, `status`, `clientName`, `service {id,name}`, `employee {id,name}`. Não expõe `companyId`, `clientId`, `notes`, `price` nem `duration`.

### 1.4 Serviço

`AppointmentService.ts`
- `schedule()` deixou de receber `clientId` e passou a receber `resolveClientId: () => Types.ObjectId | Promise<...>`.
- A resolução do cliente acontece **dentro** de `schedule()`, depois de: `startAt` no futuro, empresa/serviço/funcionário válidos, disponibilidade e conflito de funcionário; e **antes** do conflito de cliente.
- Consequência deliberada: no fluxo público, um pedido rejeitado por indisponibilidade ou conflito **não cria o cliente**. Este bug existia na primeira versão da implementação (um `startAt` no passado deixava um cliente órfão na base de dados) e foi corrigido pela mudança acima. O teste correspondente existe.
- `create()` (administrativo) passa `resolveClientId: () => new Types.ObjectId(dto.clientId)`, sem alterar comportamento.
- `createPublic()` valida empresa/serviço/funcionário, calcula nome/e-mail/telefone normalizados e agenda.
- Helpers `requireActiveClient`, `requireActiveService` e `requireActiveEmployee` centralizam as verificações de existência, empresa e `isActive`.
- `resolvePublicClient()` reutiliza o cliente pelo e-mail; cria se não existir; recusa cliente inativo.

### 1.5 HTTP

Criados `PublicAppointmentController.ts` e `PublicAppointmentRoutes.ts`, montados em `src/routes/index.ts`.

Ordem deliberada de middlewares na rota pública: `rateLimit` → `validateCreatePublicAppointment` → handler. O limitador vem antes da validação para que payloads malformos também contem para o limite.

`error.middleware.ts`
- `entity.parse.failed` deixou de dar `500` e passou a dar `400`. Um pedido público com JSON cortado é um erro do cliente, não do servidor.

### 1.6 Rate limit

`src/middlewares/public-booking-rate-limit.middleware.ts`
- 20 pedidos por 15 minutos, por IP, com envelope de erro do projeto e cabeçalhos padrão (`draft-7`).
- A chave é `rota + IP` e **não** inclui `companyId`: trocar o tenant na URL não reinicia a contagem.
- `ipKeyGenerator` normaliza IPv4 e subnets IPv6.
- O IP vem **apenas** de `req.ip`. A primeira versão da implementação lia o último valor de `X-Forwarded-For`; os testes revelaram que, sem `trust proxy` configurado, esse cabeçalho é controlado por quem faz o pedido e uma rotação de valores contorna o limite. Foi removido. Se um dia houver um proxy fiável, o caminho correto é configurar `trust proxy` e o Express deriva o `req.ip` de forma confiável.
- Store em memória: reiniciar o processo zera os contadores. Suficiente para uma única instância; múltiplas instâncias exigiriam store partilhado.

### 1.7 Testes

| Ficheiro | Testes | Foco |
|---|---|---|
| `tests/unit/appointments/AppointmentService.public.test.ts` | 29+ | Regras do serviço público, tenant, cliente sem conta, ausência de órfãos |
| `tests/integration/public-appointment.routes.test.ts` | 45 | Contrato HTTP, status codes, validação, corpo malformado, rota não autenticada |
| `tests/integration/public-appointment.rate-limit.test.ts` | 12 | Limite, janela, headers, chave por IP, rotação de `X-Forwarded-For`, escopo |

Total da suite: **761 testes em 63 ficheiros**, todos a passar (baseline era 675 em 60).

Dois testes de integração usam contadores simples em vez de `vi.fn` porque `restoreMocks` apagaria a implementação de um mock.

O limitador é substituído por uma função de passagem no teste de rotas, para que 45 pedidos não disparem o limite real; a sua funcionamento é testado no ficheiro dedicado. Um teste afirma explicitamente que a rota **chama** o limitador em cada pedido, incluindo os que falham a validação.

Cobertura dos ficheiros novos: 100% em validator, DTO, mapper, controller e rotas. `AppointmentService` a 89%, `public-booking-rate-limit.middleware` a 100%, `Client.model` a 100%.

## 2. VERIFICAÇÃO

| Comando | Resultado |
|---|---|
| `npm test` | 761/761, 63 ficheiros |
| `npm run typecheck` | sem erros (script adicionado; antes só existia `npx tsc --noEmit`) |
| `npm run build` | sem erros |
| `npm run test:coverage` | 79.39% statements, 78.11% branches, 67.74% functions |

Cobertura global manteve-se no mesmo patamar da baseline; a variação vem de código novo coberto na íntegra e de código antigo não relacionado.

## 3. DECISÕES E ALTERNATIVAS DESCARTADAS

**Não criar `User` para o cliente público.** O endpoint cria um `Client`, não uma conta. Verificar o e-mail contra `User` revelaria a existência de contas de outros tenants e imporia um `500` por unicidade global a quem só devia agendar. Consequência: dois pedidos públicos simultâneos com o mesmo e-mail novo podem criar dois clientes (o índice composto não é único, para não bloquear empresas diferentes com o mesmo e-mail). Aceito.

**Não adicionar `source` a `Appointment`.** O token público da próxima etapa permitirá identificar a origem. Adicionar o campo agora deixaria um marcador sem informação.

**`role: CLIENT` rejeitado como profissional.** Só no fluxo público (`404`, para não revelar a existência do registo). O fluxo administrativo mantém o comportamento anterior, por ser uma conta legítima da empresa.

**Campos desconhecidos rejeitados, não ignorados.** Ver acima.

**Telefone opcional em `Client`.** O tipo do frontend mantém `phone: string`; os clientes públicos sem telefonesimply não têm número. Alterar o frontend está fora do âmbito desta parte.

**Telefone não persistido no cliente.** O telefone enviado no booking é aceite e validado, mas não é gravado em `Client`: evita sobrescrever o número de um cliente que já existia com um telefone diferente. Fica disponível quando o link público precisar de enviar confirmação por SMS.

## 4. LIMITES CONHECIDOS

- Rate limit em memória e por IP: reinício do processo zera os contadores; várias instâncias dão contadores independentes.
- Sem CAPTCHA, WAF ou verificação de e-mail: a proteção contra spam é apenas o rate limit.
- - `Client.phone` pode ser `null` para clientes públicos. O frontend não foi alterado, e o tipo `phone: string` fica temporariamente inconsistente com o que a API pode agora devolver.
- Sem token público, sem consulta, alteração ou cancelamento pelo cliente final. Todos os endpoints `GET`/`PATCH`/`DELETE` continuam a exigir `APPOINTMENT_*` e a company ativa.

## 5. O QUE ESTÁ PRONTO PARA A PRÓXIMA ETAPA

Base para os links públicos: rota e serviço prontos, contrato estável documentado em `docs/api-contract.md`.

Próximos passos naturais, por ordem: token público e rotas de consulta/alteração/cancelamento pelo cliente final; depois a página de booking no frontend.