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
  role: EmployeeRole;
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