/**
 * ==========================================================
 * Arquivo: rbac.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir quais permissões pertencem a cada função
 * (role) do sistema.
 *
 * ==========================================================
 */

import { Permission } from "./permissions";
import { Role } from "./roles";

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,

    Permission.COMPANY_READ,
    Permission.COMPANY_UPDATE,

    Permission.CLIENT_CREATE,
    Permission.CLIENT_READ,
    Permission.CLIENT_UPDATE,
    Permission.CLIENT_DELETE,

    Permission.SERVICE_CREATE,
    Permission.SERVICE_READ,
    Permission.SERVICE_UPDATE,
    Permission.SERVICE_DELETE,

    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
    Permission.APPOINTMENT_DELETE,
  ],

  [Role.ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,

    Permission.CLIENT_CREATE,
    Permission.CLIENT_READ,
    Permission.CLIENT_UPDATE,

    Permission.SERVICE_CREATE,
    Permission.SERVICE_READ,
    Permission.SERVICE_UPDATE,

    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
  ],

  [Role.MANAGER]: [
    Permission.CLIENT_CREATE,
    Permission.CLIENT_READ,
    Permission.CLIENT_UPDATE,

    Permission.SERVICE_READ,

    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
  ],

  [Role.EMPLOYEE]: [
    Permission.CLIENT_READ,
    Permission.SERVICE_READ,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_UPDATE,
  ],

  [Role.CLIENT]: [Permission.APPOINTMENT_READ],
};
