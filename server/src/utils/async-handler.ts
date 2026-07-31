/**
 * ==========================================================
 * Arquivo: async-handler.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Eliminar a necessidade de utilizar
 * try/catch em todos os Controllers.
 *
 * Toda exceção lançada será encaminhada
 * automaticamente para o Error Middleware.
 *
 * Exemplo:
 *
 * router.post(
 *     "/login",
 *     asyncHandler(AuthController.login)
 * );
 *
 * ==========================================================
 */

import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Tipo esperado para Controllers assíncronos.
 */
type AsyncHandlerFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wrapper para funções assíncronas.
 */
export function asyncHandler(fn: AsyncHandlerFunction): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
