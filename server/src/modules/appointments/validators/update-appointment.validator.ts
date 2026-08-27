/**

* ==========================================================
* Arquivo: update-appointment.validator.ts
* ---
* Responsabilidade:
*
* Validar os dados recebidos para atualização
* de um agendamento.
*
* ==========================================================
  */

import { body } from "express-validator";

export const updateAppointmentValidator = [
  body("clientId")
    .optional()
    .isMongoId()
    .withMessage("ID do cliente inválido."),

  body("serviceId")
    .optional()
    .isMongoId()
    .withMessage("ID do serviço inválido."),

  body("employeeId")
    .optional()
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  body("startAt")
    .optional()
    .isISO8601()
    .withMessage("A data e hora do agendamento são inválidas."),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("As observações devem ser um texto.")
    .trim(),
];
