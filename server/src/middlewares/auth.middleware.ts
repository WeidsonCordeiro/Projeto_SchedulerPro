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
import { AppError } from "../errors/AppError";
import { HttpMessages } from "../constants/http-messages";
import { HttpStatus } from "../constants/http-status";

class AuthMiddleware {
  private readonly jwtProvider = JwtProvider;

  public authenticate = (
    req: Request,
    _: Response,
    next: NextFunction
  ): void => {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError(HttpMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const payload = this.jwtProvider.verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
    };

    next();
  };
}

export default new AuthMiddleware();
