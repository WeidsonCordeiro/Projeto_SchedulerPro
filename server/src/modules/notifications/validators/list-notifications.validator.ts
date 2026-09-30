import { query } from "express-validator";

/**
 * Validador dos query params da listagem de notificações.
 *
 * limit (opcional) restringe a quantidade de notificações
 * devolvidas (1 a 50). O valor padrão é aplicado pelo serviço.
 */
export const listNotificationsValidator = [
  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 50 })
    .withMessage("O limite de notificações deve ser um número entre 1 e 50."),
];