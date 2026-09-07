import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  employee: "507f1f77bcf86cd799439013",
  employeeB: "507f1f77bcf86cd799439014",
  client: "507f1f77bcf86cd799439015",
  clientB: "507f1f77bcf86cd799439016",
  service: "507f1f77bcf86cd799439017",
  serviceB: "507f1f77bcf86cd799439018",
  availability: "507f1f77bcf86cd799439019",
  availabilityB: "507f1f77bcf86cd799439020",
  appointment: "507f1f77bcf86cd799439021",
};

const { authUser, availabilityRepository, appointmentRepository, userRepository, clientRepository, serviceRepository, companyRepository } = vi.hoisted(() => ({
  authUser: { value: { userId: "actor", companyId: "507f1f77bcf86cd799439011", role: "OWNER" } },
  availabilityRepository: {
    findById: vi.fn(), findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(),
    findByEmployeeAndDay: vi.fn(), create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
  },
  appointmentRepository: {
    findById: vi.fn(), findByCompanyId: vi.fn(), create: vi.fn(), update: vi.fn(),
    updateStatus: vi.fn(), softDelete: vi.fn(), hasEmployeeConflict: vi.fn(), hasClientConflict: vi.fn(),
  },
  userRepository: { findById: vi.fn() },
  clientRepository: { findById: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  companyRepository: { findById: vi.fn() },
}));

vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.user = authUser.value as never;
      next();
    },
  },
}));
vi.mock("../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));

import app from "../../src/app";
import { Role } from "../../src/constants/roles";
import { AppointmentStatus } from "../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });
const companyA = { _id: ref(ids.companyA), timezone: "Europe/Lisbon" };
const employeeA = { _id: ref(ids.employee), companyId: ref(ids.companyA), role: Role.EMPLOYEE, isActive: true, deletedAt: null };
const clientA = { _id: ref(ids.client), companyId: ref(ids.companyA), isActive: true };
const serviceA = { _id: ref(ids.service), companyId: ref(ids.companyA), isActive: true, duration: 30 };
const availabilityA = {
  _id: ref(ids.availability), companyId: ref(ids.companyA), employeeId: ref(ids.employee), dayOfWeek: 0,
  morningStart: "09:00", morningEnd: "12:00", afternoonStart: "14:00", afternoonEnd: "18:00",
  createdAt: new Date(), updatedAt: new Date(),
};
const appointmentA = (extra: Record<string, unknown> = {}) => ({
  _id: ref(ids.appointment), companyId: ref(ids.companyA), clientId: ref(ids.client),
  serviceId: ref(ids.service), employeeId: ref(ids.employee),
  startAt: new Date("2026-08-30T08:00:00.000Z"), endAt: new Date("2026-08-30T08:30:00.000Z"),
  status: AppointmentStatus.SCHEDULED, notes: null, createdAt: new Date(), updatedAt: new Date(), ...extra,
});

const validAvailability = {
  employeeId: ids.employee, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00",
  afternoonStart: "14:00", afternoonEnd: "18:00",
};
const validAppointment = {
  clientId: ids.client, serviceId: ids.service, employeeId: ids.employee,
  startAt: "2026-08-30T08:00:00.000Z", notes: "Consulta",
};

beforeEach(() => {
  vi.clearAllMocks();
  authUser.value = { userId: "actor", companyId: ids.companyA, role: Role.OWNER };

  userRepository.findById.mockResolvedValue(employeeA);
  clientRepository.findById.mockResolvedValue(clientA);
  serviceRepository.findById.mockResolvedValue(serviceA);
  companyRepository.findById.mockResolvedValue(companyA);

  availabilityRepository.findById.mockResolvedValue(availabilityA);
  availabilityRepository.findByCompanyId.mockResolvedValue([availabilityA]);
  availabilityRepository.findByEmployeeId.mockResolvedValue([availabilityA]);
  availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availabilityA);
  availabilityRepository.create.mockImplementation(async (data: any) => ({ ...availabilityA, ...data }));
  availabilityRepository.update.mockImplementation(async (_id: string, data: any) => ({ ...availabilityA, ...data }));

  appointmentRepository.findById.mockResolvedValue(appointmentA());
  appointmentRepository.findByCompanyId.mockResolvedValue([appointmentA()]);
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.create.mockImplementation(async (data: any) => ({ ...appointmentA(), ...data }));
  appointmentRepository.update.mockImplementation(async (_id: string, data: any) => ({ ...appointmentA(), ...data }));
  appointmentRepository.updateStatus.mockImplementation(async (_id: string, status: AppointmentStatus) => appointmentA({ status }));
});

describe("Availability HTTP integration", () => {
  it("cria disponibilidade válida pelo fluxo HTTP real", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);
    const response = await request(app).post("/api/availability").send(validAvailability);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(availabilityRepository.create).toHaveBeenCalledWith(expect.objectContaining({ employeeId: ids.employee, dayOfWeek: 0 }));
  });

  it("lista, consulta por employee/id, atualiza e remove disponibilidade", async () => {
    expect((await request(app).get("/api/availability")).status).toBe(200);
    expect((await request(app).get(`/api/availability/employee/${ids.employee}`)).status).toBe(200);
    expect((await request(app).get(`/api/availability/${ids.availability}`)).status).toBe(200);
    expect((await request(app).patch(`/api/availability/${ids.availability}`).send({ morningEnd: "11:30" })).status).toBe(200);
    expect((await request(app).delete(`/api/availability/${ids.availability}`)).status).toBe(200);
    expect(availabilityRepository.softDelete).toHaveBeenCalledWith(ids.availability);
  });

  it.each([
    ["employeeId inválido", { ...validAvailability, employeeId: "bad" }],
    ["dayOfWeek inválido", { ...validAvailability, dayOfWeek: 7 }],
    ["horário inválido", { ...validAvailability, morningStart: "25:00" }],
    ["campos obrigatórios ausentes", { employeeId: ids.employee }],
    ["manhã invertida", { ...validAvailability, morningStart: "12:00", morningEnd: "09:00" }],
    ["períodos sobrepostos", { ...validAvailability, morningEnd: "15:00", afternoonStart: "14:00" }],
  ])("rejeita %s no validator real com 400", async (_label, payload) => {
    const response = await request(app).post("/api/availability").send(payload);
    expect(response.status).toBe(400);
    expect(availabilityRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita disponibilidade duplicada e employee inexistente/inativo/de outra empresa", async () => {
    let response = await request(app).post("/api/availability").send(validAvailability);
    expect(response.status).toBe(409);
    userRepository.findById.mockResolvedValue(null);
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);
    response = await request(app).post("/api/availability").send(validAvailability);
    expect(response.status).toBe(404);
    userRepository.findById.mockResolvedValue({ ...employeeA, isActive: false });
    response = await request(app).post("/api/availability").send(validAvailability);
    expect(response.status).toBe(404);
    userRepository.findById.mockResolvedValue({ ...employeeA, companyId: ref(ids.companyB) });
    response = await request(app).post("/api/availability").send(validAvailability);
    expect(response.status).toBe(404);
  });

  it("nega acesso a disponibilidade de outra empresa e valida ObjectId antes do controller", async () => {
    availabilityRepository.findById.mockResolvedValue({ ...availabilityA, companyId: ref(ids.companyB) });
    expect((await request(app).get(`/api/availability/${ids.availability}`)).status).toBe(404);
    expect((await request(app).patch(`/api/availability/${ids.availability}`).send({ morningEnd: "11:00" })).status).toBe(404);
    expect((await request(app).delete(`/api/availability/${ids.availability}`)).status).toBe(404);
    expect((await request(app).get("/api/availability/not-an-id")).status).toBe(400);
  });

  it("aplica autorização real por role", async () => {
    authUser.value = { ...authUser.value, role: Role.CLIENT };
    expect((await request(app).post("/api/availability").send(validAvailability)).status).toBe(403);
    expect((await request(app).delete(`/api/availability/${ids.availability}`)).status).toBe(403);
    expect((await request(app).get("/api/availability")).status).toBe(403);
  });
});

describe("Appointment HTTP integration", () => {
  it("cria, lista, consulta, atualiza e remove appointment pelo fluxo HTTP real", async () => {
    const created = await request(app).post("/api/appointments").send(validAppointment);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe(AppointmentStatus.SCHEDULED);
    expect(appointmentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: expect.objectContaining({ toString: expect.any(Function) }),
      status: AppointmentStatus.SCHEDULED,
    }));
    expect((await request(app).get("/api/appointments")).status).toBe(200);
    expect((await request(app).get(`/api/appointments/${ids.appointment}`)).status).toBe(200);
    expect((await request(app).patch(`/api/appointments/${ids.appointment}`).send({ notes: "Atualizado" })).status).toBe(200);
    expect((await request(app).delete(`/api/appointments/${ids.appointment}`)).status).toBe(200);
    expect(appointmentRepository.softDelete).toHaveBeenCalledWith(ids.appointment);
  });

  it.each([
    ["clientId inválido", { ...validAppointment, clientId: "bad" }],
    ["serviceId inválido", { ...validAppointment, serviceId: "bad" }],
    ["employeeId inválido", { ...validAppointment, employeeId: "bad" }],
    ["startAt inválido", { ...validAppointment, startAt: "not-a-date" }],
    ["campos obrigatórios ausentes", { clientId: ids.client }],
  ])("rejeita %s com 400 antes do service", async (_label, payload) => {
    const response = await request(app).post("/api/appointments").send(payload);
    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("valida ObjectId do appointment antes do controller", async () => {
    expect((await request(app).get("/api/appointments/not-an-id")).status).toBe(400);
    expect((await request(app).patch("/api/appointments/not-an-id").send({ notes: "x" })).status).toBe(400);
    expect((await request(app).delete("/api/appointments/not-an-id")).status).toBe(400);
  });

  it("rejeita client, service e employee de outra empresa", async () => {
    clientRepository.findById.mockResolvedValue({ ...clientA, companyId: ref(ids.companyB) });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(404);
    clientRepository.findById.mockResolvedValue(clientA);
    serviceRepository.findById.mockResolvedValue({ ...serviceA, companyId: ref(ids.companyB) });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(404);
    serviceRepository.findById.mockResolvedValue(serviceA);
    userRepository.findById.mockResolvedValue({ ...employeeA, companyId: ref(ids.companyB) });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(404);
  });

  it("nega consulta, update, status e delete de appointment de outra empresa", async () => {
    appointmentRepository.findById.mockResolvedValue({ ...appointmentA(), companyId: ref(ids.companyB) });
    expect((await request(app).get(`/api/appointments/${ids.appointment}`)).status).toBe(404);
    expect((await request(app).patch(`/api/appointments/${ids.appointment}`).send({ notes: "x" })).status).toBe(404);
    expect((await request(app).patch(`/api/appointments/${ids.appointment}/confirm`)).status).toBe(404);
    expect((await request(app).delete(`/api/appointments/${ids.appointment}`)).status).toBe(404);
  });

  it("rejeita cliente/serviço/employee inexistente ou inativo", async () => {
    clientRepository.findById.mockResolvedValue(null);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(404);
    clientRepository.findById.mockResolvedValue({ ...clientA, isActive: false });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(400);
    clientRepository.findById.mockResolvedValue(clientA);
    serviceRepository.findById.mockResolvedValue({ ...serviceA, isActive: false });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(400);
    serviceRepository.findById.mockResolvedValue(serviceA);
    userRepository.findById.mockResolvedValue({ ...employeeA, isActive: false });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(400);
  });

  it("rejeita appointment fora, parcialmente fora, sem disponibilidade ou em dia diferente", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(409);
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue({ ...availabilityA, morningStart: "10:00" });
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(409);
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availabilityA);
    const late = { ...validAppointment, startAt: "2026-08-30T11:45:00.000Z" };
    expect((await request(app).post("/api/appointments").send(late)).status).toBe(409);
    const differentDay = { ...validAppointment, startAt: "2026-08-31T08:00:00.000Z" };
    availabilityRepository.findByEmployeeAndDay.mockResolvedValueOnce(null);
    expect((await request(app).post("/api/appointments").send(differentDay)).status).toBe(409);
  });

  it("rejeita conflitos de employee/client e permite horários adjacentes", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(409);
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
    appointmentRepository.hasClientConflict.mockResolvedValue(true);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(409);
    appointmentRepository.hasClientConflict.mockResolvedValue(false);
    expect((await request(app).post("/api/appointments").send({ ...validAppointment, startAt: "2026-08-30T09:30:00.000Z" })).status).toBe(201);
  });

  it("trata scheduled/confirmed como conflitantes e permite cancelado conforme repository", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(409);
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
    appointmentRepository.hasClientConflict.mockResolvedValue(false);
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(201);
    expect(appointmentRepository.hasEmployeeConflict).toHaveBeenCalled();
  });

  it("cobre transições válidas e inválidas de status", async () => {
    for (const [path, from, to] of [
      ["confirm", AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      ["complete", AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
      ["cancel", AppointmentStatus.SCHEDULED, AppointmentStatus.CANCELLED],
      ["no-show", AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW],
    ] as const) {
      appointmentRepository.findById.mockResolvedValue(appointmentA({ status: from }));
      const response = await request(app).patch(`/api/appointments/${ids.appointment}/${path}`);
      expect(response.status).toBe(200);
      expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(ids.appointment, to);
    }
    appointmentRepository.findById.mockResolvedValue(appointmentA({ status: AppointmentStatus.COMPLETED }));
    expect((await request(app).patch(`/api/appointments/${ids.appointment}/confirm`)).status).toBe(400);
    appointmentRepository.findById.mockResolvedValue(null);
    expect((await request(app).patch(`/api/appointments/${ids.appointment}/cancel`)).status).toBe(404);
  });

  it("aplica autorização real por role no Appointment", async () => {
    authUser.value = { ...authUser.value, role: Role.CLIENT };
    expect((await request(app).post("/api/appointments").send(validAppointment)).status).toBe(403);
    expect((await request(app).delete(`/api/appointments/${ids.appointment}`)).status).toBe(403);
    expect((await request(app).get("/api/appointments")).status).toBe(200);
  });
});
