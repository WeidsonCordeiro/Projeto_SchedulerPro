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

export const createAvailabilityExceptionValidator = [
  /**
   * ==========================================================
   * Funcionário.
   * ==========================================================
   */
  body("employeeId")
    .notEmpty()
    .withMessage("O funcionário é obrigatório.")
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  /**
   * ==========================================================
   * Data local da empresa.
   * ==========================================================
   */
  body("date")
    .notEmpty()
    .withMessage("A data é obrigatória.")
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
   * Horários (apenas quando não for dia inteiro).
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
   * Validação cruzada: dia inteiro não exige horários;
   * período exige início e fim com início < fim.
   * ==========================================================
   */
  body().custom((_, { req }) => {
    const { allDay, startTime, endTime } = req.body;

    const isAllDay = allDay === true;

    if (isAllDay) {
      return true;
    }

    const hasStart = startTime !== undefined && startTime !== null && startTime !== "";
    const hasEnd = endTime !== undefined && endTime !== null && endTime !== "";

    if (!hasStart || !hasEnd) {
      throw new Error("Informe o horário inicial e final do bloqueio.");
    }

    if (startTime >= endTime) {
      throw new Error(
        "O horário inicial deve ser anterior ao horário final.",
      );
    }

    return true;
  }),
];