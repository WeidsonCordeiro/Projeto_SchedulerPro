/**

* ==========================================================
* Arquivo: create-appointment.validator.ts
* ---
* Responsabilidade:
*
* Validar os dados recebidos para criação
* de um novo agendamento.
*
* ==========================================================
  */

import { body } from "express-validator";

export const createAppointmentValidator = [
  body("clientId")
    .notEmpty()
    .withMessage("O cliente é obrigatório.")
    .isMongoId()
    .withMessage("ID do cliente inválido."),

  body("serviceId")
    .notEmpty()
    .withMessage("O serviço é obrigatório.")
    .isMongoId()
    .withMessage("ID do serviço inválido."),

  body("employeeId")
    .notEmpty()
    .withMessage("O funcionário é obrigatório.")
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  body("startAt")
    .notEmpty()
    .withMessage("A data e hora do agendamento são obrigatórias.")
    .isISO8601()
    .withMessage("A data e hora do agendamento são inválidas."),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("As observações devem ser um texto.")
    .trim(),
];
