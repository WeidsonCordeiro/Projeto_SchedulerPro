import type { Role } from "../types/auth";

export interface AppointmentAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canStatus: boolean;
  canDelete: boolean;
}

/**
 * Espelha o RBAC real do backend (server/src/constants/rbac.ts) para o módulo
 * de agendamentos:
 * - APPOINTMENT_CREATE: OWNER, ADMIN, MANAGER
 * - APPOINTMENT_READ: todas as roles
 * - APPOINTMENT_UPDATE: OWNER, ADMIN, MANAGER, EMPLOYEE (inclui os endpoints
 *   de status /confirm, /complete, /cancel e /no-show)
 * - APPOINTMENT_DELETE: OWNER
 *
 * O backend permanece a autoridade final; esta config apenas ajusta a UI.
 */
const CAN_LIST_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"];
const CAN_CREATE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const CAN_UPDATE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];
const CAN_DELETE_ROLES: Role[] = ["OWNER"];

/**
 * A troca de status usa endpoints protegidos por APPOINTMENT_UPDATE, logo
 * possui exatamente as mesmas roles de canUpdate.
 */
const CAN_STATUS_ROLES: Role[] = CAN_UPDATE_ROLES;

export function getAppointmentAbilities(role: Role | null): AppointmentAbilities {
  if (!role) {
    return {
      canList: false,
      canCreate: false,
      canUpdate: false,
      canStatus: false,
      canDelete: false,
    };
  }

  return {
    canList: CAN_LIST_ROLES.includes(role),
    canCreate: CAN_CREATE_ROLES.includes(role),
    canUpdate: CAN_UPDATE_ROLES.includes(role),
    canStatus: CAN_STATUS_ROLES.includes(role),
    canDelete: CAN_DELETE_ROLES.includes(role),
  };
}