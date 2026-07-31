/**
 * ==========================================================
 * Arquivo: validateRequest.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos pelos Validators utilizando
 * o express-validator.
 *
 * Caso existam erros de validação, interrompe a requisição
 * lançando um AppError.
 *
 * Nenhuma regra de negócio deve existir neste middleware.
 *
 * ==========================================================
 */

import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { HttpStatus } from "../constants/http-status";

export function validateRequest(
  req: Request,
  _: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, HttpStatus.BAD_REQUEST);
  }

  next();
}
