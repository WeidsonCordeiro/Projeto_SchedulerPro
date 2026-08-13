import { query } from "express-validator";

export const verifyEmailValidator = [
  query("token")
    .exists()
    .withMessage("Token de verificação é obrigatório.")
    .isString()
    .withMessage("Token de verificação inválido.")
    .notEmpty()
    .withMessage("Token de verificação é obrigatório."),
];
