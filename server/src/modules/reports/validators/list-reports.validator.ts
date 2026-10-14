import { query } from "express-validator";

import {
  ISO_INSTANT_PERIOD_INVALID_MESSAGE,
  ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
  withIsoInstantRules,
} from "../../../utils/iso-instant";

/**
 * Validador dos query params de consulta de relatórios.
 *
 * startAt e endAt são opcionais e devem ser datas ISO 8601
 * válidas representando instantes UTC. Quando ambos são
 * fornecidos, startAt deve ser anterior a endAt e o período
 * não pode ultrapassar 366 dias (limite razoável para um
 * relatório).
 *
 * limit (opcional) restringe o tamanho dos rankings
 * (1 ate 20). O valor padrão é aplicado pelo serviço.
 */
export const listReportsValidator = [
  withIsoInstantRules(
    query("startAt")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("O início do período deve ser uma data válida.")
      .isISO8601()
      .withMessage("O início do período deve estar no formato ISO 8601."),
    {
      missingOffset: ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
      invalid: ISO_INSTANT_PERIOD_INVALID_MESSAGE,
    },
  ),

  withIsoInstantRules(
    query("endAt")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("O fim do período deve ser uma data válida.")
      .isISO8601()
      .withMessage("O fim do período deve estar no formato ISO 8601.")
      .custom((endAt: string, { req }) => {
        const startAt = (req.query as { startAt?: string }).startAt;
        if (!startAt || !endAt) {
          return true;
        }
        const startMs = Date.parse(startAt);
        const endMs = Date.parse(endAt);
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
          if (startMs >= endMs) {
            throw new Error(
              "O início do período deve ser anterior ao fim do período.",
            );
          }
          if (endMs - startMs > 366 * 24 * 60 * 60 * 1000) {
            throw new Error(
              "O período do relatório não pode ultrapassar 366 dias.",
            );
          }
        }
        return true;
      }),
    {
      missingOffset: ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
      invalid: ISO_INSTANT_PERIOD_INVALID_MESSAGE,
    },
  ),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 20 })
    .withMessage("O limite dos rankings deve ser um número entre 1 e 20."),
];