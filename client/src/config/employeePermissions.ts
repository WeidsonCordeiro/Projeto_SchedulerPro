import type { Role } from "../types/auth";

export interface EmployeeAbilities {
  canList: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
}

const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_MANAGE_ROLES: Role[] = ["OWNER", "ADMIN"];
const CAN_DELETE_ROLES: Role[] = ["OWNER"];

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  EMPLOYEE: 40,
  CLIENT: 10,
};

const TEAM_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];

/**
 * Espelha o canAssignRole do backend (hierarquia de roles), limitado às roles
 * de equipa (exclui CLIENT), já que a tela Funcionários serve o time da empresa.
 */
export function canAssignEmployeeRole(
  actorRole: Role | null,
  targetRole: Role,
): boolean {
  if (!actorRole) {
    return false;
  }
  return (
    TEAM_ROLES.includes(targetRole) &&
    ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole]
  );
}

export function getAssignableEmployeeRoles(actorRole: Role | null): Role[] {
  if (!actorRole) {
    return [];
  }
  return TEAM_ROLES.filter((role) => canAssignEmployeeRole(actorRole, role));
}

/**
 * Abilities de Funcionários por role, espelhando o RBAC do backend
 * (owner gerencia tudo; admin cria/edita/ativa/desativa mas não exclui;
 * manager/employee/client não acessam). O backend continua sendo a autoridade final.
 */
export function getEmployeeAbilities(role: Role | null): EmployeeAbilities {
  if (!role) {
    return {
      canList: false,
      canCreate: false,
      canEdit: false,
      canActivate: false,
      canDeactivate: false,
      canDelete: false,
    };
  }

  return {
    canList: CAN_LIST_ROLES.includes(role),
    canCreate: CAN_MANAGE_ROLES.includes(role),
    canEdit: CAN_MANAGE_ROLES.includes(role),
    canActivate: CAN_MANAGE_ROLES.includes(role),
    canDeactivate: CAN_MANAGE_ROLES.includes(role),
    canDelete: CAN_DELETE_ROLES.includes(role),
  };
}