/**
 * ==========================================================
 * Arquivo: response.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Padronizar todas as respostas da API.
 *
 * Controllers nunca devem montar JSON manualmente.
 * ==========================================================
 */

import { Response } from "express";
import { ApiResponse, ValidationError } from "../types/api.types";
import { HttpStatus } from "../constants/http-status";
import { HttpMessages } from "../constants/http-messages";

export class ResponseHandler {
  /**
   * Resposta de sucesso.
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = HttpMessages.SUCCESS,
    statusCode: number = HttpStatus.OK
  ) {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Resposta de erro.
   */
  static error(
    res: Response,
    message: string = "Erro.",
    statusCode: number = HttpStatus.BAD_REQUEST,
    errors?: ValidationError[]
  ) {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    };

    return res.status(statusCode).json(response);
  }
}
