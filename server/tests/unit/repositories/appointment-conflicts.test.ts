import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const { appointment } = vi.hoisted(() => ({
  appointment: { findOne: vi.fn() },
}));
vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({ default: appointment }));

import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const clientId = "507f1f77bcf86cd799439013";
const appointmentId = "507f1f77bcf86cd799439014";
const start = new Date("2026-08-30T09:00:00.000Z");
const end = new Date("2026-08-30T09:30:00.000Z");

describe("AppointmentRepository - conflitos", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["employee", () => AppointmentRepository.hasEmployeeConflict(companyId, employeeId, start, end)],
    ["client", () => AppointmentRepository.hasClientConflict(companyId, clientId, start, end)],
  ])("considera %s apenas registros ativos scheduled/confirmed e sobrepostos", async (_name, operation) => {
    appointment.findOne.mockResolvedValue({});
    await expect(operation()).resolves.toBe(true);
    const query = appointment.findOne.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({
      companyId,
      deletedAt: null,
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      startAt: { $lt: end },
      endAt: { $gt: start },
    }));
  });

  it("não considera cancelado/sem sobreposição e exclui o próprio appointment", async () => {
    appointment.findOne.mockResolvedValue(null);
    await expect(AppointmentRepository.hasEmployeeConflict(companyId, employeeId, start, end, appointmentId)).resolves.toBe(false);
    expect(appointment.findOne).toHaveBeenCalledWith(expect.objectContaining({
      _id: { $ne: appointmentId },
      startAt: { $lt: end },
      endAt: { $gt: start },
    }));
  });
});
