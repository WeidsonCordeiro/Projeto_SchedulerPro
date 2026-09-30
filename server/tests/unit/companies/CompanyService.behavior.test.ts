import { beforeEach, describe, expect, it, vi } from "vitest";

const { companyRepository } = vi.hoisted(() => ({
  companyRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));

import CompanyService from "../../../src/modules/companies/services/CompanyService";
import { AppError } from "../../../src/errors/AppError";
import { HttpStatus } from "../../../src/constants/http-status";

const id = "507f1f77bcf86cd799439011";
const company = {
  _id: { toString: () => id },
  id,
  name: "Empresa",
  timezone: "Europe/Lisbon",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  companyRepository.findById.mockResolvedValue(company);
  companyRepository.update.mockResolvedValue(company);
  companyRepository.activate.mockResolvedValue(company);
  companyRepository.deactivate.mockResolvedValue({ ...company, isActive: false });
});

describe("CompanyService", () => {
  it("rejeita timezone inválido antes de consultar ou atualizar", async () => {
    await expect(CompanyService.update(id, { timezone: "Not/A_Timezone" }, id))
      .rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
    expect(companyRepository.findById).not.toHaveBeenCalled();
    expect(companyRepository.update).not.toHaveBeenCalled();
  });

  it("retorna não encontrado quando a empresa não existe ou está soft-deleted", async () => {
    companyRepository.findById.mockResolvedValue(null);
    await expect(CompanyService.findById(id, id)).rejects.toBeInstanceOf(AppError);
    await expect(CompanyService.update(id, { name: "Nova" }, id)).rejects.toBeInstanceOf(AppError);
    await expect(CompanyService.delete(id, id)).rejects.toBeInstanceOf(AppError);
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(companyRepository.softDelete).not.toHaveBeenCalled();
  });

  it("não acessa outro tenant e rejeita id inválido", async () => {
    await expect(CompanyService.findById(id, "507f1f77bcf86cd799439012"))
      .rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
    await expect(CompanyService.findById("not-an-id", "not-an-id"))
      .rejects.toBeInstanceOf(AppError);
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it("atualiza, ativa, desativa e remove somente a própria empresa", async () => {
    await CompanyService.update(id, { timezone: "UTC" }, id);
    await CompanyService.activate(id, id);
    await CompanyService.deactivate(id, id);
    await CompanyService.delete(id, id);
    expect(companyRepository.update).toHaveBeenCalledWith(id, { timezone: "UTC" });
    expect(companyRepository.activate).toHaveBeenCalledWith(id);
    expect(companyRepository.deactivate).toHaveBeenCalledWith(id);
    expect(companyRepository.softDelete).toHaveBeenCalledWith(id);
  });
});
