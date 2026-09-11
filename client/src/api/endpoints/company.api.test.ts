import { describe, expect, it, vi } from "vitest";
import companyApi from "./company.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

describe("companyApi", () => {
  it("gets /companies without sending companyId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await companyApi.getCompany();

    expect(apiClient.get).toHaveBeenCalledWith("/companies");
    // O frontend não envia companyId em nenhum lugar (nem query, nem body).
    const [url, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).toBe("/companies");
    expect(config).toBeUndefined();
  });

  it("patches /companies/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await companyApi.updateCompany("507f1f77bcf86cd799439012", {
      name: "salao do centro",
      timezone: "Europe/Lisbon",
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/companies/507f1f77bcf86cd799439012",
      {
        name: "salao do centro",
        timezone: "Europe/Lisbon",
      },
    );
  });

  it("patches with a single editable field (name)", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await companyApi.updateCompany("abc123", { name: "novo nome" });

    expect(apiClient.patch).toHaveBeenCalledWith("/companies/abc123", {
      name: "novo nome",
    });
  });

  it("patches with a single editable field (timezone)", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await companyApi.updateCompany("abc123", { timezone: "America/Sao_Paulo" });

    expect(apiClient.patch).toHaveBeenCalledWith("/companies/abc123", {
      timezone: "America/Sao_Paulo",
    });
  });

  it("does not include administrative fields in the update payload", async () => {
    const payload = {
      name: "salao",
      timezone: "Europe/Lisbon",
      // Campos administrativos nunca devem fazer parte do contrato real.
      companyId: "falso",
      isActive: false,
      deletedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { isActive, deletedAt, createdAt, updatedAt, ...expected } = payload;

    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await companyApi.updateCompany("abc123", {
      name: expected.name,
      timezone: expected.timezone,
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/companies/abc123", {
      name: "salao",
      timezone: "Europe/Lisbon",
    });
    expect(isActive).toBe(false);
    expect(deletedAt).toBeDefined();
    expect(createdAt).toBeDefined();
    expect(updatedAt).toBeDefined();
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(companyApi.getCompany()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("propagates validation errors during update", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(
      httpError(400, { message: "Timezone IANA Inválido." }),
    );

    await expect(
      companyApi.updateCompany("abc123", { timezone: "nao-existe/zona" }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});