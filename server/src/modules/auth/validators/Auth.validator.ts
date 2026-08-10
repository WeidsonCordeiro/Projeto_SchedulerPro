/**
 * ==========================================================
 * Arquivo: AuthValidator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos nas requisições de autenticação.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const loginValidator = [
  body("email").trim().toLowerCase().isEmail().withMessage("E-mail inválido"),

  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Senha inválida"),
];
