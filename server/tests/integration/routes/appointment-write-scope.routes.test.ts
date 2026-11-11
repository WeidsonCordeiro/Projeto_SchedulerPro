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
  availabilityService,
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
    updateInCompany: vi.fn(),
    updateStatus: vi.fn(),
    updateStatusInCompany: vi.fn(),
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
    touchBookingSerialization: vi.fn().mockResolvedValue(undefined),
  },
  companyRepository: { findById: vi.fn() },
  clientRepository: {
    findById: vi.fn(),
    touchBookingSerialization: vi.fn().mockResolvedValue(undefined),
  },
  serviceRepository: { findById: vi.fn() },
  reportRepository: {
    findStatusCounts: vi.fn(),
    findRevenue: vi.fn(),
    findTopServices: vi.fn(),
    findEmployeeMetrics: vi.fn(),
    findClientMetrics: vi.fn(),
  },
  availabilityService: {
    ensureEmployeeAvailable: vi.fn().mockResolvedValue(undefined),
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

vi.mock("../../../src/modules/appointments/services/appointment-booking-transaction", () => ({
  withBookingTransaction: async <T>(operation: (session: never) => Promise<T>) =>
    operation(undefined as never),
}));

vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({
  default: availabilityService,
}));

import app from "../../../src/app";
import { Role } from "../../../src/constants/roles";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";
import { AppError } from "../../../src/errors/AppError";

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
  priceAtTime: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
});

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

function installScopedFindByIdInCompany() {
  appointmentRepository.findByIdInCompany.mockImplementation(
    async (id: string, companyId: string, scope?: { employeeId?: string }) => {
      if (companyId !== ids.companyA) {
        return null;
      }

      const byId: Record<string, ReturnType<typeof appointmentDoc>> = {
        [ids.appointment1]: appointmentDoc(ids.appointment1, ids.employee1),
        [ids.appointment2]: appointmentDoc(ids.appointment2, ids.employee2),
      };

      const doc = byId[id];
      if (!doc) {
        return null;
      }

      if (scope?.employeeId && scope.employeeId !== doc.employeeId.toString()) {
        return null;
      }

      return doc;
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stubSessionUser(Role.EMPLOYEE, ids.employee1);
  companyRepository.findById.mockResolvedValue({ isActive: true });
  clientRepository.findById.mockResolvedValue({
    _id: ref(ids.client),
    companyId: ref(ids.companyA),
    isActive: true,
  });
  serviceRepository.findById.mockResolvedValue({
    _id: ref(ids.service),
    name: "Serviço",
    companyId: ref(ids.companyA),
    isActive: true,
    duration: 30,
  });
  userRepository.findById.mockResolvedValue({
    _id: ref(ids.employee1),
    name: "Profissional",
    companyId: ref(ids.companyA),
    isActive: true,
  });

  installScopedFindByIdInCompany();
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.cancelOverdueScheduled.mockResolvedValue(0);
  availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);

  appointmentRepository.updateInCompany.mockImplementation(
    async (
      id: string,
      companyId: string,
      data: Record<string, unknown>,
      scope?: { employeeId?: string },
    ) => {
      const doc = await appointmentRepository.findByIdInCompany(
        id,
        companyId,
        scope,
      );
      return doc ? { ...doc, ...data } : null;
    },
  );

  appointmentRepository.updateStatusInCompany.mockImplementation(
    async (
      id: string,
      companyId: string,
      status: AppointmentStatus,
      scope?: { employeeId?: string },
    ) => {
      const doc = await appointmentRepository.findByIdInCompany(
        id,
        companyId,
        scope,
      );
      return doc ? { ...doc, status } : null;
    },
  );
});

describe("O7 — escopo de escrita em agendamentos (integração HTTP)", () => {
  it("EMPLOYEE atualiza notes no próprio agendamento", async () => {
    const response = await request(app)
      .patch(`/api/appointments/${ids.appointment1}`)
      .send({ notes: "Atualizado" });

    expect(response.status).toBe(200);
    expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
      ids.appointment1,
      ids.companyA,
      { employeeId: ids.employee1 },
    );
    expect(appointmentRepository.updateInCompany).toHaveBeenCalled();
  });

  it("EMPLOYEE recebe 404 ao PATCH no agendamento de colega", async () => {
    const response = await request(app)
      .patch(`/api/appointments/${ids.appointment2}`)
      .send({ notes: "Não devia" });

    expect(response.status).toBe(404);
    expect(appointmentRepository.updateInCompany).not.toHaveBeenCalled();
  });

  it.each(["confirm", "cancel", "complete", "no-show"])(
    "EMPLOYEE recebe 404 em transição de colega (%s)",
    async (path) => {
      appointmentRepository.findByIdInCompany.mockImplementation(
        async (id: string, companyId: string, scope?: { employeeId?: string }) => {
          if (id !== ids.appointment2) {
            return null;
          }
          const doc = appointmentDoc(ids.appointment2, ids.employee2);
          if (scope?.employeeId === ids.employee1) {
            return null;
          }
          return doc;
        },
      );

      const response = await request(app).patch(
        `/api/appointments/${ids.appointment2}/${path}`,
      );

      expect(response.status).toBe(404);
      expect(appointmentRepository.updateStatusInCompany).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["employeeId", { employeeId: ids.employee2 }],
    ["clientId", { clientId: ids.client }],
    ["serviceId", { serviceId: ids.service }],
  ])("EMPLOYEE recebe 400 ao PATCH com %s", async (_label, body) => {
    const response = await request(app)
      .patch(`/api/appointments/${ids.appointment1}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      HttpMessages.APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED,
    );
    expect(appointmentRepository.findByIdInCompany).not.toHaveBeenCalled();
  });

  it("EMPLOYEE recebe 403 em DELETE", async () => {
    const response = await request(app).delete(
      `/api/appointments/${ids.appointment1}`,
    );

    expect(response.status).toBe(403);
    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
  });

  it("OWNER atualiza agendamento de outro funcionário", async () => {
    stubSessionUser(Role.OWNER, ids.employee1);

    const response = await request(app)
      .patch(`/api/appointments/${ids.appointment2}`)
      .send({ notes: "Gestão" });

    expect(response.status).toBe(200);
    expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
      ids.appointment2,
      ids.companyA,
      undefined,
    );
  });

  it("CLIENT recebe 403 em POST e PATCH staff", async () => {
    stubSessionUser(Role.CLIENT, ids.client, ids.client);

    expect(
      (
        await request(app).post("/api/appointments").send({
          clientId: ids.client,
          serviceId: ids.service,
          employeeId: ids.employee1,
          startAt: "2027-08-29T09:00:00.000Z",
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .patch(`/api/appointments/${ids.appointment1}`)
          .send({ notes: "x" })
      ).status,
    ).toBe(403);
  });

  it("ignora companyId na query no PATCH", async () => {
    await request(app)
      .patch(`/api/appointments/${ids.appointment1}?companyId=${ids.companyB}`)
      .send({ notes: "tenant da sessão" });

    expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
      ids.appointment1,
      ids.companyA,
      { employeeId: ids.employee1 },
    );
  });

  describe("reagendamento EMPLOYEE (startAt)", () => {
    const newStartIso = "2027-08-30T10:00:00.000Z";
    const expectedEndAt = new Date(
      new Date(newStartIso).getTime() + 30 * 60 * 1000,
    );

    it("EMPLOYEE altera startAt do próprio agendamento e recalcula endAt", async () => {
      const response = await request(app)
        .patch(`/api/appointments/${ids.appointment1}`)
        .send({ startAt: newStartIso });

      expect(response.status).toBe(200);
      expect(appointmentRepository.updateInCompany).toHaveBeenCalledWith(
        ids.appointment1,
        ids.companyA,
        expect.objectContaining({
          startAt: new Date(newStartIso),
          endAt: expectedEndAt,
        }),
        { employeeId: ids.employee1 },
      );
    });

    it("EMPLOYEE preserva clientId, serviceId e employeeId ao reagendar", async () => {
      await request(app)
        .patch(`/api/appointments/${ids.appointment1}`)
        .send({ startAt: newStartIso });

      const persistData = appointmentRepository.updateInCompany.mock.calls.at(-1)?.[2] as {
        clientId: { toString: () => string };
        serviceId: { toString: () => string };
        employeeId: { toString: () => string };
      };

      expect(persistData.clientId.toString()).toBe(ids.client);
      expect(persistData.serviceId.toString()).toBe(ids.service);
      expect(persistData.employeeId.toString()).toBe(ids.employee1);
    });

    it("EMPLOYEE recebe 409 quando há conflito de funcionário", async () => {
      appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);

      const response = await request(app)
        .patch(`/api/appointments/${ids.appointment1}`)
        .send({ startAt: newStartIso });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body.message).toBe(HttpMessages.EMPLOYEE_CONFLICT);
      expect(appointmentRepository.updateInCompany).not.toHaveBeenCalled();
    });

    it("EMPLOYEE recebe 409 quando o funcionário está indisponível", async () => {
      availabilityService.ensureEmployeeAvailable.mockRejectedValue(
        new AppError("indisponível", HttpStatus.CONFLICT),
      );

      const response = await request(app)
        .patch(`/api/appointments/${ids.appointment1}`)
        .send({ startAt: newStartIso });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(appointmentRepository.updateInCompany).not.toHaveBeenCalled();
    });

    it("EMPLOYEE recebe 404 ao reagendar agendamento de colega", async () => {
      const response = await request(app)
        .patch(`/api/appointments/${ids.appointment2}`)
        .send({ startAt: newStartIso });

      expect(response.status).toBe(404);
      expect(appointmentRepository.updateInCompany).not.toHaveBeenCalled();
    });

    it("OWNER reagenda startAt de agendamento de outro funcionário", async () => {
      stubSessionUser(Role.OWNER, ids.employee1);

      const response = await request(app)
        .patch(`/api/appointments/${ids.appointment2}`)
        .send({ startAt: newStartIso });

      expect(response.status).toBe(200);
      expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
        ids.appointment2,
        ids.companyA,
        undefined,
      );
      expect(appointmentRepository.updateInCompany).toHaveBeenCalled();
    });
  });
});
