/**
 * ==========================================================
 * Arquivo: reset-password.validator.ts
 * ==========================================================
 */

import { body } from "express-validator";

export const resetPasswordValidator = [
  body("token").trim().notEmpty().withMessage("O token é obrigatório."),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("A palavra-passe é obrigatória.")
    .isLength({ min: 8 })
    .withMessage("A palavra-passe deve possuir pelo menos 8 caracteres."),
];
