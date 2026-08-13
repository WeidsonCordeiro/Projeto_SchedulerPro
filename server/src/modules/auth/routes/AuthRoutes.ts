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
import { forgotPasswordValidator } from "../validators/forgot-password.validator";
import { resetPasswordValidator } from "../validators/reset-password.validator";
import { verifyEmailValidator } from "../validators/verify-email.validator";

const router = Router();

router.post(
  "/register",
  registerValidator,
  validateRequest,
  AuthController.register,
);
router.post("/login", loginValidator, validateRequest, AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", AuthMiddleware.authenticate, AuthController.me);
router.get(
  "/verify-email",
  verifyEmailValidator,
  validateRequest,
  AuthController.verifyEmail,
);
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validateRequest,
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validateRequest,
  AuthController.resetPassword,
);

export default router;
