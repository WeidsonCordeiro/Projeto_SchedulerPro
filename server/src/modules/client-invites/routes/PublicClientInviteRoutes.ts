/**
 * ==========================================================
 * Arquivo: PublicClientInviteRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir as rotas PÚBLICAS de convite de conta CLIENT (sem
 * autenticação):
 *
 *   POST /api/public/client-invites/inspect
 *   POST /api/public/client-invites/accept
 *
 * Ambas usam POST porque o token É a credencial e vem no
 * CORPO: um token em path (`/convites/:token`) apareceria
 * nos registos de acesso (morgan) e transformaria a própria
 * credencial em log.
 *
 * Não há `AuthMiddleware.authenticate`, `authorize` nem
 * `hasPermission`: o token do convite É a autorização, com
 * expiração e uso único.
 * ==========================================================
 */

import { Router } from "express";

import ClientInviteController from "../controllers/ClientInviteController";
import { inspectClientInviteValidator } from "../validators/inspect-client-invite.validator";
import { acceptClientInviteValidator } from "../validators/accept-client-invite.validator";
import { validateRequest } from "../../../middlewares/validation.middleware";
import {
  clientInviteAcceptRateLimit,
  clientInviteInspectRateLimit,
} from "../../../middlewares/client-invite-rate-limit.middleware";

const publicClientInviteRoutes = Router();

/**
 * ==========================================================
 * Consulta do convite.
 *
 * Ordem: rate limit → validação do corpo → controller.
 * ==========================================================
 */
publicClientInviteRoutes.post(
  "/client-invites/inspect",
  clientInviteInspectRateLimit,
  inspectClientInviteValidator,
  validateRequest,
  ClientInviteController.inspect,
);

/**
 * ==========================================================
 * Aceite do convite (criação da conta CLIENT).
 * ==========================================================
 */
publicClientInviteRoutes.post(
  "/client-invites/accept",
  clientInviteAcceptRateLimit,
  acceptClientInviteValidator,
  validateRequest,
  ClientInviteController.accept,
);

export default publicClientInviteRoutes;
