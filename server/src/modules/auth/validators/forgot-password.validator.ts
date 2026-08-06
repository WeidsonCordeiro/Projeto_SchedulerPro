/**
 * ==========================================================
 * Arquivo: forgot-password.validator.ts
 * ==========================================================
 */

import { body } from "express-validator";

export const forgotPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("O e-mail é obrigatório.")
    .isEmail()
    .withMessage("E-mail inválido.")
    .normalizeEmail(),
];
