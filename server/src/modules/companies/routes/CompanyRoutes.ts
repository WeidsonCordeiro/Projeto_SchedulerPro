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
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";

const router = Router();

router.get(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_READ),
  CompanyController.findAll,
);

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_READ),
  CompanyController.findById,
);

router.patch(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_UPDATE),
  CompanyController.update,
);

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_DELETE),
  CompanyController.delete,
);

router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_ACTIVATE),
  CompanyController.activate,
);

router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.COMPANY_DEACTIVATE),
  CompanyController.deactivate,
);

export default router;
