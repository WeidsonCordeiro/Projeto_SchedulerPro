import { describe, expect, it, vi } from "vitest";
import employeesApi from "./employees.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

describe("employeesApi", () => {
  it("gets /users", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await employeesApi.getEmployees();

    expect(apiClient.get).toHaveBeenCalledWith("/users");
  });

  it("gets /users/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await employeesApi.getEmployee("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/users/abc123");
  });

  it("posts /users with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });

    await employeesApi.createEmployee({
      name: "Ana Silva",
      email: "ana@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      role: "EMPLOYEE",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/users", {
      name: "Ana Silva",
      email: "ana@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      role: "EMPLOYEE",
    });
  });

  it("puts /users/:id with the update payload", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await employeesApi.updateEmployee("abc123", { name: "Ana Souza" });

    expect(apiClient.put).toHaveBeenCalledWith("/users/abc123", {
      name: "Ana Souza",
    });
  });

  it("patches /users/:id/activate", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "ativado", data: null },
    });

    await employeesApi.activateEmployee("abc123");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/abc123/activate");
  });

  it("patches /users/:id/deactivate", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "desativado", data: null },
    });

    await employeesApi.deactivateEmployee("abc123");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/abc123/deactivate");
  });

  it("deletes /users/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await employeesApi.deleteEmployee("abc123");

    expect(apiClient.delete).toHaveBeenCalledWith("/users/abc123");
  });

  it("never sends companyId in any payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await employeesApi.createEmployee({
      name: "Ana Silva",
      email: "ana@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      role: "EMPLOYEE",
    });
    await employeesApi.updateEmployee("abc123", {
      name: "Ana Silva",
      email: "ana@example.com",
    });

    const postPayload = vi.mocked(apiClient.post).mock.calls[0][1];
    const putPayload = vi.mocked(apiClient.put).mock.calls[0][1];
    expect(postPayload).not.toHaveProperty("companyId");
    expect(putPayload).not.toHaveProperty("companyId");
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(employeesApi.getEmployees()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});