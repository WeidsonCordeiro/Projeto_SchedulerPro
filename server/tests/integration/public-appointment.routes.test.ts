import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  employee: "507f1f77bcf86cd799439013",
  employeeB: "507f1f77bcf86cd799439014",
  client: "507f1f77bcf86cd799439015",
  service: "507f1f77bcf86cd799439017",
  serviceB: "507f1f77bcf86cd799439018",
  availability: "507f1f77bcf86cd799439019",
  appointment: "507f1f77bcf86cd799439021",
};

const {
  authenticateCalls,
  rateLimitCalls,
  appointmentRepository,
  clientRepository,
  serviceRepository,
  userRepository,
  companyRepository,
  availabilityRepository,
  availabilityExceptionRepository,
  notificationRepository,
  notificationDispatcher,
  resendSend,
} = vi.hoisted(() => {
  return {
    /**
     * Contador simples (e não um mock) para comprovar que a rota
     * autenticada continua a passar por `authenticate`.
     */
    authenticateCalls: { count: 0 },
    /**
     * Contador simples (e não um mock) para comprovar que a rota
     * pública passa pelo limitador. O limitador real é testado em
     * `public-appointment.rate-limit.test.ts`.
     */
    rateLimitCalls: { count: 0 },
    appointmentRepository: {
      findById: vi.fn(),
      findByCompanyId: vi.fn(),
      findByPublicAccessTokenHash: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
      hasEmployeeConflict: vi.fn(),
      hasClientConflict: vi.fn(),
      cancelOverdueScheduled: vi.fn(),
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
    serviceRepository: { findById: vi.fn(), findByCompanyId: vi.fn() },
    userRepository: {
      findById: vi.fn(),
      findByIdForAccessControl: vi.fn(),
      findByCompanyId: vi.fn(),
      create: vi.fn(),
    },
    companyRepository: { findById: vi.fn(), findAll: vi.fn(), findByName: vi.fn() },
    availabilityRepository: {
      findById: vi.fn(),
      findByCompanyId: vi.fn(),
      findByEmployeeId: vi.fn(),
      findByEmployeeAndDay: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    },
    availabilityExceptionRepository: { findByEmployeeAndDate: vi.fn(), findById: vi.fn(), findByCompanyId: vi.fn() },
    notificationRepository: { createMany: vi.fn() },
    notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
    resendSend: vi.fn(),
  };
});

/**
 * O limitador é substituído por uma função de passagem que conta
 * as invocações. Usar uma função simples (e não `vi.fn`) evita
 * que `restoreMocks` lhe apague a implementação.
 */
vi.mock("../../src/middlewares/public-booking-rate-limit.middleware", () => ({
  default: (_req: never, _res: never, next: () => void) => {
    rateLimitCalls.count += 1;
    next();
  },
  publicBookingRateLimit: (_req: never, _res: never, next: () => void) => {
    rateLimitCalls.count += 1;
    next();
  },
  createPublicBookingRateLimit: () => (
    _req: never,
    _res: never,
    next: () => void,
  ) => {
    rateLimitCalls.count += 1;
    next();
  },
}));

/**
 * O middleware de autenticação é instrumentado para provar que a
 * rota pública NÃO o utiliza: se fosse chamado, `authenticate`
 * contaria uma chamada e o pedido não chegaria ao handler.
 */
vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (_req: never, res: never, _next: () => void) => {
      authenticateCalls.count += 1;
      res.status(401).json({ success: false, message: "Não autenticado." });
    },
  },
}));

vi.mock("../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../src/modules/Clients/repositories/ClientRepository", () => ({ default: clientRepository }));
vi.mock("../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));
vi.mock("../../src/modules/notifications/repositories/NotificationRepository", () => ({ default: notificationRepository }));
vi.mock("../../src/modules/notifications/services/NotificationDispatcher", () => ({ default: notificationDispatcher }));
vi.mock("../../src/providers/mail/ResendProvider", () => ({ default: { send: resendSend } }));

import app from "../../src/app";
import { Role } from "../../src/constants/roles";
import { AppointmentStatus } from "../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });

const companyA = { _id: ref(ids.companyA), isActive: true, timezone: "Europe/Lisbon", name: "empresa a" };
const employeeA = {
  _id: ref(ids.employee),
  companyId: ref(ids.companyA),
  role: Role.EMPLOYEE,
  isActive: true,
  deletedAt: null,
  name: "Carlos",
};
const serviceA = { _id: ref(ids.service), companyId: ref(ids.companyA), isActive: true, duration: 30, name: "Corte" };
const availabilityA = {
  _id: ref(ids.availability),
  companyId: ref(ids.companyA),
  employeeId: ref(ids.employee),
  dayOfWeek: 0,
  morningStart: "09:00",
  morningEnd: "12:00",
  afternoonStart: "14:00",
  afternoonEnd: "18:00",
};

const createdAppointment = () => ({
  _id: ref(ids.appointment),
  companyId: ref(ids.companyA),
  clientId: ref(ids.client),
  serviceId: ref(ids.service),
  employeeId: ref(ids.employee),
  startAt: new Date("2027-08-29T08:00:00.000Z"),
  endAt: new Date("2027-08-29T08:30:00.000Z"),
  status: AppointmentStatus.SCHEDULED,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const publicUrl = (companyId: string = ids.companyA) =>
  `/api/public/companies/${companyId}/appointments`;

const validPublicPayload = (extra: Record<string, unknown> = {}) => ({
  serviceId: ids.service,
  employeeId: ids.employee,
  startAt: "2027-08-29T08:00:00.000Z",
  clientName: "Ana Publica",
  clientEmail: "ana@exemplo.com",
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  authenticateCalls.count = 0;
  rateLimitCalls.count = 0;

  companyRepository.findById.mockResolvedValue(companyA);
  serviceRepository.findById.mockResolvedValue(serviceA);
  userRepository.findById.mockResolvedValue(employeeA);
  userRepository.findByCompanyId.mockResolvedValue([]);
  availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availabilityA);
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);

  clientRepository.findByEmailAndCompany.mockResolvedValue(null);
  clientRepository.create.mockImplementation(async (data: { email: string }) => ({
    _id: ref(ids.client),
    companyId: ref(ids.companyA),
    email: data.email,
    isActive: true,
  }));

  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.create.mockImplementation(async (data: Record<string, unknown>) => ({
    ...createdAppointment(),
    ...data,
  }));

  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("Agendamento público — rota sem autenticação", () => {
  it("cria o agendamento sem qualquer autenticação", async () => {
    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(authenticateCalls.count).toBe(0);
    expect(appointmentRepository.create).toHaveBeenCalledTimes(1);
  });

  it("devolve o contrato público sem dados internos", async () => {
    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.body.data.appointment).toEqual({
      id: ids.appointment,
      startAt: "2027-08-29T08:00:00.000Z",
      endAt: "2027-08-29T08:30:00.000Z",
      status: AppointmentStatus.SCHEDULED,
      clientName: "Ana Publica",
      service: { id: ids.service, name: "Corte" },
      employee: {
        id: ids.employee,
        name: "Carlos",
        avatarUrl: null,
      },
    });

    expect(response.body.data.appointment).not.toHaveProperty("clientId");
    expect(response.body.data.appointment).not.toHaveProperty("companyId");
    expect(response.body.data.appointment).not.toHaveProperty("notes");
    expect(response.body.data).not.toHaveProperty("publicAccessTokenHash");
  });

  it("recusa campos de controlo interno em vez de os ignorar", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(
        validPublicPayload({
          endAt: "2030-01-01T00:00:00.000Z",
          status: AppointmentStatus.CANCELLED,
          duration: 999,
          price: 0,
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("endAt");
    expect(response.body.message).toContain("status");
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("deriva endAt e status exclusivamente do serviço do catálogo", async () => {
    await request(app).post(publicUrl()).send(validPublicPayload());

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: new Date("2027-08-29T08:00:00.000Z"),
        endAt: new Date("2027-08-29T08:30:00.000Z"),
        status: AppointmentStatus.SCHEDULED,
      }),
    );

    const persisted = appointmentRepository.create.mock.calls[0][0];
    expect(persisted).not.toHaveProperty("duration");
    expect(persisted).not.toHaveProperty("price");
  });

  it("não aceita companyId no corpo e usa o da URL", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload({ companyId: ids.companyB }));

    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();

    const created = await request(app).post(publicUrl()).send(validPublicPayload());
    expect(created.status).toBe(201);
    expect(
      appointmentRepository.create.mock.calls[0][0].companyId.toString(),
    ).toBe(ids.companyA);
  });

  it("mantém as rotas autenticadas protegidas", async () => {
    expect((await request(app).post("/api/appointments").send({})).status).toBe(401);
    expect(authenticateCalls.count).toBe(1);
  });

  it("passa pelo limitador dedicado em cada pedido", async () => {
    await request(app).post(publicUrl()).send(validPublicPayload());
    expect(rateLimitCalls.count).toBe(1);

    await request(app).post(publicUrl()).send({ serviceId: "invalido" });
    expect(rateLimitCalls.count).toBe(2);
  });
});

describe("Agendamento público — empresa", () => {
  it("rejeita empresa inexistente ou eliminada com 404", async () => {
    companyRepository.findById.mockResolvedValue(null);

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(404);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita empresa inativa com 400", async () => {
    companyRepository.findById.mockResolvedValue({ ...companyA, isActive: false });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("valida o companyId da URL antes do controller", async () => {
    const response = await request(app)
      .post("/api/public/companies/not-an-id/appointments")
      .send(validPublicPayload());

    expect(response.status).toBe(400);
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });
});

describe("Agendamento público — isolamento multi-tenant", () => {
  it("rejeita serviço de outra empresa", async () => {
    serviceRepository.findById.mockResolvedValue({
      ...serviceA,
      companyId: ref(ids.companyB),
    });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(404);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita funcionário de outra empresa", async () => {
    userRepository.findById.mockResolvedValue({
      ...employeeA,
      companyId: ref(ids.companyB),
    });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(404);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita a combinação cruzada serviço (A) + funcionário (B)", async () => {
    serviceRepository.findById.mockResolvedValue({
      ...serviceA,
      _id: ref(ids.serviceB),
    });
    userRepository.findById.mockResolvedValue({
      ...employeeA,
      _id: ref(ids.employeeB),
      companyId: ref(ids.companyB),
    });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(404);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conta de acesso (role CLIENT) como profissional", async () => {
    userRepository.findById.mockResolvedValue({ ...employeeA, role: Role.CLIENT });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(404);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita serviço e funcionário inativos", async () => {
    serviceRepository.findById.mockResolvedValue({ ...serviceA, isActive: false });
    expect((await request(app).post(publicUrl()).send(validPublicPayload())).status).toBe(400);

    serviceRepository.findById.mockResolvedValue(serviceA);
    userRepository.findById.mockResolvedValue({ ...employeeA, isActive: false });
    expect((await request(app).post(publicUrl()).send(validPublicPayload())).status).toBe(400);

    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });
});

describe("Agendamento público — validação do payload", () => {
  it.each([
    ["serviceId inválido", { serviceId: "bad" }],
    ["employeeId inválido", { employeeId: "bad" }],
    ["nome ausente", { clientName: undefined }],
    ["nome demasiado curto", { clientName: "A" }],
    ["e-mail ausente", { clientEmail: undefined }],
    ["e-mail inválido", { clientEmail: "nao-e-email" }],
    ["telefone inválido", { clientPhone: "123" }],
    ["notes acima do limite", { notes: "x".repeat(501) }],
    ["startAt inválido", { startAt: "not-a-date" }],
    ["startAt sem fuso horário", { startAt: "2027-08-29T08:00:00" }],
    ["campo inesperado", { companyId: ids.companyB }],
    ["status enviado pelo cliente", { status: AppointmentStatus.CONFIRMED }],
  ])("rejeita %s com 400 antes do service", async (_label, patch) => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload(patch));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita startAt no passado com 400", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload({ startAt: "2020-01-15T10:00:00.000Z" }));

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("passou");
    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita corpo malformado com 400", async () => {
    const response = await request(app)
      .post(publicUrl())
      .set("Content-Type", "application/json")
      .send('{"serviceId": ');

    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita corpo que não é um objeto JSON", async () => {
    const response = await request(app)
      .post(publicUrl())
      .set("Content-Type", "application/json")
      .send("[1,2,3]");

    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("aceita o payload mínimo válido", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send({
        serviceId: ids.service,
        employeeId: ids.employee,
        startAt: "2027-08-29T08:00:00.000Z",
        clientName: "Ana Publica",
        clientEmail: "ana@exemplo.com",
      });

    expect(response.status).toBe(201);
  });
});

describe("Agendamento público — regras de agenda", () => {
  it("rejeita horário fora da disponibilidade do funcionário", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(409);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita horário bloqueado por exceção de disponibilidade", async () => {
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([
      { allDay: false, startTime: "09:00", endTime: "10:00" },
    ]);

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(409);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita serviço que termina fora do horário disponível", async () => {
    serviceRepository.findById.mockResolvedValue({ ...serviceA, duration: 600 });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(409);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conflito de horário do funcionário (scheduled/confirmed)", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("funcionário");
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita conflito de horário do cliente", async () => {
    appointmentRepository.hasClientConflict.mockResolvedValue(true);

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("cliente");
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("permite o horário seguinte de um agendamento existente", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload({ startAt: "2027-08-29T08:30:00.000Z" }));

    expect(response.status).toBe(201);
    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ endAt: new Date("2027-08-29T09:00:00.000Z") }),
    );
  });

  it("reutiliza as mesmas regras de conflito do fluxo administrativo", async () => {
    await request(app).post(publicUrl()).send(validPublicPayload());

    expect(appointmentRepository.hasEmployeeConflict).toHaveBeenCalledWith(
      ids.companyA,
      expect.anything(),
      new Date("2027-08-29T08:00:00.000Z"),
      new Date("2027-08-29T08:30:00.000Z"),
      /**
       * Na criação não há agendamento a excluir do conflito.
       */
      undefined,
    );
    expect(appointmentRepository.hasClientConflict).toHaveBeenCalled();
  });
});

describe("Agendamento público — cliente sem conta", () => {
  it("cria o cliente na empresa do link sem criar User", async () => {
    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(201);
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana Publica",
        email: "ana@exemplo.com",
      }),
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("reutiliza o cliente já existente na empresa", async () => {
    clientRepository.findByEmailAndCompany.mockResolvedValue({
      _id: ref(ids.client),
      companyId: ref(ids.companyA),
      isActive: true,
    });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(201);
    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.findByEmailAndCompany).toHaveBeenCalledWith(
      "ana@exemplo.com",
      ids.companyA,
    );
  });

  it("bloqueia o agendamento quando o cliente está inativo", async () => {
    clientRepository.findByEmailAndCompany.mockResolvedValue({
      _id: ref(ids.client),
      companyId: ref(ids.companyA),
      isActive: false,
    });

    const response = await request(app).post(publicUrl()).send(validPublicPayload());

    expect(response.status).toBe(400);
    expect(appointmentRepository.create).not.toHaveBeenCalled();
  });

  it("aceita agendamento sem telefone", async () => {
    await request(app).post(publicUrl()).send(validPublicPayload());

    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("guarda as observações apenas no agendamento", async () => {
    await request(app)
      .post(publicUrl())
      .send(validPublicPayload({ notes: "Primeira vez" }));

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Primeira vez" }),
    );
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ notes: expect.anything() }),
    );
  });

  it("dispara as notificações existentes de agendamento criado", async () => {
    await request(app).post(publicUrl()).send(validPublicPayload());

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: ids.companyA,
        appointmentId: ids.appointment,
        clientId: ids.client,
      }),
    );
  });

  it("entrega o token puro ao notificador, igual ao devolvido na resposta", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload());

    const dispatched = notificationDispatcher.dispatchAppointmentEvent.mock
      .calls[0][0];

    expect(dispatched.publicAccessToken).toBe(
      response.body.data.publicAccessToken,
    );
    expect(dispatched.publicAccessToken).not.toContain("sha256:");
  });

  it("não persiste o token puro: a base de dados recebe só o hash", async () => {
    const response = await request(app)
      .post(publicUrl())
      .send(validPublicPayload());

    const persisted = appointmentRepository.create.mock.calls[0][0];

    expect(persisted.publicAccessTokenHash).toContain("sha256:");
    expect(JSON.stringify(persisted)).not.toContain(
      response.body.data.publicAccessToken,
    );
  });
});

describe("Agendamento público — superfície da rota", () => {
  it("responde 404 para rotas públicas inexistentes", async () => {
    expect((await request(app).get(publicUrl())).status).toBe(404);
    expect((await request(app).post("/api/public/appointments").send({})).status).toBe(404);
  });
});