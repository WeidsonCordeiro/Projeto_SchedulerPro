# SchedulerPro — Etapa 6.4c.3 — Diagnóstico das falhas e reforço dos testes

**Data:** 2026-11-04  
**Branch:** `develop`  
**HEAD:** `0ee6a2dbfb3f727c099c7d65b918995a34281f15`

**Relacionado:** [`schedulerpro-sidebar-mobile-step-6-4c-3-implementation.md`](./schedulerpro-sidebar-mobile-step-6-4c-3-implementation.md)

---

## 1. Estado Git (inspeção)

| Item | Valor |
|------|--------|
| Branch | `develop` |
| Alterações 6.4c.3 | `AppLayout.tsx`, `Navbar.tsx`, `AppLayout.test.tsx` (+ relatório 6.4c.3 untracked) |
| CSS / RegisterPage / CompanyPage (produção) | Sem alterações nesta sub-etapa de validação |

---

## 2. Falhas reportadas na suite completa (execução anterior)

Referência: execução ~17:15 UTC — **1504 passaram, 4 falharam**, **2 ficheiros** (1508 total).

Re-execução com filtro `rg "FAIL  src/"` (~17:35 UTC) listou **2 linhas** (Vitest nem sempre imprime todas as falhas no pipe):

| # | Ficheiro | Teste |
|---|----------|--------|
| 1 | `src/pages/RegisterPage.test.tsx` | `calls register with the selected IANA timezone in the payload` |
| 2 | `src/pages/company/CompanyPage.test.tsx` | `updates the company and shows success feedback` |

### Quatro testes individuais (diagnóstico reproduzível)

Execução em batch repetida (`RegisterPage.test.tsx` + `CompanyPage.test.tsx`, 5 runs) e análise de mensagens:

| # | Ficheiro | Teste | Erro observado |
|---|----------|--------|----------------|
| 1 | `RegisterPage.test.tsx` | `calls register with the selected IANA timezone in the payload` | **`Error: Test timed out in 5000ms`** (Vitest default) |
| 2 | `RegisterPage.test.tsx` | `shows server errors` | Timeout **5000ms** (aparece quando os dois ficheiros correm em paralelo no mesmo job — run 1 do loop) |
| 3 | `CompanyPage.test.tsx` | `updates the company and shows success feedback` | **`Error: Test timed out in 5000ms`** |
| 4 | *(inferência coerente com 4 falhas / 2 ficheiros)* | Segundo teste lento no mesmo worker sob carga (ex. `shows an error with retry when loading fails` com `findByRole` no combobox, ou outro async da página) | Mesmo padrão **timeout 5000ms** quando a máquina está sob carga da suite completa |

**Evidência de timeout (CompanyPage):**

```
FAIL ... updates the company and shows success feedback
Error: Test timed out in 5000ms.
 ❯ CompanyPage.test.tsx:273:3
```

**Evidência de timeout (RegisterPage IANA):**

```
FAIL ... calls register with the selected IANA timezone in the payload
Error: Test timed out in 5000ms.
 ❯ RegisterPage.test.tsx:224:3
```

---

## 3. Relação com a implementação 6.4c.3

| Critério | Conclusão |
|----------|-----------|
| Ficheiros alterados em 6.4c.3 | Apenas `AppLayout.tsx`, `Navbar.tsx`, `AppLayout.test.tsx` |
| Ficheiros que falharam | `RegisterPage.test.tsx`, `CompanyPage.test.tsx` — **não modificados** em 6.4c.3 |
| Causa técnica | **Timeout de 5s** em testes async que usam `TimezonePicker` (`selectTimezoneBySearch`, `findBy*`) — lentos quando `pool: "threads"`, `maxWorkers: 3` e suite completa (~7–8 min CPU) |
| Efeito colateral de AppLayout | **Nenhum** — sem estado global, sem alteração a rotas/registo/empresa |

**Conclusão:** as falhas **não são causadas** pela implementação 6.4c.3. São **limitações de timeout / carga** em testes da etapa **6.4b** (TimezonePicker), já referenciadas em [`schedulerpro-timezone-picker-step-6-4b-6-final-validation.md`](./schedulerpro-timezone-picker-step-6-4b-6-final-validation.md) (batch RegisterPage).

**Correções nesta sub-etapa:** nenhuma em `RegisterPage.test.tsx` / `CompanyPage.test.tsx` (fora do escopo autorizado para 6.4c.3).

---

## 4. Alterações realizadas (escopo 6.4c.3)

| Ficheiro | Alteração |
|----------|-----------|
| [`AppLayout.test.tsx`](../../client/src/components/layout/AppLayout.test.tsx) | Novo teste **`wraps Shift+Tab from the first focusable element to the last`** |

Implementação em [`AppLayout.tsx`](../../client/src/components/layout/AppLayout.tsx) — trap Shift+Tab **já existia**; o teste confirma o comportamento. **Sem alteração de produção** nesta sub-etapa.

---

## 5. Teste Shift+Tab

- Abre o drawer, foca o primeiro focável (botão fechar).
- `Shift+Tab` → foco no **último** focável dentro de `#app-sidebar`.
- Mantido o teste de **Tab** no último elemento → wrap para o primeiro.
- Teste **`marks main content inert`** garante que `main` não participa enquanto o drawer está aberto.

---

## 6. Resultados de validação (execuções nesta sessão)

### Layout (6.4c.3)

```bash
npm test -- src/components/layout/AppLayout.test.tsx src/components/layout/Navbar.test.tsx
```

| Resultado | **31 testes passaram** (25 AppLayout + 6 Navbar), incl. Shift+Tab |

### Ficheiros que falharam na suite anterior

```bash
npm test -- src/pages/RegisterPage.test.tsx src/pages/company/CompanyPage.test.tsx
```

| Execução | Resultado |
|----------|-----------|
| Isolado (cada ficheiro) | **11/11** e **24/24** (várias vezes) |
| Batch (2 ficheiros juntos) | **Intermitente** — 1–4 falhas por timeout 5000ms (loop 5× documentado) |

### Suite completa

```bash
npm test
```

| Execução | Resultado |
|----------|-----------|
| ~17:39 UTC | **1508/1508** (~359 s) |
| ~17:45 UTC | **1508/1508** (~450 s) |
| Sob carga concorrente | Pode voltar a falhar 2–4 testes por timeout (mesmos ficheiros) |

### Build

```bash
npm run build
```

| Resultado | **Sucesso** (~33 s na execução combinada com testes batch) |

---

## 7. Problemas pendentes

| ID | Descrição | Acção sugerida (fora de 6.4c.3) |
|----|-----------|-----------------------------------|
| P1 | Testes TimezonePicker > 5s sob carga | Aumentar `testTimeout` nos testes afetados ou `vi.setConfig({ testTimeout: 10000 })` no describe; ou reduzir trabalho em `selectTimezoneBySearch` nos testes |
| P2 | Suite completa intermitente | Re-correr `npm test` antes do merge; CI com timeout maior |
| P3 | Validação manual / AT | Pendente utilizador (6.4c.3) |

---

## 8. Conclusão

- **Diagnóstico:** 4 falhas = **timeouts 5000ms** em testes de **RegisterPage** e **CompanyPage** (TimezonePicker), **não** regressão do layout 6.4c.3.
- **Entregue:** teste explícito **Shift+Tab**; layout **31/31**; suite completa **verde** em re-execuções desta sessão; build OK.
- **Sem correção** nos testes de registo/empresa nesta etapa (sem ligação causal a 6.4c.3).

Aguardar validação manual do utilizador antes de fechar a UX mobile da sidebar.
