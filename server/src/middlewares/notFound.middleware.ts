/**
 * ==========================================================
 * Arquivo: notFound.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Capturar qualquer rota inexistente.
 *
 * Este middleware deve ser registrado
 * após todas as rotas.
 *
 * ==========================================================
 */

import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { HttpStatus } from "../constants/http-status";

export function notFoundMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(
    new AppError(
      `Rota ${req.method} ${req.originalUrl} não encontrada.`,
      HttpStatus.NOT_FOUND
    )
  );
}
