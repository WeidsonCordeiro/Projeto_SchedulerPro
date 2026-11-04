import type { Role } from "../types/auth";

export function getNotFoundHomePath(
  isAuthenticated: boolean,
  mustChangePassword: boolean,
  role: Role | undefined,
): string {
  if (!isAuthenticated) {
    return "/login";
  }
  if (mustChangePassword) {
    return "/change-password";
  }
  if (role === "CLIENT") {
    return "/portal";
  }
  return "/";
}

export function getNotFoundHomeLabel(
  isAuthenticated: boolean,
  mustChangePassword: boolean,
  role: Role | undefined,
): string {
  if (!isAuthenticated) {
    return "Ir para o início";
  }
  if (mustChangePassword) {
    return "Alterar senha";
  }
  if (role === "CLIENT") {
    return "Ir para o portal";
  }
  return "Ir para o painel";
}
