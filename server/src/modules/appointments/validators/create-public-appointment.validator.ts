/**

* ==========================================================
* Arquivo: create-public-appointment.validator.ts
* ---
* Responsabilidade:
*
* Validar os dados recebidos no pedido público de criação
* de agendamento.
*
* O endpoint é público (sem autenticação) e, por isso, valida
* de forma mais estrita do que o fluxo administrativo:
*
* • rejeita campos inesperados (mass assignment);
* • exige `startAt` com fuso horário explícito, porque o
*   timezone do servidor pode diferir do da empresa;
* • limita o tamanho de cada campo.
* ==========================================================
  */

import { body } from "express-validator";

import { PUBLIC_APPOINTMENT_FIELDS } from "../dto/CreatePublicAppointment.dto";

const ALLOWED_FIELDS = new Set<string>(PUBLIC_APPOINTMENT_FIELDS);

/**
 * ISO 8601 com deslocamento explícito: `Z` ou `+HH:MM`/`-HH:MM`.
 *
 * Sem este deslocamento, `new Date()` interpretaria o valor no
 * fuso do servidor — não no fuso da empresa — e o agendamento
 * seria gravado no instante errado.
 */
const HAS_TIMEZONE_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const createPublicAppointmentValidator = [
  /**
   * Rejeita qualquer campo fora do contrato público.
   *
   * Sem esta validação, um `companyId`, `status`, `endAt` ou
   * `clientId` no corpo seria simplesmente ignorado pelo
   * controller (o DTO é lido campo a campo), mas a rejeição
   * explícita evita que um cliente descubra a superfície aceite
   * por tentativas.
   */
  body().custom((value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("O corpo do pedido deve ser um objeto JSON.");
    }

    const unexpected = Object.keys(value as Record<string, unknown>).filter(
      (field) => !ALLOWED_FIELDS.has(field),
    );

    if (unexpected.length > 0) {
      throw new Error(
        `O pedido contém campos não permitidos: ${unexpected.join(", ")}.`,
      );
    }

    return true;
  }),

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
    .withMessage("A data e hora do agendamento são inválidas.")
    .custom(
      (value: unknown) =>
        typeof value === "string" && HAS_TIMEZONE_OFFSET.test(value),
    )
    .withMessage(
      "A data e hora do agendamento devem incluir o fuso horário (ex.: 2027-08-29T08:00:00Z).",
    )
    .custom((value: unknown) => {
      if (typeof value !== "string") {
        return false;
      }

      return !Number.isNaN(new Date(value).getTime());
    })
    .withMessage("A data e hora do agendamento são inválidas."),

  body("clientName")
    .trim()
    .notEmpty()
    .withMessage("O nome é obrigatório.")
    .isLength({ min: 2, max: 100 })
    .withMessage("O nome deve ter entre 2 e 100 caracteres."),

  body("clientEmail")
    .trim()
    .notEmpty()
    .withMessage("O e-mail é obrigatório.")
    .isEmail()
    .withMessage("O e-mail informado é inválido.")
    .isLength({ max: 254 })
    .withMessage("O e-mail informado é inválido."),

  /**
   * Telefone é opcional e validado apenas por tamanho, para não
   * impor um formato único a números internacionais.
   */
  body("clientPhone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage("O telefone deve ter entre 8 e 20 caracteres."),

  body("notes")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("As observações devem ter no máximo 500 caracteres."),
];