import { beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardRepository } = vi.hoisted(() => ({
  dashboardRepository: {
    findStatusCounts: vi.fn(),
    findAppointmentsInPeriod: vi.fn(),
    findUpcoming: vi.fn(),
    countActiveClients: vi.fn(),
  },
}));

vi.mock("../../../src/modules/dashboard/repositories/DashboardRepository", () => ({
  default: dashboardRepository,
}));

import DashboardService from "../../../src/modules/dashboard/services/DashboardService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const companyId = "507f1f77bcf86cd799439011";

const range = {
  startAt: new Date("2026-09-10T00:00:00.000Z"),
  endAt: new Date("2026-09-11T00:00:00.000Z"),
};

const now = new Date("2026-09-10T12:00:00.000Z");

function makeDoc(
  status: AppointmentStatus,
  id = "507f1f77bcf86cd799439020",
) {
  return {
    _id: { toString: () => id },
    companyId: { toString: () => companyId },
    clientId: { toString: () => "507f1f77bcf86cd799439021" },
    serviceId: { toString: () => "507f1f77bcf86cd799439022" },
    employeeId: { toString: () => "507f1f77bcf86cd799439023" },
    startAt: new Date("2026-09-10T14:00:00.000Z"),
    endAt: new Date("2026-09-10T14:30:00.000Z"),
    status,
    notes: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dashboardRepository.findStatusCounts.mockResolvedValue([
    { status: AppointmentStatus.SCHEDULED, count: 2 },
    { status: AppointmentStatus.CONFIRMED, count: 1 },
    { status: AppointmentStatus.CANCELLED, count: 1 },
  ]);
  dashboardRepository.findAppointmentsInPeriod.mockResolvedValue([
    makeDoc(AppointmentStatus.SCHEDULED),
    makeDoc(AppointmentStatus.CANCELLED, "507f1f77bcf86cd799439024"),
  ]);
  dashboardRepository.findUpcoming.mockResolvedValue([
    makeDoc(AppointmentStatus.CONFIRMED, "507f1f77bcf86cd799439025"),
  ]);
  dashboardRepository.countActiveClients.mockResolvedValue(12);
});

describe("DashboardService.getSummary", () => {
  it("agrega totais por status e ecoa o período", async () => {
    const result = await DashboardService.getSummary(companyId, range, { now });

    expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
      companyId,
      range,
    );
    expect(result.period.total).toBe(4);
    expect(result.period.byStatus[AppointmentStatus.SCHEDULED]).toBe(2);
    expect(result.period.startAt).toBe(range.startAt.toISOString());
    expect(result.activeClientsCount).toBe(12);
  });

  it("exclui cancelados da lista do dia", async () => {
    const result = await DashboardService.getSummary(companyId, range, { now });

    expect(result.todayAppointments).toHaveLength(1);
    expect(result.todayAppointments[0].status).toBe(AppointmentStatus.SCHEDULED);
  });

  it("aplica limite normalizado de próximos agendamentos", async () => {
    await DashboardService.getSummary(companyId, range, {
      now,
      upcomingLimit: 99,
    });

    expect(dashboardRepository.findUpcoming).toHaveBeenCalledWith(
      companyId,
      now,
      20,
    );
  });

  it("usa limite padrão quando upcomingLimit é inválido", async () => {
    await DashboardService.getSummary(companyId, range, {
      now,
      upcomingLimit: Number.NaN,
    });

    expect(dashboardRepository.findUpcoming).toHaveBeenCalledWith(
      companyId,
      now,
      5,
    );
  });
});
