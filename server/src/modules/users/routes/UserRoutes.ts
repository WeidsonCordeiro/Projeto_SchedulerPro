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

const router = Router();

/**
 * ==========================================================
 * GET /users
 * ==========================================================
 */

router.get(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_READ),
  UserController.findAll
);

/**
 * ==========================================================
 * GET /users/:id
 * ==========================================================
 */

router.get(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_READ),
  UserController.findById
);

/**
 * ==========================================================
 * POST /users
 * ==========================================================
 */

router.post(
  "/",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_CREATE),
  UserController.create
);

/**
 * ==========================================================
 * DELETE /users/:id
 * ==========================================================
 */

router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  hasPermission(Permission.USER_DELETE),
  UserController.delete
);

export default router;
