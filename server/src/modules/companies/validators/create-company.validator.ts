/**
 * ==========================================================
 * Arquivo: create-company.validator.ts
 * ==========================================================
 */

import { body } from "express-validator";
import { isValidIanaTimezone } from "../../../utils/timezone";

export const createCompanyValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("O nome da empresa é obrigatório.")
    .isLength({
      min: 3,
      max: 120,
    })
    .withMessage("O nome deve possuir entre 3 e 120 caracteres."),
  body("timezone")
    .optional()
    .isString()
    .withMessage("O timezone deve ser um texto.")
    .custom((value) => isValidIanaTimezone(value))
    .withMessage("Timezone IANA Inválido."),
];
