/**
 * ==========================================================
 * Arquivo: auth.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar o Access Token enviado pelo cliente.
 *
 * Caso seja válido:
 *
 * • decodifica o JWT
 * • adiciona req.user
 * • permite continuar
 *
 * Caso contrário:
 *
 * • lança AppError
 *
 * ==========================================================
 */

import { NextFunction, Request, Response } from "express";

import JwtProvider from "../providers/security/JwtProvider";
import UserRepository from "../modules/users/repositories/UserRepository";
import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";
import { TokenType } from "../constants/token-type";

class AuthMiddleware {
  private readonly jwtProvider = JwtProvider;

  public authenticate = async (
    req: Request,
    _: Response,
    next: NextFunction
  ): Promise<void> => {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const payload = this.jwtProvider.verifyAccessToken(token);

    if (payload.type !== TokenType.ACCESS || !payload.userId) {
      throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }

    const user = await UserRepository.findByIdForAccessControl(payload.userId);

    if (!user) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError(HttpMessages.USER_DISABLED, HttpStatus.FORBIDDEN);
    }

    if (user.lockUntil != null && user.lockUntil.getTime() > Date.now()) {
      throw new AppError(HttpMessages.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }

    req.user = {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      role: user.role,
    };

    next();
  };
}

export default new AuthMiddleware();
