/**
 * ==========================================================
 * Arquivo: create-user.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos para a criação
 * de um utilizador.
 *
 * ==========================================================
 */

import { body } from "express-validator";
import { Role } from "../../../constants/roles";

export const createUserValidator = [
  body("name").trim().notEmpty().withMessage("O nome é obrigatório."),

  body("email")
    .trim()
    .isEmail()
    .withMessage("O e-mail é inválido.")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("A senha deve possuir pelo menos 8 caracteres."),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("As senhas não coincidem.");
    }

    return true;
  }),

  body("role").isIn(Object.values(Role)).withMessage("Função inválida."),
];
