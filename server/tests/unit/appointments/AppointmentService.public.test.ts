import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  companyRepository,
  availabilityService,
  notificationDispatcher,
  userCreate,
  findByClientIdIncludingDeleted,
  findByEmailIncludingDeleted,
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
    update: vi.fn(),
    softDelete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    updateAvatar: vi.fn(),
    findByCompanyId: vi.fn(),
  },
  serviceRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  companyRepository: { findById: vi.fn() },
  availabilityService: { ensureEmployeeAvailable: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
  userCreate: vi.fn(),
  findByClientIdIncludingDeleted: vi.fn(),
  findByEmailIncludingDeleted: vi.fn(),
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: {
    ...userRepository,
    create: userCreate,
    findByClientIdIncludingDeleted,
    findByEmailIncludingDeleted,
  },
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({ default: availabilityService }));
vi.mock("../../../src/modules/notifications/services/NotificationDispatcher", () => ({ default: notificationDispatcher }));

import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const companyId = "507f1f77bcf86cd799439011";
const otherCompanyId = "507f1f77bcf86cd799439099";
const serviceId = "507f1f77bcf86cd799439013";
const employeeId = "507f1f77bcf86cd799439014";
const createdClientId = "507f1f77bcf86cd799439016";
const appointmentId = "507f1f77bcf86cd799439015";

const ref = (id: string) => ({ toString: () => id });

const START_AT = new Date("2027-08-29T08:00:00.000Z");
const NOW = new Date("2027-08-28T00:00:00.000Z");

const publicDto = (extra: Record<string, unknown> = {}) => ({
  serviceId,
  employeeId,
  startAt: START_AT.toISOString(),
  clientName: "Ana Publica",
  clientEmail: "Ana@Exemplo.com",
  ...extra,
});

const appointmentEntity = () => ({
  _id: ref(appointmentId),
  companyId: ref(companyId),
  clientId: ref(createdClientId),
  serviceId: ref(serviceId),
  employeeId: ref(employeeId),
  startAt: START_AT,
  endAt: new Date(START_AT.getTime() + 30 * 60 * 1000),
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();

  companyRepository.findById.mockResolvedValue({
    _id: ref(companyId),
    isActive: true,
    timezone: "Europe/Lisbon",
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
  });
  clientRepository.findByEmailAndCompany.mockResolvedValue(null);
  clientRepository.create.mockResolvedValue({
    _id: ref(createdClientId),
    companyId: ref(companyId),
    isActive: true,
  });
  availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.create.mockResolvedValue(appointmentEntity());
  appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(null);
  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("AppointmentService.createPublic — empresa", () => {
  it("rejeita empresa inexistente ou eliminada com 404", async () => {
    companyRepository.findById.mockResolvedValue(null);

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita empresa inativa com 400", async () => {
    companyRepository.findById.mockResolvedValue({
      _id: ref(companyId),
      isActive: false,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("ativa") });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("aceita empresa válida e usa o companyId da URL como tenant", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(companyRepository.findById).toHaveBeenCalledWith(companyId);
    expect(clientRepository.findByEmailAndCompany).toHaveBeenCalledWith(
      "ana@exemplo.com",
      companyId,
    );
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: expect.anything() }),
    );
    expect(availabilityService.ensureEmployeeAvailable).toHaveBeenCalledWith(
      companyId,
      expect.anything(),
      START_AT,
      new Date(START_AT.getTime() + 30 * 60 * 1000),
    );
  });
});

describe("AppointmentService.createPublic — isolamento multi-tenant", () => {
  it("rejeita serviço de outra empresa", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(otherCompanyId),
      isActive: true,
      duration: 30,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita funcionário de outra empresa", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(otherCompanyId),
      isActive: true,
      role: Role.EMPLOYEE,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita a combinação cruzada serviço (A) + funcionário (B)", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(companyId),
      isActive: true,
      duration: 30,
    });
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(otherCompanyId),
      isActive: true,
      role: Role.EMPLOYEE,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conta de acesso (role CLIENT) como profissional", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: true,
      role: Role.CLIENT,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("não reutiliza cliente de outra empresa para o mesmo e-mail", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(clientRepository.findByEmailAndCompany).toHaveBeenCalledWith(
      "ana@exemplo.com",
      companyId,
    );
    expect(clientRepository.create).toHaveBeenCalled();
  });
});

describe("AppointmentService.createPublic — serviço e profissional", () => {
  it("rejeita serviço inexistente", async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejeita serviço inativo com 400", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(companyId),
      isActive: false,
      duration: 30,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejeita funcionário inexistente com 404", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejeita funcionário inativo com 400", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(employeeId),
      companyId: ref(companyId),
      isActive: false,
      role: Role.EMPLOYEE,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("AppointmentService.createPublic — cliente sem conta", () => {
  it("cria o cliente sem User e normaliza nome/e-mail", async () => {
    await AppointmentService.createPublic(
      publicDto({ clientPhone: "  +351 912 345 678  " }),
      companyId,
      NOW,
    );

    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana Publica",
        email: "ana@exemplo.com",
        phone: "+351 912 345 678",
      }),
    );
    expect(userCreate).not.toHaveBeenCalled();
    expect(findByClientIdIncludingDeleted).not.toHaveBeenCalled();
  });

  it("aceita agendamento sem telefone", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("trata telefone em branco como ausente", async () => {
    await AppointmentService.createPublic(
      publicDto({ clientPhone: "   " }),
      companyId,
      NOW,
    );

    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("reutiliza o cliente já cadastrado na empresa", async () => {
    clientRepository.findByEmailAndCompany.mockResolvedValue({
      _id: ref(createdClientId),
      companyId: ref(companyId),
      isActive: true,
    });

    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: expect.anything() }),
    );
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("bloqueia o agendamento quando o cliente está inativo", async () => {
    clientRepository.findByEmailAndCompany.mockResolvedValue({
      _id: ref(createdClientId),
      companyId: ref(companyId),
      isActive: false,
    });

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("não consulta a coleção User para decidir o cliente", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(findByEmailIncludingDeleted).not.toHaveBeenCalled();
  });
});

describe("AppointmentService.createPublic — regras de agenda", () => {
  it("rejeita startAt no passado antes de escrever", async () => {
    await expect(
      AppointmentService.createPublic(
        publicDto({ startAt: "2020-01-15T10:00:00.000Z" }),
        companyId,
        NOW,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Não é possível agendar em um horário que já passou.",
    });

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("propaga a recusa de disponibilidade do funcionário", async () => {
    availabilityService.ensureEmployeeAvailable.mockRejectedValue(
      new Error("indisponível"),
    );

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toThrow("indisponível");

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conflito do funcionário com 409", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conflito do cliente com 409", async () => {
    appointmentRepository.hasClientConflict.mockResolvedValue(true);

    await expect(
      AppointmentService.createPublic(publicDto(), companyId, NOW),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita serviço que termina fora do horário disponível", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(serviceId),
      companyId: ref(companyId),
      isActive: true,
      duration: 300,
      name: "Sessão longa",
    });

    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(availabilityService.ensureEmployeeAvailable).toHaveBeenCalledWith(
      companyId,
      expect.anything(),
      START_AT,
      new Date(START_AT.getTime() + 300 * 60 * 1000),
    );
  });
});

describe("AppointmentService.createPublic — agendamento gravado", () => {
  it("calcula endAt no backend a partir da duração do serviço", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: START_AT,
        endAt: new Date(START_AT.getTime() + 30 * 60 * 1000),
      }),
    );
  });

  it("ignora endAt, status, preço e companyId enviados no payload", async () => {
    await AppointmentService.createPublic(
      publicDto({
        endAt: "2030-01-01T00:00:00.000Z",
        status: AppointmentStatus.CONFIRMED,
        duration: 999,
        price: 0,
        companyId: otherCompanyId,
      }),
      companyId,
      NOW,
    );

    const persisted = appointmentRepository.create.mock.calls[0][0];

    expect(persisted.endAt).toEqual(new Date(START_AT.getTime() + 30 * 60 * 1000));
    expect(persisted.status).toBe(AppointmentStatus.SCHEDULED);
    expect(persisted.duration).toBeUndefined();
    expect(persisted.price).toBeUndefined();
    expect(persisted.companyId.toString()).toBe(companyId);
  });

  it("grava companyId, serviceId e employeeId do tenant da URL", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    const persisted = appointmentRepository.create.mock.calls[0][0];

    expect(persisted.companyId.toString()).toBe(companyId);
    expect(persisted.serviceId.toString()).toBe(serviceId);
    expect(persisted.employeeId.toString()).toBe(employeeId);
    expect(persisted.status).toBe(AppointmentStatus.SCHEDULED);
  });

  it("grava as observações apenas no agendamento", async () => {
    await AppointmentService.createPublic(
      publicDto({ notes: "  Primeira vez  " }),
      companyId,
      NOW,
    );

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Primeira vez" }),
    );
    expect(clientRepository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ notes: expect.anything() }),
    );
  });

  it("dispara a notificação de agendamento criado", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        appointmentId,
        clientId: createdClientId,
        serviceId,
        employeeId,
      }),
    );
  });

  it("grava o hash do token na mesma escrita do agendamento", async () => {
    const result = await AppointmentService.createPublic(
      publicDto(),
      companyId,
      NOW,
    );

    const persisted = appointmentRepository.create.mock.calls[0][0];

    /**
     * O agendamento e o hash nascem juntos: não há uma segunda
     * escrita que possa falhar e deixar o link inacessível.
     */
    expect(persisted.publicAccessTokenHash).toBe(
      PublicAppointmentTokenProvider.hash(result.publicAccessToken),
    );
  });

  it("nunca persiste o token puro", async () => {
    const result = await AppointmentService.createPublic(
      publicDto(),
      companyId,
      NOW,
    );

    const persisted = JSON.stringify(
      appointmentRepository.create.mock.calls[0][0],
    );

    expect(result.publicAccessToken).toHaveLength(43);
    expect(persisted).not.toContain(result.publicAccessToken);
    const written = appointmentRepository.create.mock.calls[0][0];
    expect(written.publicAccessTokenHash).toBe(
      PublicAppointmentTokenProvider.hash(result.publicAccessToken),
    );
    expect(written.publicAccessTokenCiphertext).toMatch(/^v1\./);
  });
});

describe("AppointmentService.createPublic — resposta pública", () => {
  it("devolve o contrato público sem dados internos", async () => {
    const result = await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(result.appointment).toEqual({
      id: appointmentId,
      companyId,
      startAt: START_AT,
      endAt: new Date(START_AT.getTime() + 30 * 60 * 1000),
      timezone: "Europe/Lisbon",
      status: AppointmentStatus.SCHEDULED,
      clientName: "Ana Publica",
      service: { id: serviceId, name: "Corte" },
      employee: { id: employeeId, name: "Carlos", avatarUrl: null },
    });

    expect(result.appointment).not.toHaveProperty("clientId");
    expect(result.appointment).not.toHaveProperty("notes");
    expect(result.appointment).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("publicAccessTokenHash");
    expect(result).not.toHaveProperty("publicAccessTokenCiphertext");
    expect(result.appointment).not.toHaveProperty("publicAccessTokenCiphertext");
  });
});
