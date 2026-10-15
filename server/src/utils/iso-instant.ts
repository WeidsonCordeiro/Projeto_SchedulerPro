import { DateTime } from "luxon";
import type { ValidationChain } from "express-validator";

/**
 * ISO 8601 com deslocamento explícito: `Z` ou `+HH:MM`/`-HH:MM`.
 *
 * Sem este deslocamento, `new Date()` interpretaria o valor no
 * fuso do processo Node — não como instante unívoco.
 */
export const HAS_EXPLICIT_TIMEZONE_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const ISO_INSTANT_MISSING_OFFSET_MESSAGE =
  "A data e hora do agendamento devem incluir o fuso horário (ex.: 2027-08-29T08:00:00Z).";

export const ISO_INSTANT_INVALID_MESSAGE =
  "A data e hora do agendamento são inválidas.";

export const ISO_INSTANT_PERIOD_MISSING_OFFSET_MESSAGE =
  "O instante deve incluir o fuso horário (ex.: 2027-08-01T00:00:00.000Z).";

export const ISO_INSTANT_PERIOD_INVALID_MESSAGE =
  "O instante deve ser uma data válida no formato ISO 8601.";

/**
 * Valida que o valor é um instante ISO 8601 com offset explícito e data real
 * (rejeita, por exemplo, 2026-02-30).
 */
export function isValidIsoInstant(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  if (!HAS_EXPLICIT_TIMEZONE_OFFSET.test(value)) {
    return false;
  }

  const parsed = DateTime.fromISO(value, { setZone: true });

  return parsed.isValid;
}

/**
 * Regras partilhadas de instante para express-validator (após `isISO8601`).
 */
export function withIsoInstantRules(
  chain: ValidationChain,
  messages: {
    missingOffset: string;
    invalid: string;
  } = {
    missingOffset: ISO_INSTANT_MISSING_OFFSET_MESSAGE,
    invalid: ISO_INSTANT_INVALID_MESSAGE,
  },
): ValidationChain {
  return chain
    .custom(
      (value: unknown) =>
        typeof value === "string" && HAS_EXPLICIT_TIMEZONE_OFFSET.test(value),
    )
    .withMessage(messages.missingOffset)
    .custom((value: unknown) => isValidIsoInstant(value))
    .withMessage(messages.invalid);
}
