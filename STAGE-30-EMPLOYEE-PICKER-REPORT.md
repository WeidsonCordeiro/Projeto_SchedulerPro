# STAGE 30 — PARTE 6: Identificação visual do profissional no agendamento

> Relatório da Parte 6 (identificação visual do profissional na seleção de
> funcionário para agendamento). Continuação de `STAGE-30-IMAGES-REPORT.md`
> (Partes 1–5: infraestrutura de imagens no backend e no frontend).

---

## Objetivo

Permitir que quem agenda reconheça **visualmente** o profissional antes de o
escolher, substituindo a lista textual: cada opção passa a mostrar a **foto**
(`ImageAvatar`), o **nome** e um **estado de seleção claro**, mantendo
integralmente a lógica de seleção, de validação e de envio.

Restrições herdadas: apenas frontend; backend congelado; sem alterar regras de
negócio; reutilizar `ImageAvatar` e o contrato `avatar?: StoredImage | null`.

---

## Contexto

### O fluxo de agendamento do Portal do Cliente não existe

O pedido partia do pressuposto de um fluxo de agendamento no **Portal do
Cliente** com uma etapa de escolha de profissional. **Esse fluxo não existe
neste código.** A auditoria anterior à implementação encontrou:

- `client/src/pages/portal/` contém apenas `PortalHomePage`,
  `PortalAppointmentsPage` e `PortalProfilePage` — todos **apenas de leitura**
  (próximos agendamentos, lista/filtro dos seus agendamentos, perfil).
- `client/src/config/menu.ts:10-24` — o menu do `CLIENT` só tem "Início",
  "Meus agendamentos" e "Perfil". Não existe entrada "Agendar".
- `client/src/routes/AppRoutes.tsx:50-52` — só `/portal`,
  `/portal/agendamentos`, `/portal/perfil`.
- Não existe `client/src/components/portal/`; `grep wizard` → 0 ocorrências;
  não existe estado `step` em nenhum `.tsx`.
- O backend só expõe, para `CLIENT`, `GET /appointments/mine`
  (`AppointmentRoutes.ts:99`). Não existe endpoint de criação para o portal.

### Um agendamento pelo portal é impossível sem mexer no backend

`server/src/constants/rbac.ts` dá a `Role.CLIENT` **uma única** permissão:
`APPOINTMENT_READ`. Todas as leituras de que um fluxo de agendamento precisa
estãovedadas ao `CLIENT`:

| Necessidade | Endpoint | Guarda | `CLIENT` |
|---|---|---|---|
| Listar profissionais (com `avatar`) | `GET /users` | `USER_READ` | negado |
| Listar serviços | `GET /services` | `SERVICE_READ` | negado |
| Ler disponibilidade/horários | `GET /availability` | `AVAILABILITY_READ` | negado |
| Criar o agendamento | `POST /appointments` | `APPOINTMENT_CREATE` | negado |

Não existe rota pública nem não autenticada: `server/src/routes/index.ts`
monta todos os módulos sob `/api` e cada rota passa por
`AuthMiddleware.authenticate`. Além disso, a projeção de `/mine` devolve
apenas `employeeName` (`AppointmentService.ts:339`) — o tipo
`PortalAppointment` (`client/src/types/appointment.ts:61-64`) não tem
`avatar`.

Consequência: mesmo uma página de portal apenas com "identificação visual"
seria impossível — não há fonte de dados autorizada nem forma de obter a foto
do profissional.

### O único ponto de seleção que existe

O único sítio do codebase onde um profissional é escolhido para um agendamento é
o `<select>` nativo dentro do modal administrativo:

- `client/src/components/appointments/AppointmentForm.tsx:471-493`
  (rótulo "Funcionário", `onChange` inline → `setEmployeeId`)
- Lista, vinda de `AppointmentsPage.tsx:166-178` (`employeesApi.getEmployees()`,
  estado local `AppointmentsPage.tsx:90`), já filtrada por
  `employee.role !== "CLIENT"` em `AppointmentForm.tsx:201-209`
  (`employeeOptions`).

**Decisão tomada com o utilizador:** o backend permanece congelado e a
identificação visual foi implementada **nesse** ponto de seleção real (o mesmo
controlador serve o portal, porque `AppointmentForm` é o único caminho de
criação de agendamento existente). Construir a página de portal do zero foi
descartado por depender de endpoints que o `CLIENT` não pode chamar.

---

## Implementação realizada

### 1. Novo componente `EmployeeAvatarPicker`

`client/src/components/appointments/EmployeeAvatarPicker.tsx` (150 linhas).
Substitui o `<select>` nativo — que, por natureza, **não permite mostrar
imagens** — por cartões selecionáveis.

- `role="radiogroup"` no contentor; cada cartão é um `<button role="radio">`.
- Cada cartão mostra `ImageAvatar` (`size="md"`, `shape="circle"`) com
  `image={employee.avatar}` e `name={employee.name}`, `alt=""` (decorativa,
  porque o nome é apresentado em texto ao lado — exatamente a convenção já
  usada em `EmployeesPage.tsx:218` e `ClientsPage.tsx:177` com
  `.person-cell`).
- Nome em texto dentro de `.employee-option-name`.
- Quando `employee.role === "CLIENT"` (o caso "sem perfil de funcionário" que o
  `<select>` já suportava), o texto `(sem perfil de funcionário)` aparece em
  `.employee-option-hint`.
- Estado selecionado: classe `.is-selected` **e** um selo `✓` circular
  (`.employee-option-check`, `aria-hidden`), **e** `aria-checked="true"`.
 Ou seja, o estado selecionado **não** depende apenas da cor.
- Lista vazia → `Nenhum funcionário disponível.` em vez de um grupo vazio.
- Componente **sem regras de negócio**: recebe a lista já filtrada, não faz
  pedidos e não conhece a API. A seleção continua um único valor controlado
  (`value` / `onChange`).

### 2. Navegação por teclado (padrão ARIA radiogroup com tabindex rotativo)

- Só o cartão selecionado entra no `Tab`; sem seleção, o primeiro assume o
  papel, para não existir um beco sem saída na navegação por teclado.
- `ArrowRight` / `ArrowDown` → próximo; `ArrowLeft` / `ArrowUp` → anterior;
  `Home` / `End` → primeiro / último; **com wrap nas duas pontas**.
- A navegação move o foco **e** seleciona, e o `preventDefault()` impede o
  scroll da página.
- `disabled` anula a navegação por teclado (consistente com o `<select disabled>`
  anterior).

### 3. Integração em `AppointmentForm`

`AppointmentForm.tsx:471-489` — o bloco `<label>` + `<select>` passou a
`<span id="appointment-employee-label">` + `<EmployeeAvatarPicker>`:

```tsx
<span id="appointment-employee-label" className="form-label d-block">
  Funcionário
</span>
<EmployeeAvatarPicker
  employees={employeeOptions}
  value={employeeId}
  onChange={setEmployeeId}
  disabled={readOnlyView}
  invalid={Boolean(fieldErrors.employeeId)}
  label="Funcionário"
  labelId="appointment-employee-label"
  describedById={fieldErrors.employeeId ? "appointment-employee-error" : undefined}
/>
{fieldErrors.employeeId && (
  <div id="appointment-employee-error" className="invalid-feedback">
    {fieldErrors.employeeId}
  </div>
)}
```

O `<label htmlFor>` passou a `<span>` porque não existe um `<form>` control
associado: o rótulo é ligado ao grupo por `aria-labelledby`, o mesmo padrão já
usado no bloco "Agenda do funcionário" (`<span className="form-label d-block">`).
A mensagem de erro continua a ser `invalid-feedback` (agora com `id`), para
que o padrão Bootstrap `.is-invalid ~ .invalid-feedback` continue a mostrar a
mensagem — `.is-invalid` passou para o contentor do radiogroup.

**Nada de lógica foi movida nem alterada:** `employeeOptions` (filtro
`role !== "CLIENT"` + `includeCurrent`), `validate()`, `errors.employeeId`,
`setEmployeeId`, o `useEffect` que recarrega a disponibilidade e limpa
data/horário, `slotsForDay` e o payload de criação/edição continuam
exatamente como estavam. O `setEmployeeId` é passado diretamente como
`onChange`.

### 4. CSS

`client/src/index.css`, nova secção final "Seleção de funcionário (cartões com
avatar)" (90 linhas), com `grid`, cartões, foco, estado selecionado e o selo.

---

## Arquivos alterados

**Criados (2):**

| Ficheiro | Linhas | Papel |
|---|---|---|
| `client/src/components/appointments/EmployeeAvatarPicker.tsx` | 150 | Componente de seleção por cartões |
| `client/src/components/appointments/EmployeeAvatarPicker.test.tsx` | 285 | 21 testes do componente |

**Alterados (4):**

| Ficheiro | ± | Motivo |
|---|---|---|
| `client/src/components/appointments/AppointmentForm.tsx` | +18 −14 | Integração do picker; import |
| `client/src/index.css` | +90 | Secção de CSS dos cartões |
| `client/src/components/appointments/AppointmentForm.test.tsx` | +120 −29 | 12 pontos de interação + 2 afirmações acoplados ao `<select>`; + 4 testes novos |
| `client/src/pages/appointments/AppointmentsPage.test.tsx` | +4 −8 | 2 pontos de interação acoplados ao `<select>` |

Nenhum ficheiro em `server/`. Nenhuma dependência adicionada (continua a não
existir biblioteca de ícones; o selo `✓` é um carácter Unicode dentro de um
`span aria-hidden`, como já acontece em `Navbar.tsx:50`).

---

## Componentes reutilizados

| Reutilizado | Como |
|---|---|
| `ImageAvatar` (`components/common/ImageAvatar.tsx`) | Reutilizado **sem alterações**. Fornece foto, `object-fit: cover`, iniciais, `onError` com queda permanente para o placeholder, e `role="img"`/`aria-label`/`aria-hidden` coerentes |
| `StoredImage` (`types/image.ts`) | Contrato `{ url, publicId }` consumido diretamente; `Employee.avatar` não foi tocado |
| Convenções `.entity-avatar*` | Tamanhos/formatos existentes (`md`, `circle`) |
| Convenção `person-cell` / `alt=""` | O mesmo par avatar decorativo + nome textual das tabelas de funcionários e clientes |
| `visually-hidden` / padrão `aria-hidden` + texto | Bootstrap 5 já usado no projeto; nenhum padrão de acessibilidade novo inventado |
| `role="radiogroup"` + `aria-pressed` | `AvailableTimeSlots.tsx:27-41` já usava `aria-pressed` para estado selecionado; aqui a semântica correta é `aria-checked` |
| Variáveis CSS `--sp-*` | `index.css:12-21` |

Não foi criado nenhum segundo componente de avatar, nem uploader, nem
qualquer lógica de imagem nova.

---

## Comportamento funcional

- O `GET /users` já devolvia `avatar` (Parte 1/5); nenhuma chamada nova.
- Escolher um cartão chama `setEmployeeId(id)` — exatamente o que o `<select>`
  fazia. Consequências preservadas: recarrega a disponibilidade para o novo
  funcionário, **limpa data e horário** e remove o chip de "horário atual" na
  edição.
- `includeCurrent` continua a manter visível o funcionário do agendamento em
  edição, mesmo que tenha sido desativado.
- O texto `(sem perfil de funcionário)` continua a identificar utilizadores
  sem perfil de funcionário.
- `readOnlyView` (agendamento histórico) continua a desativar o campo — agora
  os cartões ficam `disabled`.
- Validação e payload de criação/edição inalterados; a mensagem
  "O funcionário é obrigatório." continua a ser exibida e agora está associada
  ao grupo por `aria-describedby`.

---

## Responsividade

- `grid-template-columns: repeat(auto-fill, minmax(min(13rem, 100%), 1fr))` —
  o `min()` é essential: sem ele, uma coluna mínima de `13rem` (208px)
  transbordaria num contentor mais estreito. Com `min(13rem, 100%)` a coluna
  nunca excede a largura disponível, portanto **não há overflow horizontal**,
  nem a ~390px, nem em contentores muito estreitos.
- ~390px: conteúdo útil do modal ≈ 350px → **1 coluna** (2 × 208px + gap não
  cabem), cartão confortável a largura inteiro.
- 768px: 3 colunas.
- Desktop: 3–4 colunas.
- `.entity-avatar-md` (3.25rem) dentro de `.employee-option { min-height: 4rem;
  padding: 0.6rem 0.75rem }` — a foto define a altura final (~4.45rem), sem
  corte. `object-fit: cover` impede deformação.
- `.employee-option-text { min-width: 0 }` + `overflow-wrap: anywhere` em
  `.employee-option-name`: nomes longos quebram em vez de empurrar o cartão
  (mesma razão do comentário já existente em `.person-cell`).
- `text-align: left` para o texto do cartão não ficar centrado.

---

## Acessibilidade

- `role="radiogroup"` + `aria-labelledby` (ou `aria-label` quando não há
  elemento de rótulo), `aria-describedby` para o erro e `aria-invalid="true"`.
- `role="radio"` + `aria-checked` em cada cartão — o estado selecionado é
  anunciado por leitores de ecrã, e **não** só pela cor.
- O nome acessível é fixado por `aria-label` com `optionLabel(employee)`, para
  que **não mude** quando o selo `✓` entra no DOM. O texto visível
  (nome + dica) coincide com esse nome.
- A imagem é decorativa (`alt=""`), porque o nome já está em texto: evita
  anúncio duplicado.
- Tabindex rotativo + navegação por setas/Home/End com wrap, `preventDefault()`
  para não hacer scroll, e foco movido para o cartão destino.
- `:focus-visible` com `border-color` + `box-shadow` (anel de foco visível), e
  `outline: 2px solid transparent` para não acumular com o contorno do UA.
- Estado selecionado redundante em três canais: **borda mais espessa +
  sombra**, **fundo distinto** e **selo `✓` visível** — cumpre
  "percebido sem depender apenas da cor".
- Alvo de toque: `min-height: 4rem` (64px), acima dos 44px recomendados.

---

## Testes

### Componente — `EmployeeAvatarPicker.test.tsx`, 21 testes, 21/21 ✅

| Grupo | Casos |
|---|---|
| Foto / fallback | mostra a foto de quem tem avatar (e `alt=""`); iniciais quando não há foto; **iniciais quando a foto falha ao carregar**; nome de todos os profissionais |
| Seleção | marca o escolhido (`aria-checked` + `is-selected` + `✓`); estado **sem depender só da cor**; `onChange` com o id certo; nome acessível estável com/sem seleção |
| Rótulo / erro | `aria-labelledby` + `aria-describedby` + `aria-invalid` + `is-invalid`; `aria-label` quando não há elemento de rótulo |
| Teclado | tabindex só no selecionado; primeiro cartão tabbável sem seleção; `ArrowRight`, `ArrowLeft`, wrap nas duas pontas, `Home`, `End`, tecla não relacionada ignorada, `disabled` anula |
| Estados | utilizadores sem perfil sinalizados; lista vazia com mensagem |

### Integração — `AppointmentForm.test.tsx`, +4 testes (22/22 no ficheiro)

Novo bloco `describe("identificação visual do funcionário")`:
1. mostra a foto e o nome de quem vai fazer o serviço, e iniciais no cartão
   sem foto;
2. marca o escolhido como selecionado (`aria-checked` + `✓`);
3. mantém o funcionário pré-preenchido (`initialEmployeeId` do quick-create do
   calendário) marcado como selecionado;
4. desativa os cartões na visualização somente leitura.

### Testes existentes atualizados (nenhuma regra de negócio alterada)

O `<select>` foi substituído, e os testes estavam **acoplados à implementação**
(`fireEvent.change` no elemento e `getByRole("option")`). Foram atualizados
**apenas os pontos de interação**, mantendo todas as afirmações sobre
comportamento de negócio:

| Ficheiro | Alteração |
|---|---|
| `AppointmentForm.test.tsx` | Helper `selectEmployeeAndWaitForCalendar(employeeId, …)` → `(name, …)`, com `fireEvent.click` no cartão (5 chamadas); 6 `fireEvent.change(getByLabelText("Funcionário"), { target: { value } })` → `fireEvent.click(getEmployeeOption(dialog, "Ana Lima"))`; `toHaveValue("employee1")` → `toHaveAttribute("aria-checked", "true")`; `queryByRole("option", { name: "Usuário Cliente" })` → `queryByRole("radio", { name: "Usuário Cliente (sem perfil de funcionário)" })` |
| `AppointmentsPage.test.tsx` | 2 × `fireEvent.change(...)` → `fireEvent.click(within(dialog).getByRole("radio", { name: "Ana Lima" }))` |

A negativa de `Usuário Cliente` foi **reforçada** (nome completo e papel
correto), não afrouxada. Nenhum teste foi removido, pulado ou isolado. Todas as
afirmações de negócio continuam intactas: payload de criação, 409, conflitos,
recarga de disponibilidade, limpeza de data/horário, quick-create, edição com
valores pré-preenchidos, `getEmployeeAvailabilities` chamado com o id certo.

### Suíte completa

- `npm test` → **945 testes, 943 aprovados, 2 falhados** (90 ficheiros).
- As 2 falhas são as **pré-existentes** de `DashboardPage.test.tsx`
  (linhas 216 e 295), idênticas ao baseline da Parte 5. **Zero regressões.**
- `npx vitest run src/components/appointments/` → **83/83** ✅

---

## Coverage

`EmployeeAvatarPicker.tsx` (comando dirigido):

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| **100%** (25/25) | **100%** (36/36) | **100%** (7/7) | **100%** (25/25) |

Global do projeto (`npm run test:coverage -- --coverage.reportOnFailure`):

| Métrica | Parte 5 | Parte 6 |
|---|---|---|
| Statements | 96.24% | **96.30%** |
| Branches | 90.29% | **90.69%** |
| Functions | 96.56% | **96.59%** |
| Lines | 96.42% | **96.48%** |

Durante o trabalho, duas ramas mortas foram removidas do componente para não
deixar ramos inalcançáveis: a guarda `employees.length === 0` em
`handleKeyDown` (inalcançável, porque a lista vazia não renderiza botões) e a
falta de cobertura do wrap para a frente (`ArrowRight` a partir do último
profissional), que passou a ter teste próprio.

---

## Typecheck

`npm run typecheck` (`tsc -b --noEmit`) → **PASS**, sem erros.

---

## Build

`npm run build` (`tsc -b && vite build`) → **PASS**.
202 módulos; `index.css` 253.63 kB (gzip 35.85 kB); `index.js` 545.58 kB
(gzip 162.10 kB). O aviso de *chunk > 500 kB* é pré-existente e não está
relacionado com esta parte.

---

## Testes manuais recomendados

Não foi possível executar um navegador real nesta sessão; o que se segue deve
ser validado visualmente. Cobertura automatizada **não** substitui estes
pontos (o jsdom não aplica o CSS do Bootstrap).

1. **Abrir "Novo agendamento"** e confirmar que os funcionários aparecem como
   cartões com foto; quem não tem foto mostra as iniciais.
2. **Selecionar** um cartão: fundo, borda espessa e selo `✓` devem mudar; o
   calendário de disponibilidade deve carregar para esse profissional; ao
   trocar de profissional, a data/hora escolhidas devem ser limpas.
3. **Perfil sem foto** e **perfil sem foto mas com `avatar` com URL quebrada**:
   deve cair para as iniciais, sem ficar a recarregar.
4. **Enviar vazio** e confirmar que "O funcionário é obrigatório." aparece
   **visível** logo abaixo dos cartões (validar o par
   `.employee-picker.is-invalid` + `.invalid-feedback` do Bootstrap) e que o
   contorno vermelho do grupo aparece.
5. **Teclado apenas**: `Tab` até ao grupo (entra só o cartão selecionado),
   setas para mover e selecionar, `Home`/`End`, wrap nas pontas; confirmar que
   a página **não** faz scroll com as setas e que o foco é sempre visível.
6. **Leitor de ecrã** (NVDA/VoiceOver): o grupo anuncia "Funcionário", 3
   cartões, o selecionado como "checked" e o erro associado.
7. **Responsividade**: redimensionar para 390px, 768px e desktop; confirmar 1 /
   3 / 3–4 colunas, sem scroll horizontal, sem nomes cortados, fotos não
   deformadas.
8. **Ecrã muito estreito** (ex.: 320px ou sidebar reduzida): sem transbordo.
9. **Edição de agendamento** e **agendamento histórico (read-only)**: cartão
   certo marcado; no histórico, todos desativados e nenhum clique com efeito.
10. **Quick-create pelo calendário**: clicar num slot de funcionário abre o
    formulário já com o cartão correspondente selecionado.
11. Verificar a lista de **usuários sem perfil de funcionário** (papel `CLIENT`)
    numa empresa que os tenha: a dica `(sem perfil de funcionário)` deve
    continuar legível.

---

## Decisões técnicas

1. **Cartões com `role="radio"` em vez de `<select>`.** Um `<select>` nativo
   não pode apresentar imagens; o objetivo da parte é precisamente mostrar a
   foto por opção. Um `radiogroup` é também a semântica correta para
   "escolher exatamente um de vários".
2. **Componente extraído em vez de JSX inline.** `AppointmentForm.tsx` já tem
   663 linhas e a lógica de teclado/foco não é trivial; extrair dá um
   componente testável isoladamente e deixa o formulário legível. É
   consistente com `AvailableTimeSlots.tsx`, o outro bloco extraído desta
   página.
3. **`aria-label` explícito no cartão.** Sem ele, o nome acessível passaria a
   incluir o `✓` quando o cartão estivesse selecionado, o que tornaria o nome
   instável e impossible de localizar de forma fiável (em testes e em leitores
   de ecrã).
4. **`alt=""` na imagem.** O nome está em texto imediatamente ao lado; a foto é
   decorativa. É a convenção já adotada em `EmployeesPage.tsx` e
   `ClientsPage.tsx`, e evita anúncio duplicado.
5. **Tabindex rotativo.** Sem ele, os N cartões entrariam todos no `Tab`,
   tornando a navegação longa e fora do padrão ARIA.
6. **`<span>` + `aria-labelledby` em vez de `<label htmlFor>`.** Não existe um
   `<select>`/`<input>` a associar; o padrão já usado no bloco "Agenda do
   funcionário" foi replicado.
7. **`min()` no `minmax()` do grid.** É o que garante ausência de overflow
   horizontal em ecrãs estreitos; sem ele o `minmax(13rem, 1fr)` transbordaria.
8. **Testes existentes atualizados em vez de contornados.** Estavam acoplados
   ao widget substituído. Preferiu-se mudar a *interação* e preservar todas as
   *afirmações de negócio*, em vez de manter um `<select>` invisível para
   satisfazer os testes — o que teria deixado dois controlos para o mesmo
   valor. Registado explicitamente aqui por ser a única alteração a testes
   anteriores.
9. **Sem biblioteca de ícones.** O selo `✓` é um carácter Unicode num `span`
   `aria-hidden`, exatamente como o `☰` em `Navbar.tsx:50`.
10. **Mensagem para lista vazia.** Um `radiogroup` sem opções é silencioso para
    o utilizador; a mensagem evita um bloco vazio inexplicável.

---

## Limitações

- **Não existe (e não foi criado) um fluxo de agendamento no Portal do
  Cliente.** Esta parte melhorou o único ponto de seleção existente, que é
  administrativo. Um portal de auto-agendamento exige backend novo.
- O `CLIENT` continua **sem** acesso a `GET /users`, `GET /services`,
  `GET /availability` e `POST /appointments`; logo, um cliente do portal
  continua a não poder agendar sozinho.
- A foto depende de o `Employee.avatar` vir preenchido; o backend já o devolve,
  mas perfis sem foto mostram sempre iniciais.
- Nenhuma compressão/otimização de imagem no cliente, sem upload/edição/
  remoção/crop/lightbox (fora do âmbito desta parte).
- O `object-fit: cover` corta a imagem; não há escolha de enquadramento.
- Sem medidor automático de acessibilidade (axe/Lighthouse); a validação de
  contraste e de foco foi feita por leitura do CSS.
- A seleção continua a ser de **funcionário**, não de cliente/serviço; cliente e
  serviço mantêm `<select>`.
- A lista de funcionários é carregada de uma só vez e todos os cartões são
  renderizados; com dezenas/centenas de funcionários o modal ficaria longo
  (não há pesquisa nem paginação — fora do âmbito).
- Nenhuma métrica de analytics sobre a escolha de profissional.

---

## Problemas preexistentes encontrados

1. **`DashboardPage.test.tsx` — 2 falhas determinísticas (NÃO corrigidas).**
   `cardValues()` espera 6 valores e recebe 3, em
   - `DashboardPage.test.tsx:216` → esperado `["1","2","1","1","1","1"]`, recebido `["1","2","1"]`
   - `DashboardPage.test.tsx:295` → esperado `["0","0","0","1","1","1"]`, recebido `["0","0","0"]`

   Desalinhamento entre teste e componente (3 cartões de resumo em vez de 6).
   **Idêntico ao baseline da Parte 5** → não é regressão desta parte. Fora do
   âmbito: corrigi-lo é mexer em `DashboardPage`, não no agendamento.

2. **Flakes de tempo sob instrumentação de coverage** (ambiente lento; a
   suíte completa com coverage gastou ~467s só em `environment`). Numa
   execução com coverage apareceram `AppointmentForm.test.tsx > creates an
   appointment via the smart calendar…` com **"Test timed out in 5000ms"** e
   `App.test.tsx > restores an existing session…`. **Não são regressões**:
   ambos passam de forma repetida sem instrumentação — `AppointmentForm` +
   `App` correram **3/3 vezes com 24/24** isolados, e `npm test` (sem
   coverage) só falhou nos 2 casos do Dashboard. Mesmo tipo de flake de timing
   já documentado na Parte 5 em `AvailabilityPage.test.tsx`.

3. **Workers do Vitest** por vezes falham a arrancar
   ("Timeout waiting for worker to respond"), exigindo nova execução. É
   instabilidade do executor, não do código.

Nenhum foi corrigido — todos estão fora do âmbito desta parte. Nenhum foi
introduzido.

---

## O que NÃO foi alterado

- **Backend**: nenhum ficheiro em `server/`. Nenhum endpoint, rota, guarda,
  permissão, RBAC ou `RolePermissions`.
- **Regras de negócio**: `employeeOptions` (filtro `role !== "CLIENT"` e
  `includeCurrent`), `validate()`, `errors.employeeId`, recálculo de
  `slotsForDay`, `handleServiceChange`, cálculo de `startAt`/`endAt`,
  conflitos, exceções de disponibilidade, timezone, criação, edição,
  cancelamento, 409 e `onConflict`.
- **Contrato de dados**: `Employee`, `StoredImage`, `Employee.avatar`,
  `PortalAppointment`. Nenhum campo novo. Nenhum payload alterado.
- **APIs**: nenhuma chamada nova; `employeesApi.getEmployees()` continua a ser a
  única fonte. Nenhum endpoint, método ou mock novo fora dos testes.
- **Componentes reutilizados**: `ImageAvatar` usado **sem alterações**; nenhuma
  duplicação de avatar, nem uploader, nem lógica de imagem.
- **Portal do Cliente**: `PortalHomePage`, `PortalAppointmentsPage` e
  `PortalProfilePage` intactos. `menu.ts` e `AppRoutes.tsx` intactos.
- **Outras páginas**: `AppointmentsPage.tsx` (só o seu ficheiro de teste
  mudou), calendário, relatórios, clientes, empresa, serviços,
  disponibilidade, layout, `Navbar`, `Sidebar` intactos.
- **Upload/gestão de imagens**: sem upload, edição, remoção, crop, compressão
  ou drag & drop. Sem Cloudinary no frontend.
- **Dependências**: `package.json` inalterado (nenhuma biblioteca nova).
- **Testes de outros componentes**: só os dois ficheiros acoplados ao `<select>`
  foram mexidos; nenhuma outra suíte foi alterada.
- **Git**: sem `add`, `commit`, `merge`, `push` ou alteração de branches. A
  Parte 5 já estava consolidada em `55964b5` (PR #59) no início desta parte.

---

## Bloco final

```
TESTES: 943/945 (2 falhas PRÉ-EXISTENTES em DashboardPage.test.tsx:216 e :295;
        nenhuma regressão. 90 ficheiros. 25 testes novos)
        - EmployeeAvatarPicker.test.tsx: 21/21
        - AppointmentForm.test.tsx: 22/22 no ficheiro
        - src/components/appointments/: 83/83
COVERAGE: EmployeeAvatarPicker.tsx 100% stmts | 100% branches | 100% funcs |
          100% lines.  Global 96.30% stmts | 90.69% branches | 96.59% funcs |
          96.48% lines (era 96.24/90.29/96.56/96.42)
TYPECHECK: PASS (tsc -b --noEmit)
BUILD: PASS (tsc -b && vite build)
ARQUIVOS: 2 criados + 4 alterados, todos em client/ (+ este relatório)
PROBLEMAS PRÉ-EXISTENTES: DashboardPage.test.tsx (2 falhas); flakes de timeout
          de 5s sob coverage (AppointmentForm, App) e falha de arranque de
          workers do Vitest. NÃO corrigidos (fora do âmbito).
PROBLEMAS INTRODUZIDOS: nenhum
LIMITAÇÕES: não existe fluxo de agendamento no Portal do Cliente (o CLIENT não
          tem USER_READ/SERVICE_READ/AVAILABILITY_READ/APPOINTMENT_CREATE, e
          não há rota pública), logo esta parte mudou a seleção real do modal
          administrativo; sem upload/crop/lightbox; sem pesquisa/paginação;
          sem medidor automático de acessibilidade.
```

---

# CONTEXTO PARA A PRÓXIMA IA

## Estado atual

Partes 1–5 consolidadas em `55964b5` (PR #59). Esta Parte 6 **não foi
commitada**; o working tree tem apenas: 2 ficheiros novos
(`EmployeeAvatarPicker.tsx` + teste) e 4 alterados (`AppointmentForm.tsx`,
`index.css`, `AppointmentForm.test.tsx`, `AppointmentsPage.test.tsx`) + este
relatório.

## O que foi feito

A seleção de funcionário em `AppointmentForm` deixou de ser um `<select>` e
passou a ser `EmployeeAvatarPicker`: cartões `role="radio"` com
`ImageAvatar` (foto ou iniciais), nome, e estado selecionado marcado por
borda/fundo/**selo `✓`** + `aria-checked`. Tabindex rotativo com
setas/Home/End e wrap. Lógica de negócio **intocada** — só a apresentação
mudou.

## Conclusões importantes (não reabra estas questões)

1. **O Portal do Cliente é apenas de leitura e não tem agendamento.** Não
   existe wizard, rota, entrada de menu nem endpoint de criação para o portal.
2. **Um portal de auto-agendamento é tecnicamente impossível hoje**: em
   `rbac.ts`, `Role.CLIENT` só tem `APPOINTMENT_READ`. Faltam `USER_READ`
   (lista de profissionais), `SERVICE_READ`, `AVAILABILITY_READ` e
   `APPOINTMENT_CREATE`, e não há rota pública. Se alguém pedir auto-agendamento
   no portal, isso é um **backend novo** (endpoints dedicated + `clientId`
   derivado da sessão, à maneira de `/mine`), não frontend.
3. **`PortalAppointment` só tem `employeeName: string`** — mesmo a página de
   listagem do portal não consegue mostrar a foto do profissional sem o backend
   passar a devolver `employee.avatar`.
4. O `Employee.avatar` já é devolvido por `GET /users`, e `ImageAvatar` já
   funciona — a "peça" estava pronta; faltava o sítio de seleção.

## Se continuar este trabalho

- **Testes**: ao mexer na seleção, procurar `getByLabelText("Funcionário")` e
  `getByRole("option")` — já não existem; usar
  `getByRole("radio", { name: "<nome do funcionário>" })`. O nome acessível
  inclui `(sem perfil de funcionário)` para utilizadores com papel `CLIENT`.
- **Componente**: `EmployeeAvatarPicker` é apresentacional. Não lhe adicione
  fetching nem regras. Se precisar de pesquisa/paginação, o lugar é
  `AppointmentsPage` (que carrega os funcionários), não o componente.
- **CSS**: secção no fim de `index.css`; usa `--sp-*` e as classes
  `entity-avatar-*` existentes. Não introduzir uma segunda escala de avatares.
- **Não tocar** em: `server/`, `employeeOptions`, `validate()`, `StoredImage`,
  `Employee.avatar`, permissões.
- **Baseline de testes**: esperar sempre **2 falhas** em
  `DashboardPage.test.tsx:216` e `:295`. Não as "corrigir" a menos que pedido
  explicitamente. Sob `npm run test:coverage`, esperar ainda flakes de timeout
  de 5s (ambiente lento) — confirmar sempre com execução isolada antes de
  investigar.

## Comandos

```
cd client
npx vitest run src/components/appointments/                 # 83 testes
npx vitest run src/components/appointments/EmployeeAvatarPicker.test.tsx
npm run typecheck
npm run build
npm test                                                    # 2 falhas pré-existentes
npm run test:coverage -- --coverage.reportOnFailure         # necessário: as 2
                                                            # falhas travam o
                                                            # relatório de coverage
```
