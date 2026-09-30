/**
 * ==========================================================
 * Arquivo: update-user.validator.ts
 * ----------------------------------------------------------
 *
 * Responsabilidade:
 *
 * Validar os dados enviados para a atualização
 * de um utilizador.
 *
 * ==========================================================
 */

import { body } from "express-validator";
import { Role } from "../../../constants/roles";

export const updateUserValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("O nome deve possuir entre 3 e 120 caracteres."),
  body("email")
    .optional()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("E-mail inválido."),
  body("role")
    .optional()
    .isIn(Object.values(Role))
    .withMessage("Perfil inválido."),
  /**
   * `avatar` não é validado aqui porque não é aceite neste
   * pedido: é ignorado e a alteração da foto é feita
   * exclusivamente pelo endpoint de foto (via imageProvider).
   */
];
