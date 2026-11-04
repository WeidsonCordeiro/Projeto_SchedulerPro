import { beforeEach, describe, expect, it, vi } from "vitest";

const { companyRepository, userRepository, lifecycleTx } = vi.hoisted(() => ({
  companyRepository: {
    findById: vi.fn(),
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

const companyId = "507f1f77bcf86cd799439011";
const activeCompany = {
  _id: { toString: () => companyId },
  id: companyId,
  name: "empresa",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const inactiveCompany = { ...activeCompany, isActive: false };

beforeEach(() => {
  vi.clearAllMocks();
  lifecycleTx.withCompanyLifecycleTransaction.mockImplementation(
    async (operation: (session: object) => Promise<unknown>) =>
      operation({}),
  );
  companyRepository.findById.mockResolvedValue(activeCompany);
  companyRepository.deactivate.mockResolvedValue(inactiveCompany);
  companyRepository.activate.mockResolvedValue(activeCompany);
  userRepository.suspendActiveNonOwnerStaffForCompanyDeactivation.mockResolvedValue(3);
  userRepository.restoreUsersSuspendedByCompanyDeactivation.mockResolvedValue(3);
});

describe("CompanyService — lifecycle empresa", () => {
  it("desactiva empresa e suspende staff numa transacção", async () => {
    const result = await CompanyService.deactivate(companyId, companyId);
    expect(result.isActive).toBe(false);
    expect(lifecycleTx.withCompanyLifecycleTransaction).toHaveBeenCalledTimes(1);
    expect(userRepository.suspendActiveNonOwnerStaffForCompanyDeactivation).toHaveBeenCalled();
  });

  it("desactivação idempotente reconcilia staff se empresa já inactiva", async () => {
    companyRepository.findById.mockResolvedValue(inactiveCompany);
    await CompanyService.deactivate(companyId, companyId);
    expect(lifecycleTx.withCompanyLifecycleTransaction).toHaveBeenCalledTimes(1);
    expect(companyRepository.deactivate).not.toHaveBeenCalled();
    expect(userRepository.suspendActiveNonOwnerStaffForCompanyDeactivation).toHaveBeenCalled();
  });

  it("reactiva empresa e restaura suspensos", async () => {
    companyRepository.findById.mockResolvedValue(inactiveCompany);
    await CompanyService.activate(companyId, companyId);
    expect(userRepository.restoreUsersSuspendedByCompanyDeactivation).toHaveBeenCalled();
  });

  it("reactivação idempotente executa restore mesmo se empresa já activa", async () => {
    companyRepository.findById.mockResolvedValue(activeCompany);
    await CompanyService.activate(companyId, companyId);
    expect(companyRepository.activate).not.toHaveBeenCalled();
    expect(userRepository.restoreUsersSuspendedByCompanyDeactivation).toHaveBeenCalled();
  });
});
