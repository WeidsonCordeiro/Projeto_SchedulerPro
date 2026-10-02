import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppointmentStatus } from "../../../src/constants/appointment-status";
import { Role } from "../../../src/constants/roles";

const { appointment, service, user, company } = vi.hoisted(() => ({
  appointment: { find: vi.fn(), findOne: vi.fn() },
  service: { find: vi.fn(), findOne: vi.fn() },
  user: { find: vi.fn(), findOne: vi.fn() },
  company: { findOne: vi.fn() },
}));

/**
 * O Mongoose devolve uma Query encadeável (`.find().sort()`),
 * por isso o mock tem de a reproduzir: `sort` é um spy e
 * devolve outra Query, que é o que se resolve no `await`.
 */
const chainable = (result: unknown[] = []) => {
  const promise = Promise.resolve(result);

  return Object.assign(promise, {
    sort: vi.fn(() => chainable(result)),
    select: vi.fn(() => chainable(result)),
    lean: vi.fn(() => chainable(result)),
  });
};

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({ default: appointment }));
vi.mock("../../../src/modules/services/models/Service.model", () => ({ default: service }));
vi.mock("../../../src/modules/users/models/User.model", () => ({ default: user }));
vi.mock("../../../src/modules/companies/models/Company.model", () => ({ default: company }));

import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import ServiceRepository from "../../../src/modules/services/repositories/ServiceRepository";
import UserRepository from "../../../src/modules/users/repositories/UserRepository";
import CompanyRepository from "../../../src/modules/companies/repositories/CompanyRepository";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const serviceId = "507f1f77bcf86cd799439013";
const windowStart = new Date("2026-10-07T23:00:00.000Z");
const windowEnd = new Date("2026-10-08T23:00:00.000Z");

/**
 * ==========================================================
 * Filtros de leitura usados pelo catálogo público.
 *
 * Estes três métodos são a fronteira entre as rotas públicas e a
 * base de dados. Um filtro em falta aqui não produz um erro
 * visível: produz um catálogo com dados de outra empresa, ou
 * horários que o agendamento recusaria. Por isso os testes
 * verificam a CONSULTA, não apenas o retorno.
 * ==========================================================
 */
describe("AppointmentRepository.findBlockingForEmployee", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtra por tenant, profissional, ativos e sobrepostos à janela", async () => {
    appointment.find.mockReturnValue(chainable());

    await AppointmentRepository.findBlockingForEmployee(
      companyId,
      employeeId,
      windowStart,
      windowEnd,
    );

    expect(appointment.find).toHaveBeenCalledWith({
      companyId,
      employeeId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: { $lt: windowEnd },
      endAt: { $gt: windowStart },
    });
  });

  /**
   * Sobreposição ESTRITA: um agendamento que termina quando o
   * slot começa (ou começa quando o slot termina) não bloqueia.
   * É a mesma regra de `hasEmployeeConflict`, e divergir das
   * duas significaria oferecer um horário que a escrita recusa.
   */
  it("usa sobreposição estrita nos dois limites", async () => {
    appointment.find.mockReturnValue(chainable());

    await AppointmentRepository.findBlockingForEmployee(
      companyId,
      employeeId,
      windowStart,
      windowEnd,
    );

    const filter = appointment.find.mock.calls[0][0];

    expect(filter.startAt).toEqual({ $lt: windowEnd });
    expect(filter.endAt).toEqual({ $gt: windowStart });
  });

  /**
   * Não há `sort`: o consumidor faz uma busca por sobreposição
   * (`some`), insensível à ordem. Ordenar aqui seria trabalho
   * sem efeito na resposta.
   */
  it("não impõe ordenação, porque a verificação é por sobreposição", async () => {
    const query = chainable();
    appointment.find.mockReturnValue(query);

    await AppointmentRepository.findBlockingForEmployee(
      companyId,
      employeeId,
      windowStart,
      windowEnd,
    );

    expect(query.sort).not.toHaveBeenCalled();
  });

  it("devolve os agendamentos encontrados", async () => {
    const found = [{ _id: "a", startAt: windowStart, endAt: windowEnd }];
    appointment.find.mockReturnValue(chainable(found));

    await expect(
      AppointmentRepository.findBlockingForEmployee(
        companyId,
        employeeId,
        windowStart,
        windowEnd,
      ),
    ).resolves.toEqual(found);
  });

  it("devolve lista vazia quando não há agendamentos", async () => {
    appointment.find.mockReturnValue(chainable([]));

    await expect(
      AppointmentRepository.findBlockingForEmployee(
        companyId,
        employeeId,
        windowStart,
        windowEnd,
      ),
    ).resolves.toEqual([]);
  });
});

describe("ServiceRepository.findActiveByCompanyId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtra por tenant, ativo e não eliminado", async () => {
    service.find.mockReturnValue(chainable());

    await ServiceRepository.findActiveByCompanyId(companyId);

    expect(service.find).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        isActive: true,
        deletedAt: null,
      }),
    );
  });

  it("ordena por nome, para um catálogo estável", async () => {
    const query = chainable();
    service.find.mockReturnValue(query);

    await ServiceRepository.findActiveByCompanyId(companyId);

    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
  });

  it("devolve lista vazia quando a empresa não tem serviços", async () => {
    service.find.mockReturnValue(chainable([]));

    await expect(
      ServiceRepository.findActiveByCompanyId(companyId),
    ).resolves.toEqual([]);
  });
});

describe("UserRepository.findActiveEmployeesByCompanyId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtra por tenant, ativo e não eliminado", async () => {
    user.find.mockReturnValue(chainable());

    await UserRepository.findActiveEmployeesByCompanyId(companyId);

    expect(user.find).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        isActive: true,
        deletedAt: null,
      }),
    );
  });

  /**
   * ==========================================================
   * O filtro de roles merece um teste em nome próprio porque
   * NÃO é `$eq: Role.EMPLOYEE`:
   *
   * `EMPLOYEE` é o valor por omissão no modelo e dono e gestão
   * também atendem — é o que o fluxo público de marcação já
   * aceitava, e restringi-los aqui mostraria um catálogo mais
   * estreito do que o que a empresa de facto aceita.
   *
   * O que tem de ficar de fora é `CLIENT`: um cliente da
   * empresa nunca é prestador, e mostrá-lo como profissional
   * seria tanto um bug funcional como uma fuga de dados.
   * ==========================================================
   */
  it("exclui CLIENT e aceita EMPLOYEE, OWNER e MANAGER", async () => {
    user.find.mockReturnValue(chainable());

    await UserRepository.findActiveEmployeesByCompanyId(companyId);

    const filter = user.find.mock.calls[0][0];

    expect(filter.role).toEqual({ $nin: [Role.CLIENT] });

    for (const role of [Role.EMPLOYEE, Role.OWNER, Role.MANAGER]) {
      expect(filter.role.$nin).not.toContain(role);
    }
  });

  it("ordena por nome, para um catálogo estável", async () => {
    const query = chainable();
    user.find.mockReturnValue(query);

    await UserRepository.findActiveEmployeesByCompanyId(companyId);

    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
  });

  it("devolve lista vazia quando a empresa não tem profissionais", async () => {
    user.find.mockReturnValue(chainable([]));

    await expect(
      UserRepository.findActiveEmployeesByCompanyId(companyId),
    ).resolves.toEqual([]);
  });
});

/**
 * ==========================================================
 * Garantias de soft-delete herdadas dos repositórios.
 *
 * As rotas públicas NÃO volta a filtrar `deletedAt`: validate-no
 * cada resolver com um segundo filtro duplicaria a base de dados
 * e criaria dois sítios para a mesma regra. O que se fixa aqui é
 * a dependência — os `findById` que os resolvers usam filtram
 * `deletedAt`, e é por isso que uma empresa, um serviço ou um
 * profissional eliminado chega ao serviço como `null` (404) e
 * nunca como um documento ativo (200).
 *
 * Se alguém alargar um destes `findById`, o catálogo público
 * passa a responder 200 a recursos eliminados, e esta é a linha
 * que avisa.
 * ==========================================================
 */
describe("Filtros de soft-delete dos findById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CompanyRepository.findById exclui empresas eliminadas", async () => {
    company.findOne.mockReturnValue(chainable([]));

    await CompanyRepository.findById(companyId);

    expect(company.findOne).toHaveBeenCalledWith({
      _id: companyId,
      deletedAt: null,
    });
  });

  it("ServiceRepository.findById exclui serviços eliminados", async () => {
    service.findOne.mockReturnValue(chainable([]));

    await ServiceRepository.findById(serviceId);

    expect(service.findOne).toHaveBeenCalledWith({
      _id: serviceId,
      deletedAt: null,
    });
  });

  it("UserRepository.findById exclui profissionais eliminados", async () => {
    user.findOne.mockReturnValue(chainable([]));

    await UserRepository.findById(employeeId);

    expect(user.findOne).toHaveBeenCalledWith({
      _id: employeeId,
      deletedAt: null,
    });
  });
});