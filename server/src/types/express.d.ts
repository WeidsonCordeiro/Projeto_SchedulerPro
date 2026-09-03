/**
 * ==========================================================
 * Arquivo: express.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Estender o objeto Request do Express adicionando
 * as informações do usuário autenticado.
 *
 * O AuthMiddleware será responsável por preencher
 * req.user após validar o JWT.
 *
 * ==========================================================
 */

import { Role } from "../constants/roles";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId: string;
        role: Role;
      };
      requestId?: string;
    }
  }
}

export {};
