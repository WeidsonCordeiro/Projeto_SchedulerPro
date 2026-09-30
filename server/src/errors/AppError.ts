/**
 * ==========================================================
 * Arquivo: AppError.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar erros conhecidos da aplicação.
 *
 * Esses erros são capturados pelo
 * error.middleware.ts.
 * ==========================================================
 */

import { HttpStatus } from "../constants/http-status";
import { ValidationError } from "../types/api.types";

export class AppError extends Error {
  /**
   * Código HTTP.
   */
  public readonly statusCode: number;

  /**
   * Lista de erros de validação.
   */
  public readonly errors?: ValidationError[];

  /**
   * Código de erro de domínio opcional.
   */
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    errors?: ValidationError[],
    code?: string
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}
