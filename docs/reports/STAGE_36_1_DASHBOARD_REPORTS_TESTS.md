# Stage 36.1 — Diagnóstico e correção dos testes do Dashboard e dos Relatórios

Data: 15/10/2026.

## Objetivo e escopo

Corrigir as **quatro falhas pré-existentes** em `DashboardPage.test.tsx` (2) e `ReportsPage.test.tsx` (2), documentadas desde a Stage 33 e na validação Stage 36 Parte 6. Escopo limitado a **testes**; sem alteração de regras de negócio, RBAC, backend ou cálculos financeiros.

## Falhas originais — mensagens e causas

| # | Teste | Erro | Causa |
|---|--------|------|--------|
| 1 | `DashboardPage` → `renders greeting, summary cards and appointment tables with data` | `expected [ '1', '2', '1' ] to deeply equal [ '1', '2', '1', '1', '1', '1' ]` (L216) | O dashboard atual expõe **3** KPIs (`Hoje`, `Pendentes`, `Confirmados`) em [`DashboardPage.tsx`](../../client/src/pages/dashboard/DashboardPage.tsx); o teste ainda esperava 6 cards (clientes/serviços/funcionários removidos em evolução anterior — ver [`STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md`](STAGE_33_PRICE_HISTORY_AND_APPOINTMENT_STATUS_AUDIT.md)). |
| 2 | `DashboardPage` → `shows empty state when there are no appointments` | `expected [ '0', '0', '0' ] to deeply equal [ '0', '0', '0', '1', '1', '1' ]` (L295) | Mesma desatualização de contagem de `data-testid="card-value"`. |
| 3 | `ReportsPage` → `renderiza cards, receita e rankings do período` | `Unable to find an element by: [data-testid="revenue-estimated"]` (L200) | A página usa [`DashboardCard`](../../client/src/components/common/DashboardCard.tsx) com título "Receita estimada (concluídos)" sem `data-testid="revenue-estimated"` (Stage 33). |
| 4 | `ReportsPage` → `continua exibindo o relatório quando um endpoint relacionado falha` | Idem (L329) | Mesmo seletor; o fallback `EMPTY_REVENUE` → `0,00` no card continua correto em produção. |

**Conclusão:** defeito nos **testes/desatualização de UI**, não regressão de timezone (Stage 36) nem bug funcional reportado em testes manuais.

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| [`client/src/pages/dashboard/DashboardPage.test.tsx`](../../client/src/pages/dashboard/DashboardPage.test.tsx) | `cardValues()` → `["1","2","1"]` e `["0","0","0"]`; comentário sobre os 3 KPIs. Asserções de tabelas/horários mantidas. |
| [`client/src/pages/reports/ReportsPage.test.tsx`](../../client/src/pages/reports/ReportsPage.test.tsx) | Helper `getRevenueEstimatedValue()` (título + `card-value` dentro de `.dashboard-kpi`); substitui `revenue-estimated` nos 2 testes. |

Nenhum ficheiro de produção alterado.

## Decisões técnicas

- **Dashboard:** alinhar expectativas ao contrato visual atual (3 KPIs) em vez de reintroduzir cards removidos só para satisfazer o teste.
- **Relatórios:** localizar receita estimada pelo **título visível** + `card-value` partilhado com `DashboardCard`, em vez de adicionar `data-testid` só no JSX ou enfraquecer asserções de valor (`120,00` / `0,00`).

## Comandos executados e resultados

### Diagnóstico (antes da correção)

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/dashboard/DashboardPage.test.tsx \
  src/pages/reports/ReportsPage.test.tsx
```

**Resultado:** 2 ficheiros falharam; **4** testes falharam, **17** passaram (21 total).

### Validação (após correção)

```bash
cd client
npm run test -- --pool=forks --maxWorkers=1 \
  src/pages/dashboard/DashboardPage.test.tsx \
  src/pages/reports/ReportsPage.test.tsx
```

**Resultado:** 2 ficheiros passaram; **21** testes passaram.

```bash
npm run typecheck   # OK
npm run build       # OK (aviso de chunk > 500 kB — pré-existente)
```

## Limitações

- Suite completa do client **não** reexecutada nesta tarefa; apenas os 21 testes dos dois ficheiros.
- Falhas noutros módulos, se existirem, ficam fora do âmbito.

## Confirmação

- Sem commit, merge ou push.
- Sem alteração no backend.
- Sem migração nem alteração a dados históricos.

## CONTEXTO PARA A PRÓXIMA IA

**Estado:** As 4 falhas conhecidas de Dashboard/Relatórios no client estão **corrigidas** (Stage 36.1). O pacote focal Stage 36 Parte 3 pode incluir estes ficheiros sem esperar vermelho por este motivo.

**Referências:** causa raiz original em Stage 33; Parte 6 listava estas falhas como pré-existentes.

**Pendências opcionais:** correr `npm run test` no client inteiro; atualizar [`STAGE_36_PART_6_TIMEZONE_FINAL_VALIDATION.md`](STAGE_36_PART_6_TIMEZONE_FINAL_VALIDATION.md) se quiser refletir critério 7 como OK no pacote focal completo.

**Não fazer:** reverter os 3 KPIs do dashboard ou reintroduzir `revenue-estimated` sem necessidade — os testes atuais cobrem o comportamento visível.
