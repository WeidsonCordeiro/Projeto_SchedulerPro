import { beforeEach, describe, expect, it, vi } from "vitest";

const { companyRepository } = vi.hoisted(() => ({
  companyRepository: { findById: vi.fn() },
}));

vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));

import RequireOperationalCompanyMiddleware from "../../../src/middlewares/require-operational-company.middleware";
import { AppError } from "../../../src/errors/AppError";
import { HttpMessages } from "../../../src/constants/http-messages";

describe("RequireOperationalCompanyMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita pedido sem utilizador autenticado", async () => {
    const next = vi.fn();
    await expect(
      RequireOperationalCompanyMiddleware.requireOperationalCompany(
        {} as never,
        {} as never,
        next,
      ),
    ).rejects.toBeInstanceOf(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("continua quando a empresa está activa", async () => {
    companyRepository.findById.mockResolvedValue({ isActive: true });
    const next = vi.fn();
    const req = { user: { companyId: "507f1f77bcf86cd799439011" } } as never;
    await RequireOperationalCompanyMiddleware.requireOperationalCompany(
      req,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("bloqueia operações quando a empresa está desactivada", async () => {
    companyRepository.findById.mockResolvedValue({ isActive: false });
    const next = vi.fn();
    const req = { user: { companyId: "507f1f77bcf86cd799439011" } } as never;
    await expect(
      RequireOperationalCompanyMiddleware.requireOperationalCompany(
        req,
        {} as never,
        next,
      ),
    ).rejects.toMatchObject({
      message: HttpMessages.COMPANY_INACTIVE_OPERATION,
      statusCode: 403,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
