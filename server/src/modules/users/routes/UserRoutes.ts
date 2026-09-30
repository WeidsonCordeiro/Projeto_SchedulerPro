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
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import { createUserValidator } from "../validators/create-user.validator";
import { uploadSingleImage } from "../../../providers/images/imageUpload.middleware";

const router = Router();

router.get(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_READ),
  UserController.findAll,
);

router.post(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_CREATE),
  createUserValidator,
  validateRequest,
  UserController.create,
);

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_READ),
  UserController.findById,
);

router.put(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_UPDATE),
  updateUserValidator,
  validateRequest,
  UserController.update,
);

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_DELETE),
  UserController.delete,
);

router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_UPDATE),
  UserController.activate,
);

router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_UPDATE),
  UserController.deactivate,
);

/**
 * ==========================================================
 * Foto do funcionário.
 *
 * Segue a convenção já existente no módulo (sub-recursos de
 * `/:id`, como `activate` e `deactivate`).
 *
 * `USER_UPDATE` é a mesma permission usada em
 * `PUT /:id`: não foi criada nenhuma permission nova e a
 * matriz de RBAC não foi alterada (MANAGER continua sem
 * USER_UPDATE).
 *
 * O `uploadSingleImage()` vem DEPOIS da autenticação e da
 * autorização: um pedido não autorizado não deve conseguir
 * consumir memória do processo com o corpo do pedido.
 * ==========================================================
 */

router.post(
  "/:id/photo",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_UPDATE),
  uploadSingleImage("photo"),
  UserController.uploadPhoto,
);

router.delete(
  "/:id/photo",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.USER_UPDATE),
  UserController.removePhoto,
);

router.patch(
  "/me/password",
  AuthMiddleware.authenticate,
  changePasswordValidator,
  validateRequest,
  UserController.changePassword,
);

export default router;
