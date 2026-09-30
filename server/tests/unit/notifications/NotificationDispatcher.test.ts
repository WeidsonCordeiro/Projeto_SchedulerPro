import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notificationRepository,
  companyRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  resendProvider,
  logger,
} = vi.hoisted(() => ({
  notificationRepository: { createMany: vi.fn(), findByUser: vi.fn() },
  companyRepository: { findById: vi.fn() },
  clientRepository: { findByIdAndCompany: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn(), findByCompanyId: vi.fn() },
  resendProvider: { send: vi.fn() },
  logger: { error: vi.fn(), email: vi.fn() },
}));

vi.mock("../../../src/modules/notifications/repositories/NotificationRepository", () => ({
  default: notificationRepository,
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
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/providers/mail/ResendProvider", () => ({
  default: resendProvider,
}));
vi.mock("../../../src/providers/logger/Logger", () => ({
  default: logger,
}));

import NotificationDispatcher from "../../../src/modules/notifications/services/NotificationDispatcher";
import { NotificationType } from "../../../src/modules/notifications";
import { Role } from "../../../src/constants/roles";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";
const employeeId = "507f1f77bcf86cd799439014";
const appointmentId = "507f1f77bcf86cd799439015";

const input = {
  companyId,
  appointmentId,
  type: NotificationType.APPOINTMENT_CREATED,
  clientId,
  serviceId,
  employeeId,
  startAt: new Date("2026-08-30T17:00:00.000Z"),
  notes: null,
};

const ref = (id: string) => ({ toString: () => id });

const user = (extra = {}) => ({
  _id: ref(employeeId),
  role: Role.EMPLOYEE,
  isActive: true,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();

  notificationRepository.createMany.mockResolvedValue([]);
  companyRepository.findById.mockResolvedValue({
    name: "salao do centro",
    timezone: "Europe/Lisbon",
  });
  clientRepository.findByIdAndCompany.mockResolvedValue({
    id: ref(clientId),
    name: "Maria",
    email: "maria@example.com",
  });
  serviceRepository.findById.mockResolvedValue({
    name: "Corte de cabelo",
    duration: 30,
  });
  userRepository.findById.mockResolvedValue({ name: "Ana" });

  resendProvider.send.mockResolvedValue(undefined);
});

describe("NotificationDispatcher", () => {
  it("cria notificações internas apenas para utilizadores internos ativos", async () => {
    userRepository.findByCompanyId.mockResolvedValue([
      user({ _id: ref("u-owner"), role: Role.OWNER }),
      user({ _id: ref("u-employee"), role: Role.EMPLOYEE }),
      user({ _id: ref("u-inactive"), isActive: false }),
      user({ _id: ref("u-client"), role: Role.CLIENT }),
    ]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    const items = notificationRepository.createMany.mock.calls[0][0];
    const userIds = items.map((item: { userId: { toString: () => string } }) =>
      item.userId.toString(),
    );

    expect(userIds).toContain("u-owner");
    expect(userIds).toContain("u-employee");
    expect(userIds).not.toContain("u-inactive");
    expect(userIds).not.toContain("u-client");
  });

  it("monta título e mensagem no fuso da empresa", async () => {
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    const [item] = notificationRepository.createMany.mock.calls[0][0];
    expect(item.companyId.toString()).toBe(companyId);
    expect(item.userId.toString()).toBe(employeeId);
    expect(item.type).toBe(NotificationType.APPOINTMENT_CREATED);
    expect(item.title).toBe("Novo agendamento");
    expect(item.message).toBe("Maria — Corte de cabelo em 30/08/2026 às 18:00.");
    expect(item.metadata.appointmentId.toString()).toBe(appointmentId);
    expect(item.metadata.clientId.toString()).toBe(clientId);
    expect(item.metadata.serviceId.toString()).toBe(serviceId);
    expect(item.metadata.employeeId.toString()).toBe(employeeId);
  });

  it("envia e-mail ao cliente com os dados do agendamento", async () => {
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@example.com",
        subject: expect.stringContaining("Seu agendamento foi confirmado"),
        html: expect.stringContaining("Maria"),
      }),
    );
    expect(logger.email).toHaveBeenCalled();
  });

  it("não envia e-mail quando o cliente não possui e-mail cadastrado", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue({
      id: ref(clientId),
      name: "Maria",
      email: null,
    });
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    expect(resendProvider.send).not.toHaveBeenCalled();
  });

  it("não notifica quando o cliente não é encontrado na empresa", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(null);
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    expect(notificationRepository.createMany).not.toHaveBeenCalled();
    expect(resendProvider.send).not.toHaveBeenCalled();
  });

  it("ignora falha no envio de e-mail e não propaga o erro", async () => {
    userRepository.findByCompanyId.mockResolvedValue([user()]);
    resendProvider.send.mockRejectedValue(new Error("resend down"));

    await expect(
      NotificationDispatcher.dispatchAppointmentEvent(input),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
    expect(notificationRepository.createMany).toHaveBeenCalled();
  });

  it("ignora falha ao persistir notificações e não propaga o erro", async () => {
    notificationRepository.createMany.mockRejectedValue(new Error("mongo down"));

    await expect(
      NotificationDispatcher.dispatchAppointmentEvent(input),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });

  it("usa o assunto/título correspondente ao tipo do evento", async () => {
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent({
      ...input,
      type: NotificationType.APPOINTMENT_CANCELLED,
    });

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Seu agendamento foi cancelado"),
      }),
    );

    const [item] = notificationRepository.createMany.mock.calls[0][0];
    expect(item.title).toBe("Agendamento cancelado");
  });

  it("sai sem notificar quando o tipo de evento é desconhecido", async () => {
    await NotificationDispatcher.dispatchAppointmentEvent({
      ...input,
      type: "EVENTO_DESCONHECIDO" as NotificationType,
    });

    expect(companyRepository.findById).not.toHaveBeenCalled();
    expect(notificationRepository.createMany).not.toHaveBeenCalled();
    expect(resendProvider.send).not.toHaveBeenCalled();
  });

  it("não cria notificações internas quando não há utilizadores internos, mas envia o e-mail", async () => {
    userRepository.findByCompanyId.mockResolvedValue([]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    expect(notificationRepository.createMany).not.toHaveBeenCalled();
    expect(resendProvider.send).toHaveBeenCalled();
  });

  it("usa 'Serviço' e duração zero quando serviço/funcionário estão ausentes", async () => {
    serviceRepository.findById.mockResolvedValue(null);
    userRepository.findById.mockResolvedValue(null);
    userRepository.findByCompanyId.mockResolvedValue([user()]);

    await NotificationDispatcher.dispatchAppointmentEvent(input);

    const [item] = notificationRepository.createMany.mock.calls[0][0];
    expect(item.message).toBe("Maria — Serviço em 30/08/2026 às 18:00.");

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("18:00 às 18:00"),
      }),
    );
  });
});