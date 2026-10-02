import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  employee: "507f1f77bcf86cd799439013",
  owner: "507f1f77bcf86cd799439014",
  manager: "507f1f77bcf86cd799439015",
  client: "507f1f77bcf86cd799439016",
  inactive: "507f1f77bcf86cd799439017",
  service: "507f1f77bcf86cd799439018",
  serviceB: "507f1f77bcf86cd799439019",
  serviceInactive: "507f1f77bcf86cd79943901a",
  serviceOtherTenant: "507f1f77bcf86cd79943901b",
  availability: "507f1f77bcf86cd79943901c",
  exception: "507f1f77bcf86cd79943901d",
  appointment: "507f1f77bcf86cd79943901e",
};

const {
  catalogLimitCalls,
  availabilityLimitCalls,
  appointmentRepository,
  serviceRepository,
  userRepository,
  companyRepository,
  availabilityRepository,
  availabilityExceptionRepository,
} = vi.hoisted(() => ({
  catalogLimitCalls: { count: 0 },
  availabilityLimitCalls: { count: 0 },
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
    findBlockingForEmployee: vi.fn(),
  },
  serviceRepository: {
    findById: vi.fn(),
    findByCompanyId: vi.fn(),
    findActiveByCompanyId: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
    findByIdForAccessControl: vi.fn(),
    findByCompanyId: vi.fn(),
    findActiveEmployeesByCompanyId: vi.fn(),
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
}));

/**
 * Os limitadores desta etapa são substituídos por funções de
 * passagem que contam invocações, para provar que as novas rotas
 * os usam. O comportamento real (429, cabeçalhos, chave por IP)
 * é testado em `public-catalog-rate-limit.test.ts`.
 */
vi.mock(
  "../../src/middlewares/public-appointment-link-rate-limit.middleware",
  () => {
    const pass = (counter: { count: number }) =>
      (_req: never, _res: never, next: () => void) => {
        counter.count += 1;
        next();
      };

    return {
      default: pass(catalogLimitCalls),
      createPublicLinkRateLimit: (options: { routeKey: string }) => {
        // A factory devolve o limitador da orquestra que a
        // rota pediu, o que também fixa a chave de cada rota.
        return options.routeKey.includes("availability")
          ? pass(availabilityLimitCalls)
          : pass(catalogLimitCalls);
      },
      publicAppointmentReadRateLimit: pass(catalogLimitCalls),
      publicAppointmentWriteRateLimit: pass(catalogLimitCalls),
      publicAppointmentCancelRateLimit: pass(catalogLimitCalls),
    };
  },
);

vi.mock("../../src/middlewares/public-booking-rate-limit.middleware", () => ({
  default: (_req: never, _res: never, next: () => void) => {
    catalogLimitCalls.count += 1;
    next();
  },
  publicBookingRateLimit: (_req: never, _res: never, next: () => void) => {
    catalogLimitCalls.count += 1;
    next();
  },
  createPublicBookingRateLimit: () => (
    _req: never,
    _res: never,
    next: () => void,
  ) => {
    catalogLimitCalls.count += 1;
    next();
  },
}));

/**
 * A autenticação é instrumentada para provar que as rotas de
 * catálogo NÃO a utilizam.
 */
vi.mock("../../src/middlewares/auth.middleware", () => ({
  default: {
    authenticate: (_req: never, res: never, _next: () => void) => {
      res.status(401).json({ success: false, message: "Não autenticado." });
    },
  },
}));

vi.mock("../../src/modules/appointments/repositories/AppointmentRepository", () => ({ default: appointmentRepository }));
vi.mock("../../src/modules/services/repositories/ServiceRepository", () => ({ default: serviceRepository }));
vi.mock("../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));

import app from "../../src/app";
import { Role } from "../../src/constants/roles";
import { AppointmentStatus } from "../../src/constants/appointment-status";

const ref = (id: string) => ({ toString: () => id });

const companyA = {
  _id: ref(ids.companyA),
  name: "Studio A",
  timezone: "Europe/Lisbon",
  isActive: true,
  deletedAt: null,
};

const companyInactive = {
  _id: ref(ids.companyA),
  name: "Studio A",
  timezone: "Europe/Lisbon",
  isActive: false,
  deletedAt: null,
};

/**
 * `CompanyRepository.findById` já filtra `deletedAt: null` (ver
 * `tests/unit/repositories/public-catalog-filters.test.ts`), por
 * isso uma empresa eliminada chega ao serviço como `null`, e não
 * como um documento com `deletedAt`. O mock segue a realidade do
 * repositório; simular o documento seria testar um caminho que a
 * base de dados não produz.
 */
const companyDeleted = null;

const serviceA = {
  _id: ref(ids.service),
  companyId: ref(ids.companyA),
  isActive: true,
  deletedAt: null,
  name: "Corte de cabelo",
  description: "Inclui lavagem",
  duration: 30,
  price: 25,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const serviceNoDescription = {
  ...serviceA,
  _id: ref(ids.serviceB),
  name: "Consulta",
  description: undefined,
  duration: 60,
  price: 40,
};

const employee = {
  _id: ref(ids.employee),
  companyId: ref(ids.companyA),
  role: Role.EMPLOYEE,
  isActive: true,
  deletedAt: null,
  name: "Carlos Silva",
  email: "carlos@studio-a.pt",
  avatar: { url: "https://cdn.example/carlos.jpg", publicId: "publicid-1" },
};

const owner = {
  _id: ref(ids.owner),
  companyId: ref(ids.companyA),
  role: Role.OWNER,
  isActive: true,
  deletedAt: null,
  name: "Ana Dono",
  email: "ana@studio-a.pt",
  avatar: null,
};

const manager = {
  _id: ref(ids.manager),
  companyId: ref(ids.companyA),
  role: Role.MANAGER,
  isActive: true,
  deletedAt: null,
  name: "Bruno Gestão",
  email: "bruno@studio-a.pt",
  avatar: null,
};

const clientUser = {
  _id: ref(ids.client),
  companyId: ref(ids.companyA),
  role: Role.CLIENT,
  isActive: true,
  deletedAt: null,
  name: "Cliente Wordpress",
  email: "cliente@exemplo.pt",
  avatar: null,
};

const inactiveEmployee = {
  ...employee,
  _id: ref(ids.inactive),
  isActive: false,
  name: "Inativo",
};

/** Quinta-feira, para os testes de dia da semana. */
const DATE = "2026-10-08";

/** Sexta-feira. */
const FRIDAY = "2026-10-09";

/** Ambos os períodos completos de 30 em 30. */
const availabilityFull = {
  _id: ref(ids.availability),
  companyId: ref(ids.companyA),
  employeeId: ref(ids.employee),
  dayOfWeek: 4,
  morningStart: "09:00",
  morningEnd: "12:00",
  afternoonStart: "14:00",
  afternoonEnd: "18:00",
  isActive: true,
  deletedAt: null,
};

const servicesUrl = (companyId: string = ids.companyA) =>
  `/api/public/companies/${companyId}/services`;
const employeesUrl = (companyId: string = ids.companyA) =>
  `/api/public/companies/${companyId}/employees`;
const availabilityUrl = (companyId: string = ids.companyA) =>
  `/api/public/companies/${companyId}/availability`;

const availabilityQuery = (overrides: Record<string, string> = {}) => ({
  serviceId: ids.service,
  employeeId: ids.employee,
  date: DATE,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();

  catalogLimitCalls.count = 0;
  availabilityLimitCalls.count = 0;

  companyRepository.findById.mockResolvedValue(companyA);
  serviceRepository.findActiveByCompanyId.mockResolvedValue([
    serviceA,
    serviceNoDescription,
  ]);
  userRepository.findActiveEmployeesByCompanyId.mockResolvedValue([
    employee,
    owner,
    manager,
  ]);

  userRepository.findById.mockImplementation((id: string) =>
    Promise.resolve(
      [employee, owner, manager, clientUser, inactiveEmployee].find(
        (candidate) => candidate._id.toString() === id,
      ) ?? null,
    ),
  );

  serviceRepository.findById.mockImplementation((id: string) => {
    if (id === ids.service) return Promise.resolve(serviceA);
    if (id === ids.serviceB) return Promise.resolve(serviceNoDescription);

    if (id === ids.serviceInactive) {
      return Promise.resolve({
        ...serviceA,
        _id: ref(ids.serviceInactive),
        isActive: false,
        name: "Serviço inativo",
      });
    }

    if (id === ids.serviceOtherTenant) {
      return Promise.resolve({
        ...serviceA,
        _id: ref(ids.serviceOtherTenant),
        companyId: ref(ids.companyB),
        name: "Serviço de outra empresa",
      });
    }

    return Promise.resolve(null);
  });

  availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availabilityFull);
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);
  appointmentRepository.findBlockingForEmployee.mockResolvedValue([]);
});

describe("GET /api/public/companies/:companyId/services", () => {
  it("devolve 200 com os serviços ativos da empresa", async () => {
    const response = await request(app).get(servicesUrl());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
  });

  it("devolve apenas o contrato público, sem campos internos", async () => {
    const response = await request(app).get(servicesUrl());

    expect(Object.keys(response.body.data[0]).sort()).toEqual([
      "description",
      "durationMinutes",
      "id",
      "name",
      "price",
    ]);

    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toContain(ids.companyA);
    expect(serialized).not.toContain("isActive");
    expect(serialized).not.toContain("deletedAt");
    expect(serialized).not.toContain("createdAt");
    expect(serialized).not.toContain("updatedAt");
  });

  it("expõe `duration` do modelo como `durationMinutes`", async () => {
    const response = await request(app).get(servicesUrl());

    const corte = response.body.data.find(
      (item: { id: string }) => item.id === ids.service,
    );

    expect(corte.durationMinutes).toBe(30);
    expect(corte).not.toHaveProperty("duration");
  });

  it("devolve `description: null` quando o serviço não tem descrição", async () => {
    const response = await request(app).get(servicesUrl());

    const consulta = response.body.data.find(
      (item: { id: string }) => item.id === ids.serviceB,
    );

    expect(consulta.description).toBeNull();
  });

  it("consulta o repositório com o tenant da rota", async () => {
    await request(app).get(servicesUrl());

    expect(serviceRepository.findActiveByCompanyId).toHaveBeenCalledWith(
      ids.companyA,
    );
  });

  it("devolve 200 e lista vazia quando a empresa não tem serviços", async () => {
    serviceRepository.findActiveByCompanyId.mockResolvedValue([]);

    const response = await request(app).get(servicesUrl());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("devolve 404 para uma empresa inexistente", async () => {
    companyRepository.findById.mockResolvedValue(null);

    const response = await request(app).get(servicesUrl());

    expect(response.status).toBe(404);
    expect(serviceRepository.findActiveByCompanyId).not.toHaveBeenCalled();
  });

  it("devolve 404 para uma empresa eliminada", async () => {
    companyRepository.findById.mockResolvedValue(companyDeleted);

    const response = await request(app).get(servicesUrl(ids.companyB));

    expect(response.status).toBe(404);
    expect(serviceRepository.findActiveByCompanyId).not.toHaveBeenCalled();
  });

  it("devolve 400 para uma empresa inativa", async () => {
    companyRepository.findById.mockResolvedValue(companyInactive);

    const response = await request(app).get(servicesUrl());

    expect(response.status).toBe(400);
    expect(serviceRepository.findActiveByCompanyId).not.toHaveBeenCalled();
  });

  it("devolve 400 para um companyId malformado", async () => {
    const response = await request(app).get(servicesUrl("nao-e-um-id"));

    expect(response.status).toBe(400);
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it("aplica o limitador público", async () => {
    await request(app).get(servicesUrl());

    expect(catalogLimitCalls.count).toBe(1);
  });

  it("não exige autenticação", async () => {
    // O mock de `authenticate` responderia 401; um 200 prova
    // que a rota não o invoca.
    const response = await request(app).get(servicesUrl());

    expect(response.status).toBe(200);
  });
});

describe("GET /api/public/companies/:companyId/employees", () => {
  it("devolve 200 com os profissionais ativos", async () => {
    const response = await request(app).get(employeesUrl());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
  });

  it("devolve apenas id, name e avatarUrl", async () => {
    const response = await request(app).get(employeesUrl());

    expect(Object.keys(response.body.data[0]).sort()).toEqual([
      "avatarUrl",
      "id",
      "name",
    ]);

    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain(ids.companyA);
    expect(serialized).not.toContain("isActive");
    expect(serialized).not.toContain("role");
    expect(serialized).not.toContain("deletedAt");
  });

  it("não expõe o publicId do storage", async () => {
    const response = await request(app).get(employeesUrl());

    expect(JSON.stringify(response.body)).not.toContain("publicid-1");
  });

  it("mapeia o avatar do profissional para avatarUrl", async () => {
    const response = await request(app).get(employeesUrl());

    const carlos = response.body.data.find(
      (item: { id: string }) => item.id === ids.employee,
    );

    expect(carlos.avatarUrl).toBe("https://cdn.example/carlos.jpg");
  });

  it("devolve avatarUrl null para quem não tem avatar", async () => {
    const response = await request(app).get(employeesUrl());

    const ana = response.body.data.find(
      (item: { id: string }) => item.id === ids.owner,
    );

    expect(ana.avatarUrl).toBeNull();
  });

  it("exclui contas de acesso (CLIENT)", async () => {
    const response = await request(app).get(employeesUrl());

    expect(
      response.body.data.some(
        (item: { id: string }) => item.id === ids.client,
      ),
    ).toBe(false);
  });

  it("inclui dono e gestão, que também atendem", async () => {
    const response = await request(app).get(employeesUrl());

    const idsReturned = response.body.data.map(
      (item: { id: string }) => item.id,
    );

    expect(idsReturned).toContain(ids.owner);
    expect(idsReturned).toContain(ids.manager);
  });

  it("filtra no repositório pelo tenant e por ativos", async () => {
    await request(app).get(employeesUrl());

    expect(
      userRepository.findActiveEmployeesByCompanyId,
    ).toHaveBeenCalledWith(ids.companyA);
  });

  it("devolve 404 para uma empresa eliminada, sem revelar dados", async () => {
    companyRepository.findById.mockResolvedValue(companyDeleted);

    const response = await request(app).get(employeesUrl(ids.companyB));

    expect(response.status).toBe(404);
    expect(
      userRepository.findActiveEmployeesByCompanyId,
    ).not.toHaveBeenCalled();
  });

  it("devolve 400 para uma empresa inativa", async () => {
    companyRepository.findById.mockResolvedValue(companyInactive);

    const response = await request(app).get(employeesUrl());

    expect(response.status).toBe(400);
  });

  it("devolve 400 para um companyId malformado", async () => {
    const response = await request(app).get(employeesUrl("123"));

    expect(response.status).toBe(400);
  });

  it("aplica o limitador público", async () => {
    await request(app).get(employeesUrl());

    expect(catalogLimitCalls.count).toBe(1);
  });

  it("não consulta empresas diferentes em paralelo", async () => {
    await request(app).get(employeesUrl());

    expect(companyRepository.findById).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/public/companies/:companyId/availability", () => {
  it("devolve 200 com os slots do dia", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.date).toBe(DATE);
    expect(response.body.data.timezone).toBe("Europe/Lisbon");
    expect(response.body.data.slots.length).toBeGreaterThan(0);
  });

  it("devolve 200 e a lista dos dois períodos", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    // Manhã 09:00-12:00 = 6 slots; tarde 14:00-18:00 = 8 slots.
    expect(response.body.data.slots).toHaveLength(14);
    expect(response.body.data.slots[0]).toEqual({
      startAt: "2026-10-08T09:00:00.000+01:00",
      endAt: "2026-10-08T09:30:00.000+01:00",
    });
    expect(response.body.data.slots.at(-1)).toEqual({
      startAt: "2026-10-08T17:30:00.000+01:00",
      endAt: "2026-10-08T18:00:00.000+01:00",
    });
  });

  it("consulta a agenda do profissional pedido, com o tenant da rota", async () => {
    await request(app).get(availabilityUrl()).query(availabilityQuery());

    const [call] = availabilityRepository.findByEmployeeAndDay.mock.calls;

    /**
     * O `employeeId` segue o documento, como em
     * `ensureEmployeeAvailable`, que aceita `string |
     * ObjectId`.
     */
    expect(call[0]).toBe(ids.companyA);
    expect(String(call[1])).toBe(ids.employee);
    expect(call[2]).toBe(4);

    expect(
      availabilityExceptionRepository.findByEmployeeAndDate,
    ).toHaveBeenCalledWith(ids.companyA, expect.anything(), DATE);
  });

  it("consulta conflitos na janela do dia local da empresa", async () => {
    await request(app).get(availabilityUrl()).query(availabilityQuery());

    const call = appointmentRepository.findBlockingForEmployee.mock.calls[0];

    expect(call[0]).toBe(ids.companyA);
    expect(String(call[1])).toBe(ids.employee);

    /**
     * O dia local inteiro: 2026-10-08 em Lisboa é UTC+1, logo
     * de 23:00 do dia anterior a 23:59:59.999. É o que
     * `endOf("day")` dá — último milissegundo do dia, não a
     * meia-noite seguinte.
     */
    expect((call[2] as Date).toISOString()).toBe(
      "2026-10-07T23:00:00.000Z",
    );
    expect((call[3] as Date).toISOString()).toBe(
      "2026-10-08T22:59:59.999Z",
    );
  });

  it("devolve 200 e lista vazia quando o dia não tem disponibilidade", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null);

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
    expect(response.body.data.slots).toEqual([]);

    /**
     * Dia fechado é comum num endpoint que percorre datas, por
     * isso o serviço não consulta exceções nem conflitos quando
     * a disponibilidade semanal já diz que não há período.
     */
    expect(
      availabilityExceptionRepository.findByEmployeeAndDate,
    ).not.toHaveBeenCalled();
    expect(
      appointmentRepository.findBlockingForEmployee,
    ).not.toHaveBeenCalled();
  });

  it("devolve 200 e lista vazia com uma exceção de dia inteiro", async () => {
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([
      {
        _id: ref(ids.exception),
        type: "VACATION",
        allDay: true,
        startTime: null,
        endTime: null,
        reason: "Férias",
      },
    ]);

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
    expect(response.body.data.slots).toEqual([]);
  });

  it("devolve 200 e lista vazia quando um dia já passou", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ date: "2020-01-01" }));

    expect(response.status).toBe(200);
    expect(response.body.data.slots).toEqual([]);
  });

  it.each([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])(
    "remove o slot ocupado por um agendamento %s",
    async (status) => {
      appointmentRepository.findBlockingForEmployee.mockResolvedValue([
        {
          _id: ref(ids.appointment),
          companyId: ref(ids.companyA),
          employeeId: ref(ids.employee),
          status,
          startAt: new Date("2026-10-08T08:00:00.000Z"),
          endAt: new Date("2026-10-08T08:30:00.000Z"),
        },
      ]);

      const response = await request(app)
        .get(availabilityUrl())
        .query(availabilityQuery());

      expect(response.body.data.slots[0].startAt).toBe(
        "2026-10-08T09:30:00.000+01:00",
      );
    },
  );

  it("usa o timezone da empresa, não o do servidor", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.body.data.slots[0].startAt).toContain("+01:00");
  });

  it("segue a empresa quando o timezone não é válido", async () => {
    companyRepository.findById.mockResolvedValue({
      ...companyA,
      timezone: "Nao/Existe",
    });

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
    expect(response.body.data.timezone).toBe("Europe/Lisbon");
  });

  /**
   * Registos criados antes de o campo existir não têm timezone.
   * O fallback é o mesmo do resto do sistema, e a resposta
   * declara-o para que o cliente não assuma o fuso do browser.
   */
  it("usa o fallback quando a empresa não tem timezone", async () => {
    companyRepository.findById.mockResolvedValue({
      ...companyA,
      timezone: undefined,
    });

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
    expect(response.body.data.timezone).toBe("Europe/Lisbon");
    expect(response.body.data.slots[0].startAt).toContain("+01:00");
  });

  it("devolve 400 para um serviço inexistente", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ serviceId: "507f1f77bcf86cd7994390ff" }));

    expect(response.status).toBe(404);
  });

  it("devolve 400 para um serviço inativo", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ serviceId: ids.serviceInactive }));

    expect(response.status).toBe(400);
  });

  it("devolve 404 para um serviço de outra empresa", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ serviceId: ids.serviceOtherTenant }));

    expect(response.status).toBe(404);
    expect(
      availabilityRepository.findByEmployeeAndDay,
    ).not.toHaveBeenCalled();
  });

  it("devolve 404 para um profissional de outra empresa", async () => {
    const otherEmployee = {
      ...employee,
      _id: ref("507f1f77bcf86cd799439099"),
      companyId: ref(ids.companyB),
    };

    userRepository.findById.mockImplementation((id: string) =>
      Promise.resolve(id === otherEmployee._id.toString() ? otherEmployee : employee),
    );

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ employeeId: "507f1f77bcf86cd799439099" }));

    expect(response.status).toBe(404);
    expect(
      availabilityRepository.findByEmployeeAndDay,
    ).not.toHaveBeenCalled();
  });

  it("devolve 400 para um profissional inativo", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ employeeId: ids.inactive }));

    expect(response.status).toBe(400);
  });

  it("devolve 404 para uma conta de acesso (CLIENT)", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ employeeId: ids.client }));

    expect(response.status).toBe(404);
  });

  it("devolve 400 para uma empresa inativa", async () => {
    companyRepository.findById.mockResolvedValue(companyInactive);

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(400);
  });

  it("devolve 404 para uma empresa eliminada", async () => {
    companyRepository.findById.mockResolvedValue(companyDeleted);

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(404);
  });

  it.each([
    ["serviceId", "ID do serviço inválido."],
    ["employeeId", "ID do funcionário inválido."],
  ])("devolve 400 para %s malformado", async (field, message) => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ [field]: "não-é-um-id" }));

    /**
     * `validateRequest` propaga apenas a PRIMEIRA mensagem de
     * validação, num `AppError` sem lista de erros — por isso a
     * asserção é sobre `message`.
     */
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
  });

  it.each(["serviceId", "employeeId", "date"])(
    "devolve 400 quando %s falta",
    async (field) => {
      const query = availabilityQuery();
      delete query[field as keyof typeof query];

      const response = await request(app).get(availabilityUrl()).query(query);

      expect(response.status).toBe(400);
    },
  );

  it.each([
    ["2026-13-01", "A data informada não existe no calendário."],
    ["2026-02-30", "A data informada não existe no calendário."],
    ["2026-1-1", "A data deve estar no formato AAAA-MM-DD (ex.: 2026-10-05)."],
    ["08-10-2026", "A data deve estar no formato AAAA-MM-DD (ex.: 2026-10-05)."],
  ])("devolve 400 para a data %s", async (date, message) => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ date }));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
  });

  it.each(["2026-10-08T09:00", "2026-10-08T09:00:00Z", "08/10/2026"])(
    "devolve 400 para %s, porque a data não tem hora nem fuso",
    async (date) => {
      const response = await request(app)
        .get(availabilityUrl())
        .query(availabilityQuery({ date }));

      expect(response.status).toBe(400);
    },
  );

  it("recusa um companyId na query, porque o tenant vem da rota", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ companyId: ids.companyB }));

    expect(response.status).toBe(400);
  });

  it("aplica o limitador de disponibilidade", async () => {
    await request(app).get(availabilityUrl()).query(availabilityQuery());

    expect(availabilityLimitCalls.count).toBe(1);
    expect(catalogLimitCalls.count).toBe(0);
  });

  it("não exige autenticação", async () => {
    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery());

    expect(response.status).toBe(200);
  });

  it("devolve 200 para um dia da semana diferente", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue({
      ...availabilityFull,
      dayOfWeek: 5,
    });

    const response = await request(app)
      .get(availabilityUrl())
      .query(availabilityQuery({ date: FRIDAY }));

    expect(response.status).toBe(200);

    const [call] = availabilityRepository.findByEmployeeAndDay.mock.calls;

    expect(call[2]).toBe(5);
  });
});