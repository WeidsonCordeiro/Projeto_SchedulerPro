import { describe, expect, it, vi } from "vitest";
import publicAppointmentsApi from "./publicAppointments.api";
import type { PublicAppointment } from "../../types/publicAppointment";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

const appointment: PublicAppointment = {
  id: "apt1",
  startAt: "2026-10-10T14:30:00.000Z",
  endAt: "2026-10-10T15:00:00.000Z",
  status: "scheduled",
  clientName: "Maria Silva",
  service: { id: "svc1", name: "Corte de cabelo" },
  employee: { id: "emp1", name: "João Silva", avatarUrl: null },
};

const TOKEN = "aB3-_xYzPublicToken0123456789abcdefghij";

describe("publicAppointmentsApi", () => {
  it("gets /public/appointments/:token", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: appointment },
    });

    const response = await publicAppointmentsApi.getByToken(TOKEN);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/public/appointments/${TOKEN}`,
    );
    expect(response.data).toEqual(appointment);
  });

  it("patches /public/appointments/:token with the given payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "ok", data: appointment },
    });

    await publicAppointmentsApi.updateByToken(TOKEN, { notes: "Primeira vez" });

    expect(apiClient.patch).toHaveBeenCalledWith(
      `/public/appointments/${TOKEN}`,
      { notes: "Primeira vez" },
    );
  });

  it("deletes /public/appointments/:token without a body", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "ok", data: appointment },
    });

    await publicAppointmentsApi.cancelByToken(TOKEN);

    // O backend recusa com 400 qualquer corpo no DELETE, `status` incluído.
    expect(apiClient.delete).toHaveBeenCalledWith(
      `/public/appointments/${TOKEN}`,
    );
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
  });

  it("encodes the token so it can never change the requested route", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: appointment },
    });

    await publicAppointmentsApi.getByToken("../../users");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/public/appointments/..%2F..%2Fusers",
    );
  });

  it("propagates failures instead of masking them", async () => {
    const failure = new Error("Request failed");
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(publicAppointmentsApi.getByToken(TOKEN)).rejects.toBe(failure);
  });
});