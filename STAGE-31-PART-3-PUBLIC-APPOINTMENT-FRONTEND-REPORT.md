# STAGE 31 — PARTE 3: PÁGINA PÚBLICA DO AGENDAMENTO (/agendar/:token)

## CONTEXTO PARA A PRÓXIMA IA

- Objetivo desta etapa: dar acabamento de interface ao caminho que a Parte 2 tornou possível. O cliente final marca por link público, recebe o token e agora tem uma página para **consultar, alterar e cancelar** sem criar conta e sem entrar.
- Rota: `/agendar/:token`. Também existe `/agendar` (sem token), que mostra "link inválido" em vez de cair no `*` autenticado e acabar no login.
- Consome exatamente as três rotas da Parte 2: `GET`, `PATCH` e `DELETE /api/public/appointments/:token`. **Nenhum endpoint novo, nenhuma alteração no backend.**
- A rota está declarada diretamente em `AppRoutes`, sem `ProtectedRoute`, sem `GuestRoute`, sem `AppLayout`, sem `Navbar` e sem `Sidebar`. Também não usa `Provider` de Redux.
- O `SessionBootstrap` continua a correr na raiz da aplicação, mas a página não depende dele: um teste monta a rota com a sessão por inicializar e a página aparece na mesma. Nunca é chamada `/auth/me` a partir da página.
- O token vive apenas em `useParams()`. Não é escrito em `localStorage`, `sessionStorage`, Redux, query string própria nem `<input>`; os componentes filhos só recebem o que precisam e a API é a única a conhecê-lo, já codificado com `encodeURIComponent`.
- **O contrato público é deliberadamente estreito.** O `GET` devolve `id`, `startAt`, `endAt`, `status`, `clientName`, `service { id, name }` e `employee { id, name, avatarUrl }`. Não devolve `notes`, não devolve o fuso da empresa e não existe nenhuma API pública de serviços, profissionais ou disponibilidade. Por isso a edição ficou **limitada a observações** — ver §3.
- O `PATCH` aceita `serviceId`, `employeeId`, `startAt` e `notes`; o frontend envia apenas `notes`, porque não tem como obter com segurança os outros três.
- `notes` começa vazio (o `GET` não devolve o valor atual). O formulário só envia `notes` depois de o utilizador tocar no campo, e envia `null` quando o texto é limpo. Sem esse cuidado, abrir e fechar o formulário apagaria observações que ninguém via.
- Não há update otimista: depois de um `PATCH` ou `DELETE` bem-sucedido, o estado da página é **a resposta do servidor**, nunca o que foi pedido.
- Estados finais (`cancelled`, `completed`, `no-show`) e agendamentos já iniciados ficam somente leitura. Um `400` com a mensagem única de "já não pode ser alterado nem cancelado" bloqueia o formulário mesmo depois de a pessoa o ter visto editável — o servidor continua a ser a autoridade.
- Datas e horas usam `formatAppointmentTime` de `client/src/config/appointmentTime.ts`, com `APPOINTMENT_TIMEZONE = "Europe/Lisbon"` (mesmo valor do `DEFAULT_TIMEZONE` do backend). Não foi inventado timezone novo.
- `404` é apresentado como link inválido, **sem** botão de repetir: repetir não resolveria um token que não existe. `429` não oferece retry imediato. `500` e falhas de rede oferecem.
- Nenhum comando Git foi executado nesta etapa.

## 1. O QUE FOI FEITO

### 1.1 Tipos

`client/src/types/publicAppointment.ts` (novo)

- `PublicAppointment`, `PublicService`, `PublicEmployee`, `PublicAppointmentStatus`, `PublicAppointmentResponse` e `UpdatePublicAppointmentPayload` (`{ notes: string | null }`).
- Réplica do mapper do backend, sem campos que o contrato público não expõe. `clientEmail`, `clientPhone`, `price`, `durationMinutes`, `notes` e `timezone` não existem aqui de propósito: tipá-los daria a ilusão de que o backend os envia.

### 1.2 API

`client/src/api/endpoints/publicAppointments.api.ts` (novo)

- `getByToken(token)`, `updateByToken(token, payload)` e `cancelByToken(token)`, sobre o `apiClient` existente (base `/api`), o mesmo que o resto da aplicação e que já normaliza `ApiFailure`.
- O token vai sempre em `encodeURIComponent(token)`, para que caracteres fora do alfabeto base64url não quebrem o caminho.
- O `DELETE` não envia corpo — coerente com o `rejectCancelBodyValidator` da Parte 2.

### 1.3 Regras e textos

`client/src/config/publicAppointment.ts` (novo)

- Textos de sucesso, link inválido, 404 e 429; `PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH = 500`, espelhando o limite do `update-public-appointment.validator.ts` do backend.
- `isPublicAppointmentEditable()` reproduz `assertPublicAppointmentIsEditable` só para **quando esconder o botão**. Não é autorização; um `400` do servidor volta a bloquear tudo.
- `getPublicAppointmentLoadFailure()` reduz a consulta inicial a três ecrãs: `not_found` (sem retry), `rate_limited` (aguardar) e `error` (tentar novamente). O `429` é reconhecido pelo `status` porque `getApiError` o classifica como desconhecido.
- `getPublicAppointmentWriteMessage()` preserva a mensagem de `400` (é regra de negócio já escrita para o utilizador final) e traduz o resto para as mensagens amigáveis partilhadas.
- `isPublicAppointmentNotEditableFailure()` compara com a mensagem única do backend. O `AppError` público não transporta `code`, logo não há outro sinal fiável.
- `getPublicAppointmentPeriod()` formata "15:30 – 16:00" no fuso da aplicação.
- `toPublicAvatarImage()` adapta o `avatarUrl` (só URL, nunca `publicId`) para o `ImageAvatar` que já existe; sem avatar devolve `null` e o componente mostra as iniciais.

### 1.4 Componentes

Todos em `client/src/components/public/`, sem dependência de Redux e sem acesso ao token:

- `PublicAppointmentSummary` — data, período, estado, serviço, profissional e `ImageAvatar` com iniciais como fallback. Recebe só o `PublicAppointment`.
- `PublicAppointmentEditForm` — `<textarea>` nativo de observações com `maxLength`, contador de caracteres restantes, nota explicativa sobre o limite do contrato, `form` com `aria-label`, foco recebido ao abrir e submissão bloqueada enquanto o campo não é tocado ou durante o `PATCH`.
- `PublicAppointmentCancelDialog` — modal próprio, com o mesmo markup de `DeleteAppointmentModal`: `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`, foco inicial no botão de dispensar (a ação destrutiva nunca é o foco inicial), `Escape` para fechar e resumo do agendamento dentro da caixa, para se confirmar o atendimento certo. Os controlos ficam desativados durante o `DELETE`, pelo que a caixa não fecha a meio do pedido.

### 1.5 Página

`client/src/pages/public/PublicAppointmentPage.tsx` (novo)

- Estados: `loading`, `not_found`, `rate_limited`, `error` (com retry), `loaded`, `editing`, `saving`, `cancelling`.
- `loadAppointment` só corre com token; um `200` sem `data` é tratado como resposta inválida em vez de desenhar uma página meio vazia.
- Sem update otimista: `setAppointment(response.data)` nas duas escritas, e o estado final (`cancelled`) vem do servidor.
- `handleSave` e `handleConfirmCancel` não fazem nada sem token; ambos tratam `!response.data` e ambos bloqueiam a interface quando a recusa é a de "já não é alterável".
- `closeCancelDialog` ignora pedidos de fecho durante o `DELETE`.
- Accessibility: um único `main`, `role="status"` para carregamento e sucesso, `role="alert"` para erros e foco movido para o formulário quando a edição substitui o resumo. O diálogo não prende o foco nem o devolve ao fechar — ver §4.

### 1.6 Rotas

`client/src/routes/AppRoutes.tsx`

```tsx
<Route path="/agendar" element={<PublicAppointmentPage />} />
<Route path="/agendar/:token" element={<PublicAppointmentPage />} />
```

`/agendar` sem token existe para não cair no `*` (que redireciona para `/` ou `/login`) e dar um erro útil. A página fica **fora** de `AppLayout` e de qualquer guarda.

### 1.7 Estilos

`client/src/index.css`

- Novo bloco "Página pública do agendamento": `.public-shell`, `.public-brand`, `.public-content`, `.public-layout`, `.public-context`, `.public-context-list`, `.public-footer`, `.public-summary`, `.public-summary-compact`, `.public-appointment-actions` e `.public-form-note`.
- Mobile-first: resumo e ações empilhados por omissão; a partir de `480px` o resumo passa a duas colunas (rótulo/valor) e as ações a uma linha com alvos de toque confortáveis. Abaixo de `768px` o `.public-layout` deixa de ser lado a lado e a coluna de contexto passa a centralizada por cima do cartão.
- Sem media queries novas para ecrãs grandes: a coluna de contexto só aparece quando há largura para as duas.

## 2. VERIFICAÇÃO

| Comando | Resultado |
|---|---|
| `npm test` | **1050/1054**, 96 ficheiros — 4 falhas **pré-existentes** (ver abaixo) |
| `npm run typecheck` | sem erros |
| `npm run build` | sem erros (Vite 7.3.6, 210 módulos) |
| `npm run test:coverage` | **96.48%** statements, **91.23%** branches, **97.02%** functions, **96.65%** lines |

Cobertura dos ficheiros novos:

| Ficheiro | Statements | Branches | Functions |
|---|---|---|---|
| `pages/public/PublicAppointmentPage.tsx` | 96.66% | 93.75% | 100% |
| `components/public/*` (3 ficheiros) | 100% | 100% | 100% |
| `config/publicAppointment.ts` | 100% | 100% | 100% |
| `api/endpoints/publicAppointments.api.ts` | 100% | 100% | 100% |
| `routes/AppRoutes.tsx` | 100% | 100% | 100% |

Os três ramos que faltam na página são guardas defensivas inalcançáveis pela interface: `if (!token)` em `handleSave` e `handleConfirmCancel` (as ações só existem depois de um `GET` com token) e `if (isCancelling)` em `closeCancelDialog` (o diálogo já não chama `onClose` nesse estado). Escrever testes para as atingir seria fabricar caminhos que ninguém pode percorrer.

**Testes novos: 109** (103 em 6 ficheiros novos + 6 em `AppRoutes.test.tsx`)

| Ficheiro | Testes |
|---|---|
| `pages/public/PublicAppointmentPage.test.tsx` | 39 |
| `config/publicAppointment.test.ts` | 27 |
| `components/public/PublicAppointmentEditForm.test.tsx` | 13 |
| `components/public/PublicAppointmentCancelDialog.test.tsx` | 12 |
| `components/public/PublicAppointmentSummary.test.tsx` | 7 |
| `api/endpoints/publicAppointments.api.test.ts` | 5 |
| `routes/AppRoutes.test.tsx` (bloco novo) | 6 |

A página é testada **sem** `Provider` de Redux, com `localStorage` e `sessionStorage` limpos antes de cada caso. Se alguma coisa dependesse da sessão autenticada ou do store, os testes rebentavam. O bloco de rotas confirma que a página abre com a sessão a inicializar, sem sessão e com sessão administrativa aberta, sem redirecionar para o login e sem `.app-sidebar`/`.app-navbar`.

**As 4 falhas são as mesmas de antes desta etapa** e não foram introduzidas aqui:

- `src/pages/dashboard/DashboardPage.test.tsx` (2)
- `src/pages/reports/ReportsPage.test.tsx` (2)

São dependentes de data (fixtures com períodos fixos que já não são o período corrente). `npx vitest run src/pages/dashboard src/pages/reports` reproduz as mesmas falhas sem qualquer código novo envolvido. Ficam registadas, não corrigidas, para não misturar uma reparação alheia a esta parte.

Durante uma execução completa, `src/pages/company/CompanyPage.test.tsx > renders the company data and the edit form for OWNER` falhou uma vez e passou nas execuções seguintes, incluindo isoladamente. É instabilidade sob carga paralela, não uma regressão: nenhum ficheiro dessa página foi tocado.

`git status` confirma que a etapa só escreveu em `client/`: `server/` está intacto.

## 3. DECISÕES E ALTERNATIVAS DESCARTADAS

**Edição só de observações, apesar de o `PATCH` aceitar `serviceId`, `employeeId` e `startAt`.** O backend valida estes campos, mas não existe nenhuma rota pública segura para os obter: os catálogos de serviços, profissionais e disponibilidade exigem autenticação, e `GET /public/appointments/:token` só devolve os *ids* atuais. Oferecer seletores alimentados por dados autenticados seria expor catálogo e agenda a quem não tem conta; oferecer um campo de texto livre para `startAt` devolveria 400 de disponibilidade quase sempre. Fica por fazer, não por decisão de produto: ver §5.

**`notes` não é apagado ao abrir e fechar o formulário.** O `GET` não devolve as observações. O `PATCH` só é enviado depois de o campo ser tocado, e o botão fica desativado até lá. Sem esta distinção, um simples "ver" do formulário apagaria o que o cliente tinha escrito.

**O formulário não mostra as observações existentes, e a página não diz que existem.** Como o contrato não as traz, mostrar um campo vazio sem explicação seria enganador. A nota explicativa dentro do formulário diz explicitamente o que vai ser alterado.

**Detecção de "já não é alterável" por comparação de mensagem.** O `AppError` público não transporta `code`. A alternativa era não bloquear nada e confiar só no estado local, o que deixaria a pessoa a tentar guardar e a receber 400 em loop. A comparação é com a constante única do backend, e o botão desaparece na mesma.

**`404` sem botão "Tentar novamente".** O backend devolve o mesmo 404 para token malformado, inexistente e agendamento eliminado. Repetir a chamada é garantidamente inútil e só faria a página parecer instável.

**`429` com mensagem própria e sem retry imediato.** O limitador é por IP e partilhado, por isso a mensagem fala em "tentativas" e em minutos — a unidade que o utilizador pode corrigir. Um retry imediato desperdiçaria quota.

**Sem update otimista.** Mostrar o novo horário antes de o servidor confirmar diria ao cliente que a marcação está feita quando pode não estar. A resposta é a fonte de verdade nas duas escritas.

**Estado local, sem Redux.** O formulário e o diálogo são efémeros e pertencem a uma página sem sessão. Um slice para isto daria ações que ninguém subscreve e estado que morre com a página.

**`ImageAvatar` com `publicId` vazio em vez de um tipo novo.** A resposta pública só transporta a URL; `publicId` nunca sai do backend num pedido público. Um tipo só-URL duplicaria um componente já existente.

**Fuso de `appointmentTime.ts` em vez de `toLocaleString` com o fuso do browser.** O resto da aplicação formata horários no fuso da empresa. Um agendamento lido em Lisboa tinha de aparecer à mesma hora em Nova Iorque.

**`/agendar` como rota explícita em vez de confiar no `*`.** O `*` redireciona para `/` ou `/login`; quem abrir `/agendar` por engano receberia um ecrã de login sem explicação.

## 4. LIMITES CONHECIDOS

- **Não é possível remarcar, trocar serviço ou trocar profissional pela página.** O contrato público não expõe catálogos nem disponibilidade. Só as observações podem ser alteradas. O `PATCH` do backend suporta o resto.
- **As observações existentes não são mostradas.** Falta `notes` no `GET` público. O risco de perda está mitigado (só se envia depois de tocar no campo), mas quem abriu o link não consegue ler o que escreveu antes.
- **O fuso é o da aplicação (`Europe/Lisbon`), não o da empresa.** O `GET` público não devolve o timezone da empresa. É a mesma constante usada por toda a aplicação, mas numa empresa noutro fuso o horário mostrado pode estar errado.
- **Uma empresa noutro fuso vê o mesmo problema** que o ponto anterior, e a página não tem como corrigir.
- **O `400` "já não é alterável" é reconhecido por texto.** Se a mensagem do backend mudar, o frontend volta a não bloquear o formulário. Não há `code` público para usar.
- **A elegibilidade é calculada no browser.** Um relógio adulterado mostra botões que o servidor vai recusar. É uma dica de interface, não autorização; o servidor é a autoridade.
- **O diálogo de cancelamento não prende o foco nem o devolve ao fechar.** Quem fechar com `Escape` ou em "Manter agendamento" perde o foco e tem de percorrer a página de novo com `Tab`. Não foi corrigido aqui para não divergir de `DeleteAppointmentModal` e dos restantes modais da aplicação, que têm o mesmo comportamento. Fica como melhoria transversal.
- **O layout de ecrã largo não foi verificado num browser real.** As regras CSS estão escritas para as duas colunas abaixo/above de `768px`, mas a validação desta etapa foi feita por teste e por leitura, não visualmente.
- **O token continua sem expirar nem revogação** (herdado da Parte 2) e a página não acrescenta nada a esse problema: só o link dá acesso.
- **Nenhum envio do link por e-mail/SMS/WhatsApp.** Continua a ser entregue apenas na resposta da criação.
- **O `SessionBootstrap` da raiz continua a ser executado** quando alguém abre `/agendar/:token`. A página não depende dele e não chama `/auth/me`, mas o `GET /auth/me` da aplicação ainda sai no arranque do bundle. Para o eliminar era preciso separar o bootstrap por grupo de rotas — alteração de infraestrutura fora do âmbito desta parte.
- **Não há e-mail de confirmação de cancelamento nem registo de auditoria no frontend.** O cancelamento é refletido apenas pelo estado devolvido pelo servidor.
- As 4 falhas pré-existentes em `DashboardPage`/`ReportsPage` continuam abertas.

## 5. O QUE ESTÁ PRONTO PARA A PRÓXIMA ETAPA

O caminho do cliente final está fechado de ponta a ponta: marca, recebe o link, abre `/agendar/:token`, consulta, deixa observações e cancela.

Contrações que a próxima etapa pode quebrar, por ordem de utilidade:

1. **`notes` no `GET` público.** Uma linha no mapper resolve o maior limite de UX desta parte: mostrar as observações existentes e distinguir "não alteradas" de "alteradas". Continua a ser seguro (o `PATCH` público já aceita `notes`) e não expõe `clientEmail`/`clientPhone`.
2. **Timezone da empresa no `GET` público.** O mesmo raciocínio: `company.timezone` no payload público permite `formatAppointmentTime(..., timezone)` e corrige empresas fora de `Europe/Lisbon`.
3. **Um `code` estável no erro público de "não alterável".** Substitui a comparação de mensagem por contrato, sem expor nada de empresa.
4. **Rotas públicas de leitura de catálogo e disponibilidade** (serviços ativos, profissionais e slots livres por data), se se quiser remarcar pela página. Devem ser deliberadamente limitadas ao que a criação pública já aceita e sujeito ao mesmo limitador por IP.
5. **Envio do link** por e-mail reutilizando o `NotificationDispatcher`, com decisão explícita sobre o telefone que hoje não é persistido.
6. **Revogação/regeneração** do link, com validade e um `POST` autenticado que regenere o hash.
7. **`Appointment.source`** (`public`/`admin`), agora distinguível sem ambiguidade pelo token.
8. **Foco preso e devolvido nos modais**, transversal a toda a aplicação (`PublicAppointmentCancelDialog`, `DeleteAppointmentModal` e restantes).
9. **Reparar as 4 falhas pré-existentes** de `DashboardPage`/`ReportsPage`, numa etapa própria para não misturar com esta.