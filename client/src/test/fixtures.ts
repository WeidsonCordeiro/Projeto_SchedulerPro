import type { AuthSession, AuthUser } from "../types/auth";

export const user: AuthUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Owner Teste",
  email: "owner@example.com",
  avatar: null,
  role: "OWNER",
  companyId: "507f1f77bcf86cd799439012",
  isActive: true,
};

export const session: AuthSession = {
  ...user,
  mustChangePassword: false,
};

export const sessionRequiringChange: AuthSession = {
  ...user,
  mustChangePassword: true,
};