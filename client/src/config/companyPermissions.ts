import type { Role } from "../types/auth";

export interface CompanyAbilities {
  canView: boolean;
  canUpdate: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
}

/**
 * Espelha o RBAC real do backend (server/src/constants/rbac.ts +
 * server/src/middlewares/permission.middleware.ts):
 *
 *  - COMPANY_READ        (GET /companies)           -> OWNER, ADMIN
 *  - COMPANY_UPDATE      (PATCH /companies/:id)     -> OWNER, ADMIN
 *  - COMPANY_ACTIVATE    (PATCH .../activate)       -> OWNER
 *  - COMPANY_DEACTIVATE  (PATCH .../deactivate)     -> OWNER
 *  - MANAGER, EMPLOYEE e CLIENT não possuem nenhuma permissão de empresa.
 *
 * Este é apenas UX. A autorização real continua no backend.
 */
const CAN_VIEW_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_UPDATE_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_LIFECYCLE_ROLES: Role[] = ["OWNER"];

export function getCompanyAbilities(role: Role | null): CompanyAbilities {
  if (!role) {
    return {
      canView: false,
      canUpdate: false,
      canActivate: false,
      canDeactivate: false,
    };
  }

  const canLifecycle = CAN_LIFECYCLE_ROLES.includes(role);

  return {
    canView: CAN_VIEW_ROLES.includes(role),
    canUpdate: CAN_UPDATE_ROLES.includes(role),
    canActivate: canLifecycle,
    canDeactivate: canLifecycle,
  };
}