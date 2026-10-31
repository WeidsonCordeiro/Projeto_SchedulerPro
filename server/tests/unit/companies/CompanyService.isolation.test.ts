import { beforeEach, describe, expect, it, vi } from "vitest";

const { companyRepository, userRepository, lifecycleTx } = vi.hoisted(() => ({
  companyRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
  userRepository: {
    suspendActiveNonOwnerStaffForCompanyDeactivation: vi.fn(),
    restoreUsersSuspendedByCompanyDeactivation: vi.fn(),
  },
  lifecycleTx: {
    withCompanyLifecycleTransaction: vi.fn(),
  },
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({
  default: userRepository,
}));

vi.mock(
  "../../../src/modules/companies/services/company-lifecycle-transaction",
  () => ({
    withCompanyLifecycleTransaction: lifecycleTx.withCompanyLifecycleTransaction,
  }),
);

import CompanyService from "../../../src/modules/companies/services/CompanyService";
import { AppError } from "../../../src/errors/AppError";

const companyA = "507f1f77bcf86cd799439011";
const companyB = "507f1f77bcf86cd799439012";
const companyDocument = {
  _id: { toString: () => companyA },
  id: companyA,
  name: "Empresa A",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  lifecycleTx.withCompanyLifecycleTransaction.mockImplementation(
    async (operation: (session: object) => Promise<unknown>) => operation({}),
  );
  userRepository.suspendActiveNonOwnerStaffForCompanyDeactivation.mockResolvedValue(0);
  userRepository.restoreUsersSuspendedByCompanyDeactivation.mockResolvedValue(0);
  companyRepository.findById.mockResolvedValue(companyDocument);
  companyRepository.findAll.mockResolvedValue([companyDocument]);
  companyRepository.update.mockResolvedValue(companyDocument);
  companyRepository.activate.mockResolvedValue(companyDocument);
  companyRepository.deactivate.mockResolvedValue({ ...companyDocument, isActive: false });
});

describe("CompanyService - isolamento multiempresa", () => {
  it("permite acessar a própria empresa", async () => {
    await expect(CompanyService.findById(companyA, companyA)).resolves.toMatchObject({ id: companyA });
    expect(companyRepository.findById).toHaveBeenCalledWith(companyA);
  });

  it("não permite acessar empresa de outro tenant", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.findById(companyB, companyA)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it("permite atualizar a própria empresa", async () => {
    await expect(CompanyService.update(companyA, { name: "Atualizada" }, companyA)).resolves.toBeTruthy();
    expect(companyRepository.update).toHaveBeenCalledWith(companyA, { name: "Atualizada" });
  });

  it("não permite atualizar empresa de outro tenant", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.update(companyB, { name: "Alterada" }, companyA)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.update).not.toHaveBeenCalled();
  });

  it("permite remover a própria empresa", async () => {
    await expect(CompanyService.delete(companyA, companyA)).resolves.toBeUndefined();
    expect(companyRepository.softDelete).toHaveBeenCalledWith(companyA);
  });

  it("não permite remover empresa de outro tenant", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.delete(companyB, companyA)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.softDelete).not.toHaveBeenCalled();
  });

  it("permite ativar a própria empresa", async () => {
    companyRepository.findById.mockResolvedValue({ ...companyDocument, isActive: false });
    await expect(CompanyService.activate(companyA, companyA)).resolves.toBeTruthy();
    expect(lifecycleTx.withCompanyLifecycleTransaction).toHaveBeenCalled();
    expect(companyRepository.activate).toHaveBeenCalledWith(companyA, expect.anything());
  });

  it("não permite ativar empresa de outro tenant", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.activate(companyB, companyA)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.activate).not.toHaveBeenCalled();
  });

  it("permite desativar a própria empresa", async () => {
    await expect(CompanyService.deactivate(companyA, companyA)).resolves.toBeTruthy();
    expect(lifecycleTx.withCompanyLifecycleTransaction).toHaveBeenCalled();
    expect(companyRepository.deactivate).toHaveBeenCalledWith(companyA, expect.anything());
  });

  it("não permite desativar empresa de outro tenant", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.deactivate(companyB, companyA)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.deactivate).not.toHaveBeenCalled();
  });

  it("findAll consulta e retorna somente o tenant autenticado", async () => {
    await expect(CompanyService.findAll(companyA)).resolves.toHaveLength(1);
    expect(companyRepository.findAll).toHaveBeenCalledWith(companyA);
  });
});
