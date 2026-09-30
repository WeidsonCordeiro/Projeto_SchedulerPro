import type { Role } from "../types/auth";

export interface AvailabilityAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];
const CAN_CREATE_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_UPDATE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const CAN_DELETE_ROLES: Role[] = ["OWNER"];

/**
 * Abilities de Availability por role, espelhando o RBAC do backend
 * (owner gerencia tudo; admin cria/edita/lê mas não exclui; manager lê e
 * edita disponibilidades existentes; employee apenas lê; client não acessa).
 * O backend continua sendo a autoridade final.
 */
export function getAvailabilityAbilities(
  role: Role | null,
): AvailabilityAbilities {
  if (!role) {
    return {
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  return {
    canList: CAN_LIST_ROLES.includes(role),
    canCreate: CAN_CREATE_ROLES.includes(role),
    canUpdate: CAN_UPDATE_ROLES.includes(role),
    canDelete: CAN_DELETE_ROLES.includes(role),
  };
}