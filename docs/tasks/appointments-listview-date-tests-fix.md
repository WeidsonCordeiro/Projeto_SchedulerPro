# AppointmentsListView — correção T3/T4 (testes dependentes de data)

## Metadados

| Campo | Valor |
|-------|--------|
| Data | 2026-11-16 |
| Branch | `test/fix-appointments-listview-date-dependent-tests` |
| HEAD inicial | `27c4c60fc6c2a7a5bcd3dde4d967b964c7b823bc` (merge PR #140 — diagnóstico flakes suite) |
| HEAD final | `27c4c60fc6c2a7a5bcd3dde4d967b964c7b823bc` (sem commits; apenas working tree) |
| Tracking remoto | Nenhum (`@{upstream}` não configurado) |

### Estado Git

**Inicial:** branch esperada confirmada; working tree limpo de commits novos.

**Final:**

```
## test/fix-appointments-listview-date-dependent-tests
 M client/src/components/appointments/AppointmentsListView.test.tsx
```

Nenhuma operação Git de escrita (commit, push, checkout, etc.) foi executada pelo agente.

---

## Causa identificada

O diagnóstico em [`frontend-suite-flakes-diagnostic.md`](./frontend-suite-flakes-diagnostic.md) classificou T3 e T4 como **reproduzíveis**: a fixture padrão de `makeAppointment` usa `startAt: 2026-11-15T09:00:00.000Z`. A partir de 16/11/2026, `isInstantInPast` (`appointmentCalendar.ts`, comparação `start <= DateTime.now()`) trata o agendamento como passado. `AppointmentsListView` mostra o botão **Visualizar** em vez de **Editar**, quebrando assertions que clicam em **Editar**.

Testes afetados:

1. **T3** — `invokes edit, status and delete callbacks from the action row`
2. **T4** — `disables action buttons and shows Aguarde for the pending status action`

---

## Estratégia e justificação

- **Abordagem:** overrides de `startAt`/`endAt` apenas em T3 e T4, com instantes **futuros relativos** a `DateTime.now().plus({ days: 30 })` (UTC), via helper local `futureAppointmentTimes()`.
- **Porquê não alterar o default de `makeAppointment`:** o teste `renders table headers and formatted row data` asserta literalmente `15/11/2026` e horários derivados do default fixo; o teste `shows Visualizar instead of Editar for past appointments` continua a usar datas no passado de forma intencional.
- **Porquê não fake timers:** o projeto usa `vi.useFakeTimers` noutros testes de appointments, mas overrides relativos evitam `afterEach` de relógio, não interferem com outros testes no mesmo ficheiro e permanecem estáveis enquanto `start > now`.

---

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/components/appointments/AppointmentsListView.test.tsx`](../../client/src/components/appointments/AppointmentsListView.test.tsx) | Único ficheiro alterado |

**Código de produção:** nenhuma alteração (`AppointmentsListView.tsx`, `appointmentCalendar.ts`, etc. permanecem iguais).

### Resumo do diff

- Import `DateTime` de `luxon`.
- Novo helper `futureAppointmentTimes()` (+30 dias, janela de 30 min).
- T3 e T4 passam `appointments: [makeAppointment(futureAppointmentTimes())]` em `renderList`.
- Assertions e interações inalteradas.

Estatística: `1 file changed, 15 insertions(+), 1 deletion(-)`.

---

## Resultados de validação

Comandos executados a partir de `client/` (Vitest 4.1.11).

### T3 — `invokes edit, status and delete callbacks from the action row`

| Execução | Resultado |
|----------|-----------|
| 1/3 | PASS (1 passed, 8 skipped) |
| 2/3 | PASS |
| 3/3 | PASS |

### T4 — `disables action buttons and shows Aguarde for the pending status action`

| Execução | Resultado |
|----------|-----------|
| 1/3 | PASS |
| 2/3 | PASS |
| 3/3 | PASS |

### Ficheiro completo — `AppointmentsListView.test.tsx`

| Execução | Resultado |
|----------|-----------|
| 1/3 | PASS (9/9) |
| 2/3 | PASS (9/9) |
| 3/3 | PASS (9/9) |

### Typecheck e build

| Comando | Exit code |
|---------|-----------|
| `npm run typecheck` (`tsc -b --noEmit`) | 0 |
| `npm run build` (`tsc -b && vite build`) | 0 |

**Não executado nesta tarefa:** `npm test` suite integral (conforme brief).

---

## Critérios de aprovação

| Critério | Estado |
|----------|--------|
| T3 passa 3/3 | Sim |
| T4 passa 3/3 | Sim |
| Ficheiro completo 3/3 | Sim (9/9) |
| Typecheck / build | Sim |
| Apenas ficheiro de teste autorizado | Sim |
| Assertions originais preservadas | Sim |
| Sem alteração de produção | Sim |
| Relatório criado | Sim |
| Sem operações Git de escrita | Sim |

**Tarefa: APROVADA** para esta correção isolada (T3/T4).

---

## Limitações e riscos residuais

1. Outros testes que usem o default `2026-11-15` sem override **não** passam a garantir botão **Editar**; apenas T3/T4 foram corrigidos. Novos testes que assertem **Editar** devem usar fixture futura ou documentar passado.
2. `futureAppointmentTimes()` assume relógio do sistema razoável; margem de 30 dias é suficiente para CI/local normal. Relógio sistemicamente adiantado anos no futuro seria cenário extremo.
3. T1/T2 (RegisterPage), T5 (AppointmentsPage), T6 (CompanyPage) permanecem no diagnóstico da suite — **fora do escopo** desta tarefa.

---

## Handoff para continuação

1. **Commit sugerido** (utilizador): apenas `AppointmentsListView.test.tsx` + este relatório; mensagem no estilo: `test: make AppointmentsListView T3/T4 date-independent`.
2. **Próximo passo suite:** após merge, reexecutar `npm test` em `client/` e abordar T1/T2/T5/T6 conforme [`frontend-suite-flakes-diagnostic.md`](./frontend-suite-flakes-diagnostic.md) (timeouts dependentes da suite full).
3. **Referência diagnóstico original:** flakes T3/T4 eram 7/9 no ficheiro antes do fix; esperado 9/9 de forma estável.

Contexto branch: criada a partir de `develop` com merge do diagnóstico (HEAD `27c4c60`); alterações atuais estão unstaged no working tree.