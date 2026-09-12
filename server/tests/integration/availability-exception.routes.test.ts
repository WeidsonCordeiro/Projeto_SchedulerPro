import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  employee: "507f1f77bcf86cd799439013",
  employeeB: "507f1f77bcf86cd799439014",
  exception: "507f1f77bcf86cd799439015",
  exceptionB: "507f1f77bcf86cd799439016",
};

const { authUser, availabilityExceptionRepository, appointmentRepository, userRepository, clientRepository, serviceRepository, companyRepository, availabilityRepository } = vi.hoisted(() => ({
  authUser: { value: { userId: "actor", companyId: "507f1f77bcf86cd799439011", role: "OWNER" } },
  availabilityExceptionRepository: {
    findById: vi.fn(), findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(),
    findByEmployeeAndDate: vi.fn(), create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
  },
  appointmentRepository: {
    findById: vi.fn(), findByCompanyId: vi.fn(), create: vi.fn(), update: vi.fn(),
    updateStatus: vi.fn(), softDelete: vi.fn(), hasEmployeeConflict: vi.fn(),
    hasClientConflict: vi.fn(),
  },
  userRepository: { findById: vi.fn(), findByIdForAccessControl: vi.fn() },
  clientRepository: { findById: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  companyRepository: { findById: vi.fn() },
  availabilityRepository: {
    findById: vi.fn(), findByEmployeeAndDay: vi.fn(),
    findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(), create: vi.fn(),
    update: vi.fn(), softDelete: vi.fn(),
  },
}));

vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));
vi.mock("../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));
vi.mock("../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));

import app from "../../src/app";
import { Role } from "../../src/constants/roles";

const ref = (id: string) => ({ toString: () => id });
const companyA = { _id: ref(ids.companyA), timezone: "Europe/Lisbon" };
const employeeA = { _id: ref(ids.employee), companyId: ref(ids.companyA), role: Role.EMPLOYEE, isActive: true, deletedAt: null };

const exceptionA = (extra: Record<string, unknown> = {}) => ({
  _id: ref(ids.exception), companyId: ref(ids.companyA), employeeId: ref(ids.employee),
  date: "2026-08-30", allDay: false, startTime: "10:00", endTime: "11:00",
  type: "BLOCK", reason: null, createdAt: new Date(), updatedAt: new Date(), ...extra,
});

const validException = {
  employeeId: ids.employee,
  date: "2026-08-30",
  startTime: "10:00",
  endTime: "11:00",
  type: "BLOCK",
  reason: "Reunião",
};

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = { userId: "actor", companyId: ids.companyA, role: Role.OWNER };

  userRepository.findById.mockResolvedValue(employeeA);
  userRepository.findByIdForAccessControl.mockResolvedValue({ mustChangePassword: false, isActive: true, lockUntil: null });
  clientRepository.findById.mockResolvedValue({ _id: ref(ids.employee), companyId: ref(ids.companyA), isActive: true });
  serviceRepository.findById.mockResolvedValue({ _id: ref(ids.employee), companyId: ref(ids.companyA), isActive: true, duration: 30 });
  companyRepository.findById.mockResolvedValue(companyA);
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);
  availabilityExceptionRepository.findById.mockResolvedValue(exceptionA());
  availabilityExceptionRepository.findByCompanyId.mockResolvedValue([exceptionA()]);
  availabilityExceptionRepository.findByEmployeeId.mockResolvedValue([exceptionA()]);
  availabilityExceptionRepository.create.mockImplementation(async (data: any) => ({ ...exceptionA(), ...data }));
  availabilityExceptionRepository.update.mockImplementation(async (_id: string, data: any) => ({ ...exceptionA(), ...data }));

  availabilityRepository.findById.mockResolvedValue({ _id: ref(ids.exception), companyId: ref(ids.companyA), employeeId: ref(ids.employee), dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00", afternoonStart: "14:00", afternoonEnd: "18:00" });
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
});

describe("AvailabilityException HTTP integration", () => {
  it("cria, lista, consulta, atualiza e remove exceção pelo fluxo HTTP real", async () => {
    const created = await request(app).post("/api/availability-exceptions").send(validException);
    expect(created.status).toBe(201);
    expect(created.body.data.startTime).toBe("10:00");
    expect(availabilityExceptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: expect.anything(), date: "2026-08-30", startTime: "10:00", endTime: "11:00" }),
    );

    expect((await request(app).get("/api/availability-exceptions")).status).toBe(200);
    expect((await request(app).get(`/api/availability-exceptions?employeeId=${ids.employee}`)).status).toBe(200);
    expect((await request(app).get(`/api/availability-exceptions/${ids.exception}`)).status).toBe(200);

    const updated = await request(app)
      .patch(`/api/availability-exceptions/${ids.exception}`)
      .send({ endTime: "12:00", companyId: ids.companyB, deletedAt: new Date().toISOString() });
    expect(updated.status).toBe(200);
    expect(availabilityExceptionRepository.update).toHaveBeenCalledWith(
      ids.exception,
      expect.not.objectContaining({ companyId: ids.companyB, deletedAt: expect.anything() }),
    );

    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(200);
    expect(availabilityExceptionRepository.softDelete).toHaveBeenCalledWith(ids.exception);
  });

  it("cria exceção de dia inteiro e limpa horários", async () => {
    const response = await request(app).post("/api/availability-exceptions").send({
      ...validException, allDay: true, startTime: "10:00", endTime: "11:00",
    });
    expect(response.status).toBe(201);
    expect(availabilityExceptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ allDay: true, startTime: null, endTime: null }),
    );
  });

  it.each([
    ["employeeId inválido", { ...validException, employeeId: "bad" }],
    ["data inexistente", { ...validException, date: "2026-02-31" }],
    ["data mal formatada", { ...validException, date: "30-08-2026" }],
    ["tipo inválido", { ...validException, type: "SICK" }],
    ["horário mal formatado", { ...validException, startTime: "25:00" }],
    ["período sem fim", { ...validException, endTime: undefined }],
    ["período invertido", { ...validException, startTime: "12:00", endTime: "11:00" }],
    ["reason acima do limite", { ...validException, reason: "x".repeat(501) }],
  ])("rejeita %s no validator real com 400", async (_label, payload) => {
    const response = await request(app).post("/api/availability-exceptions").send(payload);
    expect(response.status).toBe(400);
    expect(availabilityExceptionRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita funcionário inexistente/inativo/de outra empresa", async () => {
    userRepository.findById.mockResolvedValue(null);
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(404);
    userRepository.findById.mockResolvedValue({ ...employeeA, isActive: false });
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(404);
    userRepository.findById.mockResolvedValue({ ...employeeA, companyId: ref(ids.companyB) });
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(404);
  });

  it("não aceita companyId do cliente e aplica a empresa do usuário autenticado", async () => {
    const response = await request(app).post("/api/availability-exceptions").send({
      ...validException, companyId: ids.companyB,
    });
    expect(response.status).toBe(201);
    expect(availabilityExceptionRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ companyId: ids.companyB }),
    );
  });

  it("filtra exceções por funcionário informado na query", async () => {
    const response = await request(app).get(`/api/availability-exceptions?employeeId=${ids.employee}`);
    expect(response.status).toBe(200);
    expect(availabilityExceptionRepository.findByEmployeeId).toHaveBeenCalledWith(ids.companyA, ids.employee);
  });

  it("rejeita employeeId da query inválido e funcionário de outra empresa", async () => {
    expect((await request(app).get("/api/availability-exceptions?employeeId=bad")).status).toBe(400);
    userRepository.findById.mockResolvedValue(null);
    expect((await request(app).get(`/api/availability-exceptions?employeeId=${ids.employee}`)).status).toBe(404);
  });

  it("valida ObjectId antes do controller", async () => {
    expect((await request(app).get("/api/availability-exceptions/not-an-id")).status).toBe(400);
    expect((await request(app).patch("/api/availability-exceptions/not-an-id").send({ reason: "x" })).status).toBe(400);
    expect((await request(app).delete("/api/availability-exceptions/not-an-id")).status).toBe(400);
  });

  it("nega acesso a exceção de outra empresa", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(exceptionA({ companyId: ref(ids.companyB) }));
    expect((await request(app).get(`/api/availability-exceptions/${ids.exception}`)).status).toBe(404);
    expect((await request(app).patch(`/api/availability-exceptions/${ids.exception}`).send({ reason: "x" })).status).toBe(404);
    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(404);
  });

  it("aplica autorização real por role", async () => {
    authUser.value = { ...authUser.value, role: Role.CLIENT };
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(403);
    expect((await request(app).get("/api/availability-exceptions")).status).toBe(403);
    expect((await request(app).patch(`/api/availability-exceptions/${ids.exception}`).send({ reason: "x" })).status).toBe(403);
    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(403);
  });

  it("RESPECTA as permissões por role (ADMIN sem delete, MANAGER sem create, EMPLOYEE somente leitura)", async () => {
    authUser.value = { ...authUser.value, role: Role.ADMIN };
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(201);
    expect((await request(app).get("/api/availability-exceptions")).status).toBe(200);
    expect((await request(app).patch(`/api/availability-exceptions/${ids.exception}`).send({ reason: "x" })).status).toBe(200);
    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(403);
    expect(availabilityExceptionRepository.softDelete).not.toHaveBeenCalled();

    authUser.value = { ...authUser.value, role: Role.MANAGER };
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(403);
    expect((await request(app).get("/api/availability-exceptions")).status).toBe(200);
    expect((await request(app).patch(`/api/availability-exceptions/${ids.exception}`).send({ reason: "x" })).status).toBe(200);
    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(403);

    authUser.value = { ...authUser.value, role: Role.EMPLOYEE };
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(403);
    expect((await request(app).get("/api/availability-exceptions")).status).toBe(200);
    expect((await request(app).patch(`/api/availability-exceptions/${ids.exception}`).send({ reason: "x" })).status).toBe(403);
    expect((await request(app).delete(`/api/availability-exceptions/${ids.exception}`)).status).toBe(403);
  });

  it("bloqueia operações normais quando mustChangePassword está ativo", async () => {
    userRepository.findByIdForAccessControl.mockResolvedValue({ mustChangePassword: true, isActive: true, lockUntil: null });
    expect((await request(app).get("/api/availability-exceptions")).status).toBe(403);
    expect((await request(app).post("/api/availability-exceptions").send(validException)).status).toBe(403);
  });

  it("rejeita criação de appointment durante exceção de bloqueio", async () => {
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionA()]);
    const response = await request(app).post("/api/appointments").send({
      clientId: ids.employee, serviceId: ids.employee, employeeId: ids.employee,
      startAt: "2026-08-30T08:30:00.000Z", notes: "Consulta",
    });
    expect(response.status).toBe(409);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita appointment em dia com exceção de dia inteiro", async () => {
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionA({ allDay: true, startTime: null, endTime: null })]);
    const response = await request(app).post("/api/appointments").send({
      clientId: ids.employee, serviceId: ids.employee, employeeId: ids.employee,
      startAt: "2026-08-30T09:00:00.000Z", notes: "Consulta",
    });
    expect(response.status).toBe(409);
  });
});