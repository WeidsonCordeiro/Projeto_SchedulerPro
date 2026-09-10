import { describe, expect, it, vi } from "vitest";
import appointmentsApi from "./appointments.api";
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

const createdAppointment = {
  id: "appt1",
  companyId: "company1",
  clientId: "client1",
  serviceId: "service1",
  employeeId: "employee1",
  startAt: "2026-08-30T09:00:00.000Z",
  endAt: "2026-08-30T09:30:00.000Z",
  status: "scheduled",
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

describe("appointmentsApi", () => {
  it("gets /appointments", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: [] },
    });

    await appointmentsApi.getAppointments();

    expect(apiClient.get).toHaveBeenCalledWith("/appointments");
  });

  it("gets /appointments/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: "ok", data: createdAppointment },
    });

    await appointmentsApi.getAppointment("appt1");

    expect(apiClient.get).toHaveBeenCalledWith("/appointments/appt1");
  });

  it("posts /appointments with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: createdAppointment },
    });

    await appointmentsApi.createAppointment({
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-08-30T09:00:00.000Z",
      notes: "Pode trazer o cartão.",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/appointments", {
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-08-30T09:00:00.000Z",
      notes: "Pode trazer o cartão.",
    });
  });

  it("patches /appointments/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: createdAppointment },
    });

    await appointmentsApi.updateAppointment("appt1", {
      startAt: "2026-08-30T10:00:00.000Z",
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/appointments/appt1", {
      startAt: "2026-08-30T10:00:00.000Z",
    });
  });

  it("patches /appointments/:id/confirm", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "confirmado", data: createdAppointment },
    });

    await appointmentsApi.confirmAppointment("appt1");

    expect(apiClient.patch).toHaveBeenCalledWith("/appointments/appt1/confirm");
  });

  it("patches /appointments/:id/complete", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "concluído", data: createdAppointment },
    });

    await appointmentsApi.completeAppointment("appt1");

    expect(apiClient.patch).toHaveBeenCalledWith("/appointments/appt1/complete");
  });

  it("patches /appointments/:id/cancel", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "cancelado", data: createdAppointment },
    });

    await appointmentsApi.cancelAppointment("appt1");

    expect(apiClient.patch).toHaveBeenCalledWith("/appointments/appt1/cancel");
  });

  it("patches /appointments/:id/no-show", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "não compareceu", data: createdAppointment },
    });

    await appointmentsApi.markAppointmentAsNoShow("appt1");

    expect(apiClient.patch).toHaveBeenCalledWith("/appointments/appt1/no-show");
  });

  it("deletes /appointments/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await appointmentsApi.deleteAppointment("appt1");

    expect(apiClient.delete).toHaveBeenCalledWith("/appointments/appt1");
  });

  it("never sends companyId in any payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "criado", data: createdAppointment },
    });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, message: "atualizado", data: createdAppointment },
    });

    await appointmentsApi.createAppointment({
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-08-30T09:00:00.000Z",
    });
    await appointmentsApi.updateAppointment("appt1", {
      serviceId: "service2",
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

    await expect(appointmentsApi.getAppointments()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});