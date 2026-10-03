import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  clientRepository,
  companyRepository,
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
    findByPublicAccessTokenHash: vi.fn(),
  },
  clientRepository: { findById: vi.fn(), findByEmailAndCompany: vi.fn() },
  companyRepository: { findById: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  availabilityService: { ensureEmployeeAvailable: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
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

describe("AppointmentService → token público na notificação", () => {
  /**
   * Exatamente 43 caracteres base64url: o comprimento que
   * `hasValidFormat` exige. Um token mais curto seria rejeitado
   * com 404 e o teste passaria a medir outra coisa.
   */
  const PUBLIC_TOKEN = "aB3-_xY9zQ1wE2rT5yU8iO0pL4kJ6hG7fD2sA1nM0zQ";

  beforeEach(() => {
    vi.clearAllMocks();

    companyRepository.findById.mockResolvedValue({
      _id: ref(companyId),
      name: "salao do centro",
      isActive: true,
      timezone: "Europe/Lisbon",
    });
    clientRepository.findById.mockResolvedValue({
      companyId: ref(companyId),
      isActive: true,
    });
    clientRepository.findByEmailAndCompany.mockResolvedValue({
      _id: ref(clientId),
      name: "Maria",
      email: "maria@example.com",
      isActive: true,
      companyId: ref(companyId),
    });
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(companyId),
      isActive: true,
      duration: 30,
      name: "Corte de cabelo",
    });
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: true,
      name: "Ana",
      role: "EMPLOYEE",
    });
    availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
    appointmentRepository.hasClientConflict.mockResolvedValue(false);
    appointmentRepository.create.mockResolvedValue(entity());
    appointmentRepository.update.mockResolvedValue(entity());
    appointmentRepository.updateStatus.mockResolvedValue(
      entity({ status: AppointmentStatus.CANCELLED }),
    );
    appointmentRepository.findById.mockResolvedValue(
      entity({ publicAccessTokenHash: `sha256:${"a".repeat(64)}` }),
    );
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      entity({ publicAccessTokenHash: `sha256:${"a".repeat(64)}` }),
    );
    notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
  });

  const dispatched = () =>
    notificationDispatcher.dispatchAppointmentEvent.mock.calls[0][0];

  describe("fluxo administrativo (sem token público)", () => {
    it("não envia token na criação administrativa", async () => {
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

      expect(dispatched()).not.toHaveProperty("publicAccessToken");
    });

    it("não envia token no cancelamento administrativo", async () => {
      await AppointmentService.cancel(id, companyId);

      expect(dispatched()).not.toHaveProperty("publicAccessToken");
    });
  });

  describe("fluxo público (com token público)", () => {
    it("envia o token puro na criação pública", async () => {
      await AppointmentService.createPublic(
        {
          serviceId,
          employeeId,
          startAt: "2026-08-30T18:00:00.000+01:00",
          clientName: "Maria",
          clientEmail: "maria@example.com",
        } as never,
        companyId,
        new Date("2026-08-29T00:00:00.000Z"),
      );

      expect(dispatched()).toMatchObject({
        type: NotificationType.APPOINTMENT_CREATED,
        publicAccessToken: expect.any(String),
      });
    });

    it("o token enviado é o mesmo devolvido na resposta (não o hash)", async () => {
      const result = await AppointmentService.createPublic(
        {
          serviceId,
          employeeId,
          startAt: "2026-08-30T18:00:00.000+01:00",
          clientName: "Maria",
          clientEmail: "maria@example.com",
        } as never,
        companyId,
        new Date("2026-08-29T00:00:00.000Z"),
      );

      expect(dispatched().publicAccessToken).toBe(result.publicAccessToken);
      expect(dispatched().publicAccessToken).not.toContain("sha256:");
    });

    it("envia o token da URL na alteração pública", async () => {
      await AppointmentService.updatePublicByToken(
        PUBLIC_TOKEN,
        { notes: "Janela" } as never,
        new Date("2026-08-29T00:00:00.000Z"),
      );

      expect(dispatched()).toMatchObject({
        type: NotificationType.APPOINTMENT_UPDATED,
        publicAccessToken: PUBLIC_TOKEN,
      });
    });

    it("envia o token da URL no cancelamento público", async () => {
      await AppointmentService.cancelPublicByToken(PUBLIC_TOKEN);

      expect(dispatched()).toMatchObject({
        type: NotificationType.APPOINTMENT_CANCELLED,
        publicAccessToken: PUBLIC_TOKEN,
      });
    });

    it("não envia e-mail quando o token público é inválido (404)", async () => {
      appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(null);

      await expect(
        AppointmentService.updatePublicByToken("token_invalido", {} as never),
      ).rejects.toThrow();

      expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
    });

    it("não envia e-mail quando o cancelamento público é rejeitado", async () => {
      appointmentRepository.findById.mockResolvedValue(
        entity({ status: AppointmentStatus.COMPLETED }),
      );

      await expect(
        AppointmentService.cancelPublicByToken(PUBLIC_TOKEN),
      ).rejects.toThrow();

      expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
    });

    it("cancelar um agendamento já cancelado é idempotente e não notifica", async () => {
      // `cancelPublicByToken` lê o estado do agendamento devolvido
      // pela resolução do token.
      appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
        entity({ status: AppointmentStatus.CANCELLED }),
      );

      await AppointmentService.cancelPublicByToken(PUBLIC_TOKEN);

      expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
    });

    it("e-mail falhado não desfaz a criação: o cliente recebe o token", async () => {
      // A creation email é best effort. Se o provider explodir, o
      // agendamento tem de continuar criado E o token tem de
      // continuar a ser devolvido — é a única cópia que o cliente
      // recebe.
      notificationDispatcher.dispatchAppointmentEvent.mockRejectedValue(
        new Error("resend down"),
      );

      const result = await AppointmentService.createPublic(
        {
          serviceId,
          employeeId,
          startAt: "2026-08-30T18:00:00.000+01:00",
          clientName: "Maria",
          clientEmail: "maria@example.com",
        } as never,
        companyId,
        new Date("2026-08-29T00:00:00.000Z"),
      );

      expect(appointmentRepository.create).toHaveBeenCalled();
      expect(result.appointment).toBeTruthy();
      expect(result.publicAccessToken).toHaveLength(43);
    });

    it("e-mail falhado não desfaz a alteração nem o cancelamento", async () => {
      notificationDispatcher.dispatchAppointmentEvent.mockRejectedValue(
        new Error("resend down"),
      );

      await expect(
        AppointmentService.updatePublicByToken(
          PUBLIC_TOKEN,
          { notes: "Janela" } as never,
          new Date("2026-08-29T00:00:00.000Z"),
        ),
      ).resolves.toBeTruthy();

      await expect(
        AppointmentService.cancelPublicByToken(PUBLIC_TOKEN),
      ).resolves.toBeTruthy();
    });
  });
});