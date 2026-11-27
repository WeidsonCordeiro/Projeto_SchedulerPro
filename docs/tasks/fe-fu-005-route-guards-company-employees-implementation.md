# FE-FU-005 — Guards `/company` e `/employees`

**Branch:** `feat/fe-fu-005-route-guards-company-employees`

- `RoleRestrictedRoute` com `getCompanyAbilities` / `getEmployeeAbilities`.
- Redirect `/` alinhado a `/reports`; guards em página mantidos.

## Teste manual

- MANAGER/EMPLOYEE em `/company` ou `/employees` → dashboard.
- OWNER/ADMIN → páginas normais.