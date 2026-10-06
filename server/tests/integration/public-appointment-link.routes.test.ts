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
  appointment: "507f1f77bcf86cd799439021",
};

const {
  rateLimitCalls,
  readLimitCalls,
  writeLimitCalls,
  cancelLimitCalls,
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
} = vi.hoisted(() => ({
  /**
   * Contadores simples (e não `vi.fn`) porque `restoreMocks`
   * apagaria a implementação de um mock de middleware.
   */
  rateLimitCalls: { count: 0 },
  readLimitCalls: { count: 0 },
  writeLimitCalls: { count: 0 },
  cancelLimitCalls: { count: 0 },
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
  availabilityExceptionRepository: {
    findByEmployeeAndDate: vi.fn(),
    findById: vi.fn(),
    findByCompanyId: vi.fn(),
  },
  notificationRepository: { createMany: vi.fn() },
  notificationDispatcher: { dispatchAppointmentEvent: vi.fn() },
  resendSend: vi.fn(),
}));

/**
 * Os três limitadores de link são substituídos por funções de
 * passagem que contam invocações. O comportamento real de cada
 * um é testado em `public-appointment-link-rate-limit.test.ts`.
 */
vi.mock("../../src/middlewares/public-appointment-link-rate-limit.middleware", () => {
  const pass = (counter: { count: number }) =>
    (_req: never, _res: never, next: () => void) => {
      counter.count += 1;
      next();
    };

  return {
    default: pass(rateLimitCalls),
    /**
     * Factory: é chamada na construção do middleware, não no
     * pedido, por isso tem de devolver um middleware. Tratar
     * `createPublicLinkRateLimit` como middleware foi-Si a
     * origem de um falso positivo — só funcionava porque nada a
     * invocava como factory.
     */
    createPublicLinkRateLimit: () => pass(rateLimitCalls),
    publicAppointmentReadRateLimit: pass(readLimitCalls),
    publicAppointmentWriteRateLimit: pass(writeLimitCalls),
    publicAppointmentCancelRateLimit: pass(cancelLimitCalls),
  };
});

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
 * A autenticação é instrumentada para provar que as rotas por
 * token NÃO a utilizam.
 */
vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (_req: never, res: never, _next: () => void) => {
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
import PublicAppointmentTokenProvider from "../../src/providers/security/PublicAppointmentTokenProvider";
import { Role } from "../../src/constants/roles";
import { AppointmentStatus } from "../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });

const TOKEN = "kJ8vQ2mNpR4xW7yLbT0cV6jHfD3qS8aZgE1uI5oK9nM";
const TOKEN_HASH = PublicAppointmentTokenProvider.hash(TOKEN);

const START_AT = new Date("2027-08-29T08:00:00.000Z");
const END_AT = new Date(START_AT.getTime() + 30 * 60 * 1000);

const employeeA = {
  _id: ref(ids.employee),
  companyId: ref(ids.companyA),
  role: Role.EMPLOYEE,
  isActive: true,
  deletedAt: null,
  name: "Carlos",
  avatar: null,
};
const serviceA = {
  _id: ref(ids.service),
  companyId: ref(ids.companyA),
  isActive: true,
  duration: 30,
  name: "Corte",
};
const clientA = {
  _id: ref(ids.client),
  companyId: ref(ids.companyA),
  name: "Ana Publica",
  isActive: true,
};

/**
 * Estado partilhado pelos mocks, para que uma alteração ou um
 * cancelamento sejam visíveis na leitura seguinte.
 */
let currentStatus = AppointmentStatus.SCHEDULED;
let currentStartAt = START_AT;
let currentEndAt = END_AT;
let currentServiceId = ids.service;
let currentEmployeeId = ids.employee;
let currentNotes: string | null = null;

const appointment = () => ({
  _id: ref(ids.appointment),
  companyId: ref(ids.companyA),
  clientId: ref(ids.client),
  serviceId: ref(currentServiceId),
  employeeId: ref(currentEmployeeId),
  startAt: currentStartAt,
  endAt: currentEndAt,
  status: currentStatus,
  notes: currentNotes,
  publicAccessTokenHash: TOKEN_HASH,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const url = (token: string = TOKEN) => `/api/public/appointments/${token}`;

beforeEach(() => {
  vi.clearAllMocks();
  readLimitCalls.count = 0;
  writeLimitCalls.count = 0;
  cancelLimitCalls.count = 0;

  currentStatus = AppointmentStatus.SCHEDULED;
  currentStartAt = START_AT;
  currentEndAt = END_AT;
  currentServiceId = ids.service;
  currentEmployeeId = ids.employee;
  currentNotes = null;

  companyRepository.findById.mockResolvedValue({
    _id: ref(ids.companyA),
    isActive: true,
    timezone: "Europe/Lisbon",
  });
  clientRepository.findById.mockResolvedValue(clientA);
  serviceRepository.findById.mockImplementation(async (id: unknown) =>
    String(id) === ids.serviceB
      ? {
          _id: ref(ids.serviceB),
          companyId: ref(ids.companyA),
          isActive: true,
          duration: 90,
          name: "Corte + Barba",
        }
      : serviceA,
  );
  userRepository.findById.mockImplementation(async (id: unknown) =>
    String(id) === ids.employeeB
      ? {
          _id: ref(ids.employeeB),
          companyId: ref(ids.companyA),
          isActive: true,
          role: Role.EMPLOYEE,
          name: "Ana Profissional",
          avatar: null,
        }
      : employeeA,
  );
  availabilityRepository.findByEmployeeAndDay.mockResolvedValue({
    _id: ref("507f1f77bcf86cd799439019"),
    companyId: ref(ids.companyA),
    employeeId: ref(ids.employee),
    dayOfWeek: 0,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
  });
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);

  appointmentRepository.hasEmployeeConflict.mockResolvedValue(false);
  appointmentRepository.hasClientConflict.mockResolvedValue(false);
  appointmentRepository.findByPublicAccessTokenHash.mockImplementation(
    async (hash: string) => (hash === TOKEN_HASH ? appointment() : null),
  );
  appointmentRepository.findById.mockImplementation(async () => appointment());
  appointmentRepository.update.mockImplementation(
    async (_id: unknown, data: Record<string, unknown>) => {
      if (data.startAt instanceof Date) currentStartAt = data.startAt;
      if (data.endAt instanceof Date) currentEndAt = data.endAt;
      if (data.notes !== undefined) currentNotes = data.notes as string | null;
      if (data.serviceId) currentServiceId = String(data.serviceId);
      if (data.employeeId) currentEmployeeId = String(data.employeeId);

      return appointment();
    },
  );
  appointmentRepository.updateStatus.mockImplementation(async () => {
    currentStatus = AppointmentStatus.CANCELLED;

    return appointment();
  });

  notificationDispatcher.dispatchAppointmentEvent.mockResolvedValue(undefined);
});

describe("Link público — sem autenticação", () => {
  it("consulta sem qualquer autenticação", async () => {
    const response = await request(app).get(url());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("mantém as rotas administrativas protegidas", async () => {
    expect((await request(app).get("/api/appointments")).status).toBe(401);
  });

  it("passa pelo limitador de leitura em cada GET", async () => {
    await request(app).get(url());
    expect(readLimitCalls.count).toBe(1);

    await request(app).get(url("token-invalido"));
    expect(readLimitCalls.count).toBe(2);
  });

  it("passa pelo limitador de escrita em cada PATCH", async () => {
    await request(app).patch(url()).send({ notes: "olá" });
    expect(writeLimitCalls.count).toBe(1);

    await request(app).patch(url()).send({ startAt: "invalido" });
    expect(writeLimitCalls.count).toBe(2);
  });

  it("passa pelo limitador de cancelamento em cada DELETE", async () => {
    await request(app).delete(url());
    expect(cancelLimitCalls.count).toBe(1);

    await request(app).delete(url("token-invalido"));
    expect(cancelLimitCalls.count).toBe(2);
  });
});

describe("GET /api/public/appointments/:token", () => {
  it("devolve o contrato público", async () => {
    const response = await request(app).get(url());

    expect(response.body.data).toEqual({
      id: ids.appointment,
      companyId: ids.companyA,
      startAt: "2027-08-29T08:00:00.000Z",
      endAt: "2027-08-29T08:30:00.000Z",
      timezone: "Europe/Lisbon",
      status: AppointmentStatus.SCHEDULED,
      clientName: "Ana Publica",
      service: { id: ids.service, name: "Corte" },
      employee: {
        id: ids.employee,
        name: "Carlos",
        avatarUrl: null,
      },
    });
  });

  it("não expõe hash nem dados internos", async () => {
    const response = await request(app).get(url());
    const serialized = JSON.stringify(response.body);

    expect(response.body.data).not.toHaveProperty("publicAccessTokenHash");
    expect(response.body.data).not.toHaveProperty("clientId");
    expect(response.body.data.companyId).toBe(ids.companyA);
    expect(response.body.data).not.toHaveProperty("notes");
    expect(serialized).not.toContain(TOKEN_HASH);
    expect(serialized).not.toContain(TOKEN);
  });

  it("expõe o avatar do profissional apenas como url", async () => {
    userRepository.findById.mockResolvedValue({
      ...employeeA,
      avatar: {
        url: "https://cdn.exemplo.com/carlos.jpg",
        publicId: "carlos-123",
      },
    });

    const response = await request(app).get(url());

    expect(response.body.data.employee.avatarUrl).toBe(
      "https://cdn.exemplo.com/carlos.jpg",
    );
    expect(JSON.stringify(response.body)).not.toContain("carlos-123");
  });

  it("consulta um agendamento cancelado", async () => {
    currentStatus = AppointmentStatus.CANCELLED;

    const response = await request(app).get(url());

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("consulta um agendamento histórico", async () => {
    currentStatus = AppointmentStatus.COMPLETED;
    currentStartAt = new Date("2020-01-01T10:00:00.000Z");
    currentEndAt = new Date("2020-01-01T10:30:00.000Z");

    const response = await request(app).get(url());

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(AppointmentStatus.COMPLETED);
  });
});

describe("Token inválido — indistinguível", () => {
  it.each([
    ["malformado", "curto"],
    ["inexistente", "a".repeat(43)],
    ["ObjectId", "507f1f77bcf86cd799439011"],
    ["com caracteres inválidos", `${"a".repeat(42)}/`],
  ])("devolve 404 para token %s", async (_label, token) => {
    const response = await request(app).get(url(token));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("usa exatamente a mesma mensagem em todos os casos", async () => {
    const malformed = await request(app).get(url("curto"));
    const unknown = await request(app).get(url("a".repeat(43)));
    const objectId = await request(app).get(url(ids.appointment));

    expect(malformed.body.message).toBe(unknown.body.message);
    expect(malformed.body.message).toBe(objectId.body.message);
  });

  it("não revela empresa, cliente nem estado", async () => {
    const response = await request(app).get(url("a".repeat(43)));

    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toContain(ids.companyA);
    expect(serialized).not.toContain(ids.client);
    expect(serialized).not.toContain("Ana Publica");
  });

  it("devolve 404 para agendamento eliminado soft", async () => {
    /**
     * O repositório filtra `deletedAt: null`, portanto um
     * agendamento eliminado é indistinguível de um token
     * inválido.
     */
    appointmentRepository.findByPublicAccessTokenHash.mockResolvedValue(null);

    const response = await request(app).get(url());

    expect(response.status).toBe(404);
  });

  it("não aceita _id como alternativa ao token", async () => {
    const response = await request(app).get(url(ids.appointment));

    expect(response.status).toBe(404);
    expect(appointmentRepository.findById).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/public/appointments/:token", () => {
  it("entrega ao notificador o token puro da URL, para o link do e-mail", async () => {
    await request(app).patch(url()).send({ notes: "Janela" });

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "APPOINTMENT_UPDATED",
        publicAccessToken: TOKEN,
      }),
    );
  });

  it("altera a data/hora", async () => {
    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00.000Z" });

    expect(response.status).toBe(200);
    expect(response.body.data.startAt).toBe("2027-08-30T10:00:00.000Z");
    expect(response.body.data.endAt).toBe("2027-08-30T10:30:00.000Z");
  });

  it("recalcula endAt a partir da duração do novo serviço", async () => {
    const response = await request(app)
      .patch(url())
      .send({ serviceId: ids.serviceB });

    expect(response.status).toBe(200);
    expect(response.body.data.service).toEqual({
      id: ids.serviceB,
      name: "Corte + Barba",
    });
    expect(response.body.data.endAt).toBe("2027-08-29T09:30:00.000Z");
  });

  it("altera o profissional", async () => {
    const response = await request(app)
      .patch(url())
      .send({ employeeId: ids.employeeB });

    expect(response.status).toBe(200);
    expect(response.body.data.employee.name).toBe("Ana Profissional");
  });

  it("altera as observações", async () => {
    const response = await request(app).patch(url()).send({ notes: "Primeira vez" });

    expect(response.status).toBe(200);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notes: "Primeira vez" }),
    );
  });

  it("não regenera o token", async () => {
    await request(app).patch(url()).send({ notes: "olá" });

    expect(appointmentRepository.update.mock.calls[0][1]).not.toHaveProperty(
      "publicAccessTokenHash",
    );
  });

  it("aceita corpo vazio como no-op", async () => {
    const response = await request(app).patch(url()).send({});

    expect(response.status).toBe(200);
  });

  it("rejeita data no passado com 400", async () => {
    const response = await request(app)
      .patch(url())
      .send({ startAt: "2020-01-15T10:00:00.000Z" });

    expect(response.status).toBe(400);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita data sem fuso horário com 400", async () => {
    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00" });

    expect(response.status).toBe(400);
  });

  it.each([
    ["número", 20270830],
    ["lista", ["2027-08-30T10:00:00.000Z"]],
    ["objeto", { value: "2027-08-30T10:00:00.000Z" }],
  ])("rejeita startAt que não é uma data (%s)", async (_label, value) => {
    const response = await request(app).patch(url()).send({ startAt: value });

    expect(response.status).toBe(400);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita startAt vazio com 400", async () => {
    const response = await request(app).patch(url()).send({ startAt: "" });

    expect(response.status).toBe(400);
  });

  it("rejeita serviço de outra empresa com 404", async () => {
    serviceRepository.findById.mockResolvedValue({
      _id: ref(ids.serviceB),
      companyId: ref(ids.companyB),
      isActive: true,
      duration: 90,
      name: "Corte + Barba",
    });

    const response = await request(app)
      .patch(url())
      .send({ serviceId: ids.serviceB });

    expect(response.status).toBe(404);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita funcionário de outra empresa com 404", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(ids.employeeB),
      companyId: ref(ids.companyB),
      isActive: true,
      role: Role.EMPLOYEE,
      name: "Outro",
      avatar: null,
    });

    const response = await request(app)
      .patch(url())
      .send({ employeeId: ids.employeeB });

    expect(response.status).toBe(404);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita funcionário inativo com 400", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(ids.employeeB),
      companyId: ref(ids.companyA),
      isActive: false,
      role: Role.EMPLOYEE,
      name: "Inativo",
      avatar: null,
    });

    const response = await request(app)
      .patch(url())
      .send({ employeeId: ids.employeeB });

    expect(response.status).toBe(400);
  });

  it("rejeita conta de acesso (role CLIENT) com 404", async () => {
    userRepository.findById.mockResolvedValue({
      _id: ref(ids.employeeB),
      companyId: ref(ids.companyA),
      isActive: true,
      role: Role.CLIENT,
      name: "Conta",
      avatar: null,
    });

    const response = await request(app)
      .patch(url())
      .send({ employeeId: ids.employeeB });

    expect(response.status).toBe(404);
  });

  it("rejeita horário fora da disponibilidade com 409", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(409);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("rejeita horário bloqueado por exceção com 409", async () => {
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([
      { allDay: false, startTime: "09:00", endTime: "10:00" },
    ]);

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(409);
  });

  it("rejeita conflito do funcionário com 409", async () => {
    appointmentRepository.hasEmployeeConflict.mockResolvedValue(true);

    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00.000Z" });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("funcionário");
  });

  it("rejeita conflito do cliente com 409", async () => {
    appointmentRepository.hasClientConflict.mockResolvedValue(true);

    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00.000Z" });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("cliente");
  });

  it("recusa agendamento cancelado com 400", async () => {
    currentStatus = AppointmentStatus.CANCELLED;

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(400);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa agendamento concluído com 400", async () => {
    currentStatus = AppointmentStatus.COMPLETED;

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(400);
  });

  it("recusa agendamento no-show com 400", async () => {
    currentStatus = AppointmentStatus.NO_SHOW;

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(400);
  });

  it("recusa agendamento histórico já iniciado com 400", async () => {
    /**
     * Uma data já iniciada (anterior a `now`) torna o
     * agendamento histórico: legível, mas imutável.
     */
    currentStartAt = new Date("2026-01-15T10:00:00.000Z");
    currentEndAt = new Date("2026-01-15T10:30:00.000Z");

    const response = await request(app).patch(url()).send({ notes: "olá" });

    expect(response.status).toBe(400);
  });

  it("aceita alterar um agendamento confirmado", async () => {
    currentStatus = AppointmentStatus.CONFIRMED;

    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00.000Z" });

    expect(response.status).toBe(200);
  });

  it("não expõe dados internos na resposta", async () => {
    const response = await request(app)
      .patch(url())
      .send({ startAt: "2027-08-30T10:00:00.000Z" });

    expect(response.body.data).not.toHaveProperty("clientId");
    expect(response.body.data.companyId).toBe(ids.companyA);
    expect(JSON.stringify(response.body)).not.toContain(TOKEN_HASH);
  });
});

describe("PATCH — campos recusados", () => {
  it.each([
    ["endAt", { endAt: "2030-01-01T00:00:00.000Z" }],
    ["status", { status: AppointmentStatus.CANCELLED }],
    ["status confirmed", { status: AppointmentStatus.CONFIRMED }],
    ["companyId", { companyId: ids.companyB }],
    ["clientId", { clientId: ids.client }],
    ["duration", { duration: 999 }],
    ["price", { price: 0 }],
    ["deletedAt", { deletedAt: new Date().toISOString() }],
    ["publicAccessTokenHash", { publicAccessTokenHash: "x".repeat(71) }],
    ["clientEmail", { clientEmail: "outro@exemplo.com" }],
    ["clientName", { clientName: "Outro Nome" }],
    ["clientPhone", { clientPhone: "+351912345678" }],
    ["reminder24hSentAt", { reminder24hSentAt: new Date().toISOString() }],
    ["campo inventado", { hackerField: 1 }],
  ])("recusa %s com 400", async (_label, payload) => {
    const response = await request(app).patch(url()).send(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("nunca aceita reativar via status scheduled", async () => {
    currentStatus = AppointmentStatus.CANCELLED;

    const response = await request(app)
      .patch(url())
      .send({ status: AppointmentStatus.SCHEDULED });

    expect(response.status).toBe(400);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("recusa corpo que não é objeto JSON", async () => {
    const response = await request(app)
      .patch(url())
      .set("Content-Type", "application/json")
      .send("[1,2,3]");

    expect(response.status).toBe(400);
  });

  it("recusa corpo malformado com 400", async () => {
    const response = await request(app)
      .patch(url())
      .set("Content-Type", "application/json")
      .send('{"startAt": ');

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/public/appointments/:token", () => {
  it("cancela o agendamento", async () => {
    const response = await request(app).delete(url());

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(AppointmentStatus.CANCELLED);
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      AppointmentStatus.CANCELLED,
    );
  });

  it("não faz remoção física", async () => {
    await request(app).delete(url());

    expect(appointmentRepository.softDelete).not.toHaveBeenCalled();
  });

  it("é idempotente", async () => {
    const first = await request(app).delete(url());
    const second = await request(app).delete(url());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe(AppointmentStatus.CANCELLED);
    expect(appointmentRepository.updateStatus).toHaveBeenCalledTimes(1);
  });

  it("não permite reativar", async () => {
    await request(app).delete(url());
    await request(app).delete(url());

    expect(
      appointmentRepository.updateStatus.mock.calls.map((call) => call[1]),
    ).toEqual([AppointmentStatus.CANCELLED]);
  });

  it("recusa agendamento concluído com 400", async () => {
    currentStatus = AppointmentStatus.COMPLETED;

    const response = await request(app).delete(url());

    expect(response.status).toBe(400);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("recusa agendamento no-show com 400", async () => {
    currentStatus = AppointmentStatus.NO_SHOW;

    const response = await request(app).delete(url());

    expect(response.status).toBe(400);
  });

  it("cancela agendamento scheduled no passado", async () => {
    currentStartAt = new Date("2026-01-15T10:00:00.000Z");
    currentEndAt = new Date("2026-01-15T10:30:00.000Z");

    const response = await request(app).delete(url());

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(AppointmentStatus.CANCELLED);
  });

  it("devolve 404 para token inválido", async () => {
    const response = await request(app).delete(url("a".repeat(43)));

    expect(response.status).toBe(404);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("recusa body com status em vez de o ignorar", async () => {
    const response = await request(app)
      .delete(url())
      .send({ status: AppointmentStatus.SCHEDULED });

    /**
     * O cliente público não controla a transição de estado.
     * Recusar é melhor do que ignorar com `200`: um `200`
     * diria que o pedido foi aplicado como pedido.
     */
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("recusa body com status cancelled", async () => {
    const response = await request(app)
      .delete(url())
      .send({ status: AppointmentStatus.CANCELLED });

    expect(response.status).toBe(400);
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("aceita corpo vazio explícito", async () => {
    const response = await request(app).delete(url()).send({});

    expect(response.status).toBe(200);
  });

  it("notifica o cancelamento pelo mecanismo existente", async () => {
    await request(app).delete(url());

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "APPOINTMENT_CANCELLED" }),
    );
  });

  it("entrega ao notificador o token puro da URL, para o link do e-mail", async () => {
    await request(app).delete(url());

    expect(notificationDispatcher.dispatchAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ publicAccessToken: TOKEN }),
    );
  });

  it("não entrega o hash do token ao notificador", async () => {
    await request(app).delete(url());

    const dispatched = notificationDispatcher.dispatchAppointmentEvent.mock
      .calls[0][0];

    expect(dispatched.publicAccessToken).not.toContain("sha256:");
    expect(dispatched.publicAccessToken).toBe(TOKEN);
  });
});

describe("Superfície das rotas públicas", () => {
  it("não expõe PUT nem rotas por _id", async () => {
    expect((await request(app).put(url()).send({})).status).toBe(404);
    expect((await request(app).get(`/api/public/appointments/${ids.appointment}`)).status).toBe(404);
  });

  it("não expõe operações por token além de GET/PATCH/DELETE", async () => {
    expect((await request(app).post(url()).send({})).status).toBe(404);
  });

  it("mantém a criação pública disponível", async () => {
    companyRepository.findById.mockResolvedValue({
      _id: ref(ids.companyA),
      isActive: true,
      timezone: "Europe/Lisbon",
    });
    clientRepository.findByEmailAndCompany.mockResolvedValue(null);
    clientRepository.create.mockResolvedValue(clientA);
    appointmentRepository.create.mockImplementation(async () => appointment());

    const response = await request(app)
      .post(`/api/public/companies/${ids.companyA}/appointments`)
      .send({
        serviceId: ids.service,
        employeeId: ids.employee,
        startAt: "2027-08-29T08:00:00.000Z",
        clientName: "Ana Publica",
        clientEmail: "ana@exemplo.com",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.publicAccessToken).toBeDefined();
  });
});
