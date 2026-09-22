import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  service: "507f1f77bcf86cd799439013",
  employee: "507f1f77bcf86cd799439014",
  client: "507f1f77bcf86cd799439015",
};

const { authUser, reportRepository, userRepository } = vi.hoisted(() => ({
  authUser: {
    value: {
      userId: "actor",
      companyId: "507f1f77bcf86cd799439011",
      role: "OWNER",
    },
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
}));

vi.mock("../../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));
vi.mock("../../../src/modules/reports/repositories/ReportRepository", () => ({
  default: reportRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });

const statusCounts = [
  { status: AppointmentStatus.COMPLETED, count: 3 },
  { status: AppointmentStatus.CANCELLED, count: 1 },
];

const topService = {
  serviceId: ref(ids.service),
  name: "Corte de cabelo",
  count: 4,
  completedCount: 3,
  estimatedRevenue: 45,
};

const employee = {
  employeeId: ref(ids.employee),
  name: "Ana",
  count: 4,
  completedCount: 3,
  cancelledCount: 1,
  estimatedRevenue: 45,
};

const client = {
  clientId: ref(ids.client),
  name: "Maria",
  count: 4,
  completedCount: 3,
  estimatedRevenue: 45,
};

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = { userId: "actor", companyId: ids.companyA, role: Role.OWNER };

  userRepository.findById.mockResolvedValue({ mustChangePassword: false, isActive: true, lockUntil: null });
  userRepository.findByIdForAccessControl.mockResolvedValue({ mustChangePassword: false, isActive: true, lockUntil: null });

  reportRepository.findStatusCounts.mockResolvedValue(statusCounts);
  reportRepository.findRevenue.mockResolvedValue({
    completedCount: 3,
    estimatedRevenue: 45,
    forecastCount: 2,
    forecastRevenue: 30,
  });
  reportRepository.findTopServices.mockResolvedValue([topService]);
  reportRepository.findEmployeeMetrics.mockResolvedValue([employee]);
  reportRepository.findClientMetrics.mockResolvedValue({
    totalClients: 1,
    recurringCount: 1,
    topClients: [client],
  });
});

describe("Relatórios HTTP integration", () => {
  it.each([
    ["/api/reports/overview", "getOverview"],
    ["/api/reports/revenue", "getRevenue"],
    ["/api/reports/top-services", "getTopServices"],
    ["/api/reports/employees", "getEmployees"],
    ["/api/reports/clients", "getClients"],
    ["/api/reports/cancellations", "getCancellations"],
  ])("responde 200 e success=true em %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it("repassa período e limite convertidos para o repositório", async () => {
    const response = await request(app).get(
      "/api/reports/overview?startAt=2026-09-01T00:00:00.000Z&endAt=2026-10-01T00:00:00.000Z",
    );

    expect(response.status).toBe(200);
    expect(reportRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      {
        startAt: new Date("2026-09-01T00:00:00.000Z"),
        endAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    );
  });

  it("aplica o limite do ranking de serviços", async () => {
    await request(app).get("/api/reports/top-services?limit=10");

    expect(reportRepository.findTopServices).toHaveBeenCalledWith(
      ids.companyA,
      {},
      10,
    );
  });

  it("usa a empresa da sessão, nunca via query param", async () => {
    await request(app).get(
      "/api/reports/overview?companyId=507f1f77bcf86cd799439099",
    );

    expect(reportRepository.findStatusCounts).toHaveBeenCalledWith(
      ids.companyA,
      expect.any(Object),
    );
    expect(reportRepository.findStatusCounts).not.toHaveBeenCalledWith(
      "507f1f77bcf86cd799439099",
      expect.anything(),
    );
  });

  it("permite acesso para MANAGER", async () => {
    authUser.value = { userId: "actor", companyId: ids.companyA, role: Role.MANAGER };

    const response = await request(app).get("/api/reports/overview");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it.each([Role.EMPLOYEE, Role.CLIENT])(
    "bloqueia acesso para %s",
    async (role) => {
      authUser.value = { userId: "actor", companyId: ids.companyA, role };

      const response = await request(app).get("/api/reports/overview");

      expect(response.status).toBe(403);
      expect(reportRepository.findStatusCounts).not.toHaveBeenCalled();
    },
  );

  it("rejeita data inicial inválida", async () => {
    const response = await request(app).get("/api/reports/overview?startAt=nao-e-data");

    expect(response.status).toBe(400);
    expect(reportRepository.findStatusCounts).not.toHaveBeenCalled();
  });

  it("rejeita início do período posterior ao fim", async () => {
    const response = await request(app).get(
      "/api/reports/overview?startAt=2026-10-01T00:00:00.000Z&endAt=2026-09-01T00:00:00.000Z",
    );

    expect(response.status).toBe(400);
  });

  it("rejeita período superior a 366 dias", async () => {
    const response = await request(app).get(
      "/api/reports/overview?startAt=2024-01-01T00:00:00.000Z&endAt=2026-01-15T00:00:00.000Z",
    );

    expect(response.status).toBe(400);
  });

  it("rejeita limite fora da faixa permitida", async () => {
    const response = await request(app).get("/api/reports/top-services?limit=0");

    expect(response.status).toBe(400);
  });

  it("rejeita limite não numérico", async () => {
    const response = await request(app).get("/api/reports/top-services?limit=abc");

    expect(response.status).toBe(400);
  });
});