/**
 * ==========================================================
 * Arquivo: error.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Capturar qualquer erro da aplicação.
 *
 * Existem dois tipos de erro:
 *
 * 1) Erros conhecidos (AppError)
 *
 * 2) Erros inesperados (500)
 *
 * ==========================================================
 */

import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ResponseHandler } from "../utils/response";
import { logger } from "../config/logger";
import { HttpStatus } from "../constants/http-status";
import { http } from "winston";

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  /**
   * Log completo da requisição.
   */
  logger.error({
    message: error.message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: error.stack,
  });

  /**
   * Erros conhecidos.
   */
  if (error instanceof AppError) {
    return ResponseHandler.error(
      res,
      error.message,
      error.statusCode,
      error.errors
    );
  }

  /**
   * Erros inesperados.
   */
  return ResponseHandler.error(
    res,
    "Erro interno do servidor.",
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
