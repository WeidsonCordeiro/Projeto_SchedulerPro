/**

* ==========================================================
* Arquivo: update-public-appointment.validator.ts
* ---
* Responsabilidade:
*
* Validar os dados do PATCH público de agendamento.
*
* O corpo é validado como uma lista fechada de campos: o que
* não estiver em `PUBLIC_APPOINTMENT_UPDATE_FIELDS` é rejeitado
* com 400. Isto é o que impede que `status`, `endAt`,
* `companyId`, `clientId` ou `publicAccessTokenHash` sejam
 * enviados por um cliente público.
*
* As regras de valor de `startAt` são as mesmas da criação
* pública (ISO 8601 com deslocamento explícito).
* ==========================================================
  */

import { body } from "express-validator";

import { PUBLIC_APPOINTMENT_UPDATE_FIELDS } from "../dto/UpdatePublicAppointment.dto";

const ALLOWED_FIELDS = new Set<string>(PUBLIC_APPOINTMENT_UPDATE_FIELDS);

/**
 * ISO 8601 com deslocamento explícito: `Z` ou `+HH:MM`/`-HH:MM`.
 */
const HAS_TIMEZONE_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Valida a data/hora enviada no PATCH.
 *
 * Exposto para ser reutilizado sem duplicar a regra de fuso.
 */
const startAtRules = [
  body("startAt")
    /**
     * O PATCH é parcial: `startAt` só é validado quando vem.
     * Sem `optional()`, `notEmpty()` transformava a ausência do
     * campo em erro e recusava qualquer PATCH que não mexesse na
     * data (incluindo o corpo vazio).
     */
    .optional()
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
];

/**
 * ==========================================================
 * Regras partilhadas de corpo.
 *
 * Numa rota cujo contrato é uma lista fechada de campos, o corpo
 * tem de ser um objeto JSON e não pode trazer nada de fora dessa
 * lista. É o que impede `status`, `endAt`, `companyId`,
 * `clientId` ou `publicAccessTokenHash` num pedido público.
 * ==========================================================
 */

/**
 * Normaliza o corpo recebido.
 *
 * `undefined`/`null` significam "sem body": um `PATCH` sem
 * corpo é um no-op legítimo e um `DELETE` não tem body nenhum.
 * Só é recusado o que foi enviado e não é um objeto JSON.
 */
const normalizeBody = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("O corpo do pedido deve ser um objeto JSON.");
  }

  return value as Record<string, unknown>;
};

const bodyHasOnly = (allowed: Set<string>) =>
  body().custom((value: unknown) => {
    const unexpected = Object.keys(normalizeBody(value)).filter(
      (field) => !allowed.has(field),
    );

    if (unexpected.length > 0) {
      throw new Error(
        `O pedido contém campos não permitidos: ${unexpected.join(", ")}.`,
      );
    }

    return true;
  });

export const updatePublicAppointmentValidator = [
  /**
   * Rejeita qualquer campo fora do contrato público.
   *
   * Um corpo vazio é aceite: resulta em nenhuma alteração
   * (no-op) e devolve o estado atual.
   */
  bodyHasOnly(ALLOWED_FIELDS),

  body("serviceId")
    .optional()
    .isMongoId()
    .withMessage("ID do serviço inválido."),

  body("employeeId")
    .optional()
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  ...startAtRules,

  /**
   * `notes` aceita `null` explícito para limpar as
   * observações, tal como o fluxo administrativo.
   */
  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("As observações devem ser um texto.")
    .trim()
    .isLength({ max: 500 })
    .withMessage("As observações devem ter no máximo 500 caracteres."),
];

/**
 * ==========================================================
 * Cancelamento público: sem body.
 *
 * `DELETE` não tem contrato de campos. Qualquer chave — `status`,
 * `startAt`, o que for — é recusada com 400.
 *
 * Ignorar o corpo seria pior: o cliente receberia `200` e
 * concluiria que escolheu o estado final, quando foi o servidor
 * que o decidiu.
 * ==========================================================
 */
export const rejectCancelBodyValidator = [
  bodyHasOnly(new Set<string>()),
];