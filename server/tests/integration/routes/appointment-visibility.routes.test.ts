import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

const {
  authUser,
  appointmentRepository,
  dashboardRepository,
  userRepository,
  companyRepository,
  reportRepository,
  clientRepository,
  serviceRepository,
} = vi.hoisted(() => ({
  authUser: {
    value: {
      userId: "507f1f77bcf86cd799439013",
      companyId: "507f1f77bcf86cd799439011",
      role: "OWNER" as const,
    },
  },
  appointmentRepository: {
    findById: vi.fn(),
    findByIdInCompany: vi.fn(),
    findByCompanyId: vi.fn(),
    cancelOverdueScheduled: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
    hasEmployeeConflict: vi.fn(),
    hasClientConflict: vi.fn(),
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
  clientRepository: { findById: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  reportRepository: {
    findStatusCounts: vi.fn(),
    findRevenue: vi.fn(),
    findTopServices: vi.fn(),
    findEmployeeMetrics: vi.fn(),
    findClientMetrics: vi.fn(),
  },
}));

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  employee1: "507f1f77bcf86cd799439013",
  employee2: "507f1f77bcf86cd799439014",
  client: "507f1f77bcf86cd799439015",
  appointment1: "507f1f77bcf86cd799439021",
  appointment2: "507f1f77bcf86cd799439022",
  service: "507f1f77bcf86cd799439017",
};

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

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({
  default: appointmentRepository,
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

vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));

vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({
  default: serviceRepository,
}));

vi.mock("../../../src/modules/reports/repositories/ReportRepository", () => ({
  default: reportRepository,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });

const appointmentDoc = (
  appointmentId: string,
  employeeId: string,
  companyId = ids.companyA,
) => ({
  _id: ref(appointmentId),
  companyId: ref(companyId),
  clientId: ref(ids.client),
  serviceId: ref(ids.service),
  employeeId: ref(employeeId),
  startAt: new Date("2027-08-29T08:00:00.000Z"),
  endAt: new Date("2027-08-29T08:30:00.000Z"),
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const summaryQuery =
  "startAt=2026-09-10T00:00:00.000Z&endAt=2026-09-11T00:00:00.000Z";

function stubSessionUser(role: Role, userId = ids.employee1, clientId?: string) {
  authUser.value = {
    userId,
    companyId: ids.companyA,
    role,
    ...(clientId ? { clientId } : {}),
  };
  userRepository.findById.mockResolvedValue({
    _id: ref(userId),
    companyId: ref(ids.companyA),
    role,
    isActive: true,
    mustChangePassword: false,
    lockUntil: null,
    emailVerified: true,
    clientId: clientId ? ref(clientId) : undefined,
  });
  userRepository.findByIdForAccessControl.mockResolvedValue({
    mustChangePassword: false,
    isActive: true,
    lockUntil: null,
    emailVerified: true,
    role,
    companyId: ids.companyA,
    _id: ref(userId),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubSessionUser(Role.OWNER, ids.employee1);
  companyRepository.findById.mockResolvedValue({ isActive: true });
  serviceRepository.findById.mockResolvedValue({
    _id: ref(ids.service),
    name: "Serviço",
    companyId: ref(ids.companyA),
    isActive: true,
  });
  userRepository.findById.mockResolvedValue({
    _id: ref(ids.employee1),
    name: "Profissional",
    companyId: ref(ids.companyA),
    isActive: true,
  });

  appointmentRepository.findByCompanyId.mockResolvedValue([
    appointmentDoc(ids.appointment1, ids.employee1),
    appointmentDoc(ids.appointment2, ids.employee2),
  ]);
  appointmentRepository.findByIdInCompany.mockImplementation(
    async (_id: string, companyId: string, scope?: { employeeId?: string }) => {
      const doc = appointmentDoc(ids.appointment1, ids.employee1, companyId);
      if (scope?.employeeId && scope.employeeId !== ids.employee1) {
        return null;
      }
      return doc;
    },
  );
  appointmentRepository.cancelOverdueScheduled.mockResolvedValue(0);

  dashboardRepository.findStatusCounts.mockResolvedValue([
    { status: AppointmentStatus.SCHEDULED, count: 1 },
  ]);
  dashboardRepository.findAppointmentsInPeriod.mockResolvedValue([]);
  dashboardRepository.findUpcoming.mockResolvedValue([]);
  dashboardRepository.countActiveClients.mockResolvedValue(7);

  reportRepository.findStatusCounts.mockResolvedValue([]);
  reportRepository.findRevenue.mockResolvedValue(0);
  reportRepository.findTopServices.mockResolvedValue([]);
  reportRepository.findEmployeeMetrics.mockResolvedValue([]);
  reportRepository.findClientMetrics.mockResolvedValue([]);
});

describe("O6 — visibilidade de agendamentos (integração HTTP)", () => {
  describe("listagem GET /api/appointments", () => {
    it.each([
      [Role.OWNER],
      [Role.ADMIN],
      [Role.MANAGER],
    ])("%s lista com escopo de empresa inteira", async (role) => {
      stubSessionUser(role, ids.employee1);
      const response = await request(app).get("/api/appointments");
      expect(response.status).toBe(200);
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        undefined,
      );
      expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenCalledWith(
        ids.companyA,
        expect.any(Date),
      );
    });

    it("EMPLOYEE lista apenas com employeeId da sessão", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      const response = await request(app).get("/api/appointments");
      expect(response.status).toBe(200);
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        { employeeId: ids.employee1 },
      );
      expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled();
    });

    it("EMPLOYEE ignora employeeId na query", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      await request(app).get(
        `/api/appointments?employeeId=${ids.employee2}`,
      );
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        { employeeId: ids.employee1 },
      );
    });

    it("EMPLOYEE ignora companyId na query", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      await request(app).get(
        `/api/appointments?companyId=${ids.companyB}`,
      );
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        { employeeId: ids.employee1 },
      );
      expect(appointmentRepository.findByCompanyId).not.toHaveBeenCalledWith(
        ids.companyB,
        expect.anything(),
        expect.anything(),
      );
    });

    it("EMPLOYEE repassa filtros de data dentro do escopo", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      await request(app).get(
        "/api/appointments?startAt=2027-08-01T00:00:00.000Z&endAt=2027-09-01T00:00:00.000Z",
      );
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {
          startAt: new Date("2027-08-01T00:00:00.000Z"),
          endAt: new Date("2027-09-01T00:00:00.000Z"),
        },
        { employeeId: ids.employee1 },
      );
    });

    it("CLIENT em GET / lista com clientId da sessão", async () => {
      stubSessionUser(Role.CLIENT, ids.client, ids.client);
      const response = await request(app).get("/api/appointments");
      expect(response.status).toBe(200);
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        { clientId: ids.client },
      );
      expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled();
    });
  });

  describe("detalhe GET /api/appointments/:id", () => {
    it("EMPLOYEE acede ao próprio agendamento", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      appointmentRepository.findByIdInCompany.mockResolvedValue(
        appointmentDoc(ids.appointment1, ids.employee1),
      );
      const response = await request(app).get(
        `/api/appointments/${ids.appointment1}`,
      );
      expect(response.status).toBe(200);
      expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
        ids.appointment1,
        ids.companyA,
        { employeeId: ids.employee1 },
      );
    });

    it("EMPLOYEE recebe 404 para agendamento de colega", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      appointmentRepository.findByIdInCompany.mockResolvedValue(null);
      const response = await request(app).get(
        `/api/appointments/${ids.appointment2}`,
      );
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/appointments/mine (CLIENT)", () => {
    it("CLIENT mantém escopo por clientId da sessão", async () => {
      stubSessionUser(Role.CLIENT, ids.client, ids.client);
      const response = await request(app).get("/api/appointments/mine");
      expect(response.status).toBe(200);
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        { clientId: ids.client },
      );
    });
  });

  describe("GET /api/dashboard/summary", () => {
    it.each([[Role.OWNER], [Role.ADMIN], [Role.MANAGER]])(
      "%s mantém dashboard sem filtro employeeId",
      async (role) => {
        stubSessionUser(role, ids.employee1);
        const response = await request(app).get(
          `/api/dashboard/summary?${summaryQuery}`,
        );
        expect(response.status).toBe(200);
        expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
          ids.companyA,
          expect.any(Object),
          undefined,
        );
        expect(dashboardRepository.countActiveClients).toHaveBeenCalledWith(
          ids.companyA,
        );
        expect(response.body.data.activeClientsCount).toBe(7);
      },
    );

    it("EMPLOYEE aplica employeeId em todas as consultas e omite activeClientsCount", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      const response = await request(app).get(
        `/api/dashboard/summary?${summaryQuery}`,
      );
      expect(response.status).toBe(200);
      expect(dashboardRepository.findStatusCounts).toHaveBeenCalledWith(
        ids.companyA,
        expect.any(Object),
        ids.employee1,
      );
      expect(dashboardRepository.findAppointmentsInPeriod).toHaveBeenCalledWith(
        ids.companyA,
        expect.any(Object),
        ids.employee1,
      );
      expect(dashboardRepository.findUpcoming).toHaveBeenCalledWith(
        ids.companyA,
        expect.any(Date),
        expect.any(Number),
        ids.employee1,
      );
      expect(dashboardRepository.countActiveClients).not.toHaveBeenCalled();
      expect(response.body.data.activeClientsCount).toBeUndefined();
      expect(response.body.data.period.total).toBeDefined();
      expect(response.body.data.period.byStatus).toBeDefined();
    });
  });

  describe("relatórios e isolamento", () => {
    it("EMPLOYEE recebe 403 em relatórios", async () => {
      stubSessionUser(Role.EMPLOYEE, ids.employee1);
      const response = await request(app).get(
        `/api/reports/overview?${summaryQuery}`,
      );
      expect(response.status).toBe(403);
      expect(reportRepository.findStatusCounts).not.toHaveBeenCalled();
    });

    it("isolamento entre empresas usa sempre companyId da sessão", async () => {
      stubSessionUser(Role.OWNER, ids.employee1);
      await request(app).get(
        `/api/appointments?companyId=${ids.companyB}`,
      );
      expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(
        ids.companyA,
        {},
        undefined,
      );
    });
  });
});
