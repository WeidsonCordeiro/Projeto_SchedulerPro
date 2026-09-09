import { describe, expect, it, vi } from "vitest";
import servicesApi from "./services.api";
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

describe("servicesApi", () => {
  it("gets /services", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await servicesApi.getServices();

    expect(apiClient.get).toHaveBeenCalledWith("/services");
  });

  it("gets /services/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await servicesApi.getService("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/services/abc123");
  });

  it("posts /services with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });

    await servicesApi.createService({
      name: "Corte de cabelo",
      description: "Corte simples",
      duration: 30,
      price: 15.5,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/services", {
      name: "Corte de cabelo",
      description: "Corte simples",
      duration: 30,
      price: 15.5,
    });
  });

  it("patches /services/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await servicesApi.updateService("abc123", { duration: 45 });

    expect(apiClient.patch).toHaveBeenCalledWith("/services/abc123", {
      duration: 45,
    });
  });

  it("patches /services/:id/activate", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "ativado", data: null },
    });

    await servicesApi.activateService("abc123");

    expect(apiClient.patch).toHaveBeenCalledWith("/services/abc123/activate");
  });

  it("patches /services/:id/deactivate", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "desativado", data: null },
    });

    await servicesApi.deactivateService("abc123");

    expect(apiClient.patch).toHaveBeenCalledWith("/services/abc123/deactivate");
  });

  it("deletes /services/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await servicesApi.deleteService("abc123");

    expect(apiClient.delete).toHaveBeenCalledWith("/services/abc123");
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(servicesApi.getServices()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});