import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activeCompany } from "../helpers/tenant-ids";

const {
  ids,
  authUser,
  dashboardRepository,
  reportRepository,
  userRepository,
  companyRepository,
} = vi.hoisted(() => {
  const { TENANT_IDS: tenantIds } =
    require("../helpers/tenant-ids.cjs") as typeof import("../helpers/tenant-ids");
  return {
  ids: tenantIds,
  authUser: {
    value: {
      userId: tenantIds.userA,
      companyId: tenantIds.companyA,
      role: "OWNER",
    },
  },
  dashboardRepository: {
    findStatusCounts: vi.fn(),
    findAppointmentsInPeriod: vi.fn(),
    findUpcoming: vi.fn(),
    countActiveClients: vi.fn(),
  },
  reportRepository: {
    findStatusCounts: vi.fn(),
    findRevenue: vi.fn(),
    findTopServices: vi.fn(),
    findEmployeeMetrics: vi.fn(),
    findClientMetrics: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
    findByIdForAccessControl: vi.fn(),
  },
  companyRepository: { findById: vi.fn() },
};
});

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
vi.mock("../../../src/modules/reports/repositories/ReportRepository", () => ({
  default: reportRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";

const summaryQuery =
  "startAt=2026-09-10T00:00:00.000Z&endAt=2026-09-11T00:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = {
    userId: ids.userA,
    companyId: ids.companyA,
    role: Role.OWNER,
  };

  companyRepository.findById.mockResolvedValue(activeCompany(ids.companyA));
  userRepository.findById.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
  });

  dashboardRepository.findStatusCounts.mockResolvedValue([]);
  dashboardRepository.findAppointmentsInPeriod.mockResolvedValue([]);
  dashboardRepository.findUpcoming.mockResolvedValue([]);
  dashboardRepository.countActiveClients.mockResolvedValue(0);

  reportRepository.findStatusCounts.mockResolvedValue([]);
  reportRepository.findRevenue.mockResolvedValue({
    completedCount: 0,
    estimatedRevenue: 0,
  });
  reportRepository.findTopServices.mockResolvedValue([]);
  reportRepository.findEmployeeMetrics.mockResolvedValue([]);
  reportRepository.findClientMetrics.mockResolvedValue([]);
});

describe("Multi-tenant — Dashboard HTTP (Bloco A)", () => {
  it("resumo usa companyId da sessão e ignora query maliciosa", async () => {
    const response = await request(app).get(
      `/api/dashboard/summary?${summaryQuery}&companyId=${ids.companyB}`,
    );

    expect(response.status).toBe(200);
    expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      expect.any(Object),
      undefined,
    );
    expect(dashboardRepository.findStatusCounts).not.toHaveBeenCalledWith(
      ids.companyB,
      expect.anything(),
      expect.anything(),
    );
  });
});

describe("Multi-tenant — Reports HTTP (Bloco A)", () => {
  it("métricas usam companyId da sessão", async () => {
    const response = await request(app).get(
      `/api/reports/overview?${summaryQuery}&companyId=${ids.companyB}`,
    );

    expect(response.status).toBe(200);
    expect(reportRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      expect.any(Object),
    );
  });

  it("EMPLOYEE não acede a relatórios (403)", async () => {
    authUser.value = {
      userId: ids.userA,
      companyId: ids.companyA,
      role: Role.EMPLOYEE,
    };

    const response = await request(app).get(
      `/api/reports/overview?${summaryQuery}`,
    );

    expect(response.status).toBe(403);
    expect(reportRepository.findStatusCounts).not.toHaveBeenCalled();
  });
});