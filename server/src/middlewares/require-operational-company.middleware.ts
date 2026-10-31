import { NextFunction, Request, Response } from "express";

import CompanyRepository from "../modules/companies/repositories/CompanyRepository";
import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

/**
 * Bloqueia módulos operacionais quando a empresa está desactivada.
 * O OWNER mantém acesso apenas às rotas de consulta/reativação da empresa
 * (essas rotas não montam este middleware).
 */
class RequireOperationalCompanyMiddleware {
  public requireOperationalCompany = async (
    req: Request,
    _: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const company = await CompanyRepository.findById(req.user.companyId);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (company.isActive) {
      next();
      return;
    }

    throw new AppError(
      HttpMessages.COMPANY_INACTIVE_OPERATION,
      HttpStatus.FORBIDDEN,
    );
  };
}

export default new RequireOperationalCompanyMiddleware();
