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
import { HttpStatus } from "../../../constants/http-status";
import { AppError } from "../../../errors/AppError";
import { IMAGE_LIMITS } from "../../../providers/images/types";

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

  /**
   * ==========================================================
   * Envia ou substitui a logo de uma empresa.
   *
   * O ficheiro já chega em memória e já limitado a 5 MB
   * pelo `uploadSingleImage()`. A validação do formato real
   * (assinatura binária) é feita pelo `imageProvider`, que é
   * chamado exclusivamente pelo serviço.
   *
   * A empresa é a própria entidade autenticada: o tenant é
   * garantido no serviço comparando o `:id` com o `companyId`
   * do token.
   * ==========================================================
   */
  public async uploadLogo(req: Request, res: Response) {
    if (!req.file) {
      /**
       * Rede de segurança: o middleware aceita pedidos sem
       * ficheiro para que a mensagem de erro seja sempre a
       * mesma. A validação definitiva é a do provider.
       */
      throw new AppError(
        HttpMessages.IMAGE_FILE_REQUIRED,
        HttpStatus.BAD_REQUEST,
        [{ field: IMAGE_LIMITS.FIELD, message: HttpMessages.IMAGE_FILE_REQUIRED }],
      );
    }

    const company = await CompanyService.updateLogo(
      String(req.params.id),
      req.file,
      req.user!.companyId,
    );

    return ResponseHandler.success(res, company, HttpMessages.COMPANY_LOGO_UPDATED);
  }

  /**
   * ==========================================================
   * Remove a logo de uma empresa.
   * ==========================================================
   */
  public async removeLogo(req: Request, res: Response) {
    const company = await CompanyService.removeLogo(
      String(req.params.id),
      req.user!.companyId,
    );

    return ResponseHandler.success(res, company, HttpMessages.COMPANY_LOGO_REMOVED);
  }
}

export default new CompanyController();
