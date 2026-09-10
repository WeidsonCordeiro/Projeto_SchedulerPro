import { describe, expect, it, vi } from "vitest";
import availabilityApi from "./availability.api";
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

describe("availabilityApi", () => {
  it("gets /availability", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await availabilityApi.getAvailabilities();

    expect(apiClient.get).toHaveBeenCalledWith("/availability");
  });

  it("gets /availability/employee/:employeeId", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await availabilityApi.getEmployeeAvailabilities("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/availability/employee/abc123");
  });

  it("gets /availability/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await availabilityApi.getAvailability("abc123");

    expect(apiClient.get).toHaveBeenCalledWith("/availability/abc123");
  });

  it("posts /availability with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });

    await availabilityApi.createAvailability({
      employeeId: "abc123",
      dayOfWeek: 1,
      morningStart: "09:00",
      morningEnd: "12:00",
      afternoonStart: "13:00",
      afternoonEnd: "18:00",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/availability", {
      employeeId: "abc123",
      dayOfWeek: 1,
      morningStart: "09:00",
      morningEnd: "12:00",
      afternoonStart: "13:00",
      afternoonEnd: "18:00",
    });
  });

  it("patches /availability/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await availabilityApi.updateAvailability("abc123", {
      morningStart: "08:00",
      morningEnd: "11:00",
      afternoonStart: null,
      afternoonEnd: null,
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/availability/abc123", {
      morningStart: "08:00",
      morningEnd: "11:00",
      afternoonStart: null,
      afternoonEnd: null,
    });
  });

  it("deletes /availability/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await availabilityApi.deleteAvailability("abc123");

    expect(apiClient.delete).toHaveBeenCalledWith("/availability/abc123");
  });

  it("never sends companyId in any payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: null },
    });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: null },
    });

    await availabilityApi.createAvailability({
      employeeId: "abc123",
      dayOfWeek: 1,
      morningStart: "09:00",
      morningEnd: "12:00",
    });
    await availabilityApi.updateAvailability("abc123", {
      morningStart: "08:00",
      morningEnd: "11:00",
    });

    const postPayload = vi.mocked(apiClient.post).mock.calls[0][1];
    const patchPayload = vi.mocked(apiClient.patch).mock.calls[0][1];
    expect(postPayload).not.toHaveProperty("companyId");
    expect(patchPayload).not.toHaveProperty("companyId");
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(availabilityApi.getAvailabilities()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});