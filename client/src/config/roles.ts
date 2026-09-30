import type { Role } from "../types/auth";

/**
 * Rótulos PT para os perfis (roles) do sistema, espelhando a enum Role do
 * backend (OWNER, ADMIN, MANAGER, EMPLOYEE, CLIENT).
 */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
  CLIENT: "Cliente",
};