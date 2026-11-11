import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointmentRepository, clientRepository, serviceRepository, userRepository, availabilityService, notificationDispatcher } = vi.hoisted(() => ({ appointmentRepository: { findById: vi.fn(), findByIdInCompany: vi.fn(), create: vi.fn(), update: vi.fn(), updateInCompany: vi.fn(), updateStatus: vi.fn(), updateStatusInCompany: vi.fn(), hasEmployeeConflict: vi.fn(), hasClientConflict: vi.fn(), softDelete: vi.fn(), cancelOverdueScheduled: vi.fn(), findByCompanyId: vi.fn() }, clientRepository: { findById: vi.fn(), touchBookingSerialization: vi.fn().mockResolvedValue(undefined) }, serviceRepository: { findById: vi.fn() }, userRepository: { findById: vi.fn(), touchBookingSerialization: vi.fn().mockResolvedValue(undefined) }, availabilityService: { ensureEmployeeAvailable: vi.fn() }, notificationDispatcher: { dispatchAppointmentEvent: vi.fn() } }));
vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({ default: availabilityService }));
vi.mock("../../../src/modules/notifications/services/NotificationDispatcher", () => ({ default: notificationDispatcher }));
vi.mock("../../../src/modules/appointments/services/appointment-booking-transaction", () => ({
  withBookingTransaction: async <T>(operation: (session: never) => Promise<T>) =>
    operation(undefined as never),
}));
import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { AppError } from "../../../src/errors/AppError";
import { Role } from "../../../src/constants/roles";
import { HttpMessages } from "../../../src/constants/http-messages";

const companyId = "507f1f77bcf86cd799439011"; const clientId = "507f1f77bcf86cd799439012"; const serviceId = "507f1f77bcf86cd799439013"; const employeeId = "507f1f77bcf86cd799439014";
const ownerSession = { userId: employeeId, companyId, role: Role.OWNER };
const employeeSession = { userId: employeeId, companyId, role: Role.EMPLOYEE };
const colleagueId = "507f1f77bcf86cd799439099";
const entity = (extra = {}) => ({ _id: { toString: () => "507f1f77bcf86cd799439015" }, companyId: { toString: () => companyId }, clientId: { toString: () => clientId }, serviceId: { toString: () => serviceId }, employeeId: { toString: () => employeeId }, startAt: new Date("2026-08-30T17:00:00Z"), endAt: new Date("2026-08-30T17:30:00Z"), status: AppointmentStatus.SCHEDULED, notes: null, createdAt: new Date(), updatedAt: new Date(), ...extra });
beforeEach(() => { vi.clearAllMocks(); clientRepository.findById.mockResolvedValue({ companyId: { toString: () => companyId }, isActive: true }); serviceRepository.findById.mockResolvedValue({ companyId: { toString: () => companyId }, isActive: true, duration: 30 }); userRepository.findById.mockResolvedValue({ companyId: { toString: () => companyId }, isActive: true }); appointmentRepository.hasEmployeeConflict.mockResolvedValue(false); appointmentRepository.hasClientConflict.mockResolvedValue(false); appointmentRepository.create.mockResolvedValue(entity()); appointmentRepository.update.mockResolvedValue(entity()); appointmentRepository.updateInCompany.mockResolvedValue(entity()); appointmentRepository.updateStatus.mockResolvedValue(entity({ status: AppointmentStatus.CONFIRMED })); appointmentRepository.updateStatusInCompany.mockResolvedValue(entity({ status: AppointmentStatus.CONFIRMED })); appointmentRepository.findByIdInCompany.mockResolvedValue(entity()); appointmentRepository.cancelOverdueScheduled.mockResolvedValue(0); appointmentRepository.findByCompanyId.mockResolvedValue([entity()]); notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined); });

describe("AppointmentService", () => {
  it("cria appointment e valida disponibilidade", async () => { await AppointmentService.create({ clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") }, companyId, new Date("2026-08-29T00:00:00.000Z")); expect(availabilityService.ensureEmployeeAvailable).toHaveBeenCalled(); });
  it("rejeita conflito de funcionário e cliente", async () => { availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined); appointmentRepository.hasEmployeeConflict.mockResolvedValue(true); await expect(AppointmentService.create({ clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") }, companyId, new Date("2026-08-29T00:00:00.000Z"))).rejects.toBeInstanceOf(AppError); appointmentRepository.hasEmployeeConflict.mockResolvedValue(false); appointmentRepository.hasClientConflict.mockResolvedValue(true); await expect(AppointmentService.create({ clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") }, companyId, new Date("2026-08-29T00:00:00.000Z"))).rejects.toBeInstanceOf(AppError); });
  it("propaga indisponibilidade do funcionário", async () => { availabilityService.ensureEmployeeAvailable.mockRejectedValue(new AppError("indisponível", 409)); await expect(AppointmentService.create({ clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") }, companyId, new Date("2026-08-29T00:00:00.000Z"))).rejects.toThrow("indisponível"); });
  it("permite transição válida e rejeita inválida", async () => { const id = "507f1f77bcf86cd799439015"; appointmentRepository.findByIdInCompany.mockResolvedValue(entity()); await expect(AppointmentService.confirm(id, companyId, ownerSession)).resolves.toBeTruthy(); appointmentRepository.findByIdInCompany.mockResolvedValue(entity({ status: AppointmentStatus.COMPLETED })); await expect(AppointmentService.confirm(id, companyId, ownerSession)).rejects.toBeInstanceOf(AppError); });
  it("impede acesso a appointment de outra empresa", async () => { appointmentRepository.findByIdInCompany.mockResolvedValue(null); await expect(AppointmentService.findById("507f1f77bcf86cd799439015", companyId)).rejects.toBeInstanceOf(AppError); });
  it("rejeita criação de appointment no passado", async () => { await expect(AppointmentService.create({ clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") }, companyId, new Date("2026-09-01T00:00:00.000Z"))).rejects.toMatchObject({ message: "Não é possível agendar em um horário que já passou." }); expect(appointmentRepository.create).not.toHaveBeenCalled(); });
  it("não cancela scheduled vencidos ao listar com escopo de empresa", async () => { const now = new Date("2026-09-01T00:00:00.000Z"); await AppointmentService.findAll(companyId, {}, { companyId }, now); expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled(); expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(companyId, {}, undefined); });
  it("mantém confirmed vencidos ao listar", async () => { appointmentRepository.findById.mockResolvedValue(entity()); appointmentRepository.findByCompanyId.mockResolvedValue([entity({ status: AppointmentStatus.CONFIRMED })]); const result = await AppointmentService.findAll(companyId, {}, { companyId }, new Date("2026-09-01T00:00:00.000Z")); expect(result[0].status).toBe(AppointmentStatus.CONFIRMED); });
  it("rejeita mover appointment para o passado na atualização", async () => { appointmentRepository.findByIdInCompany.mockResolvedValue(entity()); await expect(AppointmentService.update("507f1f77bcf86cd799439015", { startAt: new Date("2026-08-30T17:00:00Z") }, companyId, ownerSession, new Date("2026-09-01T00:00:00.000Z"))).rejects.toMatchObject({ message: "Não é possível agendar em um horário que já passou." }); expect(appointmentRepository.updateInCompany).not.toHaveBeenCalled(); });
  it("EMPLOYEE não atualiza agendamento de colega", async () => { appointmentRepository.findByIdInCompany.mockResolvedValue(null); await expect(AppointmentService.update("507f1f77bcf86cd799439015", { notes: "x" }, companyId, employeeSession)).rejects.toMatchObject({ statusCode: 404 }); });
  it("EMPLOYEE rejeita campos proibidos no PATCH", async () => { await expect(AppointmentService.update("507f1f77bcf86cd799439015", { employeeId: colleagueId }, companyId, employeeSession)).rejects.toMatchObject({ message: HttpMessages.APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED, statusCode: 400 }); expect(appointmentRepository.findByIdInCompany).not.toHaveBeenCalled(); });
  it("EMPLOYEE reagenda com listScope employeeId no repositório", async () => {
    const future = new Date("2027-08-30T10:00:00.000Z");
    availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
    appointmentRepository.findByIdInCompany.mockResolvedValue(entity());
    await AppointmentService.update(
      "507f1f77bcf86cd799439015",
      { startAt: future },
      companyId,
      employeeSession,
      new Date("2027-01-01T00:00:00.000Z"),
    );
    expect(appointmentRepository.updateInCompany).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439015",
      companyId,
      expect.objectContaining({ startAt: future }),
      { employeeId },
    );
  });
  it("repassa filtro de período ao repositório", async () => { const startAt = new Date("2026-08-01T00:00:00.000Z"); const endAt = new Date("2026-09-01T00:00:00.000Z"); const now = new Date("2026-07-01T00:00:00.000Z"); await AppointmentService.findAll(companyId, { startAt, endAt }, { companyId }, now); expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(companyId, { startAt, endAt }, undefined); });
  it("passa objeto vazio ao repositório quando nenhum filtro informado", async () => { const now = new Date("2026-07-01T00:00:00.000Z"); await AppointmentService.findAll(companyId, {}, { companyId }, now); expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(companyId, {}, undefined); });
  it("não cancela scheduled vencidos quando a consulta é escopada a um cliente", async () => { const now = new Date("2026-09-01T00:00:00.000Z"); await AppointmentService.findAll(companyId, {}, { companyId, clientId }, now); expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled(); expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(companyId, {}, { clientId }); });
  it("não cancela scheduled vencidos quando a consulta é escopada a um funcionário", async () => { const employeeUserId = "507f1f77bcf86cd799439099"; const now = new Date("2026-09-01T00:00:00.000Z"); await AppointmentService.findAll(companyId, {}, { companyId, employeeId: employeeUserId }, now); expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled(); expect(appointmentRepository.findByCompanyId).toHaveBeenCalledWith(companyId, {}, { employeeId: employeeUserId }); });
  it("findById aplica escopo de funcionário no repositório", async () => { appointmentRepository.findByIdInCompany.mockResolvedValue(entity()); await AppointmentService.findById("507f1f77bcf86cd799439015", companyId, { companyId, employeeId }); expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith("507f1f77bcf86cd799439015", companyId, { employeeId }); });
});

describe("AppointmentService - agendamento administrativo sem link público", () => {
  beforeEach(() => {
    availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
  });

  it("grava publicAccessTokenHash: null", async () => {
    await AppointmentService.create(
      { clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") },
      companyId,
      new Date("2026-08-29T00:00:00.000Z"),
    );

    /**
     * Agendamento criado pela empresa não tem link público. A
     * escrita é explícita para nunca depender do valor por
     * omissão do schema.
     */
    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ publicAccessTokenHash: null }),
    );
  });

  it("não expõe o hash na resposta administrativa", async () => {
    appointmentRepository.create.mockResolvedValue(
      entity({ publicAccessTokenHash: "sha256:segredo" }),
    );

    const created = await AppointmentService.create(
      { clientId, serviceId, employeeId, startAt: new Date("2026-08-30T17:00:00Z") },
      companyId,
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(JSON.stringify(created)).not.toContain("publicAccessTokenHash");
    expect(JSON.stringify(created)).not.toContain("sha256:segredo");
  });
});
