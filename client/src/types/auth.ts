export type Role = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: Role;
  companyId: string;
  isActive: boolean;
}

export interface AuthSession extends AuthUser {
  mustChangePassword: boolean;
}