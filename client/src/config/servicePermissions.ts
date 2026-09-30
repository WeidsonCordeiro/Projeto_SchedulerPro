import type { Role } from "../types/auth";

export interface ServiceAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const CAN_MANAGE_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];

/**
 * Abilities de Services por role, espelhando o RBAC do backend
 * (owner/admin gestionam; manager/employee apenas leem; client não acessa).
 * O backend continua sendo a autoridade final.
 */
export function getServiceAbilities(role: Role | null): ServiceAbilities {
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