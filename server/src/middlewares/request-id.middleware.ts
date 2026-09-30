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

import { randomUUID } from "node:crypto";

export function requestIdMiddleware(
  req: Request,
  _res: Response,

  next: NextFunction
): void {
  req.requestId = randomUUID();
  next();
}
