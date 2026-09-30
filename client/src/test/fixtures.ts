import type { AuthSession, AuthUser } from "../types/auth";
import type { Company } from "../types/company";

export const user: AuthUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Owner Teste",
  email: "owner@example.com",
  avatar: null,
  role: "OWNER",
  companyId: "507f1f77bcf86cd799439012",
  isActive: true,
};

export const clientUser: AuthUser = {
  ...user,
  id: "507f1f77bcf86cd799439099",
  name: "Cliente Teste",
  email: "cliente@example.com",
  role: "CLIENT",
};

export const session: AuthSession = {
  ...user,
  mustChangePassword: false,
};

export const sessionRequiringChange: AuthSession = {
  ...user,
  mustChangePassword: true,
};

export const company: Company = {
  id: "507f1f77bcf86cd799439012",
  name: "salao do centro",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};