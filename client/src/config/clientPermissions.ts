import type { Role } from "../types/auth";

export interface ClientAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const CAN_MANAGE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];

/**
 * Abilities de Clients por role, espelhando o RBAC do backend
 * (owner/admin/manager gestionam; employee apenas lê; client não acessa).
 * O backend continua sendo a autoridade final.
 */
export function getClientAbilities(role: Role | null): ClientAbilities {
  if (!role) {
    return { canList: false, canCreate: false, canUpdate: false, canDelete: false };
  }

  return {
    canList: CAN_LIST_ROLES.includes(role),
    canCreate: CAN_MANAGE_ROLES.includes(role),
    canUpdate: CAN_MANAGE_ROLES.includes(role),
    canDelete: role === "OWNER",
  };
}