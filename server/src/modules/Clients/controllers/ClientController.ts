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
import { AppError } from "../../../errors/AppError";
import { IMAGE_LIMITS } from "../../../providers/images/types";

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

  /**
   * ==========================================================
   * Perfil do cliente autenticado no portal.
   * ==========================================================
   */
  public findMe = async (req: Request, res: Response): Promise<Response> => {
    const companyId = req.user!.companyId;
    const clientId = req.user!.clientId;

    if (!clientId) {
      return ResponseHandler.success(
        res,
        null,
        HttpMessages.CLIENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const client = await this.clientService.findMe(clientId, companyId);

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_PROFILE_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * Envia ou substitui a foto de um cliente.
   *
   * O ficheiro já chega em memória e já limitado a 5 MB
   * pelo `uploadSingleImage()`. A validação do formato real
   * (assinatura binária) é feita pelo `imageProvider`, que é
   * chamado exclusivamente pelo serviço.
   * ==========================================================
   */
  public uploadPhoto = async (req: Request, res: Response) => {
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

    const client = await this.clientService.updatePhoto(
      String(req.params.id),
      req.file,
      req.user!.companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_PHOTO_UPDATED,
    );
  }

  /**
   * ==========================================================
   * Remove a foto de um cliente.
   * ==========================================================
   */
  public removePhoto = async (req: Request, res: Response) => {
    const client = await this.clientService.removePhoto(
      String(req.params.id),
      req.user!.companyId,
    );

    return ResponseHandler.success(
      res,
      client,
      HttpMessages.CLIENT_PHOTO_REMOVED,
    );
  }
}

export default new ClientController();
