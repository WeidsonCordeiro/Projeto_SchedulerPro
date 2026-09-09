import type { Role } from "../types/auth";

export interface MenuItem {
  label: string;
  path: string;
  roles: Role[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/",
    roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"],
  },
  {
    label: "Clientes",
    path: "/clients",
    roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Serviços",
    path: "/services",
    roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Funcionários",
    path: "/employees",
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Disponibilidade",
    path: "/availability",
    roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Agendamentos",
    path: "/appointments",
    roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"],
  },
  {
    label: "Empresa",
    path: "/company",
    roles: ["OWNER", "ADMIN"],
  },
];

export function getMenuItemsForRole(role: Role | null): MenuItem[] {
  if (!role) {
    return [];
  }
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}
