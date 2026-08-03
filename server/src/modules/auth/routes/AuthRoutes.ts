/**
 * ==========================================================
 * Arquivo: AuthRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registrar todas as rotas de autenticação.
 *
 * Cada rota deve possuir:
 *
 * • Validação
 * • Middleware
 * • Controller
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Router } from "express";
import AuthController from "../controllers/AuthController";
import { loginValidator } from "../validators/login.validator";
import { validateRequest } from "../../../middlewares/validation.middleware";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { registerValidator } from "../validators/register.validator";

const router = Router();

/**
 * Rotas públicas
 */
router.post(
  "/register",
  registerValidator,
  validateRequest,
  AuthController.register
);

router.post("/login", loginValidator, validateRequest, AuthController.login);
router.post("/refresh", AuthController.refresh);

/**
 * Rotas privadas
 */
router.get("/me", AuthMiddleware.authenticate, AuthController.me);
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

export default router;
