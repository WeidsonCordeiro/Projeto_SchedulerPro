/**
 * ==========================================================
 * Arquivo: login.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos para autenticação.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("E-mail é obrigatório.")
    .isEmail()
    .withMessage("E-mail inválido.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Senha é obrigatória.")
    .isLength({ min: 6 })
    .withMessage("Senha inválida."),
];
