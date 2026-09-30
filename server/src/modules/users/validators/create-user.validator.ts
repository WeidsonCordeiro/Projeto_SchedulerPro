import { body } from "express-validator";
import { Role } from "../../../constants/roles";

export const createUserValidator = [
  body("name")
    .isString()
    .withMessage("O nome deve ser um texto.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("O nome é obrigatório."),
  body("email")
    .isString()
    .withMessage("O e-mail deve ser um texto.")
    .bail()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("O e-mail é inválido."),
  body("password")
    .isString()
    .withMessage("A senha deve ser um texto.")
    .bail()
    .isLength({ min: 8 })
    .withMessage("A senha deve possuir pelo menos 8 caracteres."),
  body("confirmPassword")
    .isString()
    .withMessage("A confirmação de senha deve ser um texto.")
    .bail()
    .notEmpty()
    .withMessage("A confirmação de senha é obrigatória.")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("As senhas não coincidem.");
      }
      return true;
    }),
  body("role")
    .isString()
    .withMessage("A função deve ser um texto.")
    .bail()
    .isIn(Object.values(Role))
    .withMessage("Função inválida."),
];
