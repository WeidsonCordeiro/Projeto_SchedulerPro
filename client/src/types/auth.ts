import type { StoredImage } from "./image";

export type Role = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: StoredImage | null;
  role: Role;
  companyId: string;
  /** IANA da empresa; ausente em respostas antigas até o backend estar atualizado. */
  companyTimezone?: string;
  isActive: boolean;
  clientId?: string;
}

export interface AuthSession extends AuthUser {
  mustChangePassword: boolean;
}