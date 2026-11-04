import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointmentModel, clientModel } = vi.hoisted(() => ({
  appointmentModel: {
    aggregate: vi.fn(),
    find: vi.fn(),
  },
  clientModel: {
    countDocuments: vi.fn(),
  },
}));

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({
  default: appointmentModel,
}));

vi.mock("../../../src/modules/Clients/models/Client.model", () => ({
  default: clientModel,
}));

import DashboardRepository from "../../../src/modules/dashboard/repositories/DashboardRepository";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const companyId = "507f1f77bcf86cd799439011";
const range = {
  startAt: new Date("2026-09-10T00:00:00.000Z"),
  endAt: new Date("2026-09-11T00:00:00.000Z"),
};
const now = new Date("2026-09-10T12:00:00.000Z");

function chainable(result: unknown) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    then: undefined as unknown,
  };
  chain.sort.mockImplementation(() => chain);
  return chain;
}

describe("DashboardRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointmentModel.aggregate.mockResolvedValue([]);
    appointmentModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });
    clientModel.countDocuments.mockResolvedValue(7);
  });

  it("findStatusCounts filtra tenant, soft-delete e intervalo [startAt, endAt)", async () => {
    await DashboardRepository.findStatusCounts(companyId, range);

    const pipeline = appointmentModel.aggregate.mock.calls[0][0];
    const match = pipeline.find(
      (stage: Record<string, unknown>) => stage.$match,
    ).$match;

    expect(match).toEqual({
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
      startAt: { $gte: range.startAt, $lt: range.endAt },
    });
  });

  it("findAppointmentsInPeriod usa o mesmo filtro de startAt", async () => {
    await DashboardRepository.findAppointmentsInPeriod(companyId, range);

    expect(appointmentModel.find).toHaveBeenCalledWith({
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
      startAt: { $gte: range.startAt, $lt: range.endAt },
    });
  });

  it("findUpcoming filtra status futuros e aplica limit", async () => {
    const chain = chainable([]);
    appointmentModel.find.mockReturnValue(chain);

    await DashboardRepository.findUpcoming(companyId, now, 3);

    expect(appointmentModel.find).toHaveBeenCalledWith({
      companyId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: { $gte: now },
    });
    expect(chain.sort).toHaveBeenCalledWith({ startAt: 1 });
    expect(chain.limit).toHaveBeenCalledWith(3);
  });

  it("countActiveClients filtra isActive e deletedAt", async () => {
    await DashboardRepository.countActiveClients(companyId);

    expect(clientModel.countDocuments).toHaveBeenCalledWith({
      companyId,
      deletedAt: null,
      isActive: true,
    });
  });
});
