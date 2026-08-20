/**
 * ==========================================================
 * Arquivo: ClientController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Controlar as requisições HTTP relacionadas aos clientes.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Request, Response } from "express";
import ClientService from "../services/ClientService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

class ClientController {
  private readonly clientService = ClientService;
  /**
   * ==========================================================
   * Cria um novo cliente.
   * ==========================================================
   */
  public create = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const client = await this.clientService.create(req.body, companyId);

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_CREATED,
      HttpStatus.CREATED,
    );
  };

  /**
   * ==========================================================
   * Lista todos os clientes da empresa.
   * ==========================================================
   */
  public findAll = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const clients = await this.clientService.findAll(companyId);

    return ResponseHandler.success(
      res,
      clients,
      HttpMessages.CLIENTS_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Busca um cliente pelo ID.
   * ==========================================================
   */
  public findById = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const client = await this.clientService.findById(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Atualiza um cliente.
   * ==========================================================
   */
  public update = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const client = await this.clientService.update(
      req.params.id as string,
      req.body,
      companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_UPDATED,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Remove um cliente.
   *
   * Utiliza soft delete.
   * ==========================================================
   */
  public delete = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    await this.clientService.delete(req.params.id as string, companyId);

    return ResponseHandler.success(
      res,
      null,
      HttpMessages.CLIENT_DELETED,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Ativa um cliente.
   * ==========================================================
   */
  public activate = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;

    const client = await this.clientService.activate(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_ACTIVATED,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Desativa um cliente.
   * ==========================================================
   */
  public deactivate = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const companyId = req.user!.companyId;

    const client = await this.clientService.deactivate(
      req.params.id as string,
      companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_DEACTIVATED,
      HttpStatus.OK,
    );
  };
}

export default new ClientController();
