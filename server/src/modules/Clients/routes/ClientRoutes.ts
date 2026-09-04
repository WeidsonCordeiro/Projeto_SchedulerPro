/**
 * ==========================================================
 * Arquivo: ClientRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registrar todas as rotas relacionadas aos clientes.
 *
 * Cada rota deve possuir:
 *
 * • Autenticação
 * • Permissão
 * • Validação quando necessário
 * • Controller
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Router } from "express";

import ClientController from "../controllers/ClientController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { Permission } from "../../../constants/permissions";
import { createClientValidator } from "../validators/create-client.validator";
import { updateClientValidator } from "../validators/update-client.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";

const router = Router();

/**
 * ==========================================================
 * Criar cliente
 * ==========================================================
 */
router.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.CLIENT_CREATE),
  createClientValidator,
  validateRequest,
  ClientController.create,
);

/**
 * ==========================================================
 * Listar clientes
 * ==========================================================
 */
router.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.CLIENT_READ),
  ClientController.findAll,
);

/**
 * ==========================================================
 * Buscar cliente por ID
 * ==========================================================
 */
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_READ),
  ClientController.findById,
);

/**
 * ==========================================================
 * Atualizar cliente
 * ==========================================================
 */
router.patch(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  updateClientValidator,
  validateRequest,
  ClientController.update,
);

/**
 * ==========================================================
 * Desativar cliente
 * ==========================================================
 */
router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  ClientController.deactivate,
);

/**
 * ==========================================================
 * Ativar cliente
 * ==========================================================
 */
router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  ClientController.activate,
);

/**
 * ==========================================================
 * Remover cliente
 *
 * Soft delete.
 * ==========================================================
 */
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_DELETE),
  ClientController.delete,
);

export default router;
