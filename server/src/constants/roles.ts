/**
 * ==========================================================
 * Arquivo: roles.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir todos os papéis (Roles) do sistema.
 *
 * Roles representam QUEM é o usuário.
 *
 * Permissões representam O QUE ele pode fazer.
 *
 * Exemplo:
 *
 * Role:
 * OWNER
 *
 * Permissões:
 * USER_CREATE
 * USER_UPDATE
 * SERVICE_DELETE
 *
 * ==========================================================
 */

export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE",
  CLIENT = "CLIENT",
}

/**
 * Ordem hierárquica.
 *
 * Utilizada futuramente pelo RBAC.
 */

export const RoleHierarchy: Record<Role, number> = {
  [Role.OWNER]: 100,
  [Role.ADMIN]: 90,
  [Role.MANAGER]: 70,
  [Role.EMPLOYEE]: 40,
  [Role.CLIENT]: 10,
};
