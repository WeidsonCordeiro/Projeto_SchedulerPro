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
    const user = await UserService.create(req.body, req.user!.companyId);

    return ResponseHandler.success(res, user, HttpMessages.USER_CREATED);
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
      req.user!.companyId
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
    return ResponseHandler.success(res, null, HttpMessages.USER_REMOVED);
  }
}

export default new UserController();
