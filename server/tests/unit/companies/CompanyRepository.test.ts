import { beforeEach, describe, expect, it, vi } from "vitest";

const { company } = vi.hoisted(() => ({
  company: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../../src/modules/companies/models/Company.model", () => ({ default: company }));

import CompanyRepository from "../../../src/modules/companies/repositories/CompanyRepository";

const id = "507f1f77bcf86cd799439011";
const activeFilter = { _id: id, deletedAt: null };

describe("CompanyRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findById filtra pelo id e por deletedAt nulo", async () => {
    company.findOne.mockResolvedValue(null);
    await expect(CompanyRepository.findById(id)).resolves.toBeNull();
    expect(company.findOne).toHaveBeenCalledWith(activeFilter);
  });

  it("findAll limita a consulta à empresa ativa informada", async () => {
    company.find.mockResolvedValue([]);
    await CompanyRepository.findAll(id);
    expect(company.find).toHaveBeenCalledWith(activeFilter);
  });

  it("update aplica o filtro de empresa ativa e validadores", async () => {
    company.findOneAndUpdate.mockResolvedValue({});
    await CompanyRepository.update(id, { name: "Atualizada" });
    expect(company.findOneAndUpdate).toHaveBeenCalledWith(
      activeFilter,
      { name: "Atualizada" },
      { new: true, runValidators: true },
    );
  });

  it.each([
    ["activate", () => CompanyRepository.activate(id), { isActive: true }],
    ["deactivate", () => CompanyRepository.deactivate(id), { isActive: false }],
  ])("%s preserva o filtro de empresa ativa", async (_name, operation, update) => {
    company.findOneAndUpdate.mockResolvedValue({});
    await operation();
    expect(company.findOneAndUpdate).toHaveBeenCalledWith(
      activeFilter,
      update,
      { new: true },
    );
  });

  it("softDelete filtra a empresa ativa e grava deletedAt", async () => {
    await CompanyRepository.softDelete(id);
    const [filter, update] = company.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(activeFilter);
    expect(update.deletedAt).toBeInstanceOf(Date);
  });
});
