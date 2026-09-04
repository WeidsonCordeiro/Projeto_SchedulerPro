/**
 * ==========================================================
 * Arquivo: ServiceRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registrar as rotas relacionadas aos serviços.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Router } from "express";

import ServiceController from "../controllers/ServiceController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { Permission } from "../../../constants/permissions";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { createServiceValidator } from "../validators/create-service.validator";
import { updateServiceValidator } from "../validators/update-service.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";

const router = Router();

/**
 * ==========================================================
 * Consulta
 * ==========================================================
 */

router.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.SERVICE_READ),
  ServiceController.findAll,
);

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.SERVICE_READ),
  ServiceController.findById,
);

/**
 * ==========================================================
 * Criação
 * ==========================================================
 */

router.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.SERVICE_CREATE),
  createServiceValidator,
  validateRequest,
  ServiceController.create,
);

/**
 * ==========================================================
 * Atualização
 * ==========================================================
 */

router.patch(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.SERVICE_UPDATE),
  updateServiceValidator,
  validateRequest,
  ServiceController.update,
);

/**
 * ==========================================================
 * Remoção
 * ==========================================================
 */

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.SERVICE_DELETE),
  ServiceController.delete,
);

/**
 * ==========================================================
 * Ativação
 * ==========================================================
 */

router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.SERVICE_UPDATE),
  ServiceController.activate,
);

/**
 * ==========================================================
 * Desativação
 * ==========================================================
 */

router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  hasPermission(Permission.SERVICE_UPDATE),
  ServiceController.deactivate,
);

export default router;
