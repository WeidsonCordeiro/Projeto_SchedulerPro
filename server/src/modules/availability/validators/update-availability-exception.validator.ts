import { body } from "express-validator";
import { DateTime } from "luxon";

const time = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value: string): boolean {
  if (!dateOnly.test(value)) {
    return false;
  }
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd");
  return parsed.isValid && parsed.toISODate() === value;
}

export const updateAvailabilityExceptionValidator = [
  /**
   * ==========================================================
   * Funcionário.
   * ==========================================================
   */
  body("employeeId")
    .optional()
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  /**
   * ==========================================================
   * Data local da empresa.
   * ==========================================================
   */
  body("date")
    .optional()
    .custom((value: unknown) => {
      if (typeof value !== "string" || !isValidDateOnly(value)) {
        throw new Error("Data inválida. Use o formato AAAA-MM-DD.");
      }
      return true;
    }),

  /**
   * ==========================================================
   * Tipo.
   * ==========================================================
   */
  body("type")
    .optional()
    .isIn(["BLOCK", "VACATION", "HOLIDAY"])
    .withMessage("Tipo de exceção inválido."),

  /**
   * ==========================================================
   * Dia inteiro.
   * ==========================================================
   */
  body("allDay")
    .optional()
    .isBoolean()
    .withMessage("O campo dia inteiro deve ser booleano."),

  /**
   * ==========================================================
   * Horários.
   * ==========================================================
   */
  body("startTime")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário inicial inválido. Use HH:mm."),

  body("endTime")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário final inválido. Use HH:mm."),

  /**
   * ==========================================================
   * Motivo.
   * ==========================================================
   */
  body("reason")
    .optional({ nullable: true })
    .isString()
    .withMessage("O motivo deve ser um texto.")
    .isLength({ max: 500 })
    .withMessage("O motivo deve ter no máximo 500 caracteres.")
    .trim(),

  /**
   * ==========================================================
   * Quando ambos os horários forem enviados (e não for dia
   * inteiro), o início deve ser anterior ao fim.
   *
   * Atualizações parciais são validadas no merge feito pelo
   * serviço (valores atuais + valores enviados).
   * ==========================================================
   */
  body().custom((_, { req }) => {
    const { allDay, startTime, endTime } = req.body;

    if (allDay === true) {
      return true;
    }

    const hasStart =
      startTime !== undefined && startTime !== null && startTime !== "";
    const hasEnd = endTime !== undefined && endTime !== null && endTime !== "";

    if (hasStart && hasEnd && startTime >= endTime) {
      throw new Error(
        "O horário inicial deve ser anterior ao horário final.",
      );
    }

    return true;
  }),
];