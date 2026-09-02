/**
 * ==========================================================
 * Arquivo: CompanyController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições relacionadas às empresas
 * e delegar as regras de negócio para o serviço.
 *
 * ==========================================================
 */

import { Request, Response } from "express";

import CompanyService from "../services/CompanyService";
import { ResponseHandler } from "../../../utils/response";
import { HttpMessages } from "../../../constants/http-messages";

class CompanyController {
  /**
   * ==========================================================
   * Lista todas as empresas.
   * ==========================================================
   */
  public async findAll(req: Request, res: Response) {
    const companies = await CompanyService.findAll(req.user!.companyId);

    return ResponseHandler.success(
      res,
      companies,
      HttpMessages.COMPANIES_FOUND
    );
  }

  /**
   * ==========================================================
   * Procura uma empresa pelo ID.
   * ==========================================================
   */
  public async findById(req: Request, res: Response) {
    const company = await CompanyService.findById(String(req.params.id), req.user!.companyId);

    return ResponseHandler.success(res, company, HttpMessages.COMPANY_FOUND);
  }

  /**
   * ==========================================================
   * Atualiza uma empresa.
   * ==========================================================
   */
  public async update(req: Request, res: Response) {
    const company = await CompanyService.update(
      String(req.params.id),
      req.body,
      req.user!.companyId,
    );

    return ResponseHandler.success(res, company, HttpMessages.COMPANY_UPDATED);
  }

  /**
   * ==========================================================
   * Remove uma empresa.
   * ==========================================================
   */
  public async delete(req: Request, res: Response) {
    await CompanyService.delete(String(req.params.id), req.user!.companyId);

    return ResponseHandler.success(res, null, HttpMessages.COMPANY_REMOVED);
  }

  /**
   * ==========================================================
   * Ativa uma empresa.
   * ==========================================================
   */
  public async activate(req: Request, res: Response) {
    const company = await CompanyService.activate(String(req.params.id), req.user!.companyId);

    return ResponseHandler.success(
      res,
      company,
      HttpMessages.COMPANY_ACTIVATED
    );
  }

  /**
   * ==========================================================
   * Desativa uma empresa.
   * ==========================================================
   */
  public async deactivate(req: Request, res: Response) {
    const company = await CompanyService.deactivate(String(req.params.id), req.user!.companyId);

    return ResponseHandler.success(
      res,
      company,
      HttpMessages.COMPANY_DEACTIVATED
    );
  }
}

export default new CompanyController();
