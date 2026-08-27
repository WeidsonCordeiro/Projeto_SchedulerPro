/**
 * ==========================================================
 * Arquivo: update-client.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados recebidos para atualização de um cliente.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const updateClientValidator = [
  body("name")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("O nome deve ter entre 2 e 100 caracteres."),

  body("phone")
    .optional({ values: "falsy" })
    .trim()
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
