/**
 * ==========================================================
 * Arquivo: UserController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições relacionadas aos usuários
 * e delegar as regras de negócio para o serviço.
 *
 * ==========================================================
 */

import { Request, Response } from "express";

import UserService from "../services/UserService";
import { ResponseHandler } from "../../../utils/response";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { AppError } from "../../../errors/AppError";
import { IMAGE_LIMITS } from "../../../providers/images/types";

class UserController {
  /**
   * ==========================================================
   * Lista todos os usuários.
   * ==========================================================
   */
  public async findAll(req: Request, res: Response) {
    const users = await UserService.findAll(req.user!.companyId);

    return ResponseHandler.success(res, users, HttpMessages.USERS_FOUND);
  }

  /**
   * ==========================================================
   * Busca um usuário pelo ID.
   * ==========================================================
   */
  public async findById(req: Request, res: Response) {
    const user = await UserService.findById(
      String(req.params.id),
      req.user!.companyId
    );

    return ResponseHandler.success(res, user, HttpMessages.USER_FOUND);
  }

  /**
   * ==========================================================
   * Cria um novo usuário.
   * ==========================================================
   */
  public async create(req: Request, res: Response) {
    const user = await UserService.create(
      req.body,
      req.user!.companyId,
      req.user!.role,
    );

    return ResponseHandler.success(
      res,
      user,
      HttpMessages.USER_CREATED,
      HttpStatus.CREATED,
    );
  }

  /**
   * ==========================================================
   * Atualiza um usuário.
   * ==========================================================
   */
  public async update(req: Request, res: Response) {
    const user = await UserService.update(
      String(req.params.id),
      req.body,
      req.user!.companyId,
      req.user!.userId,
      req.user!.role,
    );
    return ResponseHandler.success(res, user, HttpMessages.USER_UPDATED);
  }

  /**
   * ==========================================================
   * Remove um usuário.
   * ==========================================================
   */
  public async delete(req: Request, res: Response) {
    await UserService.delete(String(req.params.id), req.user!.companyId);
    return ResponseHandler.success(res, null, HttpMessages.USER_DEACTIVATED);
  }

  /**
   * ==========================================================
   * Ativa um utilizador.
   * ==========================================================
   */
  public async activate(req: Request, res: Response) {
    const user = await UserService.activate(
      String(req.params.id),
      req.user!.companyId
    );

    return ResponseHandler.success(res, user, HttpMessages.USER_ACTIVATED);
  }

  /**
   * ==========================================================
   * Desativa um utilizador.
   * ==========================================================
   */
  public async deactivate(req: Request, res: Response) {
    const user = await UserService.deactivate(
      String(req.params.id),
      req.user!.companyId
    );

    return ResponseHandler.success(res, user, HttpMessages.USER_DEACTIVATED);
  }

  /**
   * ==========================================================
   * Atualiza a senha de um usuário.
   * ==========================================================
   */
  public async changePassword(req: Request, res: Response): Promise<Response> {
    await UserService.changePassword(req.user!.userId, req.body);

    return ResponseHandler.success(res, null, HttpMessages.PASSWORD_CHANGED);
  }

  /**
   * ==========================================================
   * Envia ou substitui a foto de um funcionário.
   *
   * O ficheiro já chega em memória e já limitado a 5 MB
   * pelo `uploadSingleImage()`. A validação do formato real
   * (assinatura binária) é feita pelo `imageProvider`, que é
   * chamado exclusivamente pelo serviço.
   * ==========================================================
   */
  public async uploadPhoto(req: Request, res: Response) {
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

    const user = await UserService.updatePhoto(
      String(req.params.id),
      req.file,
      req.user!.companyId,
    );

    return ResponseHandler.success(
      res,
      user,
      HttpMessages.EMPLOYEE_PHOTO_UPDATED,
    );
  }

  /**
   * ==========================================================
   * Remove a foto de um funcionário.
   * ==========================================================
   */
  public async removePhoto(req: Request, res: Response) {
    const user = await UserService.removePhoto(
      String(req.params.id),
      req.user!.companyId,
    );

    return ResponseHandler.success(
      res,
      user,
      HttpMessages.EMPLOYEE_PHOTO_REMOVED,
    );
  }
}

export default new UserController();
