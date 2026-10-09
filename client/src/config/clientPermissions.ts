import type { Role } from "../types/auth";

export interface ClientAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /**
   * Emitir convite de conta CLIENT (Stage 32).
   *
   * Mais restrito do que `canUpdate`: o backend usa
   * `authorize(OWNER, ADMIN)` — o MANAGER gere o dia a dia do
   * salon mas não cria contas de acesso, mesmo tendo
   * `CLIENT_UPDATE` para editar o cadastro. Espelha o RBAC do
   * servidor; o backend continua a ser a autoridade final.
   */
  canInvite: boolean;
}

const CAN_MANAGE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];
const CAN_INVITE_ROLES: Role[] = ["OWNER", "ADMIN"];

/**
 * Abilities de Clients por role, espelhando o RBAC do backend
 * (owner/admin/manager gestionam; employee apenas lê; client não acessa).
 * O backend continua sendo a autoridade final.
 */
export function getClientAbilities(role: Role | null): ClientAbilities {
  if (!role) {
    return {
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canInvite: false,
    };
  }

  return {
    canList: CAN_LIST_ROLES.includes(role),
    canCreate: CAN_MANAGE_ROLES.includes(role),
    canUpdate: CAN_MANAGE_ROLES.includes(role),
    canDelete: role === "OWNER",
    canInvite: CAN_INVITE_ROLES.includes(role),
  };
}
