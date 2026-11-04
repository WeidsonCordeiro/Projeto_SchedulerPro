/**
 * ==========================================================
 * Arquivo: inspect-client-invite.validator.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar o pedido público de consulta de um convite.
 *
 * O token é a credencial e vem NO CORPO, nunca na URL: um
 * token em path apareceria nos registos de acesso (morgan)
 * e transformaria a própria credencial em log.
 *
 * A validação de formato do token (tamanho/base64url) é
 * deliberadamente DEIXADA para o serviço, que responde 404
 * com a mesma mensagem para token malformado e inexistente —
 * o validator só garante que o campo existe e é texto.
 * ==========================================================
 */

import { body } from "express-validator";

import { INSPECT_CLIENT_INVITE_FIELDS } from "../dto/AcceptClientInvite.dto";

const ALLOWED_FIELDS = new Set<string>(INSPECT_CLIENT_INVITE_FIELDS);

export const inspectClientInviteValidator = [
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
];
