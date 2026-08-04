/**
 * ==========================================================
 * Arquivo: update-company.validator.ts
 * ==========================================================
 */

import { body } from "express-validator";

export const updateCompanyValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({
      min: 3,
      max: 120,
    })
    .withMessage("O nome deve possuir entre 3 e 120 caracteres."),
];
