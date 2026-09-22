import type { Role } from "../types/auth";

export interface ReportAbilities {
  canView: boolean;
}

/**
 * Espelha a autorização real do backend
 * (server/src/modules/reports/routes/ReportRoutes.ts):
 * apenas OWNER, ADMIN e MANAGER acessam os relatórios.
 *
 * Este é apenas UX. A autorização real continua no backend.
 */
const CAN_VIEW_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];

export function getReportAbilities(role: Role | null): ReportAbilities {
  if (!role) {
    return { canView: false };
  }
  return {
    canView: CAN_VIEW_ROLES.includes(role),
  };
}