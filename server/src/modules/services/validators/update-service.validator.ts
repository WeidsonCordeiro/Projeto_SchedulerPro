/**
 * ==========================================================
 * Arquivo: update-service.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar os dados utilizados para atualização de um serviço.
 *
 * Todos os campos são opcionais, porém quando enviados
 * devem respeitar as regras definidas.
 *
 * ==========================================================
 */

import { body } from "express-validator";

export const updateServiceValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("O nome do serviço deve ser um texto.")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("O nome do serviço deve ter entre 2 e 100 caracteres."),

  body("description")
    .optional()
    .isString()
    .withMessage("A descrição deve ser um texto.")
    .trim()
    .isLength({ max: 500 })
    .withMessage("A descrição deve ter no máximo 500 caracteres."),

  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("A duração deve ser um número inteiro maior que zero."),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("O preço deve ser um número maior ou igual a zero."),
];
