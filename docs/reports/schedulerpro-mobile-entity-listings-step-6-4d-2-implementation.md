# SchedulerPro — Etapa 6.4d.2 — Cards mobile nas listagens de entidades

**Data:** 2026-11-04  
**Referência:** [`schedulerpro-mobile-entity-listings-step-6-4d-1-audit.md`](./schedulerpro-mobile-entity-listings-step-6-4d-1-audit.md)

---

## 1. Objetivo da implementação

Apresentar funcionários, clientes e serviços em **cards verticais** em viewports &lt;768px, eliminando a dependência de scroll horizontal causada pela tabela com `min-width: 680px`, mantendo a **tabela inalterada** em desktop (≥768px).

---

## 2. Git no início da implementação

| Item | Valor |
|------|--------|
| Branch | `develop` |
| HEAD | `e32241a3666722730ff7ee7d9ccf6e7f6e361d0b` |
| Working tree | Limpo excepto relatório 6.4d.1 untracked |

**Operações Git durante a etapa:** nenhuma (sem commit/push/switch/etc.).

---

## 3. Resumo das alterações

- **Dual surface** em cada página: wrapper `d-none d-md-block` + `data-testid="*-list-desktop"` para a tabela; `entity-list-mobile d-md-none` + `data-testid="*-list-mobile"` para cards.
- Funções locais `render*RowActions` partilhadas entre célula da tabela e rodapé do card (mesmos handlers e RBAC).
- CSS scoped `.entity-list-mobile` (gap, quebra de email, truncamento de descrição).
- Testes existentes scoped ao desktop; novos blocos `mobile entity cards`; photo tests ajustados ao dual surface.

---

## 4. Ficheiros modificados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`client/src/pages/employees/EmployeesPage.tsx`](../../client/src/pages/employees/EmployeesPage.tsx) | Cards mobile + `renderEmployeeRowActions` |
| [`client/src/pages/clients/ClientsPage.tsx`](../../client/src/pages/clients/ClientsPage.tsx) | Cards mobile + `renderClientRowActions` |
| [`client/src/pages/services/ServicesPage.tsx`](../../client/src/pages/services/ServicesPage.tsx) | Cards mobile + `renderServiceRowActions` |
| [`client/src/index.css`](../../client/src/index.css) | Estilos `.entity-list-mobile` |
| [`EmployeesPage.test.tsx`](../../client/src/pages/employees/EmployeesPage.test.tsx) | Scope desktop + testes mobile |
| [`ClientsPage.test.tsx`](../../client/src/pages/clients/ClientsPage.test.tsx) | Idem |
| [`ServicesPage.test.tsx`](../../client/src/pages/services/ServicesPage.test.tsx) | Idem |
| [`EmployeesPage.photo.test.tsx`](../../client/src/pages/employees/EmployeesPage.photo.test.tsx) | Queries scoped ao desktop |
| [`ClientsPage.photo.test.tsx`](../../client/src/pages/clients/ClientsPage.photo.test.tsx) | Idem |

**Não alterados:** `AppLayout`, sidebar, Redux, permissões config, APIs, calendário, agendamentos.

---

## 5. Comportamento mobile implementado

### Funcionários

Card com `person-cell`, email, badges perfil/status, «Adicionado em», footer com Editar / Ativar / Desativar / Excluir conforme `getEmployeeAbilities` e regra `isSelf`.

### Clientes

Card com avatar, nome, email (`entity-card-email`), telefone, status; acções Editar / Convidar (`canInvite && email && !portalAccess.exists`) / Excluir.

### Serviços

Card com nome, descrição truncada (`entity-card-description` + `title`), duração · preço, status; toggle e demais acções via `renderServiceRowActions` + `togglingId`.

---

## 6. Preservação desktop

Tabela original dentro de `employees-list-desktop` / `clients-list-desktop` / `services-list-desktop` com classes Bootstrap `d-none d-md-block`. Markup de colunas e classes de tabela mantidos; regra global `680px` **não** removida.

---

## 7. Reutilização de handlers, modais e permissões

- Mesmos `openEdit`, `handleToggle`, `setDeleting*`, `setInvitingClient`, modais `*Form` / `Delete*` / `SendClientInviteModal`.
- Mesmas chamadas `*Api` e estado `useState` / `load*` — sem alteração de Redux ou contratos.
- Condicionais RBAC copiadas para `render*RowActions` (única fonte de botões por surface).

---

## 8. Testes executados e resultados

| Comando | Resultado |
|---------|-----------|
| `npm test -- EmployeesPage.test.tsx ClientsPage.test.tsx ServicesPage.test.tsx` | **76/76** pass |
| `npm test -- EmployeesPage.photo.test.tsx ClientsPage.photo.test.tsx` | Pass (após scope desktop) |
| `npm test` (suite completa, 1 execução) | **1520/1522** pass; **2 falhas** em `RegisterPage.test.tsx` (timeout 5s sob carga paralela) |
| `npm test -- RegisterPage.test.tsx` (isolado) | **11/11** pass |

**Conclusão:** Falhas da suite completa são **intermitentes/pré-existentes** (TimezonePicker / RegisterPage), não causadas por 6.4d.2. Todos os testes das páginas alteradas passam.

---

## 9. Build

```
npm run build  →  tsc -b && vite build  →  ✓ sucesso (2026-11-04)
```

---

## 10. Problemas e soluções

| Problema | Solução |
|----------|---------|
| Botões duplicados no DOM (tabela + cards) quebravam `getByRole` | `within(getByTestId('*-list-desktop'))` nos testes de acções |
| `findByText('Ana Silva')` ambíguo nos photo tests | Scope `employees-list-desktop` / `clients-list-desktop` |
| Email longo no mobile | `.entity-card-email` com `overflow-wrap` |
| Descrição longa serviços | `-webkit-line-clamp: 3` + `title` |

---

## 11. Pendências / limitações

- **Validação visual manual** pelo utilizador (360px / 768px) — ver checklist §12.
- Funcionários OWNER com 4 botões: usa `.table-actions` wrap; dropdown «Ações» **não** implementado (opcional da auditoria).
- Suite completa pode falhar intermitentemente em `RegisterPage` — considerar `testTimeout` ou isolamento (fora escopo 6.4d.2).

---

## 12. Checklist de validação visual manual

- [ ] `/employees` @ 360px: cards empilhados, sem scroll horizontal na listagem; modais abrem a partir do card.
- [ ] `/clients` @ 360px: email longo quebra linha; Convidar só quando aplicável.
- [ ] `/services` @ 360px: descrição truncada; toggle Ativar/Desativar.
- [ ] Mesmas rotas @ ≥768px: tabela visível, cards ocultos.
- [ ] Sidebar 6.4c: abrir menu mobile, navegar — comportamento inalterado.

---

## 13. Contexto para continuidade

Breakpoint: Bootstrap **`md` (768px)** via `d-md-none` / `d-md-block`. Test ids: `employees-list-desktop|mobile`, `clients-list-*`, `services-list-*`. Próximas etapas (ex. 6.4e) **não** iniciadas sem autorização. Aguardar QA visual antes de fechar 6.4d.

---

## Implementado vs testado vs manual

| Área | Automatizado | Manual |
|------|--------------|--------|
| Dual surface + RBAC | Sim (76 + photo) | Layout/spacing |
| CSS email/descrição | Parcial (presença texto) | Overflow real em device |
| Sidebar / resto app | Não regressão explícita | Smoke nas rotas |
