/**
 * ==========================================================
 * Arquivo: ServiceController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições HTTP relacionadas aos serviços
 * e encaminhá-las para o ServiceService.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Request, Response } from "express";

import ServiceService from "../services/ServiceService";
import { ResponseHandler } from "../../../utils/response";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";

class ServiceController {
  private readonly serviceService = ServiceService;

  /**
   * ==========================================================
   * Cria um novo serviço.
   * ==========================================================
   */
  public create = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const service = await this.serviceService.create(req.body, companyId);

    return ResponseHandler.success(
      res,
      service,
      HttpMessages.SERVICE_CREATED,
      HttpStatus.CREATED,
    );
  };

  /**
   * ==========================================================
   * Lista todos os serviços da empresa.
   * ==========================================================
   */
  public findAll = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const services = await this.serviceService.findAll(companyId);

    return ResponseHandler.success(res, services, HttpMessages.SERVICES_FOUND);
  };

  /**
   * ==========================================================
   * Procura um serviço pelo ID.
   * ==========================================================
   */
  public findById = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const service = await this.serviceService.findById(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(res, service, HttpMessages.SERVICE_FOUND);
  };

  /**
   * ==========================================================
   * Atualiza um serviço.
   * ==========================================================
   */
  public update = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const service = await this.serviceService.update(
      req.params.id as string,
      req.body,
      companyId,
    );

    return ResponseHandler.success(res, service, HttpMessages.SERVICE_UPDATED);
  };

  /**
   * ==========================================================
   * Remove um serviço.
   * ==========================================================
   */
  public delete = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    await this.serviceService.delete(req.params.id as string, companyId);

    return ResponseHandler.success(res, null, HttpMessages.SERVICE_REMOVED);
  };

  /**
   * ==========================================================
   * Ativa um serviço.
   * ==========================================================
   */
  public activate = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const service = await this.serviceService.activate(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      service,
      HttpMessages.SERVICE_ACTIVATED,
    );
  };

  /**
   * ==========================================================
   * Desativa um serviço.
   * ==========================================================
   */
  public deactivate = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const companyId = req.user!.companyId;

    const service = await this.serviceService.deactivate(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      service,
      HttpMessages.SERVICE_DEACTIVATED,
    );
  };
}

export default new ServiceController();
