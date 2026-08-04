/**
 * ==========================================================
 * Arquivo: UserRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registrar as rotas do módulo de usuários.
 *
 * ==========================================================
 */

import { Router } from "express";
import UserController from "../controllers/UserController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { Permission } from "../../../constants/permissions";
import { updateUserValidator } from "../validators/update-user.validator";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { changePasswordValidator } from "../validators/change-password.validator";

const router = Router();

router.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_READ),
  UserController.findAll
);

router.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_CREATE),
  UserController.create
);

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_READ),
  UserController.findById
);

router.put(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_UPDATE),
  updateUserValidator,
  validateRequest,
  UserController.update
);

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_DELETE),
  UserController.delete
);

router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_UPDATE),
  UserController.activate
);

router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_UPDATE),
  UserController.deactivate
);

router.patch(
  "/me/password",
  AuthMiddleware.authenticate,
  changePasswordValidator,
  validateRequest,
  UserController.changePassword
);

export default router;
