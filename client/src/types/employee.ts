import type { StoredImage } from "./image";

export type EmployeeRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "CLIENT";

export interface Employee {
  id: string;
  name: string;
  email: string;
  /**
   * Foto do funcionário. `null`/ausente quando a entidade não tem imagem.
   * Opcional para tolerar respostas parciais; o backend devolve sempre
   * `{ url, publicId } | null`.
   */
  avatar?: StoredImage | null;
  role: EmployeeRole;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: EmployeeRole;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  role?: EmployeeRole;
}