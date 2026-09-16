import { describe, expect, it, vi } from "vitest";
import clientsApi from "./clients.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

describe("clientsApi", () => {
  it("gets /clients", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await clientsApi.getClients();

    expect(apiClient.get).toHaveBeenCalledWith("/clients");
  });

  it("gets /clients/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await clientsApi.getClient("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/clients/abc123");
  });

  it("gets /clients/me", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await clientsApi.getClientMe();

    expect(apiClient.get).toHaveBeenCalledWith("/clients/me");
  });

  it("posts /clients/:id/credentials with the password payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "credenciais definidas", data: null },
    });

    await clientsApi.setClientCredentials("abc123", {
      password: "password123",
      confirmPassword: "password123",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/clients/abc123/credentials", {
      password: "password123",
      confirmPassword: "password123",
    });
  });

  it("never sends companyId in the credentials payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "credenciais definidas", data: null },
    });

    await clientsApi.setClientCredentials("abc123", {
      password: "password123",
      confirmPassword: "password123",
    });

    const payload = vi.mocked(apiClient.post).mock.calls[0][1];
    expect(payload).not.toHaveProperty("companyId");
  });

  it("posts /clients with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });

    await clientsApi.createClient({
      name: "Ana",
      phone: "912345678",
      email: "ana@example.com",
      notes: "nada",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/clients", {
      name: "Ana",
      phone: "912345678",
      email: "ana@example.com",
      notes: "nada",
    });
  });

  it("patches /clients/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await clientsApi.updateClient("abc123", { name: "Ana Silva" });

    expect(apiClient.patch).toHaveBeenCalledWith("/clients/abc123", {
      name: "Ana Silva",
    });
  });

  it("deletes /clients/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await clientsApi.deleteClient("abc123");

    expect(apiClient.delete).toHaveBeenCalledWith("/clients/abc123");
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(clientsApi.getClients()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});