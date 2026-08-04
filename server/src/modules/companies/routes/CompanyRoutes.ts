/**
 * ==========================================================
 * Arquivo: CompanyRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registar as rotas relacionadas às empresas.
 *
 * ==========================================================
 */

import { Router } from "express";

import CompanyController from "../controllers/CompanyController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { Permission } from "../../../constants/permissions";

const router = Router();

/**
 * ==========================================================
 * Consulta
 * ==========================================================
 */

router.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_READ),
  CompanyController.findAll
);

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_READ),
  CompanyController.findById
);

/**
 * ==========================================================
 * Atualização
 * ==========================================================
 */

router.patch(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_UPDATE),
  CompanyController.update
);

/**
 * ==========================================================
 * Remoção
 * ==========================================================
 */

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_DELETE),
  CompanyController.delete
);

/**
 * ==========================================================
 * Ativação
 * ==========================================================
 */

router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_ACTIVATE),
  CompanyController.activate
);

/**
 * ==========================================================
 * Desativação
 * ==========================================================
 */

router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  hasPermission(Permission.COMPANY_DEACTIVATE),
  CompanyController.deactivate
);

export default router;
