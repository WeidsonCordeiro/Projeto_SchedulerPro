import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
};

const { authUser, dashboardRepository, userRepository, companyRepository } =
  vi.hoisted(() => ({
    authUser: {
      value: {
        userId: "actor",
        companyId: "507f1f77bcf86cd799439011",
        role: "OWNER",
      },
    },
    dashboardRepository: {
      findStatusCounts: vi.fn(),
      findAppointmentsInPeriod: vi.fn(),
      findUpcoming: vi.fn(),
      countActiveClients: vi.fn(),
    },
    userRepository: {
      findById: vi.fn(),
      findByIdForAccessControl: vi.fn(),
    },
    companyRepository: { findById: vi.fn() },
  }));

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));

vi.mock("../../../src/modules/dashboard/repositories/DashboardRepository", () => ({
  default: dashboardRepository,
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const summaryQuery =
  "startAt=2026-09-10T00:00:00.000Z&endAt=2026-09-11T00:00:00.000Z";

const emptySummaryMocks = () => {
  dashboardRepository.findStatusCounts.mockResolvedValue([]);
  dashboardRepository.findAppointmentsInPeriod.mockResolvedValue([]);
  dashboardRepository.findUpcoming.mockResolvedValue([]);
  dashboardRepository.countActiveClients.mockResolvedValue(0);
};

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = { userId: "actor", companyId: ids.companyA, role: Role.OWNER };
  companyRepository.findById.mockResolvedValue({ isActive: true });
  userRepository.findById.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
    role: Role.OWNER,
    companyId: ids.companyA,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
    role: Role.OWNER,
    companyId: ids.companyA,
    _id: { toString: () => "actor" },
  });
  emptySummaryMocks();
});

describe("Dashboard HTTP integration", () => {
  it("responde 200 com summary para OWNER", async () => {
    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.period).toBeDefined();
    expect(dashboardRepository.findStatusCounts).toHaveBeenCalled();
  });

  it("repassa período convertido ao repositório", async () => {
    await request(app).get(
      `/api/dashboard/summary?startAt=2026-09-01T00:00:00.000Z&endAt=2026-10-01T00:00:00.000Z`,
    );

    expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      {
        startAt: new Date("2026-09-01T00:00:00.000Z"),
        endAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    );
  });

  it("usa a empresa da sessão, nunca via query param", async () => {
    await request(app).get(
      `/api/dashboard/summary?${summaryQuery}&companyId=507f1f77bcf86cd799439099`,
    );

    expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      expect.any(Object),
    );
    expect(dashboardRepository.findStatusCounts).not.toHaveBeenCalledWith(
      "507f1f77bcf86cd799439099",
      expect.anything(),
    );
  });

  it("permite acesso para EMPLOYEE com APPOINTMENT_READ", async () => {
    authUser.value = {
      userId: "actor",
      companyId: ids.companyA,
      role: Role.EMPLOYEE,
    };

    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}`,
    );

    expect(response.status).toBe(200);
    expect(dashboardRepository.findStatusCounts).toHaveBeenCalled();
  });

  it("bloqueia CLIENT", async () => {
    authUser.value = {
      userId: "actor",
      companyId: ids.companyA,
      role: Role.CLIENT,
      clientId: "507f1f77bcf86cd799439099",
    };

    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}`,
    );

    expect(response.status).toBe(403);
    expect(dashboardRepository.findStatusCounts).not.toHaveBeenCalled();
  });

  it("bloqueia empresa inactiva via middleware operacional", async () => {
    companyRepository.findById.mockResolvedValue({ isActive: false });

    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}`,
    );

    expect(response.status).toBe(403);
    expect(dashboardRepository.findStatusCounts).not.toHaveBeenCalled();
  });

  it("exige startAt e endAt", async () => {
    const response = await request(app).get("/api/dashboard/summary");

    expect(response.status).toBe(400);
    expect(dashboardRepository.findStatusCounts).not.toHaveBeenCalled();
  });

  it("rejeita início posterior ao fim", async () => {
    const response = await request(app).get(
      "/api/dashboard/summary?startAt=2026-10-01T00:00:00.000Z&endAt=2026-09-01T00:00:00.000Z",
    );

    expect(response.status).toBe(400);
  });

  it("rejeita upcomingLimit inválido", async () => {
    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}&upcomingLimit=0`,
    );

    expect(response.status).toBe(400);
  });

  it("devolve estrutura com byStatus oficial", async () => {
    dashboardRepository.findStatusCounts.mockResolvedValue([
      { status: AppointmentStatus.SCHEDULED, count: 1 },
    ]);

    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}`,
    );

    expect(response.body.data.period.byStatus).toMatchObject({
      scheduled: 1,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      "no-show": 0,
    });
  });
});
