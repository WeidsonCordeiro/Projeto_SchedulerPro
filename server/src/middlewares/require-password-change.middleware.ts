/**
 * ==========================================================
 * Arquivo: password-change.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Impedir que um utilizador utilize as funcionalidades
 * do sistema enquanto existir uma alteração de senha
 * obrigatória.
 *
 * O utilizador deve conseguir acessar a rota de alteração
 * da própria senha para concluir o primeiro acesso.
 *
 * ==========================================================
 */

import { NextFunction, Request, Response } from "express";

import UserRepository from "../modules/users/repositories/UserRepository";
import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

class PasswordChangeMiddleware {
  private readonly userRepository = UserRepository;

  public requirePasswordChangeCompleted = async (
    req: Request,
    _: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userRepository.findByIdForAccessControl(
      req.user.userId,
    );

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.mustChangePassword) {
      throw new AppError(
        HttpMessages.PASSWORD_CHANGE_REQUIRED,
        HttpStatus.FORBIDDEN,
      );
    }

    next();
  };
}

export default new PasswordChangeMiddleware();
