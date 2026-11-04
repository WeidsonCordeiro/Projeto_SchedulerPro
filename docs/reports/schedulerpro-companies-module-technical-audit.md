# SchedulerPro — Levantamento técnico do módulo Companies

**Data:** 31/10/2026  
**Branch inspecionada:** `develop` @ `d074294` (merge PR #114 — CI GitHub Actions)  
**Tipo:** Análise **somente leitura** — sem alterações de código, configuração ou base de dados  
**Git no momento da análise:** working tree limpo

---

## A. Resumo executivo

O módulo **Companies** está **implementado e operacional** no backend e no frontend, alinhado a um modelo **SaaS multi-tenant por utilizador**: cada `User` possui um único `companyId`; a sessão JWT expõe esse tenant; a maior parte dos módulos persiste e consulta dados com filtro `companyId`.

**Criação de empresa** não usa `POST /companies`, mas sim **`POST /auth/register`**, que cria `Company` + utilizador `OWNER` numa transação MongoDB ([`AuthService.ts`](../../server/src/modules/auth/services/AuthService.ts)).

**Operações autenticadas** incluem leitura, actualização (`name`, `timezone`), logo (Cloudinary), soft-delete, activate/deactivate — sempre com `:id` igual ao `companyId` do token (404 se tentar outro tenant).

**Lacunas principais:** `CompanyService.create()` **vazio**; ausência de contacto/endereço/settings além de timezone/logo; **sem multi-empresa por utilizador**; login **não valida** `company.isActive`; MANAGER/EMPLOYEE **sem** permissões `COMPANY_*` (apenas OWNER/ADMIN).

---

## B. Funcionalidades existentes

| Área | Descrição | Ficheiros |
|------|-----------|-----------|
| Schema Mongoose | `name` (unique, lowercase), `timezone` IANA, `isActive`, `logo` (`StoredImage`), `deletedAt` soft-delete | [`Company.model.ts`](../../server/src/modules/companies/models/Company.model.ts) |
| Repository | findById, findByName, findAll (por `_id`), create (com session), update, updateLogo, activate, deactivate, softDelete | [`CompanyRepository.ts`](../../server/src/modules/companies/repositories/CompanyRepository.ts) |
| Service | Tenant `ensureTenant`; findById/findAll/update/delete/activate/deactivate; logo replace/remove | [`CompanyService.ts`](../../server/src/modules/companies/services/CompanyService.ts) |
| Controller | Delega ao service; usa `req.user!.companyId` | [`CompanyController.ts`](../../server/src/modules/companies/controllers/CompanyController.ts) |
| Routes | `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/activate`, `PATCH /:id/deactivate`, `POST/DELETE /:id/logo` | [`CompanyRoutes.ts`](../../server/src/modules/companies/routes/CompanyRoutes.ts) |
| DTOs | `CreateCompanyDto` (name, timezone?); `UpdateCompanyDto` (name?, timezone?) | [`CreateCompany.dto.ts`](../../server/src/modules/companies/dto/CreateCompany.dto.ts), [`UpdateCompany.dto.ts`](../../server/src/modules/companies/dto/UpdateCompany.dto.ts) |
| Validators | `update-company.validator`; `create-company.validator` (usado no register) | [`validators/`](../../server/src/modules/companies/validators/) |
| Mapper | Resposta API: id, name, timezone, logo, isActive, timestamps | [`CompanyMapper.ts`](../../server/src/modules/companies/mappers/CompanyMapper.ts) |
| RBAC | Permissões `COMPANY_READ`, `COMPANY_UPDATE`, `COMPANY_DELETE`, `COMPANY_ACTIVATE`, `COMPANY_DEACTIVATE` | [`permissions.ts`](../../server/src/constants/permissions.ts), [`rbac.ts`](../../server/src/constants/rbac.ts) |
| Registo | Cria empresa + OWNER; valida nome único | [`AuthService.ts`](../../server/src/modules/auth/services/AuthService.ts) |
| Sessão | `req.user.companyId` carregado da BD após JWT | [`auth.middleware.ts`](../../server/src/middlewares/auth.middleware.ts) |
| Montagem API | Prefixo `/companies` | [`routes/index.ts`](../../server/src/routes/index.ts) |
| Frontend | Página empresa, form, logo, URL agendamento público, Redux | [`CompanyPage.tsx`](../../client/src/pages/company/CompanyPage.tsx), [`company.api.ts`](../../client/src/api/endpoints/company.api.ts), [`companySlice.ts`](../../client/src/store/slices/companySlice.ts), [`companyPermissions.ts`](../../client/src/config/companyPermissions.ts) |
| Público | Eligibility verifica `company.isActive` | [`PublicBookingEligibility.ts`](../../server/src/modules/public-booking/services/PublicBookingEligibility.ts) |

---

## C. Funcionalidades parcialmente implementadas

1. **`CompanyService.create()`** — corpo vazio; criação efectiva apenas via **Auth** (register).
2. **`create-company.validator.ts`** — ligado ao fluxo de registo, não a rota REST dedicada de companies.
3. **Desactivação** — API e repositório OK; **login de staff** não verifica `company.isActive` (comentário “futuramente” em [`AuthService.validateUserStatus`](../../server/src/modules/auth/services/AuthService.ts)); fluxo **público** já bloqueia empresa inactiva.
4. **Soft-delete** — marca `deletedAt`; sem cascade documentado para users/appointments; impacto operacional aberto.
5. **`GET /companies`** — `findAll(companyId)` devolve no máximo a **própria** empresa (lista de um elemento), não administração multi-tenant.
6. **Settings** — não existe módulo `settings/`; configuração parcial na **CompanyPage** (name, timezone, logo, link público).

---

## D. Funcionalidades ausentes

| Requisito típico SaaS | Estado no código |
|----------------------|------------------|
| `POST /companies` (cadastro fora do register) | **Ausente** |
| Contacto, endereço, dados fiscais | **Ausente** no schema |
| Configurações por empresa (além timezone/logo) | **Ausente** |
| Utilizador em várias empresas | **Ausente** — um `companyId` por `User` |
| Selecção de “empresa activa” na sessão | **Ausente** |
| Permissões COMPANY para MANAGER/EMPLOYEE | **Ausente** (intencional no RBAC actual) |
| Backoffice operador (todas as empresas) | **Ausente** |
| Módulo Employees separado | **N/A** — funcionários são **Users** com roles |
| Integração HTTP E2E completa CRUD companies | **Parcial** — testes sobretudo unitários + logo routes |

---

## E. Arquitetura actual

### Backend

Padrão por módulo em `server/src/modules/<nome>/`:

`routes` → middlewares (`auth`, `permission`, `validation`, `object-id`) → `controller` → `service` → `repository` → `model`.

Erros: `AppError` + `ResponseHandler`. Logs: Winston ([`logger.ts`](../../server/src/config/logger.ts) depende de [`env.ts`](../../server/src/config/env.ts)).

### Frontend

React + Redux; API via `companyApi`; UX de permissões espelha OWNER/ADMIN ([`companyPermissions.ts`](../../client/src/config/companyPermissions.ts)).

### Fluxo de tenant

1. **Registo** → `CompanyRepository.create` + user `OWNER` com `companyId`.
2. **Login** → cookie JWT → `auth.middleware` → `req.user.companyId` do documento `User`.
3. **Rotas autenticadas** → services recebem `companyId` do token; Companies compara `:id` com token (`ensureTenant`).
4. **Rotas públicas** → tenant na URL `/public/.../companies/:companyId` + regras de eligibility.

Não há middleware global de tenant; **cada service** aplica filtros `companyId` (padrão repetido, não centralizado).

### Integração com outros módulos

| Módulo | Uso de `companyId` | Notas |
|--------|-------------------|--------|
| Auth / Users | Criação de tenant; `User.companyId` | Registo transaccional |
| Appointments | Filtros e conflitos por empresa | GW-3 transaccional |
| Clients | Repo/service scoped | Portal CLIENT |
| Services | CRUD scoped | |
| Availability / Exceptions | Modelos e repos com `companyId` | |
| Reports / Dashboard | Controllers passam `req.user.companyId` | |
| Notifications | `companyId` em model e queries | |
| Public booking / appointments | `:companyId` na URL | `isActive` na eligibility |
| Client invites | Scoped por empresa | |
| Reminders | Verifica `company.isActive` | |

Não existe módulo **Settings** dedicado.

---

## F. Segurança e multi-tenancy

| Risco | Criticidade | Evidência / mitigação |
|-------|-------------|------------------------|
| Acesso a `:id` de outra empresa (API autenticada) | **Baixa** | `ensureTenant` → 404 ([`CompanyService.ts`](../../server/src/modules/companies/services/CompanyService.ts) L39–44) |
| Cliente envia `companyId` no body para escalar tenant | **Baixa** | Controllers usam `req.user.companyId`; frontend não envia tenant ([`company.api.ts`](../../client/src/api/endpoints/company.api.ts)) |
| MANAGER/EMPLOYEE editam empresa | **Baixa** | Sem permissões `COMPANY_*` em [`rbac.ts`](../../server/src/constants/rbac.ts) |
| ADMIN apaga/desactiva empresa | **Baixa** | `COMPANY_DELETE` / activate/deactivate só **OWNER** |
| Staff com empresa `isActive: false` | **Média** | Login não bloqueia; público sim |
| Soft-delete + utilizadores activos | **Média** | Delete não revoga sessões automaticamente |
| `CompanyRepository.findById` sem filtro tenant no repo | **Média** | Service impõe tenant; risco se repo for usado directamente no futuro |
| Rotas públicas com `:companyId` | **Média** | By design; rate limit + eligibility; risco de enumeração, não de bypass autenticado |
| Nome de empresa único global | **Baixa (produto)** | Schema `unique: true` em `name` |

**RBAC:** OWNER — todas permissões COMPANY; ADMIN — read/update; MANAGER/EMPLOYEE/CLIENT — nenhuma permissão COMPANY.

---

## G. Testes

### Server (unitários — Companies)

| Ficheiro | Cobertura |
|----------|-----------|
| [`CompanyService.isolation.test.ts`](../../server/tests/unit/companies/CompanyService.isolation.test.ts) | Isolamento multi-tenant |
| [`CompanyService.behavior.test.ts`](../../server/tests/unit/companies/CompanyService.behavior.test.ts) | Timezone, 404, id inválido |
| [`CompanyService.logo.test.ts`](../../server/tests/unit/companies/CompanyService.logo.test.ts) | Logo service |
| [`CompanyMapper.logo.test.ts`](../../server/tests/unit/companies/CompanyMapper.logo.test.ts) | Mapper |
| [`CompanyRepository.test.ts`](../../server/tests/unit/companies/CompanyRepository.test.ts) | Repository |
| [`company-logo.routes.test.ts`](../../server/tests/unit/companies/company-logo.routes.test.ts) | Rotas logo (auth/RBAC) |

### Client

- [`CompanyPage.test.tsx`](../../client/src/pages/company/CompanyPage.test.tsx)
- [`CompanyForm.test.tsx`](../../client/src/components/company/CompanyForm.test.tsx)
- [`company.api.test.ts`](../../client/src/api/endpoints/company.api.test.ts)
- [`companyPermissions.test.ts`](../../client/src/config/companyPermissions.test.ts)
- [`companySlice.test.ts`](../../client/src/store/slices/companySlice.test.ts)

### Lacunas

- Sem suite de **integração** Mongo/supertest para CRUD HTTP completo de companies.
- Sem testes de **login + company inactive** ou **soft-delete + sessão**.
- Sem testes E2E activate/deactivate por role ADMIN vs OWNER.

### Execução na análise

Suite **não reexecutada** neste levantamento (apenas leitura). CI em `develop` documenta **1239** testes server verdes (ver relatórios CI GW-3 / GitHub Actions).

---

## H. Plano de implementação sugerido

### Etapa 1 — Lifecycle empresa vs auth

- **Objectivo:** alinhar `isActive` / `deletedAt` com login e middleware.
- **Funcionalidades:** bloquear ou limitar staff quando empresa inactiva ou soft-deleted.
- **Ficheiros prováveis:** `AuthService.ts`, `auth.middleware.ts`, eventualmente `CompanyService.delete`.
- **Dependências:** nenhuma.
- **Testes:** unit Auth; integração login.
- **Aceitação:** comportamento coerente com `PublicBookingEligibility`.

### Etapa 2 — Clarificar criação de empresa

- **Objectivo:** eliminar ambiguidade (`CompanyService.create` vazio).
- **Funcionalidades:** implementar ou remover método; documentar register como onboarding; opcional `POST /companies` se produto exigir.
- **Ficheiros:** `CompanyService.ts`, possivelmente `CompanyRoutes.ts`.
- **Testes:** regressão register + isolamento.
- **Aceitação:** API e código alinhados à decisão de produto.

### Etapa 3 — Expansão de dados (contacto, endereço, settings)

- **Objectivo:** campos de negócio acordados.
- **Funcionalidades:** schema, DTO, validators, UI.
- **Ficheiros:** model, DTOs, validators, `CompanyForm`, ops de índice se necessário.
- **Dependências:** secção **I** (aprovação de campos).
- **Testes:** unit + PATCH integração.
- **Aceitação:** contrato API ↔ frontend.

### Etapa 4 — Multi-tenant avançado (opcional)

- **Objectivo:** multi-empresa por user ou operador SaaS.
- **Funcionalidades:** membership, tenant activo, refactor auth payload.
- **Ficheiros:** `User.model`, auth, middleware tenant global.
- **Dependências:** decisão arquitectural major.
- **Testes:** isolamento extensivo.
- **Aceitação:** zero queries sem tenant efectivo.

### Etapa 5 — Cobertura CI

- **Objectivo:** integração HTTP companies no CI.
- **Funcionalidades:** supertest GET/PATCH, RBAC OWNER/ADMIN, activate/deactivate.
- **Ficheiros:** `server/tests/integration/companies/`.
- **Aceitação:** verde no GitHub Actions.

---

## I. Decisões para aprovação do responsável

1. Manter **uma empresa por utilizador** ou evoluir para **membership multi-empresa** + empresa activa na sessão?
2. **Nome único global** de empresa — manter ou passar a slug/composto?
3. **Empresa desactivada** — bloquear login de todo o staff ou apenas operações de escrita?
4. **Soft-delete empresa** — cascade de dados ou proibir delete com dependências?
5. **Desactivar/apagar** — manter exclusivo para **OWNER**?
6. **MANAGER** deve poder ver/editar timezone/logo da empresa?
7. Quais campos de **contacto/endereço** entram no MVP?
8. Existe **backoffice operador** SchedulerPro (listar todas as empresas)?
9. É necessário **cadastro de empresa** além do self-service register?

---

## Referências de código

Tenant no service:

```typescript
// CompanyService.ts — ensureTenant
if (id !== companyId) {
  throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
}
```

Sessão:

```typescript
// auth.middleware.ts
req.user = {
  userId: user._id.toString(),
  companyId: user.companyId.toString(),
  role: user.role,
  // ...
};
```

Método vazio:

```typescript
// CompanyService.ts
public async create() {}
```

---

## Handoff (outra IA)

- Estado actual: módulo **maduro** para tenant único por user; gaps são **produto** (campos, lifecycle) e **testes integração**, não ausência total do módulo.
- Próximo passo recomendado: fechar decisões **I.1, I.3, I.4** antes de schema ou auth changes.
- Relacionados: timezone por empresa documentado em [`STAGE_35_TIMEZONE_PER_COMPANY_AUDIT.md`](STAGE_35_TIMEZONE_PER_COMPANY_AUDIT.md), [`STAGE_36_AUTH_COMPANY_TIMEZONE_CONTRACT.md`](STAGE_36_AUTH_COMPANY_TIMEZONE_CONTRACT.md) (se ainda relevantes no repo).

**Nenhum commit** foi criado com este relatório até staging manual pelo utilizador.
