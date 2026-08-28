import { body } from "express-validator";

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateAvailabilityValidator = [
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
   * Dia da semana.
   * ==========================================================
   */
  body("dayOfWeek")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("Dia da semana inválido."),

  /**
   * ==========================================================
   * Horário da manhã.
   * ==========================================================
   */
  body("morningStart")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário inicial da manhã inválido. Use HH:mm."),

  body("morningEnd")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário final da manhã inválido. Use HH:mm."),

  /**
   * ==========================================================
   * Horário da tarde.
   * ==========================================================
   */
  body("afternoonStart")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário inicial da tarde inválido. Use HH:mm."),

  body("afternoonEnd")
    .optional({ nullable: true })
    .matches(time)
    .withMessage("Horário final da tarde inválido. Use HH:mm."),

  /**
   * ==========================================================
   * Valida pares enviados simultaneamente.
   * ==========================================================
   */
  body().custom((_, { req }) => {
    const { morningStart, morningEnd, afternoonStart, afternoonEnd } = req.body;

    /**
     * Valida manhã quando ambos forem enviados.
     */
    if (
      morningStart !== undefined &&
      morningStart !== null &&
      morningEnd !== undefined &&
      morningEnd !== null &&
      morningStart >= morningEnd
    ) {
      throw new Error(
        "O horário inicial da manhã deve ser anterior ao horário final.",
      );
    }

    /**
     * Valida tarde quando ambos forem enviados.
     */
    if (
      afternoonStart !== undefined &&
      afternoonStart !== null &&
      afternoonEnd !== undefined &&
      afternoonEnd !== null &&
      afternoonStart >= afternoonEnd
    ) {
      throw new Error(
        "O horário inicial da tarde deve ser anterior ao horário final.",
      );
    }

    /**
     * Valida sobreposição quando morningEnd e
     * afternoonStart forem enviados juntos.
     */
    if (
      morningEnd !== undefined &&
      morningEnd !== null &&
      afternoonStart !== undefined &&
      afternoonStart !== null &&
      morningEnd > afternoonStart
    ) {
      throw new Error(
        "O período da manhã não pode sobrepor o período da tarde.",
      );
    }

    return true;
  }),
];
