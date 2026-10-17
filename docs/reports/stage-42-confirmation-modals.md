# Stage 42 — Unificação dos Modais de Confirmação (FE-005)

Data: 17/10/2026  
Branch: `feature/stage-42-confirmation-modals` (base: `develop` com Stages 39–41 já merged — PRs #81–#83)  
Sem commit, merge ou push.

## 1. Objetivo e âmbito

Reduzir duplicação dos modais de confirmação destrutiva no frontend, extraindo um **shell** partilhado (`DestructiveConfirmModal`) e mantendo modais de domínio finos (API, mensagens, entidades). Âmbito: exclusão admin (cliente, serviço, funcionário, agendamento, disponibilidade, exceção) e `PublicAppointmentCancelDialog`. Fora: `SendClientInviteModal`, `AvailabilityExceptionFormModal`, backend, RBAC, estados Loading/Error Stages 39–41.

## 2. Branch e estado inicial do Git

- `develop` limpo; merges confirmados: stage-39 (#81), stage-40 (#82), stage-41 (#83).
- Branch de trabalho: `feature/stage-42-confirmation-modals`.

## 3. Modais analisados e duplicações

| Modal | Duplicação com outros |
|-------|------------------------|
| `DeleteClientModal` | ~95% markup + fluxo `isDeleting`/erro/spinner |
| `DeleteServiceModal` | Idem |
| `DeleteEmployeeModal` | Idem |
| `DeleteAppointmentModal` | Idem + corpo `summary` com timezone |
| `DeleteAvailabilityDayModal` | Idem + `dayLabel` |
| `DeleteAvailabilityExceptionModal` | Idem + formatação data/período |
| `PublicAppointmentCancelDialog` | Shell Bootstrap igual; **diferente:** estado no pai, `dl` público, labels, `centered`, `aria-*`, Escape, foco em «Manter» |

**Conclusão:** abstração do **shell** justificada; lógica de API permanece em cada `Delete*Modal`.

## 4. Decisões técnicas

1. **`DestructiveConfirmModal`** em `components/common/` — presentational, sem chamadas API.
2. **Admin:** defaults `Cancelar`, `btn-secondary`, sem Escape/focus automático (comportamento anterior preservado).
3. **Público:** reutiliza o shell com `centered`, `titleId`/`descriptionId`, `focusCancelOnOpen`, `closeOnEscape`, `outline-secondary`, labels próprios; corpo (`dl`) no wrapper.
4. **Não** unificar modais de formulário nem convite.
5. Erros de submissão continuam `alert-danger` **dentro** do corpo do modal (como antes).

## 5. Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/components/common/DestructiveConfirmModal.tsx` | **Novo** — shell |
| `client/src/components/common/DestructiveConfirmModal.test.tsx` | **Novo** — 8 testes |
| `client/src/components/clients/DeleteClientModal.tsx` | Composição shell |
| `client/src/components/services/DeleteServiceModal.tsx` | Idem |
| `client/src/components/employees/DeleteEmployeeModal.tsx` | Idem |
| `client/src/components/appointments/DeleteAppointmentModal.tsx` | Idem |
| `client/src/components/availability/DeleteAvailabilityDayModal.tsx` | Idem |
| `client/src/components/availability/DeleteAvailabilityExceptionModal.tsx` | Idem |
| `client/src/components/public/PublicAppointmentCancelDialog.tsx` | Composição shell + a11y |
| `client/src/components/availability/DeleteAvailabilityExceptionModal.test.tsx` | **Novo** — 5 testes |

Páginas e imports (`ClientsPage`, etc.) **inalterados**.

## 6. Testes executados

**Baseline (pré-código):** 6 ficheiros, **49** testes.

**Focal pós-implementação:**

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/components/common/DestructiveConfirmModal.test.tsx \
  src/components/clients/DeleteClientModal.test.tsx \
  src/components/services/DeleteServiceModal.test.tsx \
  src/components/employees/DeleteEmployeeModal.test.tsx \
  src/components/appointments/DeleteAppointmentModal.test.tsx \
  src/components/availability/DeleteAvailabilityDayModal.test.tsx \
  src/components/availability/DeleteAvailabilityExceptionModal.test.tsx \
  src/components/public/PublicAppointmentCancelDialog.test.tsx
# → 62 testes passados (+13)
```

**Suite completa:**

```bash
npm run test -- --pool=forks --maxWorkers=1
# → 111 ficheiros, 1261 testes passados (~462s)
```

Referência pré-Stage 42: 1248 testes (pós-Stage 41).

## 7. Typecheck e build

```bash
npm run typecheck   # OK
npm run build       # OK (aviso chunk > 500 kB — pré-existente)
```

## 8. Validação visual

**Não realizada** nesta sessão (sem smoke browser nos modais em desktop/390px). Recomendado: excluir cliente/serviço e fluxo público de cancelamento.

## 9. Problemas conhecidos e adiado

- Admin sem Escape/fecho por teclado (pré-existente; não alargado nesta stage).
- Spinner no botão destrutivo público usa `me-1` no shell (antes `me-2` no público) — diferença visual mínima.
- FE-003 (404), FE-006, FE-016 — fora de âmbito.

## 10. Preservação de comportamentos e contratos

- Endpoints `delete*` e `cancel` público inalterados.
- Ordem `onDeleted` → `onClose` após sucesso mantida.
- Textos PT por entidade inalterados (incl. «Tem certeza de que deseja…» no público).
- Testes públicos de a11y, Escape e foco passam sem alteração de spec.

## 11. Resumo

FE-005 **parcialmente fechado:** shell unificado; modais de domínio mantidos por operação. Unificação **bem-sucedida ao nível do markup comum**, sem componente genérico de negócio.

---

## CONTEXTO PARA A PRÓXIMA IA

**Padrão para novas confirmações destrutivas:**

```tsx
<DestructiveConfirmModal
  isOpen={isOpen}
  title="…"
  onClose={onClose}
  onConfirm={() => void handleConfirm()}
  isSubmitting={isBusy}
  errorMessage={error}
  confirmLabel="Excluir"
  submittingLabel="Excluindo..."
>
  {/* corpo específico */}
</DestructiveConfirmModal>
```

**Props opcionais (fluxo público / a11y reforçada):** `centered`, `titleId`, `descriptionId`, `focusCancelOnOpen`, `closeOnEscape`, `cancelButtonVariant`, `cancelLabel`.

**O que não migrar para o shell:** formulários (`*FormModal`), convites, lógica API.

**Testes client:** 1261 após Stage 42.

**Próximos passos:** validação visual modais; FE-003 catch-all; eventual Escape nos admin se produto pedir paridade com público.
