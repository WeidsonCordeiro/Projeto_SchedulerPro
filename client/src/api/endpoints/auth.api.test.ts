import { describe, expect, it, vi } from "vitest";
import authApi from "./auth.api";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

describe("authApi", () => {
  it("posts /auth/register", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: "criado" } });

    await authApi.register({
      name: "Owner",
      email: "owner@example.com",
      password: "password123",
      confirmPassword: "password123",
      company: { name: "Empresa", timezone: "Europe/Lisbon" },
    });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ email: "owner@example.com" }));
  });

  it("posts /auth/login", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.login({ email: "owner@example.com", password: "password123" });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", { email: "owner@example.com", password: "password123" });
  });

  it("gets /auth/me", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.getMe();

    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
  });

  it("posts /auth/refresh", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.refresh();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/refresh");
  });

  it("posts /auth/logout", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.logout();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("posts /auth/forgot-password with email", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.forgotPassword({ email: "owner@example.com" });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "owner@example.com" });
  });

  it("gets /auth/verify-email with token query", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, message: "ok" } });

    await authApi.verifyEmail("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/auth/verify-email", { params: { token: "abc123" } });
  });
});