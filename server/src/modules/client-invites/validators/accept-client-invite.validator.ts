/**
 * ==========================================================
 * Arquivo: accept-client-invite.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar o pedido público de aceite de um convite.
 *
 * Regras:
 *
 * • rejeita campos fora da lista branca — um `companyId`,
 *   `role` ou `clientId` no corpo nunca chega ao serviço;
 * • exige `token`, `password` (mínimo 8 caracteres, mesma
 *   regra das credenciais do cliente) e `confirmPassword`
 *   idêntica.
 *
 * A validação de formato/estado do token é do serviço, para
 * que malformado, inexistente, expirado e consumido devolvam
 * respostas controladas em vez de 400 de validação.
 * ==========================================================
 */

import { body } from "express-validator";

import { ACCEPT_CLIENT_INVITE_FIELDS } from "../dto/AcceptClientInvite.dto";

const ALLOWED_FIELDS = new Set<string>(ACCEPT_CLIENT_INVITE_FIELDS);

export const acceptClientInviteValidator = [
  body().custom((value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("O corpo do pedido deve ser um objeto JSON.");
    }

    const unexpected = Object.keys(value as Record<string, unknown>).filter(
      (field) => !ALLOWED_FIELDS.has(field),
    );

    if (unexpected.length > 0) {
      throw new Error(
        `O pedido contém campos não permitidos: ${unexpected.join(", ")}.`,
      );
    }

    return true;
  }),

  body("token")
    .isString()
    .withMessage("O token do convite deve ser um texto.")
    .bail()
    .notEmpty()
    .withMessage("O token do convite é obrigatório.")
    .bail()
    .isLength({ max: 256 })
    .withMessage("O token do convite é demasiado longo."),

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
];
