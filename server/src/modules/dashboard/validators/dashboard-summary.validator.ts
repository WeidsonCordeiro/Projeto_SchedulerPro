import { query } from "express-validator";

import {
  ISO_INSTANT_PERIOD_INVALID_MESSAGE,
  ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
  withIsoInstantRules,
} from "../../../utils/iso-instant";
import { MAX_UPCOMING_LIMIT } from "../index";

/**
 * Período obrigatório [startAt, endAt) em UTC.
 * upcomingLimit opcional (1..20) para a lista de próximos agendamentos.
 */
export const dashboardSummaryValidator = [
  withIsoInstantRules(
    query("startAt")
      .notEmpty()
      .withMessage("O início do período é obrigatório.")
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
      .notEmpty()
      .withMessage("O fim do período é obrigatório.")
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
              "O período do dashboard não pode ultrapassar 366 dias.",
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

  query("upcomingLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: MAX_UPCOMING_LIMIT })
    .withMessage(
      `O limite de próximos agendamentos deve ser um número entre 1 e ${MAX_UPCOMING_LIMIT}.`,
    ),
];
