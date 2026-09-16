/**
 * ==========================================================
 * Arquivo: set-client-credentials.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos para definir as credenciais
 * de acesso de um cliente ao portal.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const setClientCredentialsValidator = [
  body("password")
    .isString()
    .withMessage("A senha deve ser um texto.")
    .bail()
    .isLength({ min: 8 })
    .withMessage("A senha deve possuir pelo menos 8 caracteres."),
  body("confirmPassword")
    .isString()
    .withMessage("A confirmação de senha deve ser um texto.")
    .bail()
    .notEmpty()
    .withMessage("A confirmação de senha é obrigatória.")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("As senhas não coincidem.");
      }
      return true;
    }),
];