import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const { appointment } = vi.hoisted(() => ({
  appointment: {
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        exec: vi.fn(async () => []),
      })),
    })),
    updateOne: vi.fn(),
  },
}));

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({
  default: appointment,
}));

import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";

const companyId = "507f1f77bcf86cd799439011";
const appointmentId = "507f1f77bcf86cd799439015";
const now = new Date("2026-08-30T12:00:00.000Z");
const leaseUntil = new Date("2026-08-30T12:10:00.000Z");
const sentAt = new Date("2026-08-30T12:00:00.000Z");

const fields24h = { sentField: "reminder24hSentAt", leaseField: "reminder24hLeaseUntil" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AppointmentRepository — lembretes", () => {
  it("busca apenas agendamentos futuros, ativos e sem soft delete", async () => {
    const queryChain = {
      select: vi.fn(),
      sort: vi.fn(),
    };
    queryChain.select.mockReturnValue(queryChain);
    queryChain.sort.mockResolvedValueOnce([{ _id: appointmentId }]);
    appointment.find.mockReturnValueOnce({
      ...queryChain,
    });

    await expect(
      AppointmentRepository.findUpcomingForReminders(now, 27 * 60 * 60 * 1000),
    ).resolves.toEqual([{ _id: appointmentId }]);

    const query = appointment.find.mock.calls[0][0];
    expect(query).toEqual({
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $gt: now,
        $lte: new Date(now.getTime() + 27 * 60 * 60 * 1000),
      },
    });
    expect(appointment.find.mock.results[0].value.sort).toHaveBeenCalledWith({
      startAt: 1,
    });
    expect(appointment.find.mock.results[0].value.select).toHaveBeenCalledWith(
      "+publicAccessTokenCiphertext +publicAccessTokenHash",
    );
  });

  it("claim só é feito quando o lembrete não foi enviado e a trava está livre/expirada", async () => {
    appointment.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(
      AppointmentRepository.claimReminder(
        appointmentId,
        fields24h,
        leaseUntil,
        now,
      ),
    ).resolves.toEqual({ modifiedCount: 1 });

    expect(appointment.updateOne).toHaveBeenCalledWith(
      {
        _id: appointmentId,
        deletedAt: null,
        status: {
          $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        reminder24hSentAt: null,
        $or: [
          { reminder24hLeaseUntil: null },
          { reminder24hLeaseUntil: { $lte: now } },
        ],
      },
      { $set: { reminder24hLeaseUntil: leaseUntil } },
    );
  });

  it("claim revalida o status ativo no momento da execução", async () => {
    appointment.updateOne.mockResolvedValue({ modifiedCount: 0 });

    const result = await AppointmentRepository.claimReminder(
      appointmentId,
      fields24h,
      leaseUntil,
      now,
    );

    expect(result.modifiedCount).toBe(0);
    expect(appointment.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: {
          $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      }),
      expect.anything(),
    );
  });

  it("marca como enviado apenas o lembrete informado e libera a trava", async () => {
    appointment.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await AppointmentRepository.markReminderSent(
      appointmentId,
      fields24h,
      sentAt,
    );

    expect(appointment.updateOne).toHaveBeenCalledWith(
      { _id: appointmentId },
      {
        $set: {
          reminder24hSentAt: sentAt,
          reminder24hLeaseUntil: null,
        },
      },
    );
  });

  it("libera a trava sem marcar como enviado (falha)", async () => {
    appointment.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await AppointmentRepository.releaseReminderLease(
      appointmentId,
      "reminder24hLeaseUntil",
    );

    expect(appointment.updateOne).toHaveBeenCalledWith(
      { _id: appointmentId },
      { $set: { reminder24hLeaseUntil: null } },
    );
  });
});
