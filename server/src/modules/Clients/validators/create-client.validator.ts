/**
 * ==========================================================
 * Arquivo: create-client.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos para criação de um cliente.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const createClientValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("O nome do cliente é obrigatório.")
    .isLength({ min: 2, max: 100 })
    .withMessage("O nome deve ter entre 2 e 100 caracteres."),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("O telefone do cliente é obrigatório.")
    .isLength({ min: 8, max: 20 })
    .withMessage("O telefone deve ter entre 8 e 20 caracteres."),

  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("O e-mail informado é inválido.")
    .normalizeEmail(),

  body("notes")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("As observações devem ter no máximo 500 caracteres."),
];
