# SchedulerPro — Diagnóstico e correção: falha de build TypeScript (client)

**Data:** 01/11/2026  
**Âmbito:** Apenas tipagem/teste em [`useAppointmentsSchedule.test.ts`](../../client/src/hooks/useAppointmentsSchedule.test.ts). Sem alterações de negócio, backend, RBAC, Sidebar/Navbar/CompanyPage ou lógica Redux (R-01/R-02/R-03). Sem operações Git.

---

## 1. Contexto

Durante a finalização da correção de consistência do nome da empresa no Redux, a suite Vitest do client passou (130+ ficheiros, 1429+ testes), mas `npm run build` em `client/` falhou com **TS2769** em `useAppointmentsSchedule.test.ts` linha 29. Este documento confirma a causa, a origem com evidência disponível no projecto, a correção mínima e a validação completa.

---

## 2. Erro original

Saída reproduzida com o padrão incorrecto `createElement(Provider, { store }, children)` e `npm run typecheck` (`tsc -b --noEmit`):

```text
src/hooks/useAppointmentsSchedule.test.ts(29,36): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type '{ store: EnhancedStore<{ auth: AuthState; company: CompanyState; }, UnknownAction, Tuple<[StoreEnhancer<{ dispatch: ThunkDispatch<{ auth: AuthState; company: CompanyState; }, undefined, UnknownAction>; }>, StoreEnhancer]>>; }' is not assignable to parameter of type 'Attributes & ProviderProps<Action<string>, unknown>'.
      Property 'children' is missing in type '{ store: EnhancedStore<{ auth: AuthState; company: CompanyState; }, UnknownAction, Tuple<[StoreEnhancer<{ dispatch: ThunkDispatch<{ auth: AuthState; company: CompanyState; }, undefined, UnknownAction>; }>, StoreEnhancer]>>; }' but required in type 'ProviderProps<Action<string>, unknown>'.
```

`npm run build` falha na mesma fase (`tsc -b`), com **exit code 2**, antes do Vite.

---

## 3. Diagnóstico

| Pergunta | Resposta |
|----------|----------|
| **Tipo incompatível?** | Segundo argumento de `createElement(Provider, props)`: objecto `{ store }` sem `children`, enquanto `ProviderProps` exige `children` nas props (React 19 + `react-redux` ^9.3). |
| **Origem?** | Wrapper de teste em ficheiro **`.test.ts`** usa `createElement` em vez de JSX. Passar `children` como **terceiro** argumento de `createElement` não preenche `ProviderProps.children` para o overload tipado do `Provider`. O tipo do `EnhancedStore` (auth + company) é válido; não é a causa do erro. |
| **Porque no build?** | [`tsconfig.app.json`](../../client/tsconfig.app.json) inclui `"src"` inteiro; [`package.json`](../../client/package.json) `"build": "tsc -b && vite build"`. Ficheiros `*.test.ts` são type-checkados. Vitest a passar não implica `tsc` OK. |
| **Teste vs store vs deps vs config?** | **Teste** (forma de passar `children`). Store e dependências adequados. Config TS não alterada. |
| **Ficheiro / linha** | [`client/src/hooks/useAppointmentsSchedule.test.ts`](../../client/src/hooks/useAppointmentsSchedule.test.ts) — função `createHookWrapper`, linha 29, dentro de `HookWrapper`. |

O hook [`useAppointmentsSchedule.ts`](../../client/src/hooks/useAppointmentsSchedule.ts) usa `useAppSelector`; o teste precisa de [`Provider`](../../client/src/store/index.ts). Esse wrapper foi introduzido na fase **company-name bootstrap** (ver [`schedulerpro-company-name-bootstrap-implementation.md`](./schedulerpro-company-name-bootstrap-implementation.md) §10). Stage 49.2 tinha criado o teste **sem** Provider e documentava build OK; o erro aparece **depois** de envolver o hook com Redux num ficheiro `.ts` + `createElement` mal tipado.

---

## 4. Origem (pré-existente?)

**Não foi possível comprovar** que a falha existia antes de **qualquer** trabalho Redux no repositório **sem Git**.

Evidência **no projecto** (documentação + escopo):

| Facto | Implicação |
|-------|------------|
| Plano R-01/R-02/R-03 não inclui `useAppointmentsSchedule.test.ts` | A lógica reconcile/commit/refresh **não** introduz este erro. |
| Bootstrap documenta adição do `Provider` neste teste | Regressão de tipagem **ligada ao wrapper Redux**, não ao Stage 49.2 original (sem Provider). |
| Relatório [`schedulerpro-company-name-redux-consistency-fix.md`](./schedulerpro-company-name-redux-consistency-fix.md) regista build a falhar na mesma linha | Falha **observada** nessa corrida; rotular “pré-existente antes de tudo” **sem prova** é incorrecto. |

Conclusão: **regressão de tipagem no teste** após envolver o hook com `Provider` + padrão `createElement` incorrecto; correcção isolada numa linha.

---

## 5. Correção

**Alteração:** incluir `children` no objecto de props do `Provider`:

```typescript
return createElement(Provider, { store, children });
```

**Antes (incorrecto para tipos actuais):**

```typescript
return createElement(Provider, { store }, children);
```

**Justificação:** alinha `createElement` com `ProviderProps` sem `any`, casts, exclusão de testes do `tsconfig` ou mudança de dependências. Mantém `.test.ts`, store `configureStore({ auth, company })` e intenção do teste (wrapper Redux para `renderHook`). O resto do projecto usa JSX `<Provider store={…}>` em `.test.tsx`; este ficheiro é o único com `createElement(Provider, …)`.

---

## 6. Ficheiros alterados

| Ficheiro | Responsabilidade |
|----------|------------------|
| [`client/src/hooks/useAppointmentsSchedule.test.ts`](../../client/src/hooks/useAppointmentsSchedule.test.ts) | Linha 29: props `{ store, children }` no `Provider` — **única** alteração de código desta tarefa. |

Nenhum outro ficheiro modificado para esta correção.

---

## 7. Validação (resultados reais)

Ambiente: `client/`, 01/11/2026.

### 7.1 — Teste específico

```bash
npm test -- --run src/hooks/useAppointmentsSchedule.test.ts
```

| Métrica | Valor |
|---------|--------|
| Exit code | **0** |
| Test files | 1 passed (1) |
| Tests | **12 passed** (12) |
| Duration | 27.69s |

### 7.2 — Build

```bash
npm run build
```

| Métrica | Valor |
|---------|--------|
| Exit code | **0** |
| `tsc -b` | OK |
| `vite build` | OK (~11.26s); aviso Rollup chunk > 500 kB (pré-existente, não bloqueante) |

### 7.3 — Suite completa

```bash
npm test -- --run
```

| Métrica | Valor |
|---------|--------|
| Exit code | **0** |
| Test files | **131 passed** (131) |
| Tests | **1439 passed** (1439) |
| Duration | 538.25s |
| Unhandled errors / worker timeouts | **Nenhum** reportado nesta execução |

### 7.4 — Typecheck explícito (pós-correção)

```bash
npm run typecheck
```

Exit code **0**.

---

## 8. Limitações

- Histórico exacto do commit que introduziu `{ store }, children` **não** determinado (sem Git).
- Aviso de tamanho de chunk no Vite permanece; fora do scope desta tarefa.
- Outros testes `.test.ts` com JSX/`createElement` não foram alterados; apenas este ficheiro falhava no `tsc`.

---

## 9. Conclusão

- **Causa confirmada:** `children` ausente das props de `Provider` em `createElement`, detectado pelo `tsc -b` porque testes vivem em `src/`.
- **Pré-existente global:** **não comprovado**; evidência aponta para o wrapper Redux do bootstrap neste teste.
- **Build:** **aprovado** (`npm run build` exit 0).
- **Correção:** mínima, isolada, pronta para revisão; testes específicos, build e suite completa documentados acima.

---

## Resumo para outra IA

1. Falha = TS2769 linha 29, não Vitest.  
2. Fix = `createElement(Provider, { store, children })`.  
3. Não tocar Redux de negócio nem `tsconfig` para excluir testes.  
4. Validar sempre `npm run build`, não só `npm test`.
