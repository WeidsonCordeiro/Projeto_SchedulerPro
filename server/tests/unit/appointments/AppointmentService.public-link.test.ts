import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  companyRepository,
  availabilityService,
  notificationDispatcher,
  loggerInfo,
  loggerError,
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
  clientRepository: {
    findById: vi.fn(),
    findByIdAndCompany: vi.fn(),
    findByEmailAndCompany: vi.fn(),
    create: vi.fn(),
    findByCompanyId: vi.fn(),
  },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  companyRepository: { findById: vi.fn() },
  availabilityService: { ensureEmployeeAvailable: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({ default: availabilityService }));
vi.mock("../../../src/modules/notifications/services/NotificationDispatcher", () => ({ default: notificationDispatcher }));
vi.mock("../../../src/providers/logger/Logger", () => ({
  default: {
    info: loggerInfo,
    error: loggerError,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";
import { NotificationType } from "../../../src/modules/notifications";

const companyId = "507f1f77bcf86cd799439011";
const otherCompanyId = "507f1f77bcf86cd799439099";
const serviceId = "507f1f77bcf86cd799439013";
const otherServiceId = "507f1f77bcf86cd799439018";
const employeeId = "507f1f77bcf86cd799439014";
const otherEmployeeId = "507f1f77bcf86cd799439020";
const clientId = "507f1f77bcf86cd799439015";
const appointmentId = "507f1f77bcf86cd799439016";

const ref = (id: string) => ({ toString: () => id });

const START_AT = new Date("2027-08-29T08:00:00.000Z");
const END_AT = new Date(START_AT.getTime() + 30 * 60 * 1000);
const NOW = new Date("2027-08-28T00:00:00.000Z");

const TOKEN = "kJ8vQ2mNpR4xW7yLbT0cV6jHfD3qS8aZgE1uI5oK9nM";
const TOKEN_HASH = PublicAppointmentTokenProvider.hash(TOKEN);

const storedAppointment = (overrides: Record<string, unknown> = {}) => ({
  _id: ref(appointmentId),
  companyId: ref(companyId),
  clientId: ref(clientId),
  serviceId: ref(serviceId),
  employeeId: ref(employeeId),
  startAt: START_AT,
  endAt: END_AT,
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  publicAccessTokenHash: TOKEN_HASH,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const updatedAppointment = () =>
  storedAppointment({
    startAt: new Date("2027-08-30T10:00:00.000Z"),
    endAt: new Date("2027-08-30T10:30:00.000Z"),
    notes: "Nova nota",
  });

/**
 * Estado partilhado pelos mocks de `findById`/`findByPublicAccessTokenHash`
 * para que o cancelamento seja visível na leitura seguinte — como
 * aconteceria com a base de dados real.
 */
let currentStatus = AppointmentStatus.SCHEDULED;
let currentStartAt = START_AT;
let currentEndAt = END_AT;
let currentServiceId = serviceId;
let currentNotes: string | null = null;

const currentAppointment = () =>
  storedAppointment({
    status: currentStatus,
    startAt: currentStartAt,
    endAt: currentEndAt,
    serviceId: ref(currentServiceId),
    notes: currentNotes,
  });

beforeEach(() => {
  vi.clearAllMocks();

  currentStatus = AppointmentStatus.SCHEDULED;
  currentStartAt = START_AT;
  currentEndAt = END_AT;
  currentServiceId = serviceId;
  currentNotes = null;

  clientRepository.findById.mockResolvedValue({
    _id: ref(clientId),
    name: "Ana Publica",
    isActive: true,
  });
  serviceRepository.findById.mockResolvedValue({
    _id: ref(serviceId),
    companyId: ref(companyId),
    isActive: true,
    duration: 30,
    name: "Corte",
  });
  userRepository.findById.mockResolvedValue({
    _id: ref(employeeId),
    companyId: ref(companyId),
    isActive: true,
    role: Role.EMPLOYEE,
    name: "Carlos",
    avatar: null,
  });

  availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.findByPublicAccessTokenHash.mockImplementation(
    async (hash: string) => (hash === TOKEN_HASH ? currentAppointment() : null),
  );
  /**
   * `cancel()` administrativo volta a ler o documento; este mock
   * partilha o estado para que a transição reutilize a regra
   * existente em vez de a duplicar, e para que a leitura seguinte
   * reflita o cancelamento.
   */
  appointmentRepository.findById.mockImplementation(async () =>
    currentAppointment(),
  );
  appointmentRepository.update.mockImplementation(
    async (_id: unknown, data: Record<string, unknown>) => {
      if (data.startAt instanceof Date) currentStartAt = data.startAt;
      if (data.endAt instanceof Date) currentEndAt = data.endAt;
      if (data.notes !== undefined) currentNotes = data.notes as string | null;
      if (data.serviceId) currentServiceId = String(data.serviceId);

      return currentAppointment();
    },
  );
  appointmentRepository.updateStatus.mockImplementation(async () => {
    currentStatus = AppointmentStatus.CANCELLED;

    return currentAppointment();
  });
  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("AppointmentService — resolução por token", () => {
  it("resolve o agendamento pelo hash do token", async () => {
    await AppointmentService.findPublicByToken(TOKEN);

    expect(appointmentRepository.findByPublicAccessTokenHash).toHaveBeenCalledWith(
      TOKEN_HASH,
    );
  });

  it("nunca consulta o agendamento por _id", async () => {
    await AppointmentService.findPublicByToken(TOKEN);

    expect(appointmentRepository.findById).not.toHaveBeenCalled();
  });

  it("devolve 404 para token malformado sem tocar na base de dados", async () => {
    await expect(
      AppointmentService.findPublicByToken("curto"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.findByPublicAccessTokenHash).not.toHaveBeenCalled();
  });

  it("devolve 404 para token inexistente", async () => {
    const unknown = "a".repeat(43);

    await expect(
      AppointmentService.findPublicByToken(unknown),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("usa a mesma mensagem e status para token malformado e inexistente", async () => {
    const malformed = await AppointmentService.findPublicByToken("x").catch(
      (error: Error & { statusCode?: number }) => error,
    );
    const unknown = "a".repeat(43);
    const nonexistent = await AppointmentService.findPublicByToken(unknown).catch(
      (error: Error & { statusCode?: number }) => error,
    );

    expect((malformed as Error).message).toBe((nonexistent as Error).message);
    expect((malformed as { statusCode?: number }).statusCode).toBe(404);
    expect((nonexistent as { statusCode?: number }).statusCode).toBe(404);
  });

  it("não distingue ObjectId de token válido", async () => {
    await expect(
      AppointmentService.findPublicByToken("507f1f77bcf86cd799439011"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejeita token de outro agendamento", async () => {
    const otherToken = "z".repeat(43);

    await expect(
      AppointmentService.findPublicByToken(otherToken),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("não regista o token em log", async () => {
    await AppointmentService.findPublicByToken(TOKEN);

    const logged = JSON.stringify(loggerInfo.mock.calls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(TOKEN_HASH);

    /**
     * Só o início do digest é registado, para diagnóstico.
     */
    expect(loggerInfo).toHaveBeenCalledWith(
      "Acesso público a agendamento",
      expect.objectContaining({
        tokenHint: TOKEN_HASH.slice("sha256:".length, "sha256:".length + 14),
      }),
    );
  });
});

describe("AppointmentService.findPublicByToken — resposta", () => {
  it("devolve o contrato público", async () => {
    const result = await AppointmentService.findPublicByToken(TOKEN);

    expect(result).toEqual({
      id: appointmentId,
      startAt: START_AT,
      endAt: END_AT,
      status: AppointmentStatus.SCHEDULED,
      clientName: "Ana Publica",
      service: { id: serviceId, name: "Corte" },
      employee: {
        id: employeeId,
        name: "Carlos",
        avatarUrl: null,
      },
    });
  });

  it("não expõe hash, clientId, companyId nem notas", async () => {
    const result = await AppointmentService.findPublicByToken(TOKEN);

    expect(result).not.toHaveProperty("publicAccessTokenHash");
    expect(result).not.toHaveProperty("clientId");
    expect(result).not.toHaveProperty("companyId");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("createdAt");
  });

  it("expõe apenas a URL do avatar do profissional", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: true,
      role: Role.EMPLOYEE,
      name: "Carlos",
      avatar: {
        url: "https://cdn.exemplo.com/carlos.jpg",
        publicId: "carlos-123",
        bytes: 1024,
      },
    });

    const result = await AppointmentService.findPublicByToken(TOKEN);

    expect(result.employee.avatarUrl).toBe("https://cdn.exemplo.com/carlos.jpg");
    expect(JSON.stringify(result)).not.toContain("carlos-123");
    expect(JSON.stringify(result)).not.toContain("1024");
  });

  it("consulta um agendamento cancelado", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status: AppointmentStatus.CANCELLED }),
    );

    const result = await AppointmentService.findPublicByToken(TOKEN);

    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("consulta um agendamento histórico já iniciado", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({
        startAt: new Date("2020-01-01T10:00:00.000Z"),
        endAt: new Date("2020-01-01T10:30:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      }),
    );

    const result = await AppointmentService.findPublicByToken(TOKEN);

    expect(result.status).toBe(AppointmentStatus.COMPLETED);
  });
});

describe("AppointmentService.updatePublicByToken — estado do agendamento", () => {
  it("altera um agendamento scheduled futuro", async () => {
    const result = await AppointmentService.updatePublicByToken(
      TOKEN,
      { startAt: "2027-08-30T10:00:00.000Z" },
      NOW,
    );

    expect(result.startAt).toEqual(new Date("2027-08-30T10:00:00.000Z"));
  });

  it("altera um agendamento confirmado futuro", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status: AppointmentStatus.CONFIRMED }),
    );

    await AppointmentService.updatePublicByToken(
      TOKEN,
      { startAt: "2027-08-30T10:00:00.000Z" },
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalled();
  });

  it.each([
    AppointmentStatus.CANCELLED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ])("recusa agendamento %s com 400", async (status) => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status }),
    );

    await expect(
      AppointmentService.updatePublicByToken(
        TOKEN,
        { startAt: "2027-08-30T10:00:00.000Z" },
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa agendamento já iniciado com 400", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({
        startAt: new Date("2027-08-27T10:00:00.000Z"),
        endAt: new Date("2027-08-27T10:30:00.000Z"),
      }),
    );

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa token inválido antes de qualquer escrita", async () => {
    await expect(
      AppointmentService.updatePublicByToken("invalido", { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });
});

describe("AppointmentService.updatePublicByToken — alterações de agenda", () => {
  it("recalcula endAt a partir da duração do novo serviço", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(otherServiceId),
      companyId: ref(companyId),
      isActive: true,
      duration: 90,
      name: "Corte + Barba",
    });
    appointmentRepository.update.mockImplementation(
      async (_id: unknown, data: Record<string, unknown>) => ({
        ...storedAppointment(data),
      }),
    );

    await AppointmentService.updatePublicByToken(
      TOKEN,
      { serviceId: otherServiceId },
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        serviceId: expect.anything(),
        endAt: new Date(START_AT.getTime() + 90 * 60 * 1000),
      }),
    );

    const persisted = appointmentRepository.update.mock.calls[0][1];
    expect(persisted.serviceId.toString()).toBe(otherServiceId);
  });

  it("recalcula endAt quando a data muda", async () => {
    const newStart = new Date("2027-08-30T10:00:00.000Z");

    await AppointmentService.updatePublicByToken(
      TOKEN,
      { startAt: newStart.toISOString() },
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        startAt: newStart,
        endAt: new Date(newStart.getTime() + 30 * 60 * 1000),
      }),
    );
  });

  it("recusa data no passado com 400", async () => {
    await expect(
      AppointmentService.updatePublicByToken(
        TOKEN,
        { startAt: "2020-01-15T10:00:00.000Z" },
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa serviço de outra empresa com 404", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(otherServiceId),
      companyId: ref(otherCompanyId),
      isActive: true,
      duration: 90,
      name: "Corte + Barba",
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { serviceId: otherServiceId }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa serviço inativo com 400", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(otherServiceId),
      companyId: ref(companyId),
      isActive: false,
      duration: 90,
      name: "Corte + Barba",
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { serviceId: otherServiceId }, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("recusa funcionário de outra empresa com 404", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(otherEmployeeId),
      companyId: ref(otherCompanyId),
      isActive: true,
      role: Role.EMPLOYEE,
      name: "Outro",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { employeeId: otherEmployeeId }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa funcionário inativo com 400", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(otherEmployeeId),
      companyId: ref(companyId),
      isActive: false,
      role: Role.EMPLOYEE,
      name: "Inativo",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { employeeId: otherEmployeeId }, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("recusa conta de acesso (role CLIENT) com 404", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(otherEmployeeId),
      companyId: ref(companyId),
      isActive: true,
      role: Role.CLIENT,
      name: "Conta",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { employeeId: otherEmployeeId }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("valida a disponibilidade do novo horário", async () => {
    await AppointmentService.updatePublicByToken(
      TOKEN,
      { startAt: "2027-08-30T10:00:00.000Z" },
      NOW,
    );

    expect(availabilityService.ensureEmployeeAvailable).toHaveBeenCalledWith(
      companyId,
      expect.anything(),
      new Date("2027-08-30T10:00:00.000Z"),
      new Date("2027-08-30T10:30:00.000Z"),
    );

    const employeeArg = availabilityService.ensureEmployeeAvailable.mock
      .calls[0][1] as { toString(): string };
    expect(employeeArg.toString()).toBe(employeeId);
  });

  it("propaga a recusa de disponibilidade do serviço de disponibilidade", async () => {
    availabilityService.ensureEmployeeAvailable.mockRejectedValue(
      new Error("indisponível"),
    );

    /**
     * A regra de disponibilidade é a mesma da criação e da
     * alteração administrativa: quem decide o status é
     * `AvailabilityService`, não este fluxo.
     */
    await expect(
      AppointmentService.updatePublicByToken(
        TOKEN,
        { startAt: "2027-08-30T10:00:00.000Z" },
        NOW,
      ),
    ).rejects.toThrow("indisponível");

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa conflito do funcionário com 409", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);

    await expect(
      AppointmentService.updatePublicByToken(
        TOKEN,
        { startAt: "2027-08-30T10:00:00.000Z" },
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa conflito do cliente com 409", async () => {
    appointmentRepository.hasClientConflict.mockResolvedValue(true);

    await expect(
      AppointmentService.updatePublicByToken(
        TOKEN,
        { startAt: "2027-08-30T10:00:00.000Z" },
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("exclui o próprio agendamento da verificação de conflitos", async () => {
    await AppointmentService.updatePublicByToken(
      TOKEN,
      { startAt: "2027-08-30T10:00:00.000Z" },
      NOW,
    );

    const employeeCall = appointmentRepository.hasEmployeeConflict.mock.calls[0];
    expect(employeeCall[0]).toBe(companyId);
    expect(employeeCall[4].toString()).toBe(appointmentId);

    const clientCall = appointmentRepository.hasClientConflict.mock.calls[0];
    expect(clientCall[0]).toBe(companyId);
    expect(clientCall[1].toString()).toBe(clientId);
    expect(clientCall[4].toString()).toBe(appointmentId);
  });

  it("revalida o serviço atual mesmo sem o enviar", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(companyId),
      isActive: false,
      duration: 30,
      name: "Corte",
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("revalida o serviço atual quando já não existe", async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("revalida o profissional atual mesmo sem o enviar", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: false,
      role: Role.EMPLOYEE,
      name: "Carlos",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita o profissional atual se for uma conta de acesso", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: true,
      role: Role.CLIENT,
      name: "Conta",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita o serviço atual de outra empresa", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(otherCompanyId),
      isActive: true,
      duration: 30,
      name: "Corte",
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejeita o profissional atual de outra empresa", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(otherCompanyId),
      isActive: true,
      role: Role.EMPLOYEE,
      name: "Carlos",
      avatar: null,
    });

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "olá" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("AppointmentService.updatePublicByToken — notas e token", () => {
  it("altera as observações", async () => {
    await AppointmentService.updatePublicByToken(TOKEN, { notes: "Nova nota" }, NOW);

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notes: "Nova nota" }),
    );
  });

  it("limpa as observações com null explícito", async () => {
    await AppointmentService.updatePublicByToken(TOKEN, { notes: null }, NOW);

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notes: null }),
    );
  });

  it("mantém as observações quando o campo não é enviado", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ notes: "Nota original" }),
    );

    await AppointmentService.updatePublicByToken(TOKEN, { startAt: "2027-08-30T10:00:00.000Z" }, NOW);

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notes: "Nota original" }),
    );
  });

  it("não regenera nem apaga o token na alteração", async () => {
    await AppointmentService.updatePublicByToken(TOKEN, { notes: "Nova nota" }, NOW);

    const persisted = appointmentRepository.update.mock.calls[0][1];

    expect(persisted).not.toHaveProperty("publicAccessTokenHash");
  });

  it("mantém o cliente original", async () => {
    await AppointmentService.updatePublicByToken(TOKEN, { notes: "Nova nota" }, NOW);

    const persisted = appointmentRepository.update.mock.calls[0][1];

    expect(persisted).not.toHaveProperty("clientId");
  });

  it("notifica a alteração com o mecanismo existente", async () => {
    await AppointmentService.updatePublicByToken(TOKEN, { notes: "Nova nota" }, NOW);

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        appointmentId,
        type: NotificationType.APPOINTMENT_UPDATED,
      }),
    );
  });

  it("devolve 404 se o agendamento desaparecer durante a alteração", async () => {
    appointmentRepository.update.mockResolvedValue(null);

    await expect(
      AppointmentService.updatePublicByToken(TOKEN, { notes: "Nova nota" }, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("AppointmentService.cancelPublicByToken", () => {
  it("cancela usando a transição administrativa existente", async () => {
    await AppointmentService.cancelPublicByToken(TOKEN);

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      AppointmentStatus.CANCELLED,
    );

    const [idArg] = appointmentRepository.updateStatus.mock.calls[0];
    expect(String(idArg)).toBe(appointmentId);
  });

  it("devolve o agendamento cancelado", async () => {
    const result = await AppointmentService.cancelPublicByToken(TOKEN);

    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("notifica o cancelamento pelo mecanismo existente", async () => {
    await AppointmentService.cancelPublicByToken(TOKEN);

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.APPOINTMENT_CANCELLED }),
    );
  });

  it("não faz remoção física", async () => {
    await AppointmentService.cancelPublicByToken(TOKEN);

    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
  });

  it("é idempotente quando já está cancelado", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status: AppointmentStatus.CANCELLED }),
    );

    const result = await AppointmentService.cancelPublicByToken(TOKEN);

    expect(result.status).toBe(AppointmentStatus.CANCELLED);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    expect(notificationDispatcher.dispatchAppointmentEvent).not.toHaveBeenCalled();
  });

  it("recusa agendamento concluído com 400", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(
      AppointmentService.cancelPublicByToken(TOKEN),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("recusa agendamento no-show com 400", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({ status: AppointmentStatus.NO_SHOW }),
    );

    await expect(
      AppointmentService.cancelPublicByToken(TOKEN),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("cancela agendamento scheduled no passado", async () => {
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(
      storedAppointment({
        startAt: new Date("2027-08-27T10:00:00.000Z"),
        endAt: new Date("2027-08-27T10:30:00.000Z"),
      }),
    );

    await AppointmentService.cancelPublicByToken(TOKEN);

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      AppointmentStatus.CANCELLED,
    );
  });

  it("recusa token inválido", async () => {
    await expect(
      AppointmentService.cancelPublicByToken("invalido"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("não permite reativar: cancelar de novo nunca volta a scheduled", async () => {
    const first = await AppointmentService.cancelPublicByToken(TOKEN);
    const second = await AppointmentService.cancelPublicByToken(TOKEN);

    expect(first.status).toBe(AppointmentStatus.CANCELLED);
    expect(second.status).toBe(AppointmentStatus.CANCELLED);

    /**
     * A segunda chamada é idempotente: não escreve.
     */
    expect(appointmentRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(
      appointmentRepository.updateStatus.mock.calls.map((call) => call[1]),
    ).toEqual([AppointmentStatus.CANCELLED]);
  });
});