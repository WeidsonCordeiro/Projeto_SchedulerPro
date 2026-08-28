/**
 * ==========================================================
 * Arquivo: register.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados enviados para o cadastro
 * de um novo usuário.
 *
 * Este validator é responsável apenas por
 * validar a entrada da requisição.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * Regras de negócio pertencem ao AuthService.
 *
 * ==========================================================
 */

import { body } from "express-validator";
import { isValidIanaTimezone } from "../../../utils/timezone";

export const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nome é obrigatório.")
    .isLength({ min: 3, max: 120 }),
  body("email").trim().toLowerCase().isEmail().withMessage("E-mail inválido."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("A senha deve possuir no mínimo 8 caracteres."),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirmação de senha é obrigatória.")
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("As senhas não conferem."),
  body("company.timezone")
    .optional()
    .isString()
    .withMessage("O timezone deve ser um texto.")
    .custom((value) => isValidIanaTimezone(value))
    .withMessage("Timezone IANA inválido."),
];
