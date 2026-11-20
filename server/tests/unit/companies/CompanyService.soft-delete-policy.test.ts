import { beforeEach, describe, expect, it, vi } from "vitest";

const { companyRepository, appointmentRepository, lifecycleTx } = vi.hoisted(() => ({
  companyRepository: {
    findById: vi.fn(),
    touchBookingSerialization: vi.fn(),
    softDelete: vi.fn(),
  },
  appointmentRepository: {
    hasOpenAppointmentsForCompany: vi.fn(),
  },
  lifecycleTx: {
    withCompanyLifecycleTransaction: vi.fn(),
  },
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

vi.mock("../../../src/modules/appointments/repositories/AppointmentRepository", () => ({
  default: appointmentRepository,
}));

vi.mock(
  "../../../src/modules/companies/services/company-lifecycle-transaction",
  () => ({
    withCompanyLifecycleTransaction: lifecycleTx.withCompanyLifecycleTransaction,
  }),
);

import CompanyService from "../../../src/modules/companies/services/CompanyService";
import { AppError } from "../../../src/errors/AppError";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const otherCompanyId = "507f1f77bcf86cd799439012";

const activeCompany = {
  _id: { toString: () => companyId },
  id: companyId,
  name: "Empresa",
  timezone: "Europe/Lisbon",
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const closedCompany = { ...activeCompany, isActive: false, deletedAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  lifecycleTx.withCompanyLifecycleTransaction.mockImplementation(
    async (operation: (session: object) => Promise<unknown>) => operation({}),
  );
  companyRepository.findById.mockResolvedValue(activeCompany);
  companyRepository.touchBookingSerialization.mockResolvedValue(activeCompany);
  appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(false);
  companyRepository.softDelete.mockResolvedValue(closedCompany);
});

async function expectDeleteConflict(): Promise<void> {
  await expect(CompanyService.delete(companyId, companyId)).rejects.toMatchObject({
    statusCode: HttpStatus.CONFLICT,
    message: HttpMessages.COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS,
    code: "COMPANY_DELETE_BLOCKED_OPEN_APPOINTMENTS",
  });
  expect(companyRepository.softDelete).not.toHaveBeenCalled();
}

describe("CompanyService.delete — política soft delete (B2)", () => {
  it.each([
    ["SCHEDULED futuro bloqueia", true],
    ["CONFIRMED futuro bloqueia", true],
  ])("%s", async (_label, hasOpen) => {
    appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(hasOpen);
    await expectDeleteConflict();
    expect(appointmentRepository.hasOpenAppointmentsForCompany).toHaveBeenCalledWith(
      companyId,
      expect.any(Date),
      expect.objectContaining({ session: expect.anything() }),
    );
  });

  it.each([
    ["sem appointments abertos", false],
    ["apenas histórico (mock false)", false],
  ])("permite delete quando %s", async (_label, hasOpen) => {
    appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(hasOpen);
    await expect(CompanyService.delete(companyId, companyId)).resolves.toBeUndefined();
    expect(companyRepository.softDelete).toHaveBeenCalledWith(
      companyId,
      expect.anything(),
    );
  });

  it("409 não invoca softDelete", async () => {
    appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(true);
    await expectDeleteConflict();
  });

  it("empresa inactiva pode ser eliminada quando não há appointments abertos", async () => {
    companyRepository.findById.mockResolvedValue({ ...activeCompany, isActive: false });
    await CompanyService.delete(companyId, companyId);
    expect(companyRepository.softDelete).toHaveBeenCalled();
  });

  it("cross-tenant continua 404 sem softDelete", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.delete(otherCompanyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });
    expect(appointmentRepository.hasOpenAppointmentsForCompany).not.toHaveBeenCalled();
    expect(companyRepository.softDelete).not.toHaveBeenCalled();
  });

  it("segunda tentativa: empresa já soft-deleted → 404 antes da transação", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.delete(companyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });
    expect(lifecycleTx.withCompanyLifecycleTransaction).not.toHaveBeenCalled();
    expect(companyRepository.softDelete).not.toHaveBeenCalled();
  });

  it("softDelete concorrente retorna null → 404 dentro da transação", async () => {
    companyRepository.softDelete.mockResolvedValue(null);
    await expect(CompanyService.delete(companyId, companyId)).rejects.toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  it("consulta appointments só para o companyId do delete", async () => {
    await CompanyService.delete(companyId, companyId);
    expect(appointmentRepository.hasOpenAppointmentsForCompany).toHaveBeenCalledWith(
      companyId,
      expect.any(Date),
      expect.any(Object),
    );
    const firstArg =
      appointmentRepository.hasOpenAppointmentsForCompany.mock.calls[0]?.[0];
    expect(firstArg).toBe(companyId);
    expect(firstArg).not.toBe(otherCompanyId);
  });

  it("usa transação de lifecycle no delete", async () => {
    await CompanyService.delete(companyId, companyId);
    expect(lifecycleTx.withCompanyLifecycleTransaction).toHaveBeenCalledTimes(1);
  });

  it("propaga AppError de conflito sem envolver", async () => {
    appointmentRepository.hasOpenAppointmentsForCompany.mockResolvedValue(true);
    try {
      await CompanyService.delete(companyId, companyId);
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
    }
  });

  it("hasOpen consultado após ensureTenant e findById", async () => {
    const callOrder: string[] = [];
    companyRepository.touchBookingSerialization.mockImplementation(async () => {
      callOrder.push("touch");
      return activeCompany;
    });
    appointmentRepository.hasOpenAppointmentsForCompany.mockImplementation(
      async (_id, _now, options) => {
        callOrder.push(options?.session ? "hasOpenSession" : "hasOpenCommitted");
        return false;
      },
    );
    companyRepository.softDelete.mockImplementation(async () => {
      callOrder.push("softDelete");
      return closedCompany;
    });

    await CompanyService.delete(companyId, companyId);
    expect(callOrder).toEqual([
      "touch",
      "hasOpenSession",
      "touch",
      "hasOpenSession",
      "hasOpenCommitted",
      "hasOpenCommitted",
      "softDelete",
    ]);
  });

  it("referência temporal consistente em cada tentativa do delete", async () => {
    await CompanyService.delete(companyId, companyId);
    const nowArgs = appointmentRepository.hasOpenAppointmentsForCompany.mock.calls.map(
      (call) => call[1] as Date,
    );
    expect(nowArgs.length).toBeGreaterThanOrEqual(2);
    const firstInstant = nowArgs[0]!.getTime();
    for (const nowArg of nowArgs) {
      expect(nowArg).toBeInstanceOf(Date);
      expect(nowArg.getTime()).toBe(firstInstant);
    }
  });

  it("não chama softDelete quando ensureTenant falha", async () => {
    await expect(
      CompanyService.delete(otherCompanyId, companyId),
    ).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.findById).not.toHaveBeenCalled();
    expect(companyRepository.softDelete).not.toHaveBeenCalled();
  });
});