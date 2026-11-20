import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointment } = vi.hoisted(() => ({
  appointment: {
    exists: vi.fn(),
  },
}));

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({
  default: appointment,
}));

import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const companyId = "507f1f77bcf86cd799439011";
const now = new Date("2028-01-15T12:00:00.000Z");

describe("AppointmentRepository.hasOpenAppointmentsForCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointment.exists.mockReturnValue({
      session: vi.fn().mockResolvedValue({ _id: companyId }),
    });
  });

  it("consulta SCHEDULED/CONFIRMED com endAt maior que now", async () => {
    appointment.exists.mockResolvedValue({ _id: "appt" });

    const result = await AppointmentRepository.hasOpenAppointmentsForCompany(
      companyId,
      now,
    );

    expect(result).toBe(true);
    expect(appointment.exists).toHaveBeenCalledWith({
      companyId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      endAt: { $gt: now },
    });
  });

  it("retorna false quando não há documentos", async () => {
    appointment.exists.mockResolvedValue(null);

    const result = await AppointmentRepository.hasOpenAppointmentsForCompany(
      companyId,
      now,
    );

    expect(result).toBe(false);
  });

  it("aplica session quando fornecida", async () => {
    const sessionQuery = { session: vi.fn().mockResolvedValue(null) };
    appointment.exists.mockReturnValue(sessionQuery);
    const session = {} as never;

    await AppointmentRepository.hasOpenAppointmentsForCompany(companyId, now, {
      session,
    });

    expect(sessionQuery.session).toHaveBeenCalledWith(session);
  });
});