/**
 * ==========================================================
 * Arquivo: request-id.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Gerar um ID único para cada requisição.
 *
 * Utilizado para rastrear logs.
 *
 * ==========================================================
 */

import { Request, Response, NextFunction } from "express";

import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(
  req: Request,
  _res: Response,

  next: NextFunction
): void {
  req.requestId = uuidv4();
  next();
}
