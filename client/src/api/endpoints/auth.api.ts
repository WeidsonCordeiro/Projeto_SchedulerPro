import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type { AuthSession } from "../../types/auth";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: {
    name: string;
    timezone?: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  async register(payload: RegisterPayload) {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>(
      "/auth/register",
      payload,
    );
    return data;
  },

  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>(
      "/auth/login",
      payload,
    );
    return data;
  },

  async logout() {
    const { data } = await apiClient.post<ApiResponse<null>>("/auth/logout");
    return data;
  },

  async getMe() {
    const { data } = await apiClient.get<ApiResponse<AuthSession>>("/auth/me");
    return data;
  },

  async refresh() {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>(
      "/auth/refresh",
    );
    return data;
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    const { data } = await apiClient.post<ApiResponse<null>>(
      "/auth/forgot-password",
      payload,
    );
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const { data } = await apiClient.post<ApiResponse<null>>(
      "/auth/reset-password",
      payload,
    );
    return data;
  },

  async changePassword(payload: ChangePasswordPayload) {
    const { data } = await apiClient.patch<ApiResponse<null>>(
      "/users/me/password",
      payload,
    );
    return data;
  },

  async verifyEmail(token: string) {
    const { data } = await apiClient.get<ApiResponse<null>>("/auth/verify-email", {
      params: { token },
    });
    return data;
  },
};

export default authApi;