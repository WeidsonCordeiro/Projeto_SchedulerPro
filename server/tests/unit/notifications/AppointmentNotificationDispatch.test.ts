import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  availabilityService,
  notificationDispatcher,
} = vi.hoisted(() => ({
  appointmentRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    hasEmployeeConflict: vi.fn(),
    hasClientConflict: vi.fn(),
    softDelete: vi.fn(),
    cancelOverdueScheduled: vi.fn(),
    findByCompanyId: vi.fn(),
  },
  clientRepository: { findById: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  availabilityService: { ensureEmployeeAvailable: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({ default: availabilityService }));
vi.mock("../../../src/modules/notifications/services/NotificationDispatcher", () => ({ default: notificationDispatcher }));

import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { NotificationType } from "../../../src/modules/notifications";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";
const employeeId = "507f1f77bcf86cd799439014";
const id = "507f1f77bcf86cd799439015";

const ref = (value: string) => ({ toString: () => value });

const entity = (extra = {}) => ({
  _id: ref(id),
  companyId: ref(companyId),
  clientId: ref(clientId),
  serviceId: ref(serviceId),
  employeeId: ref(employeeId),
  startAt: new Date("2026-08-30T17:00:00.000Z"),
  endAt: new Date("2026-08-30T17:30:00.000Z"),
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();

  clientRepository.findById.mockResolvedValue({
    companyId: ref(companyId),
    isActive: true,
  });
  serviceRepository.findById.mockResolvedValue({
    companyId: ref(companyId),
    isActive: true,
    duration: 30,
    name: "Corte de cabelo",
  });
  userRepository.findById.mockResolvedValue({
    companyId: ref(companyId),
    isActive: true,
    name: "Ana",
  });
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.create.mockResolvedValue(entity());
  appointmentRepository.update.mockResolvedValue(entity());
  appointmentRepository.updateStatus.mockResolvedValue(
    entity({ status: AppointmentStatus.CONFIRMED }),
  );
  appointmentRepository.findById.mockResolvedValue(entity());
  appointmentRepository.cancelOverdueScheduled.mockResolvedValue(0);
  appointmentRepository.findByCompanyId.mockResolvedValue([entity()]);

  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("AppointmentService -> notificações", () => {
  it("dispara APPOINTMENT_CREATED ao criar", async () => {
    await AppointmentService.create(
      {
        clientId,
        serviceId,
        employeeId,
        startAt: new Date("2026-08-30T17:00:00.000Z"),
      },
      companyId,
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledTimes(1);
    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        appointmentId: id,
        type: NotificationType.APPOINTMENT_CREATED,
        clientId,
        serviceId,
        employeeId,
      }),
    );
  });

  it("dispara APPOINTMENT_UPDATED ao atualizar", async () => {
    appointmentRepository.findById.mockResolvedValue(entity());

    await AppointmentService.update(
      id,
      { notes: "Janela" },
      companyId,
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: id,
        type: NotificationType.APPOINTMENT_UPDATED,
      }),
    );
  });

  it("dispara APPOINTMENT_CANCELLED ao cancelar", async () => {
    appointmentRepository.updateStatus.mockResolvedValue(
      entity({ status: AppointmentStatus.CANCELLED }),
    );

    await AppointmentService.cancel(id, companyId);

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: id,
        type: NotificationType.APPOINTMENT_CANCELLED,
      }),
    );
  });

  it("não dispara notificações em confirm/complete/no-show/delete", async () => {
    appointmentRepository.updateStatus.mockResolvedValue(
      entity({ status: AppointmentStatus.CONFIRMED }),
    );
    await AppointmentService.confirm(id, companyId);

    appointmentRepository.findById.mockResolvedValue(
      entity({ status: AppointmentStatus.CONFIRMED }),
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      entity({ status: AppointmentStatus.COMPLETED }),
    );
    await AppointmentService.complete(id, companyId);

    appointmentRepository.updateStatus.mockResolvedValue(
      entity({ status: AppointmentStatus.NO_SHOW }),
    );
    await AppointmentService.markAsNoShow(id, companyId);

    await AppointmentService.delete(id, companyId);

    expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
  });

  it("não dispara notificações na expiração automática de scheduled vencidos", async () => {
    await AppointmentService.findAll(
      companyId,
      {},
      undefined,
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenCalled();
    expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
  });

  it("falha na notificação não impede a criação do agendamento", async () => {
    notificationDispatcher.dispatchAppointmentEvent.mockRejectedValue(
      new Error("boom"),
    );

    await expect(
      AppointmentService.create(
        {
          clientId,
          serviceId,
          employeeId,
          startAt: new Date("2026-08-30T17:00:00.000Z"),
        },
        companyId,
        new Date("2026-08-29T00:00:00.000Z"),
      ),
    ).resolves.toBeTruthy();
  });
});