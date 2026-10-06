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
import { HttpMessages } from "../constants/http-messages";
import { redactPublicAppointmentToken } from "../utils/redact-public-appointment-token";

/**
 * ==========================================================
 * Detecta JSON malformado.
 *
 * O `express.json()` encaminha a falha com
 * `type: "entity.parse.failed"`. Sem este tratamento, um corpo
 * inválido devolvia 500 — num endpoint público isso transformaria
 * um erro do cliente numa falha do servidor.
 * ==========================================================
 */
function isMalformedJson(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    (error as SyntaxError & { type?: string }).type === "entity.parse.failed"
  );
}

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response | void {
  /**
   * Log completo da requisição.
   */
  logger.error({
    message: redactPublicAppointmentToken(error.message),
    method: req.method,
    url: redactPublicAppointmentToken(req.originalUrl),
    ip: req.ip,
    stack: error.stack
      ? redactPublicAppointmentToken(error.stack)
      : undefined,
  });

  /**
   * Erros conhecidos.
   */
  if (error instanceof AppError) {
    return ResponseHandler.error(
      res,
      error.message,
      error.statusCode,
      error.errors,
      error.code
    );
  }

  /**
   * Corpo JSON inválido: erro do cliente, não do servidor.
   */
  if (isMalformedJson(error)) {
    return ResponseHandler.error(
      res,
      HttpMessages.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST
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
