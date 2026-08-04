/**
 * ==========================================================
 * Arquivo: change-password.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados necessários para a alteração
 * da palavra-passe do utilizador.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("A palavra-passe atual é obrigatória."),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("A nova palavra-passe deve possuir pelo menos 8 caracteres."),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("As palavras-passe não coincidem.");
    }

    return true;
  }),
];
