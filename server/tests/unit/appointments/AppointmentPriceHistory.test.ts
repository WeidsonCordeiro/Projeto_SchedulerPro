import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  companyRepository,
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
  clientRepository: {
    findById: vi.fn(),
    findByEmailAndCompany: vi.fn(),
    create: vi.fn(),
    touchBookingSerialization: vi.fn().mockResolvedValue(undefined),
  },
  serviceRepository: { findById: vi.fn() },
  userRepository: {
    findById: vi.fn(),
    touchBookingSerialization: vi.fn().mockResolvedValue(undefined),
  },
  companyRepository: { findById: vi.fn() },
  availabilityService: { ensureEmployeeAvailable: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
}));

vi.mock(
  "../../../src/modules/appointments/repositories/AppointmentRepository",
  () => ({ default: appointmentRepository }),
);
vi.mock("../../../src/modules/Clients/repositories/ClientRepository", () => ({
  default: clientRepository,
}));
vi.mock("../../../src/modules/services/repositories/ServiceRepository", () => ({
  default: serviceRepository,
}));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/modules/availability/services/AvailabilityService", () => ({
  default: availabilityService,
}));
vi.mock(
  "../../../src/modules/notifications/services/NotificationDispatcher",
  () => ({ default: notificationDispatcher }),
);
vi.mock("../../../src/modules/appointments/services/appointment-booking-transaction", () => ({
  withBookingTransaction: async <T>(operation: (session: never) => Promise<T>) =>
    operation(undefined as never),
}));

import AppointmentService from "../../../src/modules/appointments/services/AppointmentService";
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";
import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const companyId = "507f1f77bcf86cd799439011";
const otherCompanyId = "507f1f77bcf86cd799439099";
const clientId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";
const otherServiceId = "507f1f77bcf86cd799439018";
const employeeId = "507f1f77bcf86cd799439014";
const appointmentId = "507f1f77bcf86cd799439015";

const START_AT = new Date("2027-08-29T08:00:00.000Z");
const NOW = new Date("2027-08-28T00:00:00.000Z");

const ref = (id: string) => ({ toString: () => id });

const ORIGINAL_PRICE = 20;
const NEW_PRICE = 35;

const originalService = (overrides: Record<string, unknown> = {}) => ({
  _id: ref(serviceId),
  companyId: ref(companyId),
  isActive: true,
  duration: 30,
  price: ORIGINAL_PRICE,
  name: "Corte",
  ...overrides,
});

const otherService = (overrides: Record<string, unknown> = {}) => ({
  _id: ref(otherServiceId),
  companyId: ref(companyId),
  isActive: true,
  duration: 60,
  price: NEW_PRICE,
  name: "Corte + Barba",
  ...overrides,
});

const appointment = (overrides: Record<string, unknown> = {}) => ({
  _id: ref(appointmentId),
  companyId: ref(companyId),
  clientId: ref(clientId),
  serviceId: ref(serviceId),
  employeeId: ref(employeeId),
  startAt: new Date("2027-08-30T10:00:00.000Z"),
  endAt: new Date("2027-08-30T10:30:00.000Z"),
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  priceAtTime: ORIGINAL_PRICE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const publicDto = (extra: Record<string, unknown> = {}) => ({
  serviceId,
  employeeId,
  startAt: START_AT.toISOString(),
  clientName: "Ana Publica",
  clientEmail: "ana@exemplo.com",
  ...extra,
});

const TOKEN = PublicAppointmentTokenProvider.generate();
const TOKEN_HASH = PublicAppointmentTokenProvider.hash(TOKEN);

beforeEach(() => {
  vi.clearAllMocks();

  clientRepository.findById.mockResolvedValue({
    companyId: ref(companyId),
    isActive: true,
    name: "Maria",
  });
  clientRepository.findByEmailAndCompany.mockResolvedValue(null);
  clientRepository.create.mockResolvedValue({
    _id: ref(clientId),
    companyId: ref(companyId),
    isActive: true,
  });
  serviceRepository.findById.mockImplementation(async (id: string) =>
    id === otherServiceId ? otherService() : originalService(),
  );
  userRepository.findById.mockResolvedValue({
    _id: ref(employeeId),
    companyId: ref(companyId),
    isActive: true,
    role: Role.EMPLOYEE,
    name: "Carlos",
  });
  companyRepository.findById.mockResolvedValue({
    _id: ref(companyId),
    isActive: true,
    timezone: "Europe/Lisbon",
  });
  availabilityService.ensureEmployeeAvailable.mockResolvedValue(undefined);
  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.create.mockImplementation(async (data: object) =>
    appointment({ ...data }),
  );
  appointmentRepository.update.mockImplementation(
    async (_id: unknown, data: object) => appointment({ ...data }),
  );
  appointmentRepository.updateStatus.mockResolvedValue(
    appointment({ status: AppointmentStatus.CONFIRMED }),
  );
  appointmentRepository.findByPublicAccessTokenHash.mockImplementation(
    async (hash: string) => (hash === TOKEN_HASH ? appointment() : null),
  );
  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("AppointmentService — preço histórico na criação", () => {
  it("criação administrativa grava o preço do serviço em priceAtTime", async () => {
    await AppointmentService.create(
      { clientId, serviceId, employeeId, startAt: START_AT },
      companyId,
      NOW,
    );

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priceAtTime: ORIGINAL_PRICE }),
    );
  });

  it("criação pública grava o preço do serviço em priceAtTime", async () => {
    await AppointmentService.createPublic(publicDto(), companyId, NOW);

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priceAtTime: ORIGINAL_PRICE }),
    );
  });

  it("ignora priceAtTime/price enviados pelo cliente na criação administrativa", async () => {
    await AppointmentService.create(
      {
        clientId,
        serviceId,
        employeeId,
        startAt: START_AT,
        priceAtTime: 999,
        price: 999,
      } as never,
      companyId,
      NOW,
    );

    const persisted = appointmentRepository.create.mock.calls[0][0];
    expect(persisted.priceAtTime).toBe(ORIGINAL_PRICE);
  });

  it("ignora priceAtTime/price enviados pelo cliente na criação pública", async () => {
    await AppointmentService.createPublic(
      publicDto({ priceAtTime: 999, price: 999 }),
      companyId,
      NOW,
    );

    const persisted = appointmentRepository.create.mock.calls[0][0];
    expect(persisted.priceAtTime).toBe(ORIGINAL_PRICE);
  });

  it("rejeita criar agendamento para serviço de outra empresa", async () => {
    serviceRepository.findById.mockResolvedValue(
      originalService({ companyId: ref(otherCompanyId) }),
    );

    await expect(
      AppointmentService.create(
        { clientId, serviceId, employeeId, startAt: START_AT },
        companyId,
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });
});

describe("AppointmentService — preservação do preço histórico na alteração", () => {
  it("altera notas/serviço sem mudar de serviço e preserva o preço original", async () => {
    serviceRepository.findById.mockImplementation(
      async (id: string) =>
        id === serviceId ? originalService({ price: 99 }) : otherService(),
    );
    appointmentRepository.findById.mockResolvedValue(appointment());

    await AppointmentService.update(
      appointmentId,
      { notes: "Nova nota", startAt: new Date("2027-08-30T11:00:00.000Z") },
      companyId,
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      appointmentId,
      expect.objectContaining({ priceAtTime: ORIGINAL_PRICE }),
    );
  });

  it("reenviar o MESMO serviceId não recalcula o preço histórico", async () => {
    serviceRepository.findById.mockImplementation(async () =>
      originalService({ price: 99 }),
    );
    appointmentRepository.findById.mockResolvedValue(appointment());

    await AppointmentService.update(
      appointmentId,
      { serviceId },
      companyId,
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      appointmentId,
      expect.objectContaining({ priceAtTime: ORIGINAL_PRICE }),
    );
  });

  it("alterar para OUTRO serviço recalcula o preço histórico com o preço atual do novo serviço", async () => {
    appointmentRepository.findById.mockResolvedValue(appointment());

    await AppointmentService.update(
      appointmentId,
      { serviceId: otherServiceId },
      companyId,
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      appointmentId,
      expect.objectContaining({
        priceAtTime: NEW_PRICE,
        serviceId: expect.anything(),
      }),
    );
  });

  it("alterar o estado (confirmar) não toca no preço histórico", async () => {
    appointmentRepository.findById.mockResolvedValue(appointment());

    await AppointmentService.confirm(appointmentId, companyId);

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
      appointmentId,
      AppointmentStatus.CONFIRMED,
    );
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });
});

describe("AppointmentService — preço histórico na alteração pública", () => {
  it("preserva o preço quando o serviço não é alterado", async () => {
    serviceRepository.findById.mockImplementation(
      async () => originalService({ price: 99 }),
    );

    await AppointmentService.updatePublicByToken(
      TOKEN,
      { notes: "Nova nota" },
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ priceAtTime: ORIGINAL_PRICE }),
    );
  });

  it("recalcula o preço quando o serviço é alterado", async () => {
    await AppointmentService.updatePublicByToken(
      TOKEN,
      { serviceId: otherServiceId },
      NOW,
    );

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ priceAtTime: NEW_PRICE }),
    );
  });

  it("ignora priceAtTime enviado no PATCH público", async () => {
    serviceRepository.findById.mockImplementation(
      async () => originalService({ price: 99 }),
    );

    await AppointmentService.updatePublicByToken(
      TOKEN,
      { notes: "x", priceAtTime: 999 } as never,
      NOW,
    );

    const persisted = appointmentRepository.update.mock.calls[0][1];
    expect(persisted.priceAtTime).toBe(ORIGINAL_PRICE);
  });
});

describe("Appointment - schema do preço histórico", () => {
  it("grava null por omissão e exige mínimo zero", async () => {
    const AppointmentModel = (
      await import("../../../src/modules/appointments/models/Appointment.model")
    ).default;

    const field = AppointmentModel.schema.path("priceAtTime");

    expect(field.options.type).toBe(Number);
    expect(field.options.default).toBeNull();
    expect(field.options.min).toBe(0);
  });
});
