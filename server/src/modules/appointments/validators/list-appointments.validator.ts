import { query } from "express-validator";

import {
  ISO_INSTANT_PERIOD_INVALID_MESSAGE,
  ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
  withIsoInstantRules,
} from "../../../utils/iso-instant";

/**
 * Validador para os query params de consulta de agendamentos.
 *
 * startAt e endAt são opcionais e devem ser datas ISO 8601 válidas
 * representando instantes UTC. Quando ambos são fornecidos, startAt deve
 * ser anterior ao endAt.
 */
export const listAppointmentsValidator = [
  withIsoInstantRules(
    query("startAt")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("A data inicial do período deve ser uma data válida.")
      .isISO8601()
      .withMessage("A data inicial do período deve ser no formato ISO 8601."),
    {
      missingOffset: ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
      invalid: ISO_INSTANT_PERIOD_INVALID_MESSAGE,
    },
  ),

  withIsoInstantRules(
    query("endAt")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("A data final do período deve ser uma data válida.")
      .isISO8601()
      .withMessage("A data final do período deve ser no formato ISO 8601.")
      .custom((endAt: string, { req }) => {
        const startAt = (req.query as { startAt?: string }).startAt;
        if (!startAt || !endAt) {
          return true;
        }
        const startMs = Date.parse(startAt);
        const endMs = Date.parse(endAt);
        if (
          !Number.isNaN(startMs) &&
          !Number.isNaN(endMs) &&
          startMs >= endMs
        ) {
          throw new Error(
            "O início do período deve ser anterior ao fim do período.",
          );
        }
        return true;
      }),
    {
      missingOffset: ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE,
      invalid: ISO_INSTANT_PERIOD_INVALID_MESSAGE,
    },
  ),
];
