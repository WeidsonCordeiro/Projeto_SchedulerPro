import { body } from "express-validator";

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createAvailabilityValidator = [
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
   * Dia da semana.
   * ==========================================================
   */
  body("dayOfWeek")
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
   * Validação dos períodos.
   * ==========================================================
   */
  body().custom((_, { req }) => {
    const { morningStart, morningEnd, afternoonStart, afternoonEnd } = req.body;

    const hasMorningStart = morningStart !== undefined && morningStart !== null;

    const hasMorningEnd = morningEnd !== undefined && morningEnd !== null;

    const hasAfternoonStart =
      afternoonStart !== undefined && afternoonStart !== null;

    const hasAfternoonEnd = afternoonEnd !== undefined && afternoonEnd !== null;

    /**
     * Deve possuir pelo menos um período.
     */
    if (
      !hasMorningStart &&
      !hasMorningEnd &&
      !hasAfternoonStart &&
      !hasAfternoonEnd
    ) {
      throw new Error("Informe pelo menos um período de disponibilidade.");
    }

    /**
     * Manhã deve possuir início e fim.
     */
    if (hasMorningStart !== hasMorningEnd) {
      throw new Error("Informe o horário inicial e final da manhã.");
    }

    /**
     * Tarde deve possuir início e fim.
     */
    if (hasAfternoonStart !== hasAfternoonEnd) {
      throw new Error("Informe o horário inicial e final da tarde.");
    }

    /**
     * Valida período da manhã.
     */
    if (hasMorningStart && hasMorningEnd && morningStart >= morningEnd) {
      throw new Error(
        "O horário inicial da manhã deve ser anterior ao horário final.",
      );
    }

    /**
     * Valida período da tarde.
     */
    if (
      hasAfternoonStart &&
      hasAfternoonEnd &&
      afternoonStart >= afternoonEnd
    ) {
      throw new Error(
        "O horário inicial da tarde deve ser anterior ao horário final.",
      );
    }

    /**
     * Quando existir manhã e tarde, os períodos
     * não podem se sobrepor.
     */
    if (hasMorningEnd && hasAfternoonStart && morningEnd > afternoonStart) {
      throw new Error(
        "O período da manhã não pode sobrepor o período da tarde.",
      );
    }

    return true;
  }),
];
