# SchedulerPro API Contract

Stage 11 - API Contract Audit

Base URL: /api

This document reflects the current implementation after auditing routes,
middlewares, validators, controllers, services, repositories and response
handling. Authentication uses httpOnly cookies.

## 1. Common response envelope

Success:

    {
      "success": true,
      "message": "Mensagem da operacao.",
      "data": {}
    }

Error:

    {
      "success": false,
      "message": "Mensagem do erro."
    }

The data value may be an object, array or null. The optional errors field
exists in the TypeScript response type, but validation currently returns only
the first validation message and does not populate field-level errors.

Known error statuses: 400, 401, 403, 404 and 409. Status 422 is declared but
is not used by the audited routes. Unexpected errors return 500 and the
message "Erro interno do servidor.".

Dates are serialized as ISO 8601 strings. Resource IDs are exposed as id
strings by the mappers. Company context comes from the authenticated user;
the frontend must not send companyId to select the active tenant.

## 2. Authentication and cookies

Cookies:

| Cookie | Purpose | httpOnly | secure | sameSite | Lifetime |
|---|---|---:|---:|---|---:|
| accessToken | Access authentication | true | production only | strict | 15 minutes |
| refreshToken | Token refresh | true | production only | strict | 7 days |

Login and register set both cookies. Refresh replaces both. Logout clears both.
The frontend cannot read these cookies through JavaScript.

The access token uses the access secret and must have type ACCESS. The refresh
token uses a separate secret. There is no JWT blacklist or immediate token
revocation mechanism.

Roles: OWNER, ADMIN, MANAGER, EMPLOYEE, CLIENT.

Appointment statuses: scheduled, confirmed, completed, cancelled, no-show.

DayOfWeek values:
SUNDAY=0, MONDAY=1, TUESDAY=2, WEDNESDAY=3, THURSDAY=4, FRIDAY=5,
SATURDAY=6.

## 3. Endpoint inventory

All paths include the /api prefix.

### Health

GET /api/health

- Auth: none.
- Request: no body, params or query.
- Success: 200.
- Data: uptime number and timestamp ISO date string.

### Auth

POST /api/auth/register

- Auth: none.
- Body: name, email, password, confirmPassword and company.name.
- Optional: company.timezone; default Europe/Lisbon.
- Timezone must be valid IANA.
- Backend creates company, OWNER user, IDs, password hash, status fields,
  timestamps and authentication cookies.
- Success: 201.
- Data: authenticated user plus mustChangePassword.
- Errors: 400 validation/timezone/password mismatch; 409 duplicate email or
  company.

Example body:

    {
      "name": "Owner Teste",
      "email": "owner@example.com",
      "password": "password123",
      "confirmPassword": "password123",
      "company": {
        "name": "Empresa Teste",
        "timezone": "Europe/Lisbon"
      }
    }

POST /api/auth/login

- Auth: none.
- Body: email and password.
- Success: 200.
- Data: authenticated user plus mustChangePassword; both cookies are set.
- Errors: 400 invalid body; 401 invalid credentials; 403 inactive, blocked or
  unverified user.

POST /api/auth/refresh

- Auth middleware: none; refreshToken cookie required.
- Body: none.
- Success: 200.
- Data: authenticated user plus mustChangePassword; both cookies are replaced.
- Errors: 401 missing, invalid or expired token; 403 inactive/blocked user;
  404 user not found.

GET /api/auth/me

- Auth: accessToken cookie.
- Success: 200.
- Data: id, name, email, avatar, role, companyId, isActive and
  mustChangePassword.
- Errors: 401 invalid/missing token; 403 inactive/blocked; 404 user missing.

POST /api/auth/logout

- Auth: accessToken cookie.
- Success: 200 with data null.
- Clears both authentication cookies.

GET /api/auth/verify-email?token=...

- Auth: none.
- Query: required token.
- Success: 200 with data null.
- Errors: 400/401 invalid or expired token; 404 user missing.
- Repeating verification for an already verified user is accepted.

POST /api/auth/forgot-password

- Auth: none.
- Body: email.
- Success: 200 with data null.
- Does not reveal whether the email exists.
- Invalid body: 400.

POST /api/auth/reset-password

- Auth: none.
- Body: token and password with minimum 8 characters.
- Success: 200 with data null.
- Invalid, used or expired token: 400. Missing user: 404.

### Companies

All company routes require authentication, completed password change and the
listed permission. Company IDs are restricted to the authenticated company.

GET /api/companies
- Permission: COMPANY_READ.
- Success: 200, array of companies.

GET /api/companies/:id
- Permission: COMPANY_READ.
- id: Mongo ObjectId.
- Success: 200, company object.
- Invalid id: 400. Missing, deleted or foreign resource: 404.

PATCH /api/companies/:id
- Permission: COMPANY_UPDATE.
- Body: optional name and timezone.
- Success: 200, company object.
- Invalid body/timezone: 400. Missing/foreign resource: 404.

DELETE /api/companies/:id
- Permission: COMPANY_DELETE.
- Success: 200 with data null.
- Soft delete.

PATCH /api/companies/:id/activate
- Permission: COMPANY_ACTIVATE.
- Success: 200, company object.

PATCH /api/companies/:id/deactivate
- Permission: COMPANY_DEACTIVATE.
- Success: 200, company object.

### Users

All user routes require completed password change except
PATCH /api/users/me/password.

GET /api/users
- Permission: USER_READ.
- Success: 200, array of users.

POST /api/users
- Permission: USER_CREATE.
- Body: name, email, password, confirmPassword and role.
- Backend generates companyId, password hash, status and audit fields.
- Success: 201, user object.
- Errors: 400 validation; 403 permission/hierarchy; 409 duplicate email.

GET /api/users/:id
- Permission: USER_READ.
- id: Mongo ObjectId.
- Success: 200, user object.
- Invalid id: 400. Missing/deleted/foreign resource: 404.

PUT /api/users/:id
- Permission: USER_UPDATE.
- Body: optional name, email, role and avatar.
- Success: 200, user object.
- Role changes follow the existing hierarchy and self-escalation rules.

DELETE /api/users/:id
- Permission: USER_DELETE.
- Success: 200 with data null.
- Current behavior is soft delete/deactivation.

PATCH /api/users/:id/activate
- Permission: USER_UPDATE.
- Success: 200, user object.

PATCH /api/users/:id/deactivate
- Permission: USER_UPDATE.
- Success: 200, user object.

PATCH /api/users/me/password
- Auth: accessToken cookie.
- Password-change middleware is intentionally not applied.
- Body: currentPassword, newPassword and confirmPassword.
- Success: 200 with data null.
- Invalid body/password: 400; unauthenticated: 401.

### Clients

All routes require authentication, completed password change and the listed
permission. CompanyId is derived from the authenticated context.

POST /api/clients
- Permission: CLIENT_CREATE.
- Body: name, phone, optional email and notes.
- Success: 201, client object.
- Backend generates id, companyId, isActive, deletedAt and timestamps.

GET /api/clients
- Permission: CLIENT_READ.
- Success: 200, array of clients.

GET /api/clients/:id
- Permission: CLIENT_READ.
- id: Mongo ObjectId.
- Success: 200, client object.
- Invalid id: 400. Missing/deleted/foreign resource: 404.

PATCH /api/clients/:id
- Permission: CLIENT_UPDATE.
- Body: optional name, phone, email and notes.
- Success: 200, client object.

PATCH /api/clients/:id/activate
- Permission: CLIENT_UPDATE.
- Success: 200, client object.

PATCH /api/clients/:id/deactivate
- Permission: CLIENT_UPDATE.
- Success: 200, client object.

DELETE /api/clients/:id
- Permission: CLIENT_DELETE.
- Success: 200 with data null.
- Soft delete.

### Services

POST /api/services
- Permission: SERVICE_CREATE.
- Body: name, duration integer, price number, optional description.
- Success: 201, service object.
- Backend generates id, companyId, isActive, deletedAt and timestamps.

GET /api/services
- Permission: SERVICE_READ.
- Success: 200, array of services.

GET /api/services/:id
- Permission: SERVICE_READ.
- id: Mongo ObjectId.
- Success: 200, service object.
- Invalid id: 400. Missing: 404. Foreign existing resource currently: 403.

PATCH /api/services/:id
- Permission: SERVICE_UPDATE.
- Body: optional name, description, duration and price.
- Success: 200, service object.

PATCH /api/services/:id/activate
- Permission: SERVICE_UPDATE.
- Success: 200, service object.

PATCH /api/services/:id/deactivate
- Permission: SERVICE_UPDATE.
- Success: 200, service object.

DELETE /api/services/:id
- Permission: SERVICE_DELETE.
- Success: 200 with data null.
- Soft delete.

### Availability

POST /api/availability
- Permission: AVAILABILITY_CREATE.
- Body: employeeId, dayOfWeek and at least one complete period.
- Times use local company clock in HH:mm.
- Success: 201, availability object.
- Errors: 400 validation; 404 employee/company; 409 duplicate availability.

Example:

    {
      "employeeId": "ObjectId",
      "dayOfWeek": 1,
      "morningStart": "09:00",
      "morningEnd": "12:00",
      "afternoonStart": "13:00",
      "afternoonEnd": "18:00"
    }

GET /api/availability
- Permission: AVAILABILITY_READ.
- Success: 200, availability array.

GET /api/availability/employee/:employeeId
- Permission: AVAILABILITY_READ.
- employeeId: Mongo ObjectId.
- Success: 200, array for employee.
- Invalid/foreign/inactive employee: 400 or 404 according to failure point.

GET /api/availability/:id
- Permission: AVAILABILITY_READ.
- id: Mongo ObjectId.
- Success: 200, availability object.
- Invalid id: 400. Missing/deleted/foreign: 404.

PATCH /api/availability/:id
- Permission: AVAILABILITY_UPDATE.
- Body: optional employeeId, dayOfWeek and morning/afternoon period fields.
- Success: 200, availability object.
- Invalid body/id: 400; missing/foreign: 404; duplicate: 409.

DELETE /api/availability/:id
- Permission: AVAILABILITY_DELETE.
- Success: 200 with data null.
- Soft delete.

### Appointments

POST /api/appointments
- Permission: APPOINTMENT_CREATE.
- Body: clientId, serviceId, employeeId, startAt ISO 8601, optional notes.
- endAt is calculated from service duration.
- status starts as scheduled.
- Success: 201, appointment object.
- Errors: 400 validation/inactive references; 404 missing/cross-company
  references; 409 availability or appointment conflict.

Example:

    {
      "clientId": "ObjectId",
      "serviceId": "ObjectId",
      "employeeId": "ObjectId",
      "startAt": "2026-08-30T09:00:00.000Z",
      "notes": "optional"
    }

GET /api/appointments
- Permission: APPOINTMENT_READ.
- Success: 200, array sorted by startAt.

GET /api/appointments/:id
- Permission: APPOINTMENT_READ.
- id: Mongo ObjectId.
- Success: 200, appointment object.
- Invalid id: 400; missing/deleted/foreign: 404.

PATCH /api/appointments/:id
- Permission: APPOINTMENT_UPDATE.
- Body: optional clientId, serviceId, employeeId, startAt and notes.
- endAt and status are not general update fields.
- Success: 200, updated appointment; endAt is recalculated.

PATCH /api/appointments/:id/confirm
- Permission: APPOINTMENT_UPDATE.
- Transition scheduled -> confirmed.
- Success: 200, appointment.

PATCH /api/appointments/:id/complete
- Permission: APPOINTMENT_UPDATE.
- Transition confirmed -> completed.
- Success: 200, appointment.

PATCH /api/appointments/:id/cancel
- Permission: APPOINTMENT_UPDATE.
- Transition scheduled/confirmed -> cancelled.
- Success: 200, appointment.

PATCH /api/appointments/:id/no-show
- Permission: APPOINTMENT_UPDATE.
- Transition confirmed -> no-show.
- Success: 200, appointment.

DELETE /api/appointments/:id
- Permission: APPOINTMENT_DELETE.
- Success: 200 with data null.
- Soft delete.

## 4. Resource fields

Company:
id, name, timezone, isActive, createdAt, updatedAt.

User:
id, name, email, role, companyId, createdAt, updatedAt.
Auth responses additionally expose avatar, isActive and mustChangePassword.
passwordHash is never returned.

Client:
id, name, email, phone, companyId, notes, isActive, createdAt, updatedAt.

Service:
id, companyId, name, description, duration, price, isActive, createdAt,
updatedAt.

Availability:
id, companyId, employeeId, dayOfWeek, morningStart, morningEnd,
afternoonStart, afternoonEnd, createdAt, updatedAt.

Appointment:
id, companyId, clientId, serviceId, employeeId, startAt, endAt, status,
notes, createdAt, updatedAt.

deletedAt is not returned by resource mappers.

## 5. Permissions by role

The route middleware is authoritative; frontend visibility is only UX.

| Role | Permissions |
|---|---|
| OWNER | All declared permissions |
| ADMIN | User create/read/update; company read/update; client create/read/update; service create/read/update; appointment create/read/update; availability create/read/update |
| MANAGER | Client create/read/update; service read; appointment create/read/update; availability read/update |
| EMPLOYEE | Client read; service read; appointment read/update; availability read |
| CLIENT | Appointment read |

## 6. Findings and actions

| ID | Severity | Area | Problem | Action |
|---|---|---|---|---|
| API-01 | HIGH | Register validation | company.name was used by AuthService but was not validated by the register route. | Corrected with nested validation and unit test. |
| API-02 | MEDIUM | Create status | Register and user creation returned 200 while other creates returned 201. | Corrected to 201; controller tests added. |
| API-03 | MEDIUM | Auth response | Register and refresh omitted mustChangePassword although login returned it. | Corrected; register, refresh and me expose it consistently. |
| API-04 | MEDIUM | Validation errors | The response type allows errors[], but validation returns only the first message and no field names. | Documented; existing error contract preserved. |
| API-05 | LOW | Cross-tenant status | Most foreign resources return 404; service findById currently returns 403. | Documented; behavior preserved. |
| API-06 | INFO | Lists | No pagination, filters or query ordering parameters exist. | Documented; no functionality added. |
| API-07 | INFO | JWT | Logout clears cookies but does not revoke already-issued JWTs. | Existing future architectural improvement; not implemented. |

## 7. Scope

No frontend was created. No React, Vite, Axios, Router, hooks, stores or
frontend auth context were added.

No pagination, filters, permissions, business features, JWT blacklist or
refresh-token rotation were added.

Only minimal contract corrections were made:
- register validates company.name;
- register and user creation return 201;
- register and refresh include mustChangePassword;
- me includes mustChangePassword.

All other observed behavior remains as implemented.

