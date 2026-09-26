import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  companyRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  resendProvider,
  logger,
} = vi.hoisted(() => ({
  appointmentRepository: {
    findUpcomingForReminders: vi.fn(),
    claimReminder: vi.fn(),
    markReminderSent: vi.fn(),
    releaseReminderLease: vi.fn(),
  },
  companyRepository: { findById: vi.fn() },
  clientRepository: { findByIdAndCompany: vi.fn() },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  resendProvider: { send: vi.fn() },
  logger: { error: vi.fn(), email: vi.fn() },
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({
  default: appointmentRepository,
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

import ReminderService from "../../../src/modules/reminders/services/ReminderService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const companyId = "507f1f77bcf86cd799439011";
const clientId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";
const employeeId = "507f1f77bcf86cd799439014";
const appointmentId = "507f1f77bcf86cd799439015";

const now = new Date("2026-08-30T12:00:00.000Z");

const ref = (id: string) => ({ toString: () => id });

const company = (extra = {}) => ({
  name: "salao do centro",
  timezone: "Europe/Lisbon",
  isActive: true,
  ...extra,
});

const client = (email = "maria@example.com", extra = {}) => ({
  id: ref(clientId),
  name: "Maria",
  email,
  ...extra,
});

const appointment = (extra = {}) => ({
  _id: ref(appointmentId),
  companyId: ref(companyId),
  clientId: ref(clientId),
  serviceId: ref(serviceId),
  employeeId: ref(employeeId),
  startAt: new Date("2026-08-31T10:00:00.000Z"),
  status: AppointmentStatus.SCHEDULED,
  reminder24hSentAt: null,
  reminder2hSentAt: null,
  reminder24hLeaseUntil: null,
  reminder2hLeaseUntil: null,
  ...extra,
});

/** Agendamento dentro da janela de 24h (startAt = now + 22h). */
const appointment24h = (extra = {}) =>
  appointment({
    startAt: new Date(now.getTime() + 22 * 60 * 60 * 1000),
    ...extra,
  });

/** Agendamento dentro da janela de 2h (startAt = now + 1.5h). */
const appointment2h = (extra = {}) =>
  appointment({
    startAt: new Date(now.getTime() + 90 * 60 * 1000),
    ...extra,
  });

beforeEach(() => {
  vi.clearAllMocks();

  appointmentRepository.findUpcomingForReminders.mockResolvedValue([]);
  appointmentRepository.claimReminder.mockResolvedValue({ modifiedCount: 1 });
  appointmentRepository.markReminderSent.mockResolvedValue({ modifiedCount: 1 });
  appointmentRepository.releaseReminderLease.mockResolvedValue({ modifiedCount: 1 });

  companyRepository.findById.mockResolvedValue(company());
  clientRepository.findByIdAndCompany.mockResolvedValue(client());
  serviceRepository.findById.mockResolvedValue({ name: "Corte de cabelo", duration: 30 });
  userRepository.findById.mockResolvedValue({ name: "Ana" });

  resendProvider.send.mockResolvedValue(undefined);
});

describe("ReminderService — lembretes de 24h", () => {
  it("envia o lembrete de 24h quando o agendamento é elegível", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledTimes(1);
    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@example.com",
        subject: "SchedulerPro — Lembrete em 24 horas",
        html: expect.stringContaining("Seu agendamento é em 24 horas"),
      }),
    );
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledWith(
      expect.anything(),
      {
        sentField: "reminder24hSentAt",
        leaseField: "reminder24hLeaseUntil",
      },
      now,
    );
    expect(summary).toEqual({ checked: 1, sent: 1, skipped: 0, failed: 0 });
  });

  it("não envia quando o lembrete de 24h já foi enviado", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h({ reminder24hSentAt: new Date("2026-08-30T10:00:00.000Z") }),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("não envia quando ainda é cedo demais (fora da janela)", async () => {
    const tooEarly = appointment24h({
      startAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
    });

    appointmentRepository.findUpcomingForReminders.mockResolvedValue([tooEarly]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("não envia para agendamento que já passou", async () => {
    const past = appointment({ startAt: new Date("2026-08-29T10:00:00.000Z") });

    appointmentRepository.findUpcomingForReminders.mockResolvedValue([past]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("não envia para agendamento cancelado (claim rejeita no banco)", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h({ status: AppointmentStatus.CANCELLED }),
    ]);
    appointmentRepository.claimReminder.mockResolvedValue({ modifiedCount: 0 });

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it.each([AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED])(
    "não envia para agendamento %s (claim rejeita no banco)",
    async (status) => {
      appointmentRepository.findUpcomingForReminders.mockResolvedValue([
        appointment24h({ status }),
      ]);
      appointmentRepository.claimReminder.mockResolvedValue({ modifiedCount: 0 });

      const summary = await ReminderService.processDueReminders(now);

      expect(resendProvider.send).not.toHaveBeenCalled();
      expect(summary.sent).toBe(0);
      expect(summary.skipped).toBe(1);
    },
  );

  it("não marca como enviado quando o envio falha", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);
    resendProvider.send.mockRejectedValue(new Error("resend down"));

    const summary = await ReminderService.processDueReminders(now);

    expect(appointmentRepository.releaseReminderLease).toHaveBeenCalledWith(
      expect.anything(),
      "reminder24hLeaseUntil",
    );
    expect(appointmentRepository.markReminderSent).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, sent: 0, skipped: 0, failed: 1 });
  });

  it("falha no envio não propaga e libera a trava mesmo quando a liberação falha", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);
    resendProvider.send.mockRejectedValue(new Error("resend down"));
    appointmentRepository.releaseReminderLease.mockRejectedValue(
      new Error("mongo down"),
    );

    const summary = await ReminderService.processDueReminders(now);

    expect(appointmentRepository.markReminderSent).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });

  it("execuções repetidas não duplicam o envio", async () => {
    appointmentRepository.findUpcomingForReminders
      .mockResolvedValueOnce([appointment24h()])
      .mockResolvedValueOnce([
        appointment24h({ reminder24hSentAt: new Date("2026-08-30T10:00:00.000Z") }),
      ]);

    await ReminderService.processDueReminders(now);
    await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledTimes(1);
  });
});

describe("ReminderService — lembretes de 2h", () => {
  it("envia o lembrete de 2h quando o agendamento é elegível", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment2h(),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledTimes(1);
    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "SchedulerPro — Lembrete em 2 horas",
        html: expect.stringContaining("Seu agendamento é em 2 horas"),
      }),
    );
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledWith(
      expect.anything(),
      {
        sentField: "reminder2hSentAt",
        leaseField: "reminder2hLeaseUntil",
      },
      now,
    );
    expect(summary).toEqual({ checked: 1, sent: 1, skipped: 0, failed: 0 });
  });

  it("não envia quando o lembrete de 2h já foi enviado", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment2h({ reminder2hSentAt: new Date("2026-08-30T10:00:00.000Z") }),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("não envia para agendamento cancelado antes do lembrete de 2h", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment2h({ status: AppointmentStatus.CANCELLED }),
    ]);
    appointmentRepository.claimReminder.mockResolvedValue({ modifiedCount: 0 });

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("execuções repetidas não duplicam o envio", async () => {
    appointmentRepository.findUpcomingForReminders
      .mockResolvedValueOnce([appointment2h()])
      .mockResolvedValueOnce([
        appointment2h({ reminder2hSentAt: new Date("2026-08-30T10:00:00.000Z") }),
      ]);

    await ReminderService.processDueReminders(now);
    await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledTimes(1);
  });

  it("falha no envio não marca como enviado", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment2h(),
    ]);
    resendProvider.send.mockRejectedValue(new Error("resend down"));

    const summary = await ReminderService.processDueReminders(now);

    expect(appointmentRepository.releaseReminderLease).toHaveBeenCalledWith(
      expect.anything(),
      "reminder2hLeaseUntil",
    );
    expect(appointmentRepository.markReminderSent).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });

  it("recalcula o lembrete de 2h em relação ao novo horário após alteração", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment2h({ reminder24hSentAt: new Date("2026-08-29T10:00:00.000Z") }),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledTimes(1);
    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "SchedulerPro — Lembrete em 2 horas" }),
    );
    expect(summary.sent).toBe(1);
  });
});

describe("ReminderService — timezone e DST", () => {
  it("formata data/hora no timezone da empresa (Europa/Lisboa no verão = UTC+1)", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("31/08/2026"),
      }),
    );
    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("11:00 às 11:30"),
      }),
    );
  });

  it("formata horário em outro timezone (America/Sao_Paulo = UTC-3)", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ timezone: "America/Sao_Paulo" }),
    );
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining("07:00 às 07:30") }),
    );
  });

  it("aplica DST: mesmo instante UTC vira horário local diferente antes/depois da transição", async () => {
    const beforeDst = new Date("2026-03-27T10:00:00.000Z");
    const afterDst = new Date("2026-03-30T10:00:00.000Z");

    const checkLabel = async (startAt: Date, expected: string) => {
      appointmentRepository.findUpcomingForReminders.mockResolvedValue([
        appointment24h({ startAt }),
      ]);
      await ReminderService.processDueReminders(
        new Date(startAt.getTime() - 22 * 60 * 60 * 1000),
      );
      expect(resendProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ html: expect.stringContaining(expected) }),
      );
    };

    await checkLabel(beforeDst, "10:00 às 10:30");
    await checkLabel(afterDst, "11:00 às 11:30");

    expect(resendProvider.send).toHaveBeenCalledTimes(2);
  });
});

describe("ReminderService — isolamento e destinatário", () => {
  it("processa cada empresa com os dados da própria empresa e do próprio cliente", async () => {
    const companyIdA = "507f1f77bcf86cd799439021";
    const companyIdB = "507f1f77bcf86cd799439031";
    const clientIdA = "507f1f77bcf86cd799439022";
    const clientIdB = "507f1f77bcf86cd799439032";

    const apptCompanyA = appointment24h({
      _id: ref("appt-a"),
      companyId: ref(companyIdA),
      clientId: ref(clientIdA),
    });
    const apptCompanyB = appointment2h({
      _id: ref("appt-b"),
      companyId: ref(companyIdB),
      clientId: ref(clientIdB),
    });

    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      apptCompanyA,
      apptCompanyB,
    ]);
    companyRepository.findById
      .mockResolvedValueOnce(company({ name: "Salão A" }))
      .mockResolvedValueOnce(company({ name: "Salão B" }));
    clientRepository.findByIdAndCompany
      .mockResolvedValueOnce(client("ana@a.com", { name: "Ana A" }))
      .mockResolvedValueOnce(client("bia@b.com", { name: "Bia B" }));

    await ReminderService.processDueReminders(now);

    expect(companyRepository.findById).toHaveBeenNthCalledWith(1, companyIdA);
    expect(companyRepository.findById).toHaveBeenNthCalledWith(2, companyIdB);
    expect(clientRepository.findByIdAndCompany).toHaveBeenNthCalledWith(
      1,
      clientIdA,
      companyIdA,
    );
    expect(clientRepository.findByIdAndCompany).toHaveBeenNthCalledWith(
      2,
      clientIdB,
      companyIdB,
    );
    expect(resendProvider.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: "ana@a.com", html: expect.stringContaining("Ana A") }),
    );
    expect(resendProvider.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: "bia@b.com", html: expect.stringContaining("Bia B") }),
    );
  });

  it("usa o e-mail do cliente associado ao agendamento", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(
      client("cliente@example.com"),
    );
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    await ReminderService.processDueReminders(now);

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com" }),
    );
  });

  it("não envia quando a empresa está inativa", async () => {
    companyRepository.findById.mockResolvedValue(
      company({ isActive: false }),
    );
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("não envia quando o cliente não possui e-mail", async () => {
    clientRepository.findByIdAndCompany.mockResolvedValue(
      client(null as never),
    );
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("não envia quando outra execução disputou o mesmo lembrete (claim falhou)", async () => {
    appointmentRepository.findUpcomingForReminders.mockResolvedValue([
      appointment24h(),
    ]);
    appointmentRepository.claimReminder.mockResolvedValue({ modifiedCount: 0 });

    const summary = await ReminderService.processDueReminders(now);

    expect(resendProvider.send).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, sent: 0, skipped: 1, failed: 0 });
  });
});